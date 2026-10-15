import { createAdminClient } from "../supabase/admin.ts";
import { isValidSportSlug } from "../repositories/sportRepository.ts";

export const SPORT_IMAGES_BUCKET = "sport-images";
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MANIFEST_PATH = "manifest.json";

export type SportImageManifest = Record<string, string>;

/**
 * Retrieves the persisted sport image mappings from the sport-images bucket.
 */
export async function getSportImageManifest(): Promise<SportImageManifest> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {};
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(SPORT_IMAGES_BUCKET)
      .download(MANIFEST_PATH);

    if (error || !data) {
      return {};
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch (err) {
    console.warn("[sportImageStorage] Could not read manifest:", err);
    return {};
  }
}

/**
 * Updates the sport image manifest with a new URL or removes it if null.
 */
export async function updateSportImageManifest(
  sportSlug: string,
  imageUrl: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!isValidSportSlug(sportSlug)) {
    return {
      success: false,
      error: `Invalid or unrecognized sport identifier '${sportSlug}'.`,
    };
  }

  const cleanSlug = sportSlug.trim().toLowerCase();

  try {
    const supabase = createAdminClient();
    const current = await getSportImageManifest();

    if (imageUrl) {
      current[cleanSlug] = imageUrl;
    } else {
      delete current[cleanSlug];
    }

    const buffer = Buffer.from(JSON.stringify(current, null, 2), "utf-8");
    const { error } = await supabase.storage
      .from(SPORT_IMAGES_BUCKET)
      .upload(MANIFEST_PATH, buffer, {
        upsert: true,
        contentType: "application/json",
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Validates and uploads a sport image to the sport-images bucket.
 */
export async function uploadSportImage(
  sportSlug: string,
  fileBuffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  // 0. Validate sport slug against canonical catalog and path-traversal rules
  if (!isValidSportSlug(sportSlug)) {
    return {
      success: false,
      error: `Invalid or unrecognized sport identifier '${sportSlug}'.`,
    };
  }

  const cleanSlug = sportSlug.trim().toLowerCase();

  // 1. Validate MIME type
  const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!allowedMime.includes(mimeType.toLowerCase())) {
    return {
      success: false,
      error: `Invalid file type '${mimeType}'. Only JPEG, PNG, and WebP images are permitted.`,
    };
  }

  // 2. Validate file size (max 5 MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (fileBuffer.length > MAX_SIZE) {
    return {
      success: false,
      error: `File size exceeds the 5MB limit (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB uploaded).`,
    };
  }

  // 3. Determine file extension
  let ext = "jpg";
  if (mimeType.includes("png")) ext = "png";
  else if (mimeType.includes("webp")) ext = "webp";
  else if (originalName.toLowerCase().endsWith(".jpeg")) ext = "jpeg";

  const storagePath = `uploads/${cleanSlug}-${Date.now()}.${ext}`;

  try {
    const supabase = createAdminClient();
    const { error: uploadError } = await supabase.storage
      .from(SPORT_IMAGES_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from(SPORT_IMAGES_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Update manifest
    await updateSportImageManifest(sportSlug, publicUrl);

    return { success: true, url: publicUrl };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

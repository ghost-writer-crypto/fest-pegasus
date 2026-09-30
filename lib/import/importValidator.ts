/**
 * PEGASUS — Festival Data Ingestion Validator
 * Performs Level 1 (row-level) and Level 2 (cross-dataset & read-only DB conflict) validation.
 */

import {
  validateAndPrepareParticipant,
  OFFICIAL_TEAM_CODES,
  OFFICIAL_DIVISION_CODES,
} from "@/lib/repositories/participantRepository";
import type {
  RawStudentRow,
  RawEventRow,
  RawRegistrationRow,
  NormalizedStudent,
  NormalizedEvent,
  NormalizedRegistration,
  ValidationIssue,
  PreviewRow,
  ImportPreviewDataset,
} from "@/lib/types/import";
import type { PointClass, ScoringEngineType, CompetitionFormat, RegistrationStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const VALID_POINT_CLASSES: PointClass[] = ["W", "X", "Y", "Z"];
const VALID_COMPETITION_FORMATS: CompetitionFormat[] = ["final", "heats", "knockout", "round_robin", "match"];
const VALID_SCORING_ENGINES: ScoringEngineType[] = [
  "athletics",
  "standard_match",
  "arm_wrestling",
  "tug_of_war",
  "weightlifting",
  "swimming",
];
const VALID_REGISTRATION_STATUSES: RegistrationStatus[] = [
  "draft",
  "submitted",
  "approved",
  "withdrawn",
  "rejected",
];

export interface ValidationContext {
  festivalId: string;
  existingTeams?: Map<string, { id: string; code: string; name: string }>;
  existingDivisions?: Map<string, { id: string; code: string; name: string }>;
  existingSports?: Map<string, { id: string; slug: string; name: string }>;
  existingChestNumbers?: Set<string>;
  existingEventCodes?: Set<string>;
}

/**
 * Loads lookup caches and existing database records (read-only) for pre-flight validation.
 */
export async function loadValidationContext(festivalId: string): Promise<ValidationContext> {
  const context: ValidationContext = {
    festivalId,
    existingTeams: new Map(),
    existingDivisions: new Map(),
    existingSports: new Map(),
    existingChestNumbers: new Set(),
    existingEventCodes: new Set(),
  };

  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (!hasSupabaseConfig) {
    // In-memory defaults for tests / local development
    context.existingTeams = new Map([
      ["GAR", { id: "t_gar", code: "GAR", name: "Garuda" }],
      ["TOF", { id: "t_tof", code: "TOF", name: "Toofan" }],
      ["TIB", { id: "t_tib", code: "TIB", name: "Tiburon" }],
      ["TRJ", { id: "t_trj", code: "TRJ", name: "Trojan" }],
    ]);
    context.existingDivisions = new Map([
      ["bidaya", { id: "d_bid", code: "bidaya", name: "Bidaya" }],
      ["thaniya", { id: "d_tha", code: "thaniya", name: "Thaniya" }],
      ["thamheediyya", { id: "d_thm", code: "thamheediyya", name: "Thamheediyya" }],
      ["aliya", { id: "d_ali", code: "aliya", name: "Aliya" }],
      ["majestir", { id: "d_maj", code: "majestir", name: "Majestir" }],
    ]);
    context.existingSports = new Map([
      ["athletics", { id: "s_ath", slug: "athletics", name: "Athletics" }],
      ["football", { id: "s_ftb", slug: "football", name: "Football" }],
      ["cricket", { id: "s_crk", slug: "cricket", name: "Cricket" }],
      ["volleyball", { id: "s_vlb", slug: "volleyball", name: "Volleyball" }],
      ["tug-of-war", { id: "s_tow", slug: "tug-of-war", name: "Tug of War" }],
      ["badminton", { id: "s_bdm", slug: "badminton", name: "Badminton" }],
      ["chess", { id: "s_chs", slug: "chess", name: "Chess" }],
      ["swimming", { id: "s_swm", slug: "swimming", name: "Swimming" }],
    ]);
    return context;
  }

  try {
    const supabase = await createClient();

    // 1. Fetch official teams
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, code, name")
      .eq("festival_id", festivalId);
    for (const t of teamsData || []) {
      context.existingTeams?.set(t.code.toUpperCase(), t);
    }

    // 2. Fetch official divisions
    const { data: divsData } = await supabase
      .from("divisions")
      .select("id, code, name")
      .eq("festival_id", festivalId);
    for (const d of divsData || []) {
      context.existingDivisions?.set(d.code.toLowerCase(), d);
    }

    // 3. Fetch sports
    const { data: sportsData } = await supabase
      .from("sports")
      .select("id, slug, name")
      .eq("festival_id", festivalId);
    for (const s of sportsData || []) {
      context.existingSports?.set(s.slug.toLowerCase(), s);
    }

    // 4. Fetch existing chest numbers (for CREATE-ONLY conflict check)
    const { data: partData } = await supabase
      .from("participants")
      .select("chest_number")
      .eq("festival_id", festivalId)
      .not("chest_number", "is", null);
    for (const p of partData || []) {
      if (p.chest_number) context.existingChestNumbers?.add(p.chest_number.trim());
    }

    // 5. Fetch existing event codes (for CREATE-ONLY conflict check)
    const { data: evData } = await supabase
      .from("events")
      .select("code")
      .eq("festival_id", festivalId);
    for (const e of evData || []) {
      if (e.code) context.existingEventCodes?.add(e.code.trim().toLowerCase());
    }
  } catch (err) {
    console.warn("[loadValidationContext] Error loading Supabase context, using fallback defaults:", err);
  }

  return context;
}

/**
 * Validates raw rows across all 3 sheets, cross-references relationships, and builds preview dataset.
 */
export async function validateFestivalImportData(
  inputOrFestivalId:
    | string
    | {
        festivalId?: string;
        students: RawStudentRow[];
        events: RawEventRow[];
        registrations: RawRegistrationRow[];
      },
  rawStudentsOrContext?: RawStudentRow[] | ValidationContext,
  rawEvents?: RawEventRow[],
  rawRegistrations?: RawRegistrationRow[],
  contextOverride?: ValidationContext,
): Promise<ImportPreviewDataset> {
  let festivalId = "fest-2026";
  let rawStudents: RawStudentRow[] = [];
  let rawEventsList: RawEventRow[] = [];
  let rawRegistrationsList: RawRegistrationRow[] = [];
  let contextObj: ValidationContext | undefined;

  if (typeof inputOrFestivalId === "object" && inputOrFestivalId !== null) {
    festivalId = inputOrFestivalId.festivalId || "fest-2026";
    rawStudents = inputOrFestivalId.students || [];
    rawEventsList = inputOrFestivalId.events || [];
    rawRegistrationsList = inputOrFestivalId.registrations || [];
    if (rawStudentsOrContext && !Array.isArray(rawStudentsOrContext)) {
      contextObj = rawStudentsOrContext as ValidationContext;
    }
  } else {
    festivalId = inputOrFestivalId || "fest-2026";
    rawStudents = Array.isArray(rawStudentsOrContext) ? rawStudentsOrContext : [];
    rawEventsList = rawEvents || [];
    rawRegistrationsList = rawRegistrations || [];
    contextObj = contextOverride;
  }

  const context = contextObj || (await loadValidationContext(festivalId));
  const allIssues: ValidationIssue[] = [];

  // --------------------------------------------------------------------------
  // 1. VALIDATE STUDENTS
  // --------------------------------------------------------------------------
  const studentPreviews: PreviewRow<NormalizedStudent>[] = [];
  const validStudentsByChest = new Map<string, NormalizedStudent>();
  const seenChestNumbersInFile = new Set<string>();
  let autoPublicIdCounter = 1;

  for (const raw of rawStudents) {
    const rowIssues: ValidationIssue[] = [];
    const rowNumber = raw.rowNumber;

    // Use canonical validateAndPrepareParticipant domain service
    const validation = validateAndPrepareParticipant({
      name: raw.Full_Name ? String(raw.Full_Name) : null,
      chest_number: raw.Chest_Number != null ? String(raw.Chest_Number) : null,
      team_code: raw.Team_Code ? String(raw.Team_Code) : null,
      division_code: raw.Division_Code ? String(raw.Division_Code) : null,
      status: raw.Status ? String(raw.Status) : "registered",
      phone: raw.Phone != null ? String(raw.Phone) : null,
      email: raw.Email ? String(raw.Email) : null,
      date_of_birth: raw.DOB != null ? String(raw.DOB) : null,
      notes: raw.Notes ? String(raw.Notes) : null,
    });

    if (!validation.valid) {
      for (const err of validation.errors) {
        let field: string | undefined;
        if (err.toLowerCase().includes("team")) field = "Team_Code";
        else if (err.toLowerCase().includes("division")) field = "Division_Code";
        else if (err.toLowerCase().includes("chest")) field = "Chest_Number";
        else if (err.toLowerCase().includes("name")) field = "Full_Name";
        else if (err.toLowerCase().includes("status")) field = "Status";

        rowIssues.push({
          rowNumber,
          sheet: "Students",
          severity: "error",
          code: "INVALID_STUDENT_FIELD",
          message: err,
          field,
        });
      }
    }

    const chestNumber = raw.Chest_Number != null ? String(raw.Chest_Number).trim() : "";

    // Duplicate chest number in file check
    if (chestNumber) {
      if (seenChestNumbersInFile.has(chestNumber)) {
        rowIssues.push({
          rowNumber,
          sheet: "Students",
          severity: "error",
          code: "DUPLICATE_CHEST_IN_FILE",
          message: `Chest Number "${chestNumber}" is duplicated in the spreadsheet at multiple rows.`,
          field: "Chest_Number",
        });
      } else {
        seenChestNumbersInFile.add(chestNumber);
      }

      // Existing chest number in database check (CREATE-ONLY mode)
      if (context.existingChestNumbers?.has(chestNumber)) {
        rowIssues.push({
          rowNumber,
          sheet: "Students",
          severity: "error",
          code: "EXISTING_CHEST_NUMBER",
          message: `Chest Number "${chestNumber}" already exists in the festival database. Create-only import prevents overwriting existing athletes.`,
          field: "Chest_Number",
        });
      }
    }

    // Optional Public ID format check or auto-generation
    let publicId: string | undefined = undefined;
    if (raw.Public_ID != null && String(raw.Public_ID).trim() !== "") {
      const pid = String(raw.Public_ID).trim();
      if (!/^PGS-\d{4,}$/i.test(pid)) {
        rowIssues.push({
          rowNumber,
          sheet: "Students",
          severity: "warning",
          code: "NON_CANONICAL_PUBLIC_ID",
          message: `Provided Public ID "${pid}" does not follow standard PGS-XXXX format. PEGASUS will generate a canonical ID if omitted.`,
          field: "Public_ID",
        });
      } else {
        publicId = pid.toUpperCase();
      }
    } else {
      publicId = `PGS-${String(autoPublicIdCounter++).padStart(4, "0")}`;
    }

    const hasError = rowIssues.some((i) => i.severity === "error");
    const hasWarning = rowIssues.some((i) => i.severity === "warning");
    const status = hasError ? "error" : hasWarning ? "warning" : "ready";

    let normalized: NormalizedStudent | undefined = undefined;
    if (validation.valid && chestNumber) {
      const team = context.existingTeams?.get(validation.data.teamCode);
      const division = context.existingDivisions?.get(validation.data.divisionCode);

      normalized = {
        rowNumber,
        chestNumber,
        name: validation.data.name,
        teamCode: validation.data.teamCode,
        divisionCode: validation.data.divisionCode,
        publicId,
        status: validation.data.status,
        phone: validation.data.phone,
        email: validation.data.email,
        dateOfBirth: validation.data.dateOfBirth,
        notes: validation.data.notes,
        teamId: team?.id,
        divisionId: division?.id,
      };

      if (!hasError) {
        validStudentsByChest.set(chestNumber, normalized);
      }
    }

    studentPreviews.push({
      rowNumber,
      sheet: "Students",
      raw,
      normalized,
      status,
      issues: rowIssues,
    });
    allIssues.push(...rowIssues);
  }

  // --------------------------------------------------------------------------
  // 2. VALIDATE EVENTS
  // --------------------------------------------------------------------------
  const eventPreviews: PreviewRow<NormalizedEvent>[] = [];
  const validEventsByCode = new Map<string, NormalizedEvent>();
  const seenEventCodesInFile = new Set<string>();

  for (const raw of rawEventsList) {
    const rowIssues: ValidationIssue[] = [];
    const rowNumber = raw.rowNumber;

    // 1. Event Code
    const eventCode = raw.Event_Code ? String(raw.Event_Code).trim() : "";
    const eventCodeLower = eventCode.toLowerCase();
    if (!eventCode) {
      rowIssues.push({
        rowNumber,
        sheet: "Events",
        severity: "error",
        code: "MISSING_EVENT_CODE",
        message: "Event Code is required.",
        field: "Event_Code",
      });
    } else {
      if (seenEventCodesInFile.has(eventCodeLower)) {
        rowIssues.push({
          rowNumber,
          sheet: "Events",
          severity: "error",
          code: "DUPLICATE_EVENT_IN_FILE",
          message: `Event Code "${eventCode}" is duplicated in the Events sheet.`,
          field: "Event_Code",
        });
      } else {
        seenEventCodesInFile.add(eventCodeLower);
      }

      if (context.existingEventCodes?.has(eventCodeLower)) {
        rowIssues.push({
          rowNumber,
          sheet: "Events",
          severity: "error",
          code: "EXISTING_EVENT_CODE",
          message: `Event Code "${eventCode}" already exists in the festival database. Create-only mode prevents overwriting existing events.`,
          field: "Event_Code",
        });
      }
    }

    // 2. Event Name
    const eventName = raw.Event_Name ? String(raw.Event_Name).trim() : "";
    if (!eventName) {
      rowIssues.push({
        rowNumber,
        sheet: "Events",
        severity: "error",
        code: "MISSING_EVENT_NAME",
        message: "Event Name is required.",
        field: "Event_Name",
      });
    }

    // 3. Sport Slug
    const sportSlug = raw.Sport_Slug ? String(raw.Sport_Slug).trim().toLowerCase() : "";
    let sportId: string | undefined = undefined;
    if (!sportSlug) {
      rowIssues.push({
        rowNumber,
        sheet: "Events",
        severity: "error",
        code: "MISSING_SPORT_SLUG",
        message: "Sport Slug is required.",
        field: "Sport_Slug",
      });
    } else {
      const rootSlug = sportSlug.split("-")[0];
      const sport = context.existingSports?.get(sportSlug) || context.existingSports?.get(rootSlug);
      if (!sport) {
        rowIssues.push({
          rowNumber,
          sheet: "Events",
          severity: "error",
          code: "UNKNOWN_SPORT_SLUG",
          message: `Sport Slug "${sportSlug}" does not match any recognized festival sport.`,
          field: "Sport_Slug",
        });
      } else {
        sportId = sport.id;
      }
    }

    // 4. Point Class
    const rawPointClass = raw.Point_Class ? String(raw.Point_Class).trim().toUpperCase() as PointClass : "W";
    if (!VALID_POINT_CLASSES.includes(rawPointClass)) {
      rowIssues.push({
        rowNumber,
        sheet: "Events",
        severity: "error",
        code: "INVALID_POINT_CLASS",
        message: `Point Class "${raw.Point_Class}" is invalid. Expected one of: ${VALID_POINT_CLASSES.join(", ")}.`,
        field: "Point_Class",
      });
    }

    // 5. Division Code (optional for General events)
    const rawDivCode = raw.Division_Code ? String(raw.Division_Code).trim().toLowerCase() : "";
    let divisionCode: "bidaya" | "thaniya" | "thamheediyya" | "aliya" | "majestir" | null = null;
    let divisionId: string | undefined = undefined;
    let isGeneralEvent = true;

    if (rawDivCode && rawDivCode !== "general" && rawDivCode !== "none" && rawDivCode !== "all") {
      if (!OFFICIAL_DIVISION_CODES.includes(rawDivCode as any)) {
        rowIssues.push({
          rowNumber,
          sheet: "Events",
          severity: "error",
          code: "INVALID_DIVISION_CODE",
          message: `Division Code "${rawDivCode}" is invalid. Expected one of: ${OFFICIAL_DIVISION_CODES.join(", ")}, or blank for General events.`,
          field: "Division_Code",
        });
      } else {
        divisionCode = rawDivCode as any;
        isGeneralEvent = false;
        const div = context.existingDivisions?.get(rawDivCode);
        divisionId = div?.id;
      }
    }

    // 6. Competition Type / Format
    const rawCompType = raw.Competition_Type ? String(raw.Competition_Type).trim().toLowerCase() as CompetitionFormat : "final";
    if (!VALID_COMPETITION_FORMATS.includes(rawCompType)) {
      rowIssues.push({
        rowNumber,
        sheet: "Events",
        severity: "error",
        code: "INVALID_COMPETITION_TYPE",
        message: `Competition Type "${raw.Competition_Type}" is invalid. Expected: ${VALID_COMPETITION_FORMATS.join(", ")}.`,
        field: "Competition_Type",
      });
    }

    // 7. Scoring Engine
    const rawScoring = raw.Scoring_Engine ? String(raw.Scoring_Engine).trim().toLowerCase() as ScoringEngineType : "athletics";
    if (!VALID_SCORING_ENGINES.includes(rawScoring)) {
      rowIssues.push({
        rowNumber,
        sheet: "Events",
        severity: "error",
        code: "INVALID_SCORING_ENGINE",
        message: `Scoring Engine "${raw.Scoring_Engine}" is invalid. Expected: ${VALID_SCORING_ENGINES.join(", ")}.`,
        field: "Scoring_Engine",
      });
    }

    // 8. Quotas
    const maxPerTeam = raw.Max_Per_Team != null && String(raw.Max_Per_Team).trim() !== ""
      ? parseInt(String(raw.Max_Per_Team), 10)
      : 2;
    if (isNaN(maxPerTeam) || maxPerTeam < 1) {
      rowIssues.push({
        rowNumber,
        sheet: "Events",
        severity: "error",
        code: "INVALID_MAX_PER_TEAM",
        message: "Max_Per_Team must be a positive integer >= 1.",
        field: "Max_Per_Team",
      });
    }

    const substitutesPerTeam = raw.Substitutes_Per_Team != null && String(raw.Substitutes_Per_Team).trim() !== ""
      ? parseInt(String(raw.Substitutes_Per_Team), 10)
      : 0;
    if (isNaN(substitutesPerTeam) || substitutesPerTeam < 0) {
      rowIssues.push({
        rowNumber,
        sheet: "Events",
        severity: "error",
        code: "INVALID_SUBSTITUTES_PER_TEAM",
        message: "Substitutes_Per_Team must be an integer >= 0.",
        field: "Substitutes_Per_Team",
      });
    }

    // 9. Rules JSON parsing
    let parsedRules: Record<string, unknown> = {};
    if (raw.Rules_JSON != null && String(raw.Rules_JSON).trim() !== "") {
      if (typeof raw.Rules_JSON === "object") {
        parsedRules = raw.Rules_JSON as Record<string, unknown>;
      } else {
        try {
          parsedRules = JSON.parse(String(raw.Rules_JSON));
        } catch (jsonErr) {
          rowIssues.push({
            rowNumber,
            sheet: "Events",
            severity: "error",
            code: "MALFORMED_RULES_JSON",
            message: `Rules_JSON contains invalid JSON syntax: ${(jsonErr as Error).message}`,
            field: "Rules_JSON",
          });
        }
      }
    }

    const hasError = rowIssues.some((i) => i.severity === "error");
    const hasWarning = rowIssues.some((i) => i.severity === "warning");
    const status = hasError ? "error" : hasWarning ? "warning" : "ready";

    let normalized: NormalizedEvent | undefined = undefined;
    if (!hasError && eventCode && eventName) {
      normalized = {
        rowNumber,
        eventCode,
        name: eventName,
        sportSlug,
        pointClass: rawPointClass,
        divisionCode,
        isGeneralEvent,
        competitionType: rawCompType,
        scoringEngine: rawScoring,
        maxPerTeam,
        substitutesPerTeam,
        rules: parsedRules,
        sportId,
        divisionId,
      };
      validEventsByCode.set(eventCode.toLowerCase(), normalized);
    }

    eventPreviews.push({
      rowNumber,
      sheet: "Events",
      raw,
      normalized,
      status,
      issues: rowIssues,
    });
    allIssues.push(...rowIssues);
  }

  // --------------------------------------------------------------------------
  // 3. VALIDATE REGISTRATIONS & CROSS-DATASET LINKAGES
  // --------------------------------------------------------------------------
  const regPreviews: PreviewRow<NormalizedRegistration>[] = [];
  const seenRegistrationsInFile = new Set<string>();
  const teamRosterCounts = new Map<string, number>(); // Key: `${teamCode}:${eventCode}` -> count

  for (const raw of rawRegistrationsList) {
    const rowIssues: ValidationIssue[] = [];
    const rowNumber = raw.rowNumber;

    const chestNumber = raw.Chest_Number != null ? String(raw.Chest_Number).trim() : "";
    const eventCode = raw.Event_Code ? String(raw.Event_Code).trim() : "";

    // 1. Validate Chest Number Reference
    if (!chestNumber) {
      rowIssues.push({
        rowNumber,
        sheet: "Registrations",
        severity: "error",
        code: "MISSING_CHEST_NUMBER",
        message: "Chest Number is required for registration.",
        field: "Chest_Number",
      });
    }

    // 2. Validate Event Code Reference
    if (!eventCode) {
      rowIssues.push({
        rowNumber,
        sheet: "Registrations",
        severity: "error",
        code: "MISSING_EVENT_CODE",
        message: "Event Code is required for registration.",
        field: "Event_Code",
      });
    }

    // 3. Resolve Student Linkage from Students sheet
    const student = validStudentsByChest.get(chestNumber);
    if (chestNumber && !student) {
      rowIssues.push({
        rowNumber,
        sheet: "Registrations",
        severity: "error",
        code: "STUDENT_NOT_FOUND",
        message: `Chest Number "${chestNumber}" was not found in the valid Students sheet.`,
        field: "Chest_Number",
      });
    }

    // 4. Resolve Event Linkage from Events sheet
    const event = validEventsByCode.get(eventCode.toLowerCase());
    if (eventCode && !event) {
      rowIssues.push({
        rowNumber,
        sheet: "Registrations",
        severity: "error",
        code: "EVENT_NOT_FOUND",
        message: `Event Code "${eventCode}" was not found in the valid Events sheet.`,
        field: "Event_Code",
      });
    }

    // 5. Duplicate Registration Check in Workbook
    if (chestNumber && eventCode) {
      const regKey = `${chestNumber}::${eventCode.toLowerCase()}`;
      if (seenRegistrationsInFile.has(regKey)) {
        rowIssues.push({
          rowNumber,
          sheet: "Registrations",
          severity: "error",
          code: "DUPLICATE_REGISTRATION_IN_FILE",
          message: `Athlete (Chest #${chestNumber}) is registered for event "${eventCode}" multiple times in the spreadsheet.`,
        });
      } else {
        seenRegistrationsInFile.add(regKey);
      }
    }

    // 6. Academic Division Compatibility Check
    if (student && event && !event.isGeneralEvent && event.divisionCode) {
      if (student.divisionCode !== event.divisionCode) {
        rowIssues.push({
          rowNumber,
          sheet: "Registrations",
          severity: "error",
          code: "DIVISION_MISMATCH",
          message: `Academic division mismatch: Athlete is in "${student.divisionCode}", but event "${event.name}" requires "${event.divisionCode}".`,
        });
      }
    }

    // 7. Team House Quota Verification
    if (student && event) {
      const quotaKey = `${student.teamCode}:${event.eventCode.toLowerCase()}`;
      const currentTeamCount = teamRosterCounts.get(quotaKey) || 0;
      const allowedTotal = event.maxPerTeam;

      if (currentTeamCount + 1 > allowedTotal) {
        rowIssues.push({
          rowNumber,
          sheet: "Registrations",
          severity: "warning",
          code: "TEAM_QUOTA_EXCEEDED",
          message: `Team "${student.teamCode}" quota warning: Exceeds team roster quota (${allowedTotal}) for event "${event.name}".`,
        });
      }
      teamRosterCounts.set(quotaKey, currentTeamCount + 1);
    }

    // 8. Registration Status (default: 'approved' for bulk ingestion)
    let status: RegistrationStatus = "approved";
    if (raw.Status != null && String(raw.Status).trim() !== "") {
      const rawStatus = String(raw.Status).trim().toLowerCase() as RegistrationStatus;
      if (VALID_REGISTRATION_STATUSES.includes(rawStatus)) {
        status = rawStatus;
      } else {
        rowIssues.push({
          rowNumber,
          sheet: "Registrations",
          severity: "error",
          code: "INVALID_REGISTRATION_STATUS",
          message: `Status "${raw.Status}" is invalid. Expected: ${VALID_REGISTRATION_STATUSES.join(", ")}.`,
          field: "Status",
        });
      }
    }

    // 9. Optional Seed Number
    let seedNumber: number | null = null;
    if (raw.Seed_Number != null && String(raw.Seed_Number).trim() !== "") {
      const parsedSeed = parseInt(String(raw.Seed_Number), 10);
      if (!isNaN(parsedSeed) && parsedSeed >= 1) {
        seedNumber = parsedSeed;
      }
    }

    const hasError = rowIssues.some((i) => i.severity === "error");
    const hasWarning = rowIssues.some((i) => i.severity === "warning");
    const regStatus = hasError ? "error" : hasWarning ? "warning" : "ready";

    let normalized: NormalizedRegistration | undefined = undefined;
    if (chestNumber && eventCode && student && event) {
      normalized = {
        rowNumber,
        chestNumber,
        eventCode: event.eventCode,
        status,
        seedNumber,
        participantName: student.name,
        teamCode: student.teamCode,
        divisionCode: student.divisionCode,
        eventName: event.name,
        participantId: student.publicId,
        eventId: event.eventCode,
      };
    }

    regPreviews.push({
      rowNumber,
      sheet: "Registrations",
      raw,
      normalized,
      status: regStatus,
      issues: rowIssues,
    });
    allIssues.push(...rowIssues);
  }

  // --------------------------------------------------------------------------
  // 4. AGGREGATE PREVIEW DATASET
  // --------------------------------------------------------------------------
  const studentErrors = studentPreviews.filter((p) => p.status === "error").length;
  const studentWarnings = studentPreviews.filter((p) => p.status === "warning").length;
  const studentReady = studentPreviews.filter((p) => p.status === "ready").length;

  const eventErrors = eventPreviews.filter((p) => p.status === "error").length;
  const eventWarnings = eventPreviews.filter((p) => p.status === "warning").length;
  const eventReady = eventPreviews.filter((p) => p.status === "ready").length;

  const regErrors = regPreviews.filter((p) => p.status === "error").length;
  const regWarnings = regPreviews.filter((p) => p.status === "warning").length;
  const regReady = regPreviews.filter((p) => p.status === "ready").length;

  const totalErrors = studentErrors + eventErrors + regErrors;
  const totalWarnings = studentWarnings + eventWarnings + regWarnings;
  const totalReady = studentReady + eventReady + regReady;

  return {
    festivalId,
    isValid: totalErrors === 0,
    summary: {
      totalStudents: rawStudents.length,
      totalEvents: rawEventsList.length,
      totalRegistrations: rawRegistrationsList.length,
      totalReady,
      totalWarnings,
      totalErrors,
    },
    sheets: {
      students: {
        sheetName: "Students",
        totalRows: rawStudents.length,
        readyCount: studentReady,
        warningCount: studentWarnings,
        errorCount: studentErrors,
        rows: studentPreviews,
      },
      events: {
        sheetName: "Events",
        totalRows: rawEventsList.length,
        readyCount: eventReady,
        warningCount: eventWarnings,
        errorCount: eventErrors,
        rows: eventPreviews,
      },
      registrations: {
        sheetName: "Registrations",
        totalRows: rawRegistrationsList.length,
        readyCount: regReady,
        warningCount: regWarnings,
        errorCount: regErrors,
        rows: regPreviews,
      },
    },
    allIssues,
  };
}

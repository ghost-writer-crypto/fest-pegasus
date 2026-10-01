"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface HeroMediaSlide {
  id: string;
  tag: string;
  title: string;
  image: string;
  aspectRatio: string;
  resolution: string;
  status: "active" | "staged" | "archived";
}

const INITIAL_SLIDES: HeroMediaSlide[] = [
  {
    id: "slide-campus",
    tag: "SLIDE 01",
    title: "Campus Arena Complex (Aerial)",
    image: "/images/hero/campus-aerial.jpg",
    aspectRatio: "16:9",
    resolution: "1920 × 1080",
    status: "active",
  },
  {
    id: "slide-turf",
    tag: "SLIDE 02",
    title: "Arena Turf Under Tournament Lights",
    image: "/images/hero/football-arena.jpg",
    aspectRatio: "16:9",
    resolution: "1920 × 1080",
    status: "active",
  },
  {
    id: "slide-track",
    tag: "SLIDE 03",
    title: "Championship Track & Field Stadium",
    image: "/images/hero/track-stadium.jpg",
    aspectRatio: "16:9",
    resolution: "1920 × 1080",
    status: "active",
  },
  {
    id: "slide-trophy",
    tag: "SLIDE 04",
    title: "House Championship Shield & Trophy",
    image: "/images/hero/championship-trophy.jpg",
    aspectRatio: "16:9",
    resolution: "1920 × 1080",
    status: "active",
  },
];

export default function AdminHeroMediaClient() {
  const [slides, setSlides] = useState<HeroMediaSlide[]>(INITIAL_SLIDES);
  const [selectedTarget, setSelectedTarget] = useState<string>("slide-campus");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadFileSize, setUploadFileSize] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadFileName(file.name);
      setUploadFileSize((file.size / (1024 * 1024)).toFixed(2) + " MB");
      setIsSuccess(false);
    }
  };

  const handleStageImage = () => {
    if (!previewUrl) return;

    setSlides((prev) =>
      prev.map((s) =>
        s.id === selectedTarget
          ? {
              ...s,
              image: previewUrl,
              status: "staged",
              title: uploadFileName ? `Uploaded: ${uploadFileName}` : s.title,
            }
          : s
      )
    );
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 5000);
  };

  return (
    <section
      id="hero-media-manager"
      className="pegasus-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span className="zenith-kicker" style={{ margin: 0 }}>
            06 // HERO MEDIA & BRAND ASSET MANAGER
          </span>
          <h2
            style={{
              margin: "6px 0 0",
              fontSize: "20px",
              fontWeight: 850,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Homepage Hero Carousel Staging
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)", maxWidth: "700px" }}>
            Upload, inspect, and stage 16:9 cinematic visual assets for the image-first public ZENITHROW homepage entrance.
          </p>
        </div>

        <span
          className="pegasus-status pegasus-status--published"
          style={{ fontSize: "11px", padding: "4px 10px" }}
        >
          <span className="pegasus-status__dot" />
          4 SLIDES ACTIVE
        </span>
      </div>

      {/* Current Hero Slides Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
        }}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "var(--radius-card, 18px)",
              border: `1px solid ${selectedTarget === slide.id ? "var(--primary)" : "var(--glass-border)"}`,
              background: "var(--glass-bg-subtle)",
              overflow: "hidden",
              boxShadow: "var(--glass-shadow)",
              transition: "border-color 160ms ease, transform 160ms ease",
              cursor: "pointer",
            }}
            onClick={() => setSelectedTarget(slide.id)}
          >
            {/* Slide Thumbnail */}
            <div style={{ position: "relative", width: "100%", height: "140px", background: "#000" }}>
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                style={{ objectFit: "cover" }}
                sizes="(max-width: 768px) 100vw, 300px"
              />
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  left: "8px",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                  background: "rgba(0, 0, 0, 0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#FFF",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 750,
                }}
              >
                {slide.tag}
              </div>

              <div
                style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "8px",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                  background: "rgba(0, 0, 0, 0.7)",
                  backdropFilter: "blur(8px)",
                  color: "rgba(255, 255, 255, 0.8)",
                  fontSize: "9px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {slide.aspectRatio} • {slide.resolution}
              </div>
            </div>

            {/* Slide Meta */}
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <strong style={{ fontSize: "13px", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {slide.title}
              </strong>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Slot #{idx + 1}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: slide.status === "staged" ? "var(--primary)" : "var(--secondary)",
                  }}
                >
                  {slide.status === "staged" ? "● STAGED PREVIEW" : "● LIVE ACTIVE"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Gap Dropzone */}
      <div
        style={{
          border: "2px dashed var(--glass-border)",
          borderRadius: "var(--radius-card, 18px)",
          background: "var(--glass-bg)",
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "14px",
          position: "relative",
          backdropFilter: "var(--glass-blur)",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            display: "grid",
            placeItems: "center",
            color: "var(--primary)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div>
          <strong style={{ fontSize: "15px", display: "block", color: "var(--text-primary)" }}>
            Upload Hero Carousel Replacement Asset
          </strong>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
            Drag and drop high-resolution 16:9 imagery here, or browse local files. Recommended: 1920×1080 (PNG, JPEG, WebP).
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="pegasus-select"
            style={{ width: "auto", minHeight: "38px", fontSize: "12px", padding: "0 12px" }}
          >
            {slides.map((s, i) => (
              <option key={s.id} value={s.id}>
                Target: Slot #{i + 1} ({s.tag} — {s.title})
              </option>
            ))}
          </select>

          <button
            type="button"
            className="pegasus-button pegasus-button--subtle"
            style={{ minHeight: "38px", fontSize: "12px" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <span>📁</span> Browse Local Files
          </button>
        </div>

        {/* Selected File Staging Card */}
        {previewUrl && (
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "14px 18px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--primary)",
              background: "var(--surface-raised)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative", width: "48px", height: "32px", borderRadius: "4px", overflow: "hidden" }}>
                <Image src={previewUrl} alt="Preview" fill style={{ objectFit: "cover" }} />
              </div>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 750, color: "var(--text-primary)", display: "block" }}>
                  {uploadFileName}
                </span>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  {uploadFileSize} • Target Slot: {slides.find((s) => s.id === selectedTarget)?.tag}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="pegasus-button pegasus-button--primary"
              style={{ minHeight: "34px", padding: "0 14px", fontSize: "11px" }}
              onClick={handleStageImage}
            >
              Stage Asset ↗
            </button>
          </div>
        )}

        {isSuccess && (
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-pill)",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              color: "#22c55e",
              fontSize: "12px",
              fontWeight: 750,
            }}
          >
            ✓ Hero asset staged for live carousel sequence in target slot.
          </div>
        )}
      </div>
    </section>
  );
}

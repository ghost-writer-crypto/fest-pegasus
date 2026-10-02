"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { UploadCloud, CheckCircle2, RotateCcw, Sparkles, FolderOpen, Image as ImageIcon } from "lucide-react";

export interface HeroMediaSlide {
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
    image: "/images/hero/zenithrow-arena-aerial.png",
    aspectRatio: "2.19:1",
    resolution: "2560 × 1170",
    status: "active",
  },
  {
    id: "slide-turf",
    tag: "SLIDE 02",
    title: "Official Logo Unveiled by Sports Minister",
    image: "/images/hero/zenithrow-logo-unveiled.png",
    aspectRatio: "2.19:1",
    resolution: "2560 × 1170",
    status: "active",
  },
  {
    id: "slide-track",
    tag: "SLIDE 03",
    title: "Championship Track & Field Stadium",
    image: "/images/hero/track-stadium.jpg",
    aspectRatio: "2.19:1",
    resolution: "2560 × 1170",
    status: "active",
  },
  {
    id: "slide-trophy",
    tag: "SLIDE 04",
    title: "House Championship Shield & Trophy",
    image: "/images/hero/championship-trophy.jpg",
    aspectRatio: "2.19:1",
    resolution: "2560 × 1170",
    status: "active",
  },
];

const PRESET_REAL_PHOTOS = [
  {
    name: "Campus Arena Aerial (Turf Banner)",
    url: "/images/hero/zenithrow-arena-aerial.png",
  },
  {
    name: "Minister Logo Unveiling Launch",
    url: "/images/hero/zenithrow-logo-unveiled.png",
  },
  {
    name: "Arena Turf Under Lights",
    url: "/images/hero/football-arena.jpg",
  },
  {
    name: "Championship Trophy & Shield",
    url: "/images/hero/championship-trophy.jpg",
  },
];

export default function AdminHeroMediaClient() {
  const [slides, setSlides] = useState<HeroMediaSlide[]>(INITIAL_SLIDES);
  const [selectedTarget, setSelectedTarget] = useState<string>("slide-campus");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadFileSize, setUploadFileSize] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("✓ Hero asset staged for live carousel sequence in target slot.");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persisted slides from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("zenithrow_hero_slides");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlides(parsed);
          setSelectedTarget(parsed[0].id);
        }
      }
    } catch (e) {
      console.warn("Unable to load stored hero slides", e);
    }
  }, []);

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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadFileName(file.name);
      setUploadFileSize((file.size / (1024 * 1024)).toFixed(2) + " MB");
      setIsSuccess(false);
    }
  };

  const handleStageImage = (customUrl?: string, customTitle?: string) => {
    const targetUrl = customUrl || previewUrl;
    if (!targetUrl) return;

    const updated = slides.map((s) =>
      s.id === selectedTarget
        ? {
            ...s,
            image: targetUrl,
            status: "staged" as const,
            title: customTitle || (uploadFileName ? `Uploaded: ${uploadFileName}` : s.title),
          }
        : s
    );

    setSlides(updated);
    setPreviewUrl(null);
    setSuccessMessage(`✓ Hero asset staged for target slot: ${slides.find((s) => s.id === selectedTarget)?.tag}`);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 5000);
  };

  const handlePublishAll = () => {
    const published = slides.map((s) => ({ ...s, status: "active" as const }));
    setSlides(published);
    try {
      localStorage.setItem("zenithrow_hero_slides", JSON.stringify(published));
      window.dispatchEvent(new CustomEvent("zenithrow_hero_updated"));
      setSuccessMessage("✓ All staged hero assets successfully published to live public homepage!");
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all homepage hero slides to official ZENITHROW defaults?")) {
      setSlides(INITIAL_SLIDES);
      setSelectedTarget(INITIAL_SLIDES[0].id);
      setPreviewUrl(null);
      try {
        localStorage.removeItem("zenithrow_hero_slides");
        window.dispatchEvent(new CustomEvent("zenithrow_hero_updated"));
        setSuccessMessage("✓ Restored official ZENITHROW defaults for homepage carousel.");
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 5000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const activeCount = slides.filter((s) => s.status === "active").length;
  const stagedCount = slides.filter((s) => s.status === "staged").length;

  return (
    <section id="hero-media-manager" className="zenithrow-hero-staging">
      <style>{`
        .zenithrow-hero-staging {
          --line: rgba(255, 255, 255, 0.085);
          --line2: rgba(255, 255, 255, 0.16);
          --red: #e53935;
          --green: #22c55e;
          --blue: #2563eb;
          --muted: #8994a4;
          --muted2: #64748b;
          --fg: #f5f7fa;
          background: linear-gradient(145deg, rgba(20, 24, 30, 0.92), rgba(10, 12, 15, 0.98));
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 26px 28px;
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          gap: 22px;
          font-family: Inter, system-ui, -apple-system, sans-serif;
          color: var(--fg);
        }

        .zenithrow-hero-staging .kicker {
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.16em;
          color: var(--red);
          text-transform: uppercase;
          margin-bottom: 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .zenithrow-hero-staging .title {
          font-size: 22px;
          font-weight: 850;
          letter-spacing: -0.025em;
          margin: 0 0 6px;
          color: #fff;
          text-transform: uppercase;
        }

        .zenithrow-hero-staging .subtitle {
          margin: 0;
          font-size: 13px;
          color: var(--muted);
          max-width: 720px;
          line-height: 1.55;
        }

        .zenithrow-hero-staging .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 9px;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.25);
          color: #86efac;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }
        .zenithrow-hero-staging .status-pill i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
          display: inline-block;
        }

        .zenithrow-hero-staging .slides-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }

        .zenithrow-hero-staging .slide-card {
          display: flex;
          flex-direction: column;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: #0d1014;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          transition: all 0.18s ease;
          cursor: pointer;
        }
        .zenithrow-hero-staging .slide-card:hover {
          border-color: var(--line2);
          transform: translateY(-2px);
        }
        .zenithrow-hero-staging .slide-card.active {
          border-color: var(--red);
          box-shadow: 0 0 0 1px rgba(229, 57, 53, 0.35), 0 12px 30px rgba(229, 57, 53, 0.15);
        }

        .zenithrow-hero-staging .dropzone {
          border: 2px dashed var(--line2);
          border-radius: 16px;
          background: rgba(14, 17, 22, 0.6);
          padding: 30px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 14px;
          transition: border-color 0.18s ease, background 0.18s ease;
        }
        .zenithrow-hero-staging .dropzone.dragover {
          border-color: var(--red);
          background: rgba(229, 57, 53, 0.04);
        }

        .zenithrow-hero-staging .btn {
          height: 36px;
          border-radius: 9px;
          border: 1px solid var(--line);
          background: #11151a;
          color: #dce2ea;
          padding: 0 14px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.18s ease;
          text-decoration: none;
        }
        .zenithrow-hero-staging .btn:hover:not(:disabled) {
          background: #191f26;
          border-color: var(--line2);
          color: #fff;
          transform: translateY(-1px);
        }
        .zenithrow-hero-staging .btn-primary {
          background: var(--red) !important;
          border-color: var(--red) !important;
          color: #fff !important;
        }
        .zenithrow-hero-staging .btn-primary:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .zenithrow-hero-staging select {
          height: 36px;
          background: #11151a;
          border: 1px solid var(--line);
          border-radius: 9px;
          color: #fff;
          font-size: 11px;
          padding: 0 12px;
          font-weight: 700;
        }
        .zenithrow-hero-staging select:focus {
          outline: none;
          border-color: var(--blue);
        }

        .zenithrow-hero-staging .ratio-note {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 1px solid rgba(229, 57, 53, 0.24);
          border-radius: 12px;
          background: linear-gradient(90deg, rgba(229, 57, 53, 0.08), rgba(37, 99, 235, 0.05));
          font-size: 12px;
        }
        .zenithrow-hero-staging .ratio-note strong {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #fff;
        }
        .zenithrow-hero-staging .ratio-note span {
          color: #94a3b8;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        @media (max-width: 768px) {
          .zenithrow-hero-staging {
            padding: 18px 16px;
          }
          .zenithrow-hero-staging .ratio-note {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <div className="kicker">06 • HERO MEDIA &amp; BRAND ASSET MANAGER</div>
          <h2 className="title">Homepage Hero Carousel Staging</h2>
          <p className="subtitle">
            Upload, inspect, and stage 2.19:1 cinematic visual assets for the image-first public ZENITHROW homepage entrance.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span className="status-pill">
            <i />
            <span>{activeCount} SLIDES ACTIVE</span>
            {stagedCount > 0 && <span style={{ color: "#ff6b66", marginLeft: "4px" }}>• {stagedCount} STAGED</span>}
          </span>
        </div>
      </div>

      {/* Current Hero Slides Grid */}
      <div className="slides-grid">
        {slides.map((slide, idx) => {
          const isSelected = selectedTarget === slide.id;
          return (
            <div
              key={slide.id}
              className={`slide-card ${isSelected ? "active" : ""}`}
              onClick={() => setSelectedTarget(slide.id)}
            >
              {/* Slide Thumbnail with 2.19:1 Wide Aspect Ratio */}
              <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 7.4", background: "#050608" }}>
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
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: "rgba(0, 0, 0, 0.72)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    color: "#FFF",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                  }}
                >
                  {slide.tag}
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "8px",
                    padding: "2px 7px",
                    borderRadius: "5px",
                    background: "rgba(0, 0, 0, 0.72)",
                    backdropFilter: "blur(6px)",
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: "9px",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {slide.aspectRatio} • {slide.resolution}
                </div>
              </div>

              {/* Slide Meta */}
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <strong style={{ fontSize: "12px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {slide.title}
                </strong>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>
                    Slot #{idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 850,
                      textTransform: "uppercase",
                      color: slide.status === "staged" ? "#ff6b66" : "#86efac",
                    }}
                  >
                    {slide.status === "staged" ? "● STAGED PREVIEW" : "● LIVE ACTIVE"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Dropzone */}
      <div
        className={`dropzone ${isDragOver ? "dragover" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
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
            borderRadius: "12px",
            background: "#161b22",
            border: "1px solid var(--line2)",
            display: "grid",
            placeItems: "center",
            color: "var(--red)",
          }}
        >
          <UploadCloud size={24} />
        </div>

        <div>
          <strong style={{ fontSize: "14px", display: "block", color: "#fff" }}>
            Upload Hero Carousel Replacement Asset
          </strong>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
            Drag and drop high-resolution 2.19:1 imagery here, or browse local files. Recommended: 2560 × 1170 (PNG, JPEG, WebP).
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
          >
            {slides.map((s, i) => (
              <option key={s.id} value={s.id}>
                Target: Slot #{i + 1} ({s.tag} — {s.title})
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen size={14} />
            <span>Browse Local Files</span>
          </button>
        </div>

        {/* Preset Authentic Festival Photos Selector */}
        <div style={{ marginTop: "4px", width: "100%", maxWidth: "600px" }}>
          <div style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: "8px" }}>
            Quick Select Authentic Event Photos:
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
            {PRESET_REAL_PHOTOS.map((preset) => (
              <button
                key={preset.url}
                type="button"
                className="btn"
                style={{ height: "26px", fontSize: "10px", padding: "0 10px" }}
                onClick={() => handleStageImage(preset.url, preset.name)}
              >
                <ImageIcon size={11} />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected File Staging Card */}
        {previewUrl && (
          <div
            style={{
              width: "100%",
              maxWidth: "540px",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid var(--red)",
              background: "#12161d",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <div style={{ position: "relative", width: "54px", height: "32px", borderRadius: "5px", overflow: "hidden", flexShrink: 0 }}>
                <Image src={previewUrl} alt="Preview" fill style={{ objectFit: "cover" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#fff", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {uploadFileName}
                </span>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  {uploadFileSize} • Target Slot: {slides.find((s) => s.id === selectedTarget)?.tag}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ height: "32px", padding: "0 12px", fontSize: "11px", flexShrink: 0 }}
              onClick={() => handleStageImage()}
            >
              <span>Stage Asset ↗</span>
            </button>
          </div>
        )}

        {isSuccess && (
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "9px",
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              color: "#86efac",
              fontSize: "12px",
              fontWeight: 750,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <CheckCircle2 size={14} />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Production Pipeline Action Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "16px 20px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.025)",
          border: "1px solid var(--line)",
        }}
      >
        <div>
          <strong style={{ fontSize: "12px", color: "#fff", display: "block" }}>
            Live Publication Authority
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            Staged media assets are isolated until promoted to the public festival carousel.
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn"
            style={{ fontSize: "11px", color: "var(--muted)" }}
            onClick={handleResetDefaults}
          >
            <RotateCcw size={12} />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: "11px" }}
            onClick={handlePublishAll}
          >
            <Sparkles size={13} />
            <span>Publish to Live Homepage</span>
          </button>
        </div>
      </div>

      {/* Ratio Standard Footer Banner */}
      <div className="ratio-note">
        <strong>Homepage Hero Standard</strong>
        <span>2560 × 1170 px • 2.19:1 cinematic wide</span>
      </div>
    </section>
  );
}

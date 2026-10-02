"use client";

import React, { useState, useRef, useCallback } from "react";

export interface AchievementItem {
  id: string;
  achievement: string;
  competition: string;
  position: number | string;
  house: string;
  festival: string;
  date: string;
  athleteName?: string;
  chestNumber?: string;
  performance?: string;
}

interface AchievementPosterModalProps {
  achievement: AchievementItem;
}

export default function AchievementPosterModal({ achievement }: AchievementPosterModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const positionLabel =
    typeof achievement.position === "number"
      ? achievement.position === 1
        ? "#1 GOLD"
        : achievement.position === 2
        ? "#2 SILVER"
        : achievement.position === 3
        ? "#3 BRONZE"
        : `#${achievement.position}`
      : String(achievement.position).toUpperCase();

  const handleDownloadPoster = useCallback(() => {
    setIsGenerating(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setIsGenerating(false);
        return;
      }

      // Background - Deep Stadium Navy
      ctx.fillStyle = "#0F2242";
      ctx.fillRect(0, 0, 1200, 1600);

      // Outer Architectural Border - Championship Gold
      ctx.strokeStyle = "#F2B84B";
      ctx.lineWidth = 14;
      ctx.strokeRect(36, 36, 1128, 1528);

      // Inner Hairline Border - Ice
      ctx.strokeStyle = "rgba(232, 237, 243, 0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(56, 56, 1088, 1488);

      // Top Banner Header
      ctx.fillStyle = "#1A3663";
      ctx.fillRect(58, 58, 1084, 160);

      // Kicker
      ctx.fillStyle = "#5B9BD5";
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      ctx.fillText("ZENITHROW / STUDENTS' SPORTS FESTIVAL 2026", 600, 115);

      ctx.fillStyle = "#F2B84B";
      ctx.font = "900 42px sans-serif";
      ctx.fillText("OFFICIAL PODIUM CERTIFICATE", 600, 175);

      // Crimson Accent Line
      ctx.fillStyle = "#E53737";
      ctx.fillRect(200, 240, 800, 6);

      // Competition Title
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 64px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(achievement.competition.toUpperCase(), 600, 360);

      // Position Medallion Background
      ctx.fillStyle = "rgba(242, 184, 75, 0.12)";
      ctx.strokeStyle = "#F2B84B";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(400, 420, 400, 110, 12);
      ctx.fill();
      ctx.stroke();

      // Position Text
      ctx.fillStyle = "#F2B84B";
      ctx.font = "900 48px monospace";
      ctx.fillText(positionLabel, 600, 495);

      // Athlete Section
      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 22px monospace";
      ctx.fillText("HONORING ATHLETE", 600, 610);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 72px sans-serif";
      ctx.fillText(achievement.athleteName?.toUpperCase() || "OFFICIAL ATHLETE", 600, 690);

      // House & Chest Number
      if (achievement.chestNumber || achievement.house) {
        ctx.fillStyle = "#5B9BD5";
        ctx.font = "bold 32px monospace";
        const metaLine = [
          achievement.chestNumber ? `CHEST #${achievement.chestNumber}` : "",
          achievement.house ? `HOUSE ${achievement.house.toUpperCase()}` : "",
        ]
          .filter(Boolean)
          .join("  //  ");
        ctx.fillText(metaLine, 600, 755);
      }

      // Performance Mark Box
      if (achievement.performance) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.strokeStyle = "rgba(232, 237, 243, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(350, 820, 500, 140, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#C9D3DF";
        ctx.font = "bold 20px monospace";
        ctx.fillText("OFFICIAL MARK / TIME", 600, 865);

        ctx.fillStyle = "#F2B84B";
        ctx.font = "900 54px monospace";
        ctx.fillText(achievement.performance, 600, 925);
      }

      // Achievement Title
      ctx.fillStyle = "#E8EDF3";
      ctx.font = "600 30px sans-serif";
      ctx.fillText(`“${achievement.achievement}”`, 600, 1050);

      // Decorative Seal
      ctx.strokeStyle = "#5B9BD5";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(600, 1200, 80, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#F2B84B";
      ctx.font = "900 36px monospace";
      ctx.fillText("P", 600, 1205);

      ctx.fillStyle = "#5B9BD5";
      ctx.font = "bold 13px monospace";
      ctx.fillText("VERIFIED ADJUDICATION", 600, 1235);

      // Bottom Metadata
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 20px monospace";
      ctx.fillText(
        `FESTIVAL: ${achievement.festival.toUpperCase()}   •   DATE: ${achievement.date.toUpperCase()}`,
        600,
        1400
      );

      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "16px monospace";
      ctx.fillText(
        "ZENITHROW OPERATING SYSTEM // AUTHORITATIVE RESULTS LIFECYCLE CERTIFIED",
        600,
        1450
      );

      // Trigger instant PNG download
      const link = document.createElement("a");
      const safeTitle = achievement.competition.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.download = `zenithrow-poster-${safeTitle}-${achievement.position}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Poster generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [achievement, positionLabel]);

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1A3663] hover:bg-[#0F2242] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xs border border-[#1A3663] transition-colors"
        >
          <span>View Poster</span>
          <span aria-hidden="true">👁</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPoster}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E53737] hover:bg-[#C92F2F] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xs transition-colors disabled:opacity-50"
        >
          <span>{isGenerating ? "Rendering..." : "Download Poster"}</span>
          <span aria-hidden="true">↓</span>
        </button>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Podium Achievement Poster"
        >
          <div className="relative w-full max-w-2xl bg-[#0F2242] text-white border-2 border-[#F2B84B] rounded-sm p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white font-mono text-sm uppercase tracking-wider rounded-xs bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close dialog"
            >
              ✕ CLOSE
            </button>

            {/* Poster Header */}
            <div className="text-center pb-6 border-b border-white/10">
              <span className="font-mono text-xs font-bold tracking-widest text-[#5B9BD5] uppercase block mb-1">
                {achievement.festival} {"//"} OFFICIAL RECORD
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F2B84B] tracking-tight">
                {achievement.competition}
              </h2>
            </div>

            {/* Poster Body */}
            <div className="py-6 flex flex-col items-center text-center gap-4">
              <div className="px-6 py-2 bg-[#F2B84B]/15 border border-[#F2B84B] text-[#F2B84B] font-mono text-lg font-black tracking-widest uppercase rounded-xs">
                {positionLabel}
              </div>

              <div className="mt-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                  Athlete Awarded
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                  {achievement.athleteName || "Official Athlete"}
                </h3>
              </div>

              {(achievement.chestNumber || achievement.house) && (
                <div className="flex items-center gap-3 font-mono text-xs text-[#5B9BD5]">
                  {achievement.chestNumber && (
                    <span className="px-2 py-0.5 bg-white/5 rounded-xs">
                      CHEST #{achievement.chestNumber}
                    </span>
                  )}
                  {achievement.house && (
                    <span className="px-2 py-0.5 bg-white/5 rounded-xs uppercase">
                      HOUSE {achievement.house}
                    </span>
                  )}
                </div>
              )}

              {achievement.performance && (
                <div className="mt-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                    Recorded Mark
                  </span>
                  <span className="text-2xl font-mono font-black text-[#F2B84B]">
                    {achievement.performance}
                  </span>
                </div>
              )}

              <p className="text-sm text-white/80 max-w-md mt-2 italic">
                “{achievement.achievement}”
              </p>

              <div className="text-xs font-mono text-white/40 mt-4">
                CERTIFIED ON {achievement.date} • CHIEF ADJUDICATOR VERIFIED
              </div>
            </div>

            {/* Poster Actions */}
            <div className="pt-6 border-t border-white/10 flex flex-wrap justify-between items-center gap-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors rounded-xs"
              >
                Close Preview
              </button>

              <button
                type="button"
                onClick={handleDownloadPoster}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E53737] hover:bg-[#C92F2F] text-white text-xs font-mono font-bold uppercase tracking-widest transition-colors rounded-xs shadow-md"
              >
                <span>{isGenerating ? "Rendering High-Res PNG..." : "Download Official Poster (.PNG)"}</span>
                <span aria-hidden="true">↓</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

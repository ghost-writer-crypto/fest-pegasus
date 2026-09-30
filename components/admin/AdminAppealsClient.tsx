"use client";

import { useState, useTransition } from "react";
import type { AdminAppealRow, AppealStatus, AppealFeeStatus } from "@/lib/types";
import { reviewAppealAction } from "@/app/admin/actions";

interface AdminAppealsClientProps {
  festivalId: string;
  initialAppeals: AdminAppealRow[];
}

export default function AdminAppealsClient({
  festivalId: _festivalId,
  initialAppeals,
}: AdminAppealsClientProps) {
  const [appeals, setAppeals] = useState<AdminAppealRow[]>(initialAppeals);
  const [filterTab, setFilterTab] = useState<"all" | "submitted" | "under_review" | "resolved">("all");
  const [selectedAppeal, setSelectedAppeal] = useState<AdminAppealRow | null>(null);

  // Review modal state
  const [decisionStatus, setDecisionStatus] = useState<"under_review" | "accepted" | "rejected" | "partially_upheld">("under_review");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [feeStatus, setFeeStatus] = useState<AppealFeeStatus>("paid");
  const [amendResult, setAmendResult] = useState(false);
  const [newRank, setNewRank] = useState<string>("");
  const [newPoints, setNewPoints] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtering
  const filteredAppeals = appeals.filter((a) => {
    if (filterTab === "all") return true;
    if (filterTab === "submitted") return a.status === "submitted";
    if (filterTab === "under_review") return a.status === "under_review";
    if (filterTab === "resolved") {
      return a.status === "accepted" || a.status === "rejected" || a.status === "partially_upheld";
    }
    return true;
  });

  const submittedCount = appeals.filter((a) => a.status === "submitted").length;
  const reviewCount = appeals.filter((a) => a.status === "under_review").length;
  const resolvedCount = appeals.filter((a) => ["accepted", "rejected", "partially_upheld"].includes(a.status)).length;

  function openReviewModal(appeal: AdminAppealRow, targetAction: "under_review" | "accepted" | "rejected" | "partially_upheld") {
    setSelectedAppeal(appeal);
    setDecisionStatus(targetAction);
    setDecisionNotes(appeal.decision_notes || "");
    setFeeStatus(appeal.fee_status || "paid");
    setAmendResult(false);
    setNewRank(appeal.resultRank != null ? String(appeal.resultRank) : "");
    setNewPoints(appeal.resultPoints != null ? String(appeal.resultPoints) : "");
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  function handleQuickMoveToReview(appeal: AdminAppealRow) {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await reviewAppealAction({
        appealId: appeal.id,
        status: "under_review",
        decisionNotes: "Appeal formally taken under investigation by Jury of Appeal.",
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update appeal status.");
        return;
      }

      setAppeals((prev) =>
        prev.map((a) =>
          a.id === appeal.id
            ? {
                ...a,
                status: "under_review",
                decision_notes: "Appeal formally taken under investigation by Jury of Appeal.",
                reviewed_at: new Date().toISOString(),
              }
            : a
        )
      );
    });
  }

  function handleSubmitDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAppeal) return;
    setErrorMessage(null);

    const correctedResult: any = amendResult
      ? {
          rank: newRank.trim() !== "" ? parseInt(newRank, 10) : null,
          points: newPoints.trim() !== "" ? parseFloat(newPoints) : undefined,
        }
      : undefined;

    startTransition(async () => {
      const res = await reviewAppealAction({
        appealId: selectedAppeal.id,
        status: decisionStatus,
        decisionNotes,
        feeStatus,
        correctedResult,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to adjudicate appeal.");
        return;
      }

      setAppeals((prev) =>
        prev.map((a) =>
          a.id === selectedAppeal.id
            ? {
                ...a,
                status: decisionStatus,
                decision_notes: decisionNotes,
                fee_status: feeStatus,
                corrected_result_payload: correctedResult ?? null,
                reviewed_at: new Date().toISOString(),
                resultRank: correctedResult?.rank !== undefined ? correctedResult.rank : a.resultRank,
                resultPoints: correctedResult?.points !== undefined ? correctedResult.points : a.resultPoints,
              }
            : a
        )
      );

      setIsModalOpen(false);
    });
  }

  const getStatusBadgeStyle = (status: AppealStatus) => {
    switch (status) {
      case "submitted":
        return { background: "rgba(255,193,7,0.15)", color: "#ffc107", border: "1px solid rgba(255,193,7,0.3)" };
      case "under_review":
        return { background: "rgba(0,188,212,0.15)", color: "#00bcd4", border: "1px solid rgba(0,188,212,0.3)" };
      case "accepted":
        return { background: "rgba(0,255,150,0.15)", color: "#00ff96", border: "1px solid rgba(0,255,150,0.3)" };
      case "partially_upheld":
        return { background: "rgba(156,39,176,0.15)", color: "#ba68c8", border: "1px solid rgba(156,39,176,0.3)" };
      case "rejected":
        return { background: "rgba(255,68,68,0.15)", color: "#ff6b6b", border: "1px solid rgba(255,68,68,0.3)" };
      default:
        return { background: "rgba(255,255,255,0.05)", color: "var(--muted)", border: "1px solid var(--border)" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Metric Highlights Banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.06em" }}>
            Total Appeals Lodged
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "4px" }}>{appeals.length}</div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>Codex Fee: ₹70 per protest</span>
        </div>

        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#ffc107", letterSpacing: "0.06em" }}>
            Pending Action
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "4px", color: "#ffc107" }}>{submittedCount}</div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>Awaiting formal review</span>
        </div>

        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#00bcd4", letterSpacing: "0.06em" }}>
            Under Investigation
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "4px", color: "#00bcd4" }}>{reviewCount}</div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>Jury of Appeal session active</span>
        </div>

        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#00ff96", letterSpacing: "0.06em" }}>
            Adjudicated / Resolved
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "4px", color: "#00ff96" }}>{resolvedCount}</div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>Official findings published</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`pegasus-button ${filterTab === "all" ? "pegasus-button--primary" : "pegasus-button--secondary"}`}
          style={{ fontSize: "13px", padding: "6px 14px" }}
        >
          All Appeals ({appeals.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("submitted")}
          className={`pegasus-button ${filterTab === "submitted" ? "pegasus-button--primary" : "pegasus-button--secondary"}`}
          style={{ fontSize: "13px", padding: "6px 14px" }}
        >
          Submitted ({submittedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("under_review")}
          className={`pegasus-button ${filterTab === "under_review" ? "pegasus-button--primary" : "pegasus-button--secondary"}`}
          style={{ fontSize: "13px", padding: "6px 14px" }}
        >
          Under Review ({reviewCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("resolved")}
          className={`pegasus-button ${filterTab === "resolved" ? "pegasus-button--primary" : "pegasus-button--secondary"}`}
          style={{ fontSize: "13px", padding: "6px 14px" }}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Error banner if action fails */}
      {errorMessage && (
        <div style={{ padding: "12px 16px", background: "rgba(255,68,68,0.15)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: "6px", color: "#ff6b6b", fontSize: "13px" }}>
          {errorMessage}
        </div>
      )}

      {/* Appeals List */}
      {filteredAppeals.length === 0 ? (
        <div className="pegasus-card" style={{ padding: "36px", textAlign: "center" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 6px" }}>No Appeals Found</h3>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
            No official protests match the selected filter.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredAppeals.map((appeal) => (
            <div key={appeal.id} className="pegasus-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "4px", ...getStatusBadgeStyle(appeal.status) }}>
                      {appeal.status.replace("_", " ")}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                      {appeal.reason_category.replace("_", " ").toUpperCase()}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--accent)" }}>
                      {appeal.eventName || appeal.eventCode || "Event"}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "17px", fontWeight: 850, margin: "2px 0 4px" }}>
                    {appeal.title}
                  </h3>

                  <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                    <span>House: <strong>{appeal.teamName || appeal.teamCode}</strong></span>
                    <span>Submitter: <strong>{appeal.submitter_name}</strong> ({appeal.submitter_role})</span>
                    <span>Lodged: <strong>{new Date(appeal.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></span>
                    <span>Fee: <strong>₹{appeal.fee_amount}</strong> ({appeal.fee_status.toUpperCase()})</span>
                  </div>
                </div>

                {/* Quick Action buttons */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {appeal.status === "submitted" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleQuickMoveToReview(appeal)}
                        className="pegasus-button pegasus-button--secondary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                        disabled={isPending}
                      >
                        Start Investigation
                      </button>
                      <button
                        type="button"
                        onClick={() => openReviewModal(appeal, "rejected")}
                        className="pegasus-button pegasus-button--subtle"
                        style={{ fontSize: "12px", padding: "6px 12px", color: "#ff6b6b" }}
                        disabled={isPending}
                      >
                        Dismiss
                      </button>
                    </>
                  )}

                  {appeal.status === "under_review" && (
                    <button
                      type="button"
                      onClick={() => openReviewModal(appeal, "accepted")}
                      className="pegasus-button pegasus-button--primary"
                      style={{ fontSize: "12px", padding: "6px 14px" }}
                      disabled={isPending}
                    >
                      Adjudicate Appeal
                    </button>
                  )}

                  {(appeal.status === "accepted" || appeal.status === "partially_upheld" || appeal.status === "rejected") && (
                    <button
                      type="button"
                      onClick={() => openReviewModal(appeal, appeal.status as "accepted" | "rejected" | "partially_upheld")}
                      className="pegasus-button pegasus-button--secondary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                      disabled={isPending}
                    >
                      View Finding
                    </button>
                  )}
                </div>
              </div>

              {/* Description Body */}
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "6px", fontSize: "13px", lineHeight: "1.5", border: "1px solid var(--border)" }}>
                <strong style={{ color: "var(--foreground)", display: "block", marginBottom: "4px" }}>Grounds for Appeal:</strong>
                {appeal.description}

                {appeal.evidence_references && appeal.evidence_references.length > 0 && (
                  <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed var(--border)", fontSize: "12px", color: "var(--muted)" }}>
                    <strong>Evidence Provided:</strong> {appeal.evidence_references.join(" • ")}
                  </div>
                )}
              </div>

              {/* Adjudication Verdict if resolved */}
              {appeal.decision_notes && (
                <div style={{ background: "rgba(0,188,212,0.05)", padding: "12px 14px", borderRadius: "6px", fontSize: "13px", border: "1px solid rgba(0,188,212,0.2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--accent)" }}>Jury of Appeal Verdict ({appeal.status.toUpperCase()}):</strong>
                    {appeal.reviewed_at && (
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                        {new Date(appeal.reviewed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} by {appeal.reviewer_name || "Admin"}
                      </span>
                    )}
                  </div>
                  <div style={{ color: "var(--foreground)", lineHeight: "1.4" }}>{appeal.decision_notes}</div>
                  {appeal.corrected_result_payload && (
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#00ff96" }}>
                      ✅ Authoritative Result Amended: Rank {String((appeal.corrected_result_payload as any)?.rank ?? "N/A")} • Points {String((appeal.corrected_result_payload as any)?.points ?? "N/A")}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review & Adjudication Modal */}
      {isModalOpen && selectedAppeal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div className="pegasus-card" style={{ width: "100%", maxWidth: "520px", padding: "24px", background: "var(--surface)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 4px" }}>
              Adjudicate Appeal: {selectedAppeal.title}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 16px" }}>
              House: {selectedAppeal.teamName || selectedAppeal.teamCode} • Event: {selectedAppeal.eventName}
            </p>

            {errorMessage && (
              <div style={{ padding: "10px", background: "rgba(255,68,68,0.15)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: "6px", color: "#ff6b6b", fontSize: "13px", marginBottom: "14px" }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitDecision} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Adjudication Decision *
                </label>
                <select
                  value={decisionStatus}
                  onChange={(e) => setDecisionStatus(e.target.value as any)}
                  className="pegasus-input"
                  style={{ width: "100%" }}
                  required
                >
                  <option value="under_review">UNDER INVESTIGATION (Keep under review)</option>
                  <option value="accepted">ACCEPTED (Uphold protest in full)</option>
                  <option value="partially_upheld">PARTIALLY UPHELD (Accept with adjusted terms)</option>
                  <option value="rejected">REJECTED / DISMISSED (Overrule protest)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Official Jury of Appeal Finding & Rationale *
                </label>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Record formal investigation findings, steward reports, and governing rules applied..."
                  className="pegasus-input"
                  style={{ width: "100%", minHeight: "85px" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Protest Fee Status (₹70)
                </label>
                <select
                  value={feeStatus}
                  onChange={(e) => setFeeStatus(e.target.value as any)}
                  className="pegasus-input"
                  style={{ width: "100%" }}
                >
                  <option value="paid">PAID (Standard collection)</option>
                  <option value="waived">WAIVED (Official waiver)</option>
                  <option value="refunded">REFUNDED (Returned upon upheld protest)</option>
                </select>
              </div>

              {/* Authoritative Result Amendment Box */}
              {(decisionStatus === "accepted" || decisionStatus === "partially_upheld") && (
                <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid var(--border)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer", color: "var(--foreground)" }}>
                    <input
                      type="checkbox"
                      checked={amendResult}
                      onChange={(e) => setAmendResult(e.target.checked)}
                    />
                    <span>Amend Authoritative Competition Result</span>
                  </label>

                  {amendResult && (
                    <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "3px" }}>
                          New Official Rank
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={newRank}
                          onChange={(e) => setNewRank(e.target.value)}
                          placeholder="e.g. 1"
                          className="pegasus-input"
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "3px" }}>
                          New Points Awarded
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={newPoints}
                          onChange={(e) => setNewPoints(e.target.value)}
                          placeholder="e.g. 15"
                          className="pegasus-input"
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                  )}
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "6px" }}>
                    Updating the result triggers dynamic championship leaderboard recalculation automatically.
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="pegasus-button pegasus-button--secondary"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pegasus-button pegasus-button--primary"
                  disabled={isPending}
                >
                  {isPending ? "Submitting Verdict..." : "Confirm & Publish Verdict"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

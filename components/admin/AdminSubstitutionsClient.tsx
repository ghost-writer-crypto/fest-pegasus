"use client";

import { useState, useTransition } from "react";
import type { AdminSubstitutionRow } from "@/lib/repositories";
import { reviewSubstitutionAction } from "@/app/admin/actions";

interface AdminSubstitutionsClientProps {
  festivalId: string;
  initialSubstitutions: AdminSubstitutionRow[];
}

export default function AdminSubstitutionsClient({
  festivalId: _festivalId,
  initialSubstitutions,
}: AdminSubstitutionsClientProps) {
  const [substitutions, setSubstitutions] = useState<AdminSubstitutionRow[]>(initialSubstitutions);
  const [selectedSub, setSelectedSub] = useState<AdminSubstitutionRow | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");
  const [rejectionReason, setRejectionReason] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "paid" | "waived">("paid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pendingSubs = substitutions.filter((s) => s.status === "pending");
  const pastSubs = substitutions.filter((s) => s.status !== "pending");

  function openReviewModal(sub: AdminSubstitutionRow, action: "approved" | "rejected") {
    setSelectedSub(sub);
    setReviewAction(action);
    setRejectionReason("");
    setPaymentStatus(sub.payment_status || "paid");
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSub) return;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await reviewSubstitutionAction({
        substitutionId: selectedSub.id,
        status: reviewAction,
        rejectionReason: reviewAction === "rejected" ? rejectionReason : undefined,
        paymentStatus: reviewAction === "approved" ? paymentStatus : undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to process substitution review.");
        return;
      }

      setSubstitutions((prev) =>
        prev.map((s) =>
          s.id === selectedSub.id
            ? {
                ...s,
                status: reviewAction,
                rejection_reason: reviewAction === "rejected" ? rejectionReason : null,
                payment_status: reviewAction === "approved" ? paymentStatus : s.payment_status,
                reviewed_at: new Date().toISOString(),
              }
            : s
        )
      );

      setIsModalOpen(false);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Pending Reviews Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 800, margin: 0 }}>
              Pending Substitution Requests ({pendingSubs.length})
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
              Substitutions submitted by house managers awaiting administrative review.
            </p>
          </div>
        </div>

        {pendingSubs.length === 0 ? (
          <div
            className="pegasus-card"
            style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "14px" }}
          >
            No pending substitution requests. All competitor rosters are up to date.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {pendingSubs.map((sub) => (
              <div
                key={sub.id}
                className="pegasus-card"
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                  borderLeft: sub.timing === "emergency" ? "4px solid #ff4444" : "4px solid var(--accent)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: "rgba(255,255,255,0.06)",
                        color: "var(--foreground)",
                      }}
                    >
                      {sub.teamName || sub.teamCode}
                    </span>

                    <strong style={{ fontSize: "15px" }}>{sub.eventName || "Event Entry"}</strong>

                    <span
                      className={`pegasus-status pegasus-status--${sub.timing === "emergency" ? "live" : "confirmed"}`}
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                    >
                      {sub.timing === "emergency" ? "EMERGENCY (<12h • ₹50)" : "NORMAL (≥12h • ₹20)"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px" }}>
                    <span style={{ color: "#ff6b6b" }}>
                      OUT: <strong>{sub.originalParticipantName || "Original Athlete"}</strong>{" "}
                      {sub.originalParticipantChest && `(#${sub.originalParticipantChest})`}
                    </span>
                    <span style={{ color: "var(--muted)" }}>➔</span>
                    <span style={{ color: "#51cf66" }}>
                      IN: <strong>{sub.replacementParticipantName || "Replacement Athlete"}</strong>{" "}
                      {sub.replacementParticipantChest && `(#${sub.replacementParticipantChest})`}
                    </span>
                  </div>

                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, fontStyle: "italic" }}>
                    Reason: &ldquo;{sub.reason}&rdquo;
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => openReviewModal(sub, "rejected")}
                    className="pegasus-button pegasus-button--secondary"
                    style={{ fontSize: "12px", padding: "6px 12px", color: "#ff6b6b" }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => openReviewModal(sub, "approved")}
                    className="pegasus-button pegasus-button--primary"
                    style={{ fontSize: "12px", padding: "6px 14px" }}
                  >
                    Approve Substitution
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical / Processed Section */}
      <div>
        <h2 style={{ fontSize: "17px", fontWeight: 800, margin: "0 0 14px" }}>
          Resolved Substitution History ({pastSubs.length})
        </h2>

        {pastSubs.length === 0 ? (
          <div
            className="pegasus-card"
            style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}
          >
            No resolved substitutions recorded yet.
          </div>
        ) : (
          <div className="pegasus-table-container">
            <table className="pegasus-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>House</th>
                  <th>Original Athlete (Out)</th>
                  <th>Replacement (In)</th>
                  <th>Tier & Fee</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {pastSubs.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.eventName}</strong>
                    </td>
                    <td>{s.teamName || s.teamCode}</td>
                    <td style={{ color: "#ff6b6b" }}>
                      {s.originalParticipantName} {s.originalParticipantChest && `(#${s.originalParticipantChest})`}
                    </td>
                    <td style={{ color: "#51cf66" }}>
                      {s.replacementParticipantName} {s.replacementParticipantChest && `(#${s.replacementParticipantChest})`}
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", fontFamily: "monospace" }}>
                        {s.timing.toUpperCase()} (₹{s.fee_amount})
                      </span>
                    </td>
                    <td>
                      <span
                        className={`pegasus-status pegasus-status--${s.status === "approved" ? "confirmed" : "delayed"}`}
                      >
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)" }}>
                        {s.payment_status}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {s.reviewed_at ? new Date(s.reviewed_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {isModalOpen && selectedSub && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="pegasus-card"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "24px",
              background: "var(--surface)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 12px" }}>
              {reviewAction === "approved" ? "Approve Athlete Substitution" : "Reject Substitution Request"}
            </h3>

            {errorMessage && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(255, 68, 68, 0.1)",
                  border: "1px solid rgba(255, 68, 68, 0.3)",
                  borderRadius: "6px",
                  color: "#ff6b6b",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {errorMessage}
              </div>
            )}

            <div
              style={{
                padding: "14px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                marginBottom: "16px",
                fontSize: "13px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div>
                <span style={{ color: "var(--muted)" }}>Event:</span> <strong>{selectedSub.eventName}</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>House:</span> <strong>{selectedSub.teamName}</strong>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <span style={{ color: "#ff6b6b" }}>Out: {selectedSub.originalParticipantName}</span>
                <span>➔</span>
                <span style={{ color: "#51cf66" }}>In: {selectedSub.replacementParticipantName}</span>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Fee Tier:</span>{" "}
                <strong>{selectedSub.timing.toUpperCase()} — ₹{selectedSub.fee_amount}</strong>
              </div>
            </div>

            <form onSubmit={handleReview} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {reviewAction === "approved" ? (
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Substitution Fee Status (₹{selectedSub.fee_amount})
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  >
                    <option value="paid">Paid (Collected at desk)</option>
                    <option value="unpaid">Unpaid (Billed to house ledger)</option>
                    <option value="waived">Waived (Official organizer waiver)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Reason for Rejection *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Ineligible category, invalid roster change"
                    className="pegasus-input"
                    style={{ width: "100%", minHeight: "80px" }}
                    required
                  />
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
                  className={`pegasus-button ${reviewAction === "approved" ? "pegasus-button--primary" : "pegasus-button--secondary"}`}
                  style={reviewAction === "rejected" ? { color: "#ff6b6b", borderColor: "#ff6b6b" } : undefined}
                  disabled={isPending}
                >
                  {isPending ? "Processing..." : reviewAction === "approved" ? "Confirm Approval" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import { useState, useMemo, useTransition } from "react";
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

  // Filters for historical table
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "rejected">("all");
  const [tierFilter, setTierFilter] = useState<"all" | "normal" | "emergency">("all");
  const [houseFilter, setHouseFilter] = useState<string>("all");

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const pendingSubs = useMemo(() => substitutions.filter((s) => s.status === "pending"), [substitutions]);
  const pastSubs = useMemo(() => substitutions.filter((s) => s.status !== "pending"), [substitutions]);

  // Distinct house names
  const distinctHouses = useMemo(() => {
    const houses = new Set<string>();
    for (const s of substitutions) {
      const name = s.teamName || s.teamCode;
      if (name) houses.add(name);
    }
    return Array.from(houses).sort();
  }, [substitutions]);

  // Telemetry metrics
  const telemetry = useMemo(() => {
    const totalCount = substitutions.length;
    const pendingCount = pendingSubs.length;
    const approvedCount = substitutions.filter((s) => s.status === "approved").length;
    const rejectedCount = substitutions.filter((s) => s.status === "rejected").length;
    const totalFeesCollected = substitutions
      .filter((s) => s.status === "approved" && s.payment_status === "paid")
      .reduce((sum, s) => sum + (s.fee_amount || 0), 0);

    return {
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalFeesCollected,
    };
  }, [substitutions, pendingSubs]);

  // Filtered resolved substitutions
  const filteredPastSubs = useMemo(() => {
    return pastSubs.filter((s) => {
      // 1. Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.trim().toLowerCase();
        const eventName = (s.eventName || "").toLowerCase();
        const houseName = (s.teamName || s.teamCode || "").toLowerCase();
        const outName = (s.originalParticipantName || "").toLowerCase();
        const outChest = (s.originalParticipantChest || "").toLowerCase();
        const inName = (s.replacementParticipantName || "").toLowerCase();
        const inChest = (s.replacementParticipantChest || "").toLowerCase();
        const reason = (s.reason || "").toLowerCase();

        if (
          !eventName.includes(q) &&
          !houseName.includes(q) &&
          !outName.includes(q) &&
          !outChest.includes(q) &&
          !inName.includes(q) &&
          !inChest.includes(q) &&
          !reason.includes(q)
        ) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== "all" && s.status !== statusFilter) {
        return false;
      }

      // 3. Tier Filter
      if (tierFilter !== "all" && s.timing !== tierFilter) {
        return false;
      }

      // 4. House Filter
      if (houseFilter !== "all") {
        const name = s.teamName || s.teamCode;
        if (name !== houseFilter) return false;
      }

      return true;
    });
  }, [pastSubs, searchQuery, statusFilter, tierFilter, houseFilter]);

  const isFiltering =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    tierFilter !== "all" ||
    houseFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTierFilter("all");
    setHouseFilter("all");
  };

  function openReviewModal(sub: AdminSubstitutionRow, action: "approved" | "rejected") {
    setSelectedSub(sub);
    setReviewAction(action);
    setRejectionReason("");
    setPaymentStatus(sub.payment_status || "paid");
    setFeedback(null);
    setIsModalOpen(true);
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSub) return;
    setFeedback(null);

    const actionCopy = reviewAction;
    const athleteOut = selectedSub.originalParticipantName || "Original Athlete";
    const athleteIn = selectedSub.replacementParticipantName || "Replacement Athlete";

    startTransition(async () => {
      const res = await reviewSubstitutionAction({
        substitutionId: selectedSub.id,
        status: actionCopy,
        rejectionReason: actionCopy === "rejected" ? rejectionReason : undefined,
        paymentStatus: actionCopy === "approved" ? paymentStatus : undefined,
      });

      if (!res.success) {
        setFeedback({
          type: "error",
          message: res.error || "Failed to process substitution review.",
        });
        return;
      }

      setSubstitutions((prev) =>
        prev.map((s) =>
          s.id === selectedSub.id
            ? {
                ...s,
                status: actionCopy,
                rejection_reason: actionCopy === "rejected" ? rejectionReason : null,
                payment_status: actionCopy === "approved" ? paymentStatus : s.payment_status,
                reviewed_at: new Date().toISOString(),
              }
            : s,
        ),
      );

      setFeedback({
        type: "success",
        message:
          actionCopy === "approved"
            ? `Substitution approved: ${athleteIn} replaces ${athleteOut}.`
            : `Substitution request rejected for ${athleteOut}.`,
      });

      setIsModalOpen(false);
    });
  }

  return (
    <div className="pegasus-animate-fade" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Feedback Banner */}
      {feedback && (
        <div
          className="pegasus-animate-fade"
          style={{
            padding: "12px 18px",
            borderRadius: "6px",
            border: `1px solid ${
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.35)"
                : "rgba(239, 68, 68, 0.35)"
            }`,
            background:
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
            color:
              feedback.type === "success"
                ? "var(--success, #10b981)"
                : "var(--destructive, #ef4444)",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span>{feedback.type === "success" ? "✓" : "⚠"}</span>
            <strong>{feedback.message}</strong>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Telemetry Metrics Bar */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
        }}
      >
        {[
          { label: "Total Requests", value: telemetry.totalCount },
          {
            label: "Pending Review",
            value: telemetry.pendingCount,
            color: telemetry.pendingCount > 0 ? "var(--accent)" : "var(--muted)",
          },
          { label: "Approved", value: telemetry.approvedCount, color: "var(--success, #10b981)" },
          {
            label: "Rejected",
            value: telemetry.rejectedCount,
            color: telemetry.rejectedCount > 0 ? "var(--destructive, #ef4444)" : "var(--muted)",
          },
          {
            label: "Fees Collected",
            value: `₹${telemetry.totalFeesCollected}`,
            color: "var(--foreground)",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="pegasus-card"
            style={{
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {item.label}
            </span>
            <strong
              style={{
                fontSize: "22px",
                fontWeight: 850,
                lineHeight: 1.1,
                color: item.color,
              }}
            >
              {item.value}
            </strong>
          </div>
        ))}
      </section>

      {/* Pending Reviews Section */}
      <section style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
              Pending Substitution Requests ({pendingSubs.length})
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
              Athlete changes submitted by house managers awaiting desk validation.
            </p>
          </div>
        </div>

        {pendingSubs.length === 0 ? (
          <div
            className="pegasus-card"
            style={{
              padding: "36px 24px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "24px" }}>✓</span>
            <strong style={{ color: "var(--foreground)" }}>No pending substitution requests</strong>
            <span>All house rosters are current and verified.</span>
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
                  borderLeft:
                    sub.timing === "emergency"
                      ? "4px solid var(--accent, #e53935)"
                      : "4px solid #2563eb",
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
                        border: "1px solid var(--border)",
                      }}
                    >
                      {sub.teamName || sub.teamCode}
                    </span>

                    <strong style={{ fontSize: "15px", color: "var(--foreground)" }}>
                      {sub.eventName || "Event Entry"}
                    </strong>

                    <span
                      className={`pegasus-status pegasus-status--${sub.timing === "emergency" ? "live" : "confirmed"}`}
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                    >
                      <span className="pegasus-status__dot" />
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
                    type="button"
                    onClick={() => openReviewModal(sub, "rejected")}
                    className="pegasus-button pegasus-button--secondary"
                    style={{ fontSize: "12px", padding: "8px 14px", color: "#ff6b6b" }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => openReviewModal(sub, "approved")}
                    className="pegasus-button pegasus-button--primary"
                    style={{ fontSize: "12px", padding: "8px 16px" }}
                  >
                    Approve Substitution
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historical • Processed Section */}
      <section style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
              Resolved Substitution History ({pastSubs.length})
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
              Audit record of approved and rejected roster substitutions.
            </p>
          </div>
        </div>

        {/* Filters Bar */}
        {pastSubs.length > 0 && (
          <section className="pegasus-admin-filter-bar">
            <div style={{ flex: "1 1 200px", minWidth: "180px" }}>
              <input
                type="text"
                className="pegasus-admin-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search athlete, event, or house..."
                style={{ width: "100%", boxSizing: "border-box" }}
                aria-label="Search substitutions"
              />
            </div>

            <div style={{ minWidth: "140px" }}>
              <select
                className="pegasus-admin-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter by Status"
                style={{ width: "100%" }}
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div style={{ minWidth: "140px" }}>
              <select
                className="pegasus-admin-select"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as any)}
                aria-label="Filter by Tier"
                style={{ width: "100%" }}
              >
                <option value="all">All Fee Tiers</option>
                <option value="normal">Normal (₹20)</option>
                <option value="emergency">Emergency (₹50)</option>
              </select>
            </div>

            {distinctHouses.length > 1 && (
              <div style={{ minWidth: "140px" }}>
                <select
                  className="pegasus-admin-select"
                  value={houseFilter}
                  onChange={(e) => setHouseFilter(e.target.value)}
                  aria-label="Filter by House"
                  style={{ width: "100%" }}
                >
                  <option value="all">All Houses</option>
                  {distinctHouses.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isFiltering && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="pegasus-button pegasus-button--subtle"
                style={{ fontSize: "12px", height: "38px", padding: "0 14px" }}
              >
                ✕ Clear Filters
              </button>
            )}
          </section>
        )}

        {pastSubs.length === 0 ? (
          <div
            className="pegasus-card"
            style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}
          >
            No resolved substitutions recorded yet.
          </div>
        ) : filteredPastSubs.length === 0 ? (
          <div
            className="pegasus-card"
            style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}
          >
            No historical records match your filter criteria.
          </div>
        ) : (
          <div className="pegasus-table-container">
            <table className="pegasus-table" aria-label="Substitution History">
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
                {filteredPastSubs.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ color: "var(--foreground)" }}>{s.eventName}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        {s.teamName || s.teamCode}
                      </span>
                    </td>
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
                        <span className="pegasus-status__dot" />
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
      </section>

      {/* Review Modal */}
      {isModalOpen && selectedSub && (
        <div
          className="pegasus-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsModalOpen(false);
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "24px",
              background: "#121418",
              border: "1px solid var(--border)",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.6)",
              borderRadius: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <p className="pegasus-eyebrow" style={{ margin: 0 }}>
                  CALL ROOM DESK • REVIEW
                </p>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "4px 0 0" }}>
                  {reviewAction === "approved" ? "Approve Athlete Substitution" : "Reject Substitution Request"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: "14px",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                marginBottom: "16px",
                fontSize: "13px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div>
                <span style={{ color: "var(--muted)" }}>Event:</span>{" "}
                <strong style={{ color: "var(--foreground)" }}>{selectedSub.eventName}</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>House:</span>{" "}
                <strong style={{ color: "var(--foreground)" }}>{selectedSub.teamName || selectedSub.teamCode}</strong>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ color: "#ff6b6b" }}>
                  Out: <strong>{selectedSub.originalParticipantName}</strong>{" "}
                  {selectedSub.originalParticipantChest && `(#${selectedSub.originalParticipantChest})`}
                </span>
                <span>➔</span>
                <span style={{ color: "#51cf66" }}>
                  In: <strong>{selectedSub.replacementParticipantName}</strong>{" "}
                  {selectedSub.replacementParticipantChest && `(#${selectedSub.replacementParticipantChest})`}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Fee Tier:</span>{" "}
                <strong style={{ color: "var(--accent)" }}>
                  {selectedSub.timing.toUpperCase()} — ₹{selectedSub.fee_amount}
                </strong>
              </div>
              {selectedSub.reason && (
                <div style={{ fontSize: "12px", color: "var(--muted)", fontStyle: "italic" }}>
                  &ldquo;{selectedSub.reason}&rdquo;
                </div>
              )}
            </div>

            <form onSubmit={handleReview} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {reviewAction === "approved" ? (
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Substitution Fee Status (₹{selectedSub.fee_amount})
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="pegasus-admin-select"
                    style={{ width: "100%" }}
                  >
                    <option value="paid">Paid (Collected at desk)</option>
                    <option value="unpaid">Unpaid (Billed to house ledger)</option>
                    <option value="waived">Waived (Official organizer waiver)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Reason for Rejection *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Ineligible category, invalid roster change"
                    className="pegasus-admin-input"
                    style={{ width: "100%", minHeight: "80px", boxSizing: "border-box" }}
                    required
                  />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="pegasus-button pegasus-button--subtle"
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
                  {isPending
                    ? "Processing..."
                    : reviewAction === "approved"
                      ? "Confirm Approval"
                      : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import Link from "next/link";
import {
  validateFestivalImportAction,
  executeFestivalImportAction,
} from "@/app/admin/actions";
import type {
  ImportPreviewDataset,
  ImportResult,
  ImportSheetName,
  ValidationSeverity,
  NormalizedStudent,
  NormalizedEvent,
  NormalizedRegistration,
} from "@/lib/types/import";

interface AdminImportClientProps {
  festivalId: string;
}

type WizardStep = "upload" | "preview" | "confirm" | "completed";
type ImportTab = ImportSheetName | "issues";

export default function AdminImportClient({ festivalId }: AdminImportClientProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Validation Preview State
  const [previewData, setPreviewData] = useState<ImportPreviewDataset | null>(null);
  const [activeTab, setActiveTab] = useState<ImportTab>("Students");
  const [statusFilter, setStatusFilter] = useState<ValidationSeverity | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Final Execution Result
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith(".xlsx")) {
        setErrorMessage("Please select a valid Excel workbook (.xlsx).");
        return;
      }
      setFile(selectedFile);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile.name.endsWith(".xlsx")) {
        setErrorMessage("Please select a valid Excel workbook (.xlsx).");
        return;
      }
      setFile(droppedFile);
      setErrorMessage(null);
    }
  };

  const handleValidate = () => {
    if (!file) {
      setErrorMessage("Please select an .xlsx file first.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await validateFestivalImportAction(formData, festivalId);
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Failed to validate workbook.");
      } else {
        setPreviewData(res.data);
        setStep("preview");
        setActiveTab("Students");
      }
    });
  };

  const handleExecuteImport = () => {
    if (!previewData || !previewData.isValid) return;

    setErrorMessage(null);
    startTransition(async () => {
      // Gather normalized records
      const normalizedStudents = previewData.sheets.students.rows
        .map((r) => r.normalized)
        .filter((s: NormalizedStudent | undefined): s is NormalizedStudent => Boolean(s));

      const normalizedEvents = previewData.sheets.events.rows
        .map((r) => r.normalized)
        .filter((e: NormalizedEvent | undefined): e is NormalizedEvent => Boolean(e));

      const normalizedRegistrations = previewData.sheets.registrations.rows
        .map((r) => r.normalized)
        .filter((reg: NormalizedRegistration | undefined): reg is NormalizedRegistration => Boolean(reg));

      const res = await executeFestivalImportAction({
        festivalId,
        students: normalizedStudents,
        events: normalizedEvents,
        registrations: normalizedRegistrations,
      });

      if (!res.success || !res.result) {
        setErrorMessage(res.error || "Import execution failed.");
        setStep("preview");
      } else {
        setImportResult(res.result);
        setStep("completed");
      }
    });
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setErrorMessage(null);
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --------------------------------------------------------------------------
  // FILTERED PREVIEW DATA
  // --------------------------------------------------------------------------

  const filteredRows = useMemo(() => {
    if (!previewData || activeTab === "issues") return [];

    let rows: any[] = [];
    if (activeTab === "Students") rows = previewData.sheets.students.rows;
    else if (activeTab === "Events") rows = previewData.sheets.events.rows;
    else if (activeTab === "Registrations") rows = previewData.sheets.registrations.rows;

    return rows.filter((r) => {
      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // Search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const rawJson = JSON.stringify(r.raw).toLowerCase();
        const normJson = r.normalized ? JSON.stringify(r.normalized).toLowerCase() : "";
        return rawJson.includes(query) || normJson.includes(query);
      }

      return true;
    });
  }, [previewData, activeTab, statusFilter, searchQuery]);

  return (
    <div className="zenithrow-import-page">
      <style>{`
        .zenithrow-import-kicker {
          color: var(--red);
          font: 800 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        /* ZENITHROW Data Import — presentation layer only */
        .zenithrow-import-page {
          --z0: #070707;
          --z1: #0e1013;
          --z2: #15181c;
          --z3: #1e2228;
          --z4: #262b33;
          --line: rgba(255, 255, 255, 0.08);
          --line2: rgba(255, 255, 255, 0.14);
          --fg: #f8fafc;
          --muted: #94a3b8;
          --muted2: #64748b;
          --red: #e53935;
          --red2: #ff5252;
          --blue: #2563eb;
          --green: #22c55e;
          --amber: #f59e0b;
          max-width: 1440px;
          margin: 0 auto;
          padding: 28px 24px 48px;
          color: var(--fg);
        }
        .zenithrow-import-header {
          margin-bottom: 24px;
        }
        .zenithrow-import-header > div:first-child {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }
        .zenithrow-import-title {
          font-size: 30px;
          line-height: 1.05;
          font-weight: 850;
          letter-spacing: -0.035em;
          margin: 0;
          color: #fff;
        }
        .zenithrow-import-subtitle {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.55;
          max-width: 760px;
        }
        .zenithrow-import-page a {
          transition: 0.2s ease;
        }
        .zenithrow-import-page button,
        .zenithrow-import-page input,
        .zenithrow-import-page select {
          font: inherit;
        }
        .zenithrow-import-page code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: #cbd5e1;
        }
        .zenithrow-import-stepper {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 22px;
          padding: 14px 16px;
          background: linear-gradient(180deg, rgba(21, 24, 28, 0.9), rgba(14, 16, 19, 0.9));
          border: 1px solid var(--line);
          border-radius: 14px;
          box-shadow: inset 0 1px rgba(255, 255, 255, 0.04);
        }
        .zenithrow-import-stepper > div {
          min-width: 0;
        }
        .zenithrow-import-page [style*="background: #0f172a"] {
          background: linear-gradient(180deg, #111419, #0d0f12) !important;
          border-color: var(--line) !important;
          border-radius: 16px !important;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.22), inset 0 1px rgba(255, 255, 255, 0.035);
        }
        .zenithrow-import-page [style*="background: #1e293b"] {
          background: #181c21 !important;
          border-color: var(--line) !important;
        }
        .zenithrow-import-page [style*="#2563eb"] {
          background: var(--blue) !important;
        }
        .zenithrow-import-page [style*="#16a34a"] {
          background: var(--green) !important;
        }
        .zenithrow-import-page [style*="#334155"] {
          border-color: var(--line2) !important;
        }
        .zenithrow-import-page input:focus,
        .zenithrow-import-page select:focus {
          outline: none;
          border-color: rgba(37, 99, 235, 0.65) !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .zenithrow-import-page table thead tr {
          background: #181c21 !important;
        }
        .zenithrow-import-page table tbody tr {
          transition: background 0.16s ease;
        }
        .zenithrow-import-page table tbody tr:hover {
          background: rgba(255, 255, 255, 0.025) !important;
        }
        .zenithrow-import-page th {
          font-size: 10px !important;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          font-weight: 800 !important;
        }
        .zenithrow-import-page td {
          border-color: var(--line) !important;
        }
        .zenithrow-import-page button:not(:disabled):hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .zenithrow-import-page button {
          transition: filter 0.18s ease, transform 0.18s ease, background 0.18s ease;
        }
        .zenithrow-import-page [style*="border: 2px dashed"] {
          border-color: rgba(255, 255, 255, 0.14) !important;
          background: radial-gradient(circle at 50% 0, rgba(37, 99, 235, 0.08), transparent 48%) !important;
          min-height: 220px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .zenithrow-import-page [style*="border: 2px dashed"]:hover {
          border-color: rgba(229, 57, 53, 0.55) !important;
        }
        .zenithrow-import-page [style*="color: #2563eb"] {
          color: #60a5fa !important;
        }
        .zenithrow-import-page [style*="color: #f8fafc"] {
          color: #f8fafc !important;
        }
        .zenithrow-import-page [style*="color: #94a3b8"] {
          color: #94a3b8 !important;
        }
        .zenithrow-import-page [style*="color: #64748b"] {
          color: #64748b !important;
        }
        .zenithrow-import-page [style*="color: #22c55e"] {
          color: #4ade80 !important;
        }
        .zenithrow-import-page [style*="color: #ef4444"] {
          color: #f87171 !important;
        }
        .zenithrow-import-page [style*="rgba(234, 179, 8"] {
          border-color: rgba(245, 158, 11, 0.24) !important;
        }
        @media (max-width: 900px) {
          .zenithrow-import-page {
            padding: 20px 14px 36px;
          }
          .zenithrow-import-header > div:first-child {
            align-items: flex-start;
            flex-direction: column;
          }
          .zenithrow-import-title {
            font-size: 25px;
          }
          .zenithrow-import-stepper {
            overflow-x: auto;
            padding: 12px;
            gap: 9px;
          }
          .zenithrow-import-stepper > * {
            flex: 0 0 auto;
          }
          .zenithrow-import-page table {
            min-width: 860px;
          }
        }
        @media (max-width: 640px) {
          .zenithrow-import-page {
            padding: 16px 10px 28px;
          }
          .zenithrow-import-title {
            font-size: 22px;
          }
          .zenithrow-import-subtitle {
            font-size: 12px;
          }
          .zenithrow-import-page [style*='gridTemplateColumns: "1fr 340px"'] {
            display: flex !important;
            flex-direction: column;
          }
          .zenithrow-import-page [style*='padding: "32px"'] {
            padding: 18px !important;
          }
          .zenithrow-import-page [style*='padding: "48px 24px"'] {
            padding: 34px 16px !important;
          }
          .zenithrow-import-page [style*='gridTemplateColumns: "repeat(3, 1fr)"'] {
            grid-template-columns: 1fr !important;
          }
          .zenithrow-import-page [style*='display: "flex"'][style*='justifyContent: "center"'] {
            flex-wrap: wrap;
          }
        }
      `}</style>

      {/* Header */}
      <div className="zenithrow-import-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="zenithrow-import-kicker">07 • DATA MANAGEMENT &amp; INGESTION</div>
            <h1 className="zenithrow-import-title">
              Festival Data Ingestion
            </h1>
            <p className="zenithrow-import-subtitle">
              Production workbook importer for Students, Events, and Registrations (Strict CREATE-ONLY mode)
            </p>
          </div>

          <Link
            href="/admin"
            style={{
              padding: "8px 16px",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#cbd5e1",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Stepper Progress Bar */}
        <div className="zenithrow-import-stepper">
          <StepBadge num={1} label="Upload (.xlsx)" active={step === "upload"} completed={step !== "upload"} />
          <StepDivider />
          <StepBadge num={2} label="Validate & Preview" active={step === "preview"} completed={step === "confirm" || step === "completed"} />
          <StepDivider />
          <StepBadge num={3} label="Confirmation" active={step === "confirm"} completed={step === "completed"} />
          <StepDivider />
          <StepBadge num={4} label="Audit Report" active={step === "completed"} completed={step === "completed"} />
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          style={{
            padding: "14px 18px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "8px",
            color: "#fca5a5",
            fontSize: "14px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{
              background: "none",
              border: "none",
              color: "#fca5a5",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 1: UPLOAD WORKBOOK                                              */}
      {/* ==================================================================== */}
      {step === "upload" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* Dropzone Card */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "32px",
            }}
          >
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed #334155",
                borderRadius: "10px",
                padding: "48px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: file ? "rgba(59, 130, 246, 0.05)" : "transparent",
                borderColor: file ? "#3b82f6" : "#334155",
                transition: "all 0.2s ease",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📊</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#f8fafc" }}>
                {file ? file.name : "Choose an Excel workbook or drag & drop here"}
              </div>
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB — Ready to validate`
                  : "Supports single .xlsx file with Students, Events, and Registrations sheets"}
              </div>

              {file && (
                <div
                  style={{
                    display: "inline-block",
                    marginTop: "16px",
                    padding: "6px 14px",
                    background: "rgba(59, 130, 246, 0.2)",
                    borderRadius: "6px",
                    color: "#93c5fd",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Workbook Selected
                </div>
              )}
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleValidate}
                disabled={!file || isPending}
                style={{
                  padding: "12px 28px",
                  background: !file || isPending ? "#334155" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: !file || isPending ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {isPending ? "Validating Spreadsheet..." : "Validate & Preview →"}
              </button>
            </div>
          </div>

          {/* Specifications Side Card */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc", margin: "0 0 16px" }}>
              Workbook Requirements
            </h3>

            <div style={{ fontSize: "13px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <strong style={{ color: "#e2e8f0" }}>1. Students Sheet</strong>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                  <code>Chest_Number</code>, <code>Full_Name</code>, <code>Team_Code</code> (GAR, TOF, TIB, TRJ), <code>Division_Code</code>.
                </p>
              </div>

              <div>
                <strong style={{ color: "#e2e8f0" }}>2. Events Sheet</strong>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                  <code>Event_Code</code>, <code>Event_Name</code>, <code>Sport_Slug</code>, <code>Point_Class</code> (W, X, Y, Z), <code>Division_Code</code> (or General).
                </p>
              </div>

              <div>
                <strong style={{ color: "#e2e8f0" }}>3. Registrations Sheet</strong>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                  <code>Chest_Number</code>, <code>Event_Code</code>, <code>Status</code> (optional, defaults to approved).
                </p>
              </div>

              <div
                style={{
                  marginTop: "8px",
                  padding: "10px 12px",
                  background: "rgba(234, 179, 8, 0.08)",
                  border: "1px solid rgba(234, 179, 8, 0.25)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#fef08a",
                }}
              >
                ⚠️ <strong>Create-Only Enforcement:</strong> Existing records will trigger blocking conflicts.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 2: PREVIEW & VALIDATION RESULTS                                 */}
      {/* ==================================================================== */}
      {step === "preview" && previewData && (
        <div>
          {/* Summary Stats Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            <StatCard
              label="Validation Status"
              value={previewData.isValid ? "Valid & Ready" : "Blocking Errors"}
              color={previewData.isValid ? "#22c55e" : "#ef4444"}
              sub={previewData.isValid ? "Ready for atomic import" : `${previewData.summary.totalErrors} errors require fix`}
            />
            <StatCard
              label="Students"
              value={previewData.summary.totalStudents}
              color="#38bdf8"
              sub={`${previewData.sheets.students.readyCount} valid rows`}
            />
            <StatCard
              label="Events"
              value={previewData.summary.totalEvents}
              color="#a78bfa"
              sub={`${previewData.sheets.events.readyCount} valid rows`}
            />
            <StatCard
              label="Registrations"
              value={previewData.summary.totalRegistrations}
              color="#f472b6"
              sub={`${previewData.sheets.registrations.readyCount} valid rows`}
            />
            <StatCard
              label="Warnings"
              value={previewData.summary.totalWarnings}
              color="#eab308"
              sub="Non-blocking notices"
            />
          </div>

          {/* Action & Filter Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              background: "#0f172a",
              padding: "16px 20px",
              borderRadius: "10px",
              border: "1px solid #1e293b",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            {/* Sheet Tabs */}
            <div style={{ display: "flex", gap: "8px" }}>
              <TabButton
                label={`Students (${previewData.summary.totalStudents})`}
                active={activeTab === "Students"}
                onClick={() => setActiveTab("Students")}
                hasError={previewData.sheets.students.errorCount > 0}
              />
              <TabButton
                label={`Events (${previewData.summary.totalEvents})`}
                active={activeTab === "Events"}
                onClick={() => setActiveTab("Events")}
                hasError={previewData.sheets.events.errorCount > 0}
              />
              <TabButton
                label={`Registrations (${previewData.summary.totalRegistrations})`}
                active={activeTab === "Registrations"}
                onClick={() => setActiveTab("Registrations")}
                hasError={previewData.sheets.registrations.errorCount > 0}
              />
              <TabButton
                label={`All Issues (${previewData.allIssues.length})`}
                active={activeTab === "issues"}
                onClick={() => setActiveTab("issues")}
                hasError={previewData.summary.totalErrors > 0}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={handleReset}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Upload Different File
              </button>

              <button
                onClick={() => setStep("confirm")}
                disabled={!previewData.isValid || isPending}
                style={{
                  padding: "8px 20px",
                  background: !previewData.isValid ? "#334155" : "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: !previewData.isValid ? "not-allowed" : "pointer",
                }}
              >
                Proceed to Import →
              </button>
            </div>
          </div>

          {/* Search & Status Filter (for sheets) */}
          {activeTab !== "issues" && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 14px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#f8fafc",
                  fontSize: "13px",
                }}
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{
                  padding: "8px 14px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#cbd5e1",
                  fontSize: "13px",
                }}
              >
                <option value="all">All Statuses</option>
                <option value="ready">Ready (Valid)</option>
                <option value="warning">Warnings</option>
                <option value="error">Errors</option>
              </select>
            </div>
          )}

          {/* Table Container */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {activeTab === "issues" ? (
              <IssuesTable issues={previewData.allIssues} />
            ) : (
              <PreviewDataTable
                tab={activeTab}
                rows={filteredRows}
                totalCount={
                  activeTab === "Students"
                    ? previewData.sheets.students.totalRows
                    : activeTab === "Events"
                    ? previewData.sheets.events.totalRows
                    : previewData.sheets.registrations.totalRows
                }
              />
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 3: CONFIRMATION MODAL / SCREEN                                  */}
      {/* ==================================================================== */}
      {step === "confirm" && previewData && (
        <div
          style={{
            maxWidth: "600px",
            margin: "40px auto",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "44px", marginBottom: "16px" }}>⚡</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f8fafc", margin: "0 0 8px" }}>
            Confirm Festival Data Ingestion
          </h2>
          <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 24px" }}>
            You are about to insert the validated records into the official festival registry.
          </p>

          <div
            style={{
              background: "#1e293b",
              borderRadius: "8px",
              padding: "16px",
              textAlign: "left",
              marginBottom: "24px",
              fontSize: "13px",
              color: "#cbd5e1",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Students to create:</span>
              <strong style={{ color: "#38bdf8" }}>{previewData.summary.totalStudents}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Events to create:</span>
              <strong style={{ color: "#a78bfa" }}>{previewData.summary.totalEvents}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Registrations to create:</span>
              <strong style={{ color: "#f472b6" }}>{previewData.summary.totalRegistrations}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Warnings logged:</span>
              <strong style={{ color: "#eab308" }}>{previewData.summary.totalWarnings}</strong>
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              background: "rgba(234, 179, 8, 0.1)",
              border: "1px solid rgba(234, 179, 8, 0.25)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#fef08a",
              marginBottom: "24px",
              textAlign: "left",
            }}
          >
            ℹ️ <strong>Atomic Transaction:</strong> If any database error occurs during the insertion process, all records in this batch will be automatically rolled back.
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => setStep("preview")}
              disabled={isPending}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#cbd5e1",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={isPending}
              style={{
                padding: "10px 28px",
                background: isPending ? "#334155" : "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Executing Import..." : "Confirm & Import Now"}
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 4: IMPORT COMPLETED / AUDIT REPORT                             */}
      {/* ==================================================================== */}
      {step === "completed" && importResult && (
        <div
          style={{
            maxWidth: "700px",
            margin: "30px auto",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "36px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#f8fafc", margin: "0 0 8px" }}>
            Festival Data Ingestion Successful!
          </h2>
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: "0 0 28px" }}>
            {importResult.message}
          </p>

          {/* Audit Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "14px",
              marginBottom: "28px",
            }}
          >
            <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px" }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#38bdf8" }}>
                {importResult.studentsCreated}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Students Created</div>
            </div>
            <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px" }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#a78bfa" }}>
                {importResult.eventsCreated}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Events Created</div>
            </div>
            <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px" }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#f472b6" }}>
                {importResult.registrationsCreated}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Registrations Created</div>
            </div>
          </div>

          {/* Warnings List */}
          {importResult.warnings && importResult.warnings.length > 0 && (
            <div
              style={{
                textAlign: "left",
                background: "rgba(234, 179, 8, 0.08)",
                border: "1px solid rgba(234, 179, 8, 0.2)",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "28px",
              }}
            >
              <h4 style={{ margin: "0 0 8px", fontSize: "13px", color: "#fef08a" }}>
                Logged Warnings ({importResult.warnings.length})
              </h4>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#cbd5e1" }}>
                {importResult.warnings.map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Links */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link
              href="/admin/participants"
              style={{
                padding: "10px 20px",
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View Students Registry →
            </Link>
            <Link
              href="/admin/events"
              style={{
                padding: "10px 20px",
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#cbd5e1",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              View Events →
            </Link>
            <button
              onClick={handleReset}
              style={{
                padding: "10px 18px",
                background: "transparent",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#94a3b8",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Import Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------------

function StepBadge({
  num,
  label,
  active,
  completed,
}: {
  num: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: completed ? "#16a34a" : active ? "#2563eb" : "#334155",
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {completed ? "✓" : num}
      </div>
      <span
        style={{
          fontSize: "13px",
          fontWeight: active ? 600 : 400,
          color: active ? "#f8fafc" : completed ? "#cbd5e1" : "#64748b",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function StepDivider() {
  return <div style={{ flex: 1, height: "1px", background: "#334155", minWidth: "20px" }} />;
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "10px",
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#94a3b8" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 800, color, marginTop: "4px" }}>
        {value}
      </div>
      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{sub}</div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  hasError,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  hasError?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        background: active ? "#2563eb" : "#1e293b",
        border: hasError ? "1px solid rgba(239, 68, 68, 0.6)" : "1px solid transparent",
        borderRadius: "6px",
        color: active ? "#ffffff" : "#cbd5e1",
        fontSize: "13px",
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {label}
      {hasError && (
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#ef4444",
          }}
        />
      )}
    </button>
  );
}

function PreviewDataTable({
  tab,
  rows,
  totalCount,
}: {
  tab: ImportSheetName;
  rows: any[];
  totalCount: number;
}) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        No rows matching the current filter criteria ({totalCount} total in sheet).
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#1e293b", color: "#94a3b8", textAlign: "left" }}>
            <th style={{ padding: "10px 14px", width: "70px" }}>Row</th>
            <th style={{ padding: "10px 14px", width: "100px" }}>Status</th>
            {tab === "Students" && (
              <>
                <th style={{ padding: "10px 14px" }}>Chest #</th>
                <th style={{ padding: "10px 14px" }}>Name</th>
                <th style={{ padding: "10px 14px" }}>Team</th>
                <th style={{ padding: "10px 14px" }}>Division</th>
                <th style={{ padding: "10px 14px" }}>Public ID</th>
              </>
            )}
            {tab === "Events" && (
              <>
                <th style={{ padding: "10px 14px" }}>Code</th>
                <th style={{ padding: "10px 14px" }}>Event Name</th>
                <th style={{ padding: "10px 14px" }}>Sport</th>
                <th style={{ padding: "10px 14px" }}>Class</th>
                <th style={{ padding: "10px 14px" }}>Division</th>
                <th style={{ padding: "10px 14px" }}>Scoring</th>
              </>
            )}
            {tab === "Registrations" && (
              <>
                <th style={{ padding: "10px 14px" }}>Chest #</th>
                <th style={{ padding: "10px 14px" }}>Student</th>
                <th style={{ padding: "10px 14px" }}>Event Code</th>
                <th style={{ padding: "10px 14px" }}>Event Name</th>
                <th style={{ padding: "10px 14px" }}>Status</th>
              </>
            )}
            <th style={{ padding: "10px 14px" }}>Validation Feedback</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isErr = row.status === "error";
            const isWarn = row.status === "warning";

            return (
              <tr
                key={idx}
                style={{
                  borderBottom: "1px solid #1e293b",
                  background: isErr
                    ? "rgba(239, 68, 68, 0.05)"
                    : isWarn
                    ? "rgba(234, 179, 8, 0.03)"
                    : "transparent",
                }}
              >
                <td style={{ padding: "10px 14px", color: "#64748b" }}>#{row.rowNumber}</td>
                <td style={{ padding: "10px 14px" }}>
                  <StatusBadge status={row.status} />
                </td>

                {tab === "Students" && (
                  <>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#f8fafc" }}>
                      {row.normalized?.chestNumber || String(row.raw.Chest_Number || "-")}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>
                      {row.normalized?.name || String(row.raw.Full_Name || "-")}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 600 }}>
                        {row.normalized?.teamCode || String(row.raw.Team_Code || "-")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                      {row.normalized?.divisionCode || String(row.raw.Division_Code || "-")}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "12px" }}>
                      {row.normalized?.publicId || String(row.raw.Public_ID || "(auto)")}
                    </td>
                  </>
                )}

                {tab === "Events" && (
                  <>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#f8fafc" }}>
                      {row.normalized?.eventCode || String(row.raw.Event_Code || "-")}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>
                      {row.normalized?.name || String(row.raw.Event_Name || "-")}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#a78bfa" }}>
                      {row.normalized?.sportSlug || String(row.raw.Sport_Slug || "-")}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                        {row.normalized?.pointClass || String(row.raw.Point_Class || "-")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                      {row.normalized?.isGeneralEvent
                        ? "General"
                        : row.normalized?.divisionCode || String(row.raw.Division_Code || "-")}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "12px" }}>
                      {row.normalized?.scoringEngine || String(row.raw.Scoring_Engine || "-")}
                    </td>
                  </>
                )}

                {tab === "Registrations" && (
                  <>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#f8fafc" }}>
                      {row.normalized?.chestNumber || String(row.raw.Chest_Number || "-")}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>
                      {row.normalized?.participantName || "-"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#f472b6", fontWeight: 600 }}>
                      {row.normalized?.eventCode || String(row.raw.Event_Code || "-")}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                      {row.normalized?.eventName || "-"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "12px" }}>
                      {row.normalized?.status || String(row.raw.Status || "approved")}
                    </td>
                  </>
                )}

                <td style={{ padding: "10px 14px" }}>
                  {row.issues && row.issues.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {row.issues.map((iss: any, iIdx: number) => (
                        <div
                          key={iIdx}
                          style={{
                            fontSize: "12px",
                            color: iss.severity === "error" ? "#fca5a5" : "#fef08a",
                          }}
                        >
                          • {iss.message}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: "#22c55e", fontSize: "12px" }}>✓ Valid</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IssuesTable({ issues }: { issues: any[] }) {
  if (issues.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#22c55e", fontSize: "14px" }}>
        ✓ No issues found. Workbook is 100% clean and ready for import!
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#1e293b", color: "#94a3b8", textAlign: "left" }}>
            <th style={{ padding: "10px 14px", width: "80px" }}>Severity</th>
            <th style={{ padding: "10px 14px", width: "120px" }}>Sheet</th>
            <th style={{ padding: "10px 14px", width: "70px" }}>Row</th>
            <th style={{ padding: "10px 14px" }}>Message</th>
            <th style={{ padding: "10px 14px", width: "120px" }}>Field</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((iss, idx) => (
            <tr
              key={idx}
              style={{
                borderBottom: "1px solid #1e293b",
                background:
                  iss.severity === "error"
                    ? "rgba(239, 68, 68, 0.05)"
                    : "rgba(234, 179, 8, 0.03)",
              }}
            >
              <td style={{ padding: "10px 14px" }}>
                <StatusBadge status={iss.severity} />
              </td>
              <td style={{ padding: "10px 14px", fontWeight: 600, color: "#e2e8f0" }}>
                {iss.sheet}
              </td>
              <td style={{ padding: "10px 14px", color: "#64748b" }}>#{iss.rowNumber}</td>
              <td
                style={{
                  padding: "10px 14px",
                  color: iss.severity === "error" ? "#fca5a5" : "#fef08a",
                }}
              >
                {iss.message}
              </td>
              <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: "12px" }}>
                {iss.field || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: ValidationSeverity }) {
  if (status === "ready") {
    return (
      <span
        style={{
          padding: "3px 8px",
          background: "rgba(34, 197, 94, 0.15)",
          color: "#4ade80",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: 700,
        }}
      >
        READY
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span
        style={{
          padding: "3px 8px",
          background: "rgba(234, 179, 8, 0.15)",
          color: "#facc15",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: 700,
        }}
      >
        WARNING
      </span>
    );
  }
  return (
    <span
      style={{
        padding: "3px 8px",
        background: "rgba(239, 68, 68, 0.15)",
        color: "#f87171",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 700,
      }}
    >
      ERROR
    </span>
  );
}

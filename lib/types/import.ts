/**
 * PEGASUS — Festival Data Ingestion Engine Domain Types
 */

import type {
  ParticipantStatus,
  RegistrationStatus,
  PointClass,
  ScoringEngineType,
  CompetitionFormat,
} from "./index";

export type ImportSheetName =
  | "Students"
  | "Events"
  | "Registrations"
  | "students"
  | "events"
  | "registrations";

export type ValidationSeverity = "error" | "warning" | "ready";

export interface ValidationIssue {
  rowNumber: number;
  sheet: ImportSheetName;
  severity: ValidationSeverity;
  code: string;
  message: string;
  field?: string;
}

// ----------------------------------------------------------------------------
// RAW ROWS (Directly parsed from Spreadsheet)
// ----------------------------------------------------------------------------

export interface RawStudentRow {
  rowNumber: number;
  Chest_Number?: string | number | null;
  Full_Name?: string | null;
  Team_Code?: string | null;
  Division_Code?: string | null;
  Public_ID?: string | null;
  Status?: string | null;
  Phone?: string | number | null;
  Email?: string | null;
  DOB?: string | number | Date | null;
  Notes?: string | null;
  [key: string]: unknown;
}

export interface RawEventRow {
  rowNumber: number;
  Event_Code?: string | null;
  Event_Name?: string | null;
  Sport_Slug?: string | null;
  Point_Class?: string | null;
  Division_Code?: string | null;
  Competition_Type?: string | null;
  Scoring_Engine?: string | null;
  Max_Per_Team?: string | number | null;
  Substitutes_Per_Team?: string | number | null;
  Rules_JSON?: string | Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface RawRegistrationRow {
  rowNumber: number;
  Chest_Number?: string | number | null;
  Event_Code?: string | null;
  Status?: string | null;
  Seed_Number?: string | number | null;
  [key: string]: unknown;
}

// ----------------------------------------------------------------------------
// NORMALIZED & VALIDATED ROWS
// ----------------------------------------------------------------------------

export interface NormalizedStudent {
  rowNumber: number;
  chestNumber: string;
  name: string;
  teamCode: "GAR" | "TOF" | "TIB" | "TRJ";
  divisionCode: "bidaya" | "thaniya" | "thamheediyya" | "aliya" | "majestir";
  publicId?: string;
  status: ParticipantStatus;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  teamId?: string;
  divisionId?: string;
}

export interface NormalizedEvent {
  rowNumber: number;
  eventCode: string;
  name: string;
  sportSlug: string;
  pointClass: PointClass;
  divisionCode?: "bidaya" | "thaniya" | "thamheediyya" | "aliya" | "majestir" | null;
  isGeneralEvent: boolean;
  competitionType: CompetitionFormat;
  scoringEngine: ScoringEngineType;
  maxPerTeam: number;
  substitutesPerTeam: number;
  rules: Record<string, unknown>;
  sportId?: string;
  divisionId?: string;
}

export interface NormalizedRegistration {
  rowNumber: number;
  chestNumber: string;
  eventCode: string;
  status: RegistrationStatus;
  seedNumber?: number | null;
  participantName?: string;
  teamCode?: string;
  divisionCode?: string;
  eventName?: string;
  participantId?: string;
  eventId?: string;
}

// ----------------------------------------------------------------------------
// PREVIEW DATASET & SUMMARY
// ----------------------------------------------------------------------------

export interface PreviewRow<T> {
  rowNumber: number;
  sheet: ImportSheetName;
  raw: Record<string, unknown>;
  normalized?: T;
  status: ValidationSeverity;
  issues: ValidationIssue[];
}

export interface SheetPreview<T> {
  sheetName: ImportSheetName;
  totalRows: number;
  readyCount: number;
  warningCount: number;
  errorCount: number;
  rows: PreviewRow<T>[];
}

export interface ImportPreviewDataset {
  festivalId: string;
  isValid: boolean; // True if totalErrors === 0
  summary: {
    totalStudents: number;
    totalEvents: number;
    totalRegistrations: number;
    totalReady: number;
    totalWarnings: number;
    totalErrors: number;
  };
  sheets: {
    students: SheetPreview<NormalizedStudent>;
    events: SheetPreview<NormalizedEvent>;
    registrations: SheetPreview<NormalizedRegistration>;
  };
  allIssues: ValidationIssue[];
}

// ----------------------------------------------------------------------------
// EXECUTION & RESULT
// ----------------------------------------------------------------------------

export interface ImportExecutionPayload {
  festivalId: string;
  students: NormalizedStudent[];
  events: NormalizedEvent[];
  registrations: NormalizedRegistration[];
}

export interface ImportResult {
  success: boolean;
  message: string;
  error?: string;
  studentsCreated: number;
  eventsCreated: number;
  registrationsCreated: number;
  warningsCount: number;
  warnings: string[];
  importedAt: string;
}

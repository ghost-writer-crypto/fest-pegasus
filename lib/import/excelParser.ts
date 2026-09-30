/**
 * PEGASUS — Festival Data Ingestion Excel Workbook Parser
 * Parses single .xlsx workbooks into raw structured data with 1-based row numbering.
 */

import * as XLSX from "xlsx";
import type {
  RawStudentRow,
  RawEventRow,
  RawRegistrationRow,
  ImportSheetName,
} from "@/lib/types/import";

export interface ParsedFestivalData {
  students: RawStudentRow[];
  events: RawEventRow[];
  registrations: RawRegistrationRow[];
}

export interface ParseResult {
  success: boolean;
  data?: ParsedFestivalData;
  error?: string;
}

const REQUIRED_SHEETS: ImportSheetName[] = ["Students", "Events", "Registrations"];

/**
 * Normalizes header string to canonical snake_case / PascalCase format
 * e.g. "Chest Number", "chest_number", "Chest_Number", "CHEST NO" -> "Chest_Number"
 */
function normalizeHeaderKey(header: string): string {
  const clean = header.trim().toLowerCase().replace(/[\s\-_]+/g, "");

  // Student header mappings
  if (clean === "chestnumber" || clean === "chestno" || clean === "chest" || clean === "bib") {
    return "Chest_Number";
  }
  if (clean === "fullname" || clean === "name" || clean === "studentname" || clean === "athletename") {
    return "Full_Name";
  }
  if (clean === "teamcode" || clean === "team" || clean === "house" || clean === "housecode") {
    return "Team_Code";
  }
  if (clean === "divisioncode" || clean === "division" || clean === "category") {
    return "Division_Code";
  }
  if (clean === "publicid" || clean === "id" || clean === "pgsid") {
    return "Public_ID";
  }
  if (clean === "status" || clean === "state") {
    return "Status";
  }
  if (clean === "phone" || clean === "phonenumber" || clean === "mobile") {
    return "Phone";
  }
  if (clean === "email" || clean === "emailaddress") {
    return "Email";
  }
  if (clean === "dob" || clean === "dateofbirth" || clean === "birthdate") {
    return "DOB";
  }
  if (clean === "notes" || clean === "remarks" || clean === "comment") {
    return "Notes";
  }

  // Event header mappings
  if (clean === "eventcode" || clean === "code" || clean === "competitioncode") {
    return "Event_Code";
  }
  if (clean === "eventname" || clean === "title") {
    return "Event_Name";
  }
  if (clean === "sportslug" || clean === "sport" || clean === "discipline") {
    return "Sport_Slug";
  }
  if (clean === "pointclass" || clean === "class" || clean === "categoryclass") {
    return "Point_Class";
  }
  if (clean === "competitiontype" || clean === "type" || clean === "format") {
    return "Competition_Type";
  }
  if (clean === "scoringengine" || clean === "scoring" || clean === "engine") {
    return "Scoring_Engine";
  }
  if (clean === "maxperteam" || clean === "maxteam" || clean === "teamquota" || clean === "maxquota") {
    return "Max_Per_Team";
  }
  if (clean === "substitutesperteam" || clean === "substitutes" || clean === "subs" || clean === "substitutecount") {
    return "Substitutes_Per_Team";
  }
  if (clean === "rulesjson" || clean === "rules" || clean === "metadata" || clean === "rulesconfig") {
    return "Rules_JSON";
  }

  // Registration header mappings
  if (clean === "seednumber" || clean === "seed" || clean === "ranking") {
    return "Seed_Number";
  }

  return header.trim();
}

/**
 * Normalizes cell values converting Dates and scientific numbers to strings
 */
function normalizeCellValue(val: unknown): unknown {
  if (val === null || val === undefined) return null;

  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? null : trimmed;
  }

  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }

  if (typeof val === "number") {
    return val;
  }

  return String(val).trim();
}

/**
 * Parses raw worksheet into an array of typed objects preserving row numbers
 */
function parseSheetRows<T>(worksheet: XLSX.WorkSheet): T[] {
  const rawJson: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  if (!rawJson || rawJson.length < 2) {
    return [];
  }

  const headerRow = rawJson[0] || [];
  const normalizedHeaders: (string | null)[] = headerRow.map((h) =>
    h != null ? normalizeHeaderKey(String(h)) : null,
  );

  const results: T[] = [];

  for (let i = 1; i < rawJson.length; i++) {
    const rowArray = rawJson[i] || [];
    const hasData = rowArray.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
    if (!hasData) continue;

    const rowObj: Record<string, unknown> = {
      rowNumber: i + 1, // 1-based spreadsheet row number
    };

    for (let colIdx = 0; colIdx < normalizedHeaders.length; colIdx++) {
      const header = normalizedHeaders[colIdx];
      if (header) {
        rowObj[header] = normalizeCellValue(rowArray[colIdx]);
      }
    }

    results.push(rowObj as T);
  }

  return results;
}

/**
 * Parses a festival Excel workbook buffer containing Students, Events, and Registrations.
 */
export function parseFestivalWorkbook(buffer: Buffer): ParseResult {
  try {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        error: "Uploaded file contains no worksheets.",
      };
    }

    const availableSheets = new Map<string, string>();
    for (const name of workbook.SheetNames) {
      availableSheets.set(name.trim().toLowerCase(), name);
    }

    // Verify required sheets
    const missingSheets: string[] = [];
    for (const req of REQUIRED_SHEETS) {
      if (!availableSheets.has(req.toLowerCase())) {
        missingSheets.push(req);
      }
    }

    if (missingSheets.length > 0) {
      return {
        success: false,
        error: `Workbook is missing required sheet(s): ${missingSheets.join(", ")}. Required sheets are: ${REQUIRED_SHEETS.join(", ")}.`,
      };
    }

    const studentsSheetName = availableSheets.get("students")!;
    const eventsSheetName = availableSheets.get("events")!;
    const registrationsSheetName = availableSheets.get("registrations")!;

    const students = parseSheetRows<RawStudentRow>(workbook.Sheets[studentsSheetName]);
    const events = parseSheetRows<RawEventRow>(workbook.Sheets[eventsSheetName]);
    const registrations = parseSheetRows<RawRegistrationRow>(workbook.Sheets[registrationsSheetName]);

    return {
      success: true,
      data: {
        students,
        events,
        registrations,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse spreadsheet buffer.";
    return {
      success: false,
      error: `Excel parsing failed: ${message}`,
    };
  }
}

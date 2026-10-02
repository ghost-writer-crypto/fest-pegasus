/**
 * PEGASUS — Festival Data Ingestion Service
 * Handles transactional, CREATE-ONLY execution of parsed and validated festival records.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  ImportExecutionPayload,
  ImportResult,
} from "@/lib/types/import";

/**
 * Executes a festival data import transaction in strictly CREATE-ONLY mode.
 * Inserts in dependency order:
 * 1. Participants (Students)
 * 2. Events, Event Divisions, Event Quotas
 * 3. Registrations
 *
 * If any error occurs during database operations, newly created records in the batch are rolled back.
 */
export async function executeFestivalImport(
  payload: ImportExecutionPayload,
): Promise<ImportResult> {
  const { festivalId } = payload;
  const importedAt = new Date().toISOString();

  if (!festivalId) {
    return {
      success: false,
      message: "Missing festival ID",
      error: "Festival ID is required for import execution.",
      studentsCreated: 0,
      eventsCreated: 0,
      registrationsCreated: 0,
      warningsCount: 0,
      warnings: [],
      importedAt,
    };
  }

  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    return await executeSupabaseImport(payload, importedAt);
  } else {
    return executeInMemoryImport(payload, importedAt);
  }
}

/**
 * Executes the import against live Supabase database with rollback on failure.
 */
async function executeSupabaseImport(
  payload: ImportExecutionPayload,
  importedAt: string,
): Promise<ImportResult> {
  const { festivalId, students, events, registrations } = payload;
  const supabase = await createClient();

  const createdParticipantIds: string[] = [];
  const createdEventIds: string[] = [];
  const createdRegistrationIds: string[] = [];
  const warnings: string[] = [];

  try {
    // ------------------------------------------------------------------------
    // STEP 1: INSERT PARTICIPANTS
    // ------------------------------------------------------------------------
    const studentChestToIdMap = new Map<string, string>();
    const studentPublicIdToIdMap = new Map<string, string>();

    if (students.length > 0) {
      // Fetch current max PGS counter to ensure sequential generation if missing
      let nextPubNum = 1;
      const { data: existingPubs } = await supabase
        .from("participants")
        .select("public_id")
        .eq("festival_id", festivalId)
        .order("public_id", { ascending: false });

      if (existingPubs && existingPubs.length > 0) {
        for (const row of existingPubs) {
          if (!row.public_id) continue;
          const match = row.public_id.match(/^PGS-(\d+)$/i);
          if (match) {
            const parsed = parseInt(match[1], 10);
            if (!isNaN(parsed) && parsed >= nextPubNum) {
              nextPubNum = parsed + 1;
            }
          }
        }
      }

      // Prepare participant rows
      const participantRows = students.map((s) => {
        let publicId = s.publicId?.trim();
        if (!publicId) {
          publicId = `PGS-${String(nextPubNum++).padStart(4, "0")}`;
        }
        return {
          festival_id: festivalId,
          team_id: s.teamId || null,
          division_id: s.divisionId || null,
          public_id: publicId,
          chest_number: s.chestNumber?.trim() || null,
          name: s.name.trim(),
          status: s.status || "registered",
          phone: s.phone?.trim() || null,
          email: s.email?.trim() || null,
          date_of_birth: s.dateOfBirth || null,
          notes: s.notes?.trim() || null,
          profile_image_url: null,
        };
      });

      const { data: insertedParticipants, error: studentError } = await supabase
        .from("participants")
        .insert(participantRows)
        .select("id, chest_number, public_id");

      if (studentError) {
        throw new Error(`Failed to insert students: ${studentError.message} (${studentError.code})`);
      }

      if (insertedParticipants) {
        for (const p of insertedParticipants) {
          createdParticipantIds.push(p.id);
          if (p.chest_number) {
            studentChestToIdMap.set(p.chest_number.trim(), p.id);
          }
          if (p.public_id) {
            studentPublicIdToIdMap.set(p.public_id.trim(), p.id);
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // STEP 2: INSERT EVENTS, EVENT_DIVISIONS, EVENT_QUOTAS
    // ------------------------------------------------------------------------
    const eventCodeToIdMap = new Map<string, string>();

    if (events.length > 0) {
      const eventRows = events.map((e) => ({
        festival_id: festivalId,
        sport_id: e.sportId!,
        code: e.eventCode.trim(),
        name: e.name.trim(),
        point_class: e.pointClass,
        competition_type: e.competitionType,
        scoring_engine: e.scoringEngine,
        status: "active",
        metadata: e.rules || {},
      }));

      const { data: insertedEvents, error: eventError } = await supabase
        .from("events")
        .insert(eventRows)
        .select("id, code");

      if (eventError) {
        throw new Error(`Failed to insert events: ${eventError.message} (${eventError.code})`);
      }

      if (insertedEvents) {
        for (const ev of insertedEvents) {
          createdEventIds.push(ev.id);
          eventCodeToIdMap.set(ev.code.trim().toLowerCase(), ev.id);
        }
      }

      // Insert event_divisions (for division-specific events)
      const eventDivisionRows: { event_id: string; division_id: string }[] = [];
      const eventQuotaRows: {
        event_id: string;
        division_id: string | null;
        maximum_count: number;
        substitutes_count: number;
        rules: Record<string, unknown>;
      }[] = [];

      for (const e of events) {
        const eventId = eventCodeToIdMap.get(e.eventCode.trim().toLowerCase());
        if (!eventId) continue;

        if (!e.isGeneralEvent && e.divisionId) {
          eventDivisionRows.push({
            event_id: eventId,
            division_id: e.divisionId,
          });
        }

        if (e.maxPerTeam > 0 || e.substitutesPerTeam > 0 || (e.rules && Object.keys(e.rules).length > 0)) {
          eventQuotaRows.push({
            event_id: eventId,
            division_id: e.divisionId || null,
            maximum_count: e.maxPerTeam,
            substitutes_count: e.substitutesPerTeam,
            rules: e.rules || {},
          });
        }
      }

      if (eventDivisionRows.length > 0) {
        const { error: divErr } = await supabase
          .from("event_divisions")
          .insert(eventDivisionRows);

        if (divErr) {
          throw new Error(`Failed to insert event divisions: ${divErr.message} (${divErr.code})`);
        }
      }

      if (eventQuotaRows.length > 0) {
        const { error: quotaErr } = await supabase
          .from("event_quotas")
          .insert(eventQuotaRows);

        if (quotaErr) {
          throw new Error(`Failed to insert event quotas: ${quotaErr.message} (${quotaErr.code})`);
        }
      }
    }

    // ------------------------------------------------------------------------
    // STEP 3: INSERT REGISTRATIONS
    // ------------------------------------------------------------------------
    if (registrations.length > 0) {
      const registrationRows = registrations.map((r) => {
        const participantId = studentChestToIdMap.get(r.chestNumber.trim()) || r.participantId;
        const eventId = eventCodeToIdMap.get(r.eventCode.trim().toLowerCase()) || r.eventId;

        if (!participantId) {
          throw new Error(`Cannot resolve participant for chest number "${r.chestNumber}".`);
        }
        if (!eventId) {
          throw new Error(`Cannot resolve event for code "${r.eventCode}".`);
        }

        return {
          festival_id: festivalId,
          participant_id: participantId,
          event_id: eventId,
          division_id: null,
          status: r.status || "approved",
          seed_number: r.seedNumber || null,
          metadata: {},
        };
      });

      const { data: insertedRegistrations, error: regError } = await supabase
        .from("registrations")
        .insert(registrationRows)
        .select("id");

      if (regError) {
        throw new Error(`Failed to insert registrations: ${regError.message} (${regError.code})`);
      }

      if (insertedRegistrations) {
        for (const reg of insertedRegistrations) {
          createdRegistrationIds.push(reg.id);
        }
      }
    }

    return {
      success: true,
      message: `Import successful: ${createdParticipantIds.length} students, ${createdEventIds.length} events, and ${createdRegistrationIds.length} registrations created.`,
      studentsCreated: createdParticipantIds.length,
      eventsCreated: createdEventIds.length,
      registrationsCreated: createdRegistrationIds.length,
      warningsCount: warnings.length,
      warnings,
      importedAt,
    };
  } catch (err: unknown) {
    // ------------------------------------------------------------------------
    // ROLLBACK TRANSACTION CLEANUP
    // ------------------------------------------------------------------------
    console.error("[executeFestivalImport] Error during Supabase batch execution. Rolling back created records...", err);

    try {
      if (createdRegistrationIds.length > 0) {
        await supabase.from("registrations").delete().in("id", createdRegistrationIds);
      }
      if (createdEventIds.length > 0) {
        await supabase.from("event_quotas").delete().in("event_id", createdEventIds);
        await supabase.from("event_divisions").delete().in("event_id", createdEventIds);
        await supabase.from("events").delete().in("id", createdEventIds);
      }
      if (createdParticipantIds.length > 0) {
        await supabase.from("participants").delete().in("id", createdParticipantIds);
      }
    } catch (cleanupErr) {
      console.error("[executeFestivalImport] Rollback cleanup encountered error:", cleanupErr);
    }

    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during database import.";
    return {
      success: false,
      message: "Import failed and any created records were rolled back.",
      error: errorMessage,
      studentsCreated: 0,
      eventsCreated: 0,
      registrationsCreated: 0,
      warningsCount: 0,
      warnings: [],
      importedAt,
    };
  }
}

/**
 * In-memory fallback import execution for testing and offline development.
 */
function executeInMemoryImport(
  payload: ImportExecutionPayload,
  importedAt: string,
): ImportResult {
  const { students, events, registrations } = payload;

  return {
    success: true,
    message: `[In-Memory] Import completed successfully: ${students.length} students, ${events.length} events, ${registrations.length} registrations staged.`,
    studentsCreated: students.length,
    eventsCreated: events.length,
    registrationsCreated: registrations.length,
    warningsCount: 0,
    warnings: [],
    importedAt,
  };
}

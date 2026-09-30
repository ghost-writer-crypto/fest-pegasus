import { events, type FestivalEvent } from "@/data/events";
import { CODEX_EVENTS, type CodexEvent } from "./eventClassification";
import { getEventQuota } from "./quotaEngine";
import { getPoints, POINT_MATRIX, type EventClassification } from "./scoring";
import type { QuotaRule } from "./quotas";

export type ResolvedEvent = {
  eventId: string;
  festivalEvent?: FestivalEvent;
  codexEvent?: CodexEvent;
  codexEventId: string;
  divisionId?: string;
  classification?: EventClassification;
  quota: QuotaRule | null;
  pointsMatrix?: { first: number; second: number; third: number };
  getPoints: (position: number) => number;
};

/**
 * Resolves a festival event ID (e.g., 'race-100m-majestir') to its base Codex event ID ('race-100m').
 */
export function resolveCodexEventId(eventId: string): string {
  const festivalEvent = events.find((item) => item.id === eventId);
  if (festivalEvent) {
    return festivalEvent.codexEventId;
  }

  const codexEvent = CODEX_EVENTS.find((item) => item.id === eventId);
  if (codexEvent) {
    return codexEvent.id;
  }

  return eventId;
}

/**
 * Resolves a FestivalEvent or event ID down through Codex event, classification, quota, and scoring matrix.
 * If the Codex classification is unconfirmed, classification and pointsMatrix will be undefined (not invented).
 */
export function resolveFestivalEvent(
  eventOrId: string | FestivalEvent,
): ResolvedEvent | null {
  let festivalEvent: FestivalEvent | undefined;

  if (typeof eventOrId === "object") {
    festivalEvent = eventOrId;
  } else {
    festivalEvent = events.find(
      (item) => item.id === eventOrId || item.codexEventId === eventOrId,
    );
  }

  const codexEventId = festivalEvent
    ? festivalEvent.codexEventId
    : typeof eventOrId === "string"
      ? eventOrId
      : "";

  const codexEvent = CODEX_EVENTS.find((item) => item.id === codexEventId);

  if (!festivalEvent && !codexEvent) {
    return null;
  }

  const divisionId = festivalEvent?.divisionId;
  const classification = codexEvent?.classification;
  const quota = getEventQuota(codexEventId, divisionId);
  const pointsMatrix = classification ? POINT_MATRIX[classification] : undefined;

  return {
    eventId: festivalEvent ? festivalEvent.id : codexEventId,
    festivalEvent,
    codexEvent,
    codexEventId,
    divisionId,
    classification,
    quota,
    pointsMatrix,
    getPoints: (position: number) =>
      classification ? getPoints(classification, position) : 0,
  };
}

/**
 * Safely computes event points without throwing an unhandled exception
 * if an event has an unconfirmed Codex classification.
 */
export function getSafeEventPoints(
  eventId: string,
  position: number,
): number | null {
  const codexEventId = resolveCodexEventId(eventId);
  const codexEvent = CODEX_EVENTS.find((item) => item.id === codexEventId);

  if (!codexEvent || !codexEvent.classification) {
    return null;
  }

  return getPoints(codexEvent.classification, position);
}
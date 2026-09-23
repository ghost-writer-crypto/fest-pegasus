import { getEventQuota } from "./quotaEngine";
import {
  resolveFestivalEvent,
  resolveCodexEventId,
  getSafeEventPoints,
} from "./eventResolver";

export {
  resolveFestivalEvent,
  resolveCodexEventId,
  getSafeEventPoints,
};

export function getCompetitionInfo(
  eventId: string,
  divisionId?: string,
  position?: number,
) {
  const codexId = resolveCodexEventId(eventId);
  const quota = getEventQuota(codexId, divisionId);

  const points =
    position !== undefined
      ? (getSafeEventPoints(eventId, position) ?? undefined)
      : undefined;

  return {
    eventId,
    codexEventId: codexId,
    divisionId,
    quota,
    points,
  };
}


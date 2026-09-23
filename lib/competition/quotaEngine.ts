import { CODEX_QUOTAS } from "./quotas";

export function getEventQuota(
  eventId: string,
  divisionId?: string,
) {
  const exact = CODEX_QUOTAS.find(
    (quota) =>
      quota.eventId === eventId &&
      quota.divisionId === divisionId,
  );

  if (exact) return exact;

  const general = CODEX_QUOTAS.find(
    (quota) =>
      quota.eventId === eventId &&
      !quota.divisionId,
  );

  return general ?? null;
}

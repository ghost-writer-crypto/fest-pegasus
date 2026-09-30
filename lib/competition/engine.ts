import { getPoints } from "./scoring.ts";
import { CODEX_EVENTS } from "./eventClassification.ts";

export function getEventPoints(
  eventId: string,
  position: number,
): number {
  const event = CODEX_EVENTS.find((item) => item.id === eventId);

  if (!event) {
    throw new Error(`Unknown Codex event: ${eventId}`);
  }

  if (!event.classification) {
    throw new Error(
      `Classification not confirmed for Codex event: ${event.name}`,
    );
  }

  return getPoints(event.classification, position);
}

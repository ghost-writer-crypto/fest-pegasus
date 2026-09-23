/**
 * PEGASUS Domain Eligibility Validator
 * 
 * Rules:
 * 1. An athlete has ONE base academic category / division (participants.division_id).
 * 2. An athlete can enter:
 *    a) Games belonging to their own academic division.
 *    b) General-category games (games with no division restrictions).
 * 3. Entering a General event NEVER changes the athlete's base academic category.
 * 4. Cross-category participation in another specific division is strictly forbidden.
 */

export type EligibilityResult = {
  isEligible: boolean;
  isGeneral: boolean;
  reason?: string;
};

/**
 * Validates whether an athlete from a given division can participate in an event.
 *
 * @param participantDivisionId - UUID of the athlete's base division
 * @param eventDivisionIds - Array of division UUIDs allowed for this event (empty if General)
 * @returns EligibilityResult
 */
export function validateEventEligibility(
  participantDivisionId: string | null | undefined,
  eventDivisionIds: string[],
): EligibilityResult {
  // If the event has no division restrictions, it is a General-category event
  if (!eventDivisionIds || eventDivisionIds.length === 0) {
    return {
      isEligible: true,
      isGeneral: true,
    };
  }

  if (!participantDivisionId) {
    return {
      isEligible: false,
      isGeneral: false,
      reason: "Participant does not have an assigned academic division.",
    };
  }

  if (eventDivisionIds.includes(participantDivisionId)) {
    return {
      isEligible: true,
      isGeneral: false,
    };
  }

  return {
    isEligible: false,
    isGeneral: false,
    reason: `Participant academic division does not match the required divisions for this event.`,
  };
}


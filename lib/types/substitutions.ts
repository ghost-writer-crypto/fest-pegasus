export type SubstitutionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type SubstitutionTiming = "normal" | "emergency";

export type SubstitutionPaymentStatus = "unpaid" | "paid" | "waived";

export type RegistrationSubstitutionRow = {
  id: string;
  festival_id: string;
  event_id: string;
  team_id: string;
  original_participant_id: string;
  replacement_participant_id: string;
  original_registration_id: string;
  replacement_registration_id: string | null;
  timing: SubstitutionTiming;
  fee_amount: number;
  payment_status: SubstitutionPaymentStatus;
  status: SubstitutionStatus;
  reason: string;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreateSubstitutionInput = {
  festivalId: string;
  eventId: string;
  teamId: string;
  originalParticipantId: string;
  replacementParticipantId: string;
  reason: string;
  scheduledAt?: string | null; // Used to calculate timing (>= 12h = normal ₹20, < 12h = emergency ₹50)
};

export type ReviewSubstitutionInput = {
  substitutionId: string;
  status: "approved" | "rejected";
  paymentStatus?: SubstitutionPaymentStatus;
  rejectionReason?: string | null;
};


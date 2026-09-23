import type {
  Result,
  ResultStatus,
  FestivalEvent,
  Fixture,
  Heat,
  Participant,
  Team,
  Judge,
  JudgeAssignment,
  JudgeAssignmentStatus,
} from "@/lib/types";

import type { ScoreSheetEntry } from "@/lib/results";

export type {
  Result,
  ResultStatus,
  FestivalEvent,
  Fixture,
  Heat,
  Participant,
  Team,
  Judge,
  JudgeAssignment,
  JudgeAssignmentStatus,
  ScoreSheetEntry,
};


export type JudgeSubmissionParams = {
  judgeId: string;
  judgeName: string;
  draft: Result;
  assignments?: JudgeAssignment[];
};

export type JudgeSubmissionResult = {
  success: boolean;
  result?: Result;
  error?: string;
};

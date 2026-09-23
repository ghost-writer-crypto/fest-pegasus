import type { PointClass } from "@/lib/types";

export type { PointClass };
export type EventClassification = PointClass;

export const POINT_MATRIX: Record<
  PointClass,
  { first: number; second: number; third: number }
> = {
  W: {
    first: 5,
    second: 3,
    third: 1,
  },

  X: {
    first: 5,
    second: 3,
    third: 1,
  },

  Y: {
    first: 7,
    second: 5,
    third: 3,
  },

  Z: {
    first: 10,
    second: 7,
    third: 5,
  },
};

export function getPoints(
  classification: PointClass,
  position: number,
): number {
  const matrix = POINT_MATRIX[classification];

  if (!matrix) {
    throw new Error(`Unknown event classification: ${classification}`);
  }

  if (position === 1) return matrix.first;
  if (position === 2) return matrix.second;
  if (position === 3) return matrix.third;

  return 0;
}
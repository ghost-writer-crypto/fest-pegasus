import type { PointClass, EventClassification } from "./scoring";

export type CodexEvent = {
  id: string;
  name: string;
  classification?: EventClassification;
  pointClass?: PointClass;
};

export const CODEX_EVENTS: CodexEvent[] = [
  // W - Individual: 5 / 3 / 1
  { id: "race-100m", name: "Race 100m", classification: "W", pointClass: "W" },
  { id: "long-jump", name: "Long Jump", classification: "W", pointClass: "W" },
  { id: "high-jump", name: "High Jump", classification: "W", pointClass: "W" },
  { id: "shot-put", name: "Shot Put", classification: "W", pointClass: "W" },
  { id: "javelin-throw", name: "Javelin Throw", classification: "W", pointClass: "W" },
  { id: "discus-throw", name: "Discus Throw", classification: "W", pointClass: "W" },
  { id: "badminton-singles", name: "Badminton Singles", classification: "W", pointClass: "W" },
  { id: "archery", name: "Archery", classification: "W", pointClass: "W" },
  { id: "chess", name: "Chess", classification: "W", pointClass: "W" },
  { id: "chess-general", name: "Chess General", classification: "W", pointClass: "W" },
  { id: "swimming", name: "Swimming", classification: "W", pointClass: "W" },
  { id: "shot-on-target", name: "Shot on Target", classification: "W", pointClass: "W" },
  { id: "dart-board", name: "Dart Board", classification: "W", pointClass: "W" },
  { id: "corner-kick-goal", name: "Corner Kick Goal", classification: "W", pointClass: "W" },
  { id: "freestyle", name: "Freestyle", classification: "W", pointClass: "W" },
  { id: "bowling", name: "Bowling", classification: "W", pointClass: "W" },
  { id: "skipping", name: "Skipping", classification: "W", pointClass: "W" },
  { id: "sack-race", name: "Sack Race", classification: "W", pointClass: "W" },
  { id: "slow-cycle", name: "Slow Cycle", classification: "W", pointClass: "W" },
  { id: "bottle-hit", name: "Bottle Hit", classification: "W", pointClass: "W" },
  { id: "uriyadi", name: "Uriyadi", classification: "W", pointClass: "W" },
  { id: "uriyadi-general", name: "Uriyadi General", classification: "W", pointClass: "W" },
  { id: "single-leg-hula-hoop", name: "Single Leg Hula Hoop", classification: "W", pointClass: "W" },
  { id: "thread-needle", name: "Thread and Needle", classification: "W", pointClass: "W" },
  { id: "hopscotch", name: "Hopscotch", classification: "W", pointClass: "W" },
  { id: "balloon-pyramid", name: "Balloon Pyramid", classification: "W", pointClass: "W" },
  { id: "biscuit-eating", name: "Biscuit Eating", classification: "W", pointClass: "W" },
  { id: "balloon-pop", name: "Balloon Pop", classification: "W", pointClass: "W" },
  { id: "candle-race", name: "Candle Race", classification: "W", pointClass: "W" },
  { id: "musical-chair", name: "Musical Chair", classification: "W", pointClass: "W" },
  { id: "sweet-pick", name: "Sweet Pick", classification: "W", pointClass: "W" },
  { id: "basket-throw", name: "Basket Throw", classification: "W", pointClass: "W" },
  { id: "water-filling", name: "Water Filling", classification: "W", pointClass: "W" },

  // X - Group: 5 / 3 / 1
  { id: "water-filling-group", name: "Water Filling Group", classification: "X", pointClass: "X" },
  { id: "three-legged-race", name: "Three Legged Race", classification: "X", pointClass: "X" },
  { id: "relay-4x50m", name: "Relay 4x50m", classification: "X", pointClass: "X" },
  { id: "relay-4x100m", name: "Relay 4x100m", classification: "X", pointClass: "X" },
  { id: "relay-4x200m", name: "Relay 4x200m", classification: "X", pointClass: "X" },
  { id: "badminton-doubles", name: "Badminton Doubles", classification: "X", pointClass: "X" },
  { id: "kho-kho", name: "Kho-Kho", classification: "X", pointClass: "X" },
  { id: "dodge-ball", name: "Dodge Ball", classification: "X", pointClass: "X" },

  // Y - Group: 7 / 5 / 3
  { id: "penalty-shootout", name: "Penalty Shootout", classification: "Y", pointClass: "Y" },
  { id: "tug-of-war", name: "Tug of War", classification: "Y", pointClass: "Y" },
  { id: "commentary", name: "Commentary", classification: "Y", pointClass: "Y" },
  { id: "pegasus-branding", name: "Pegasus Branding", classification: "Y", pointClass: "Y" },
  { id: "march-past-cultural-show", name: "March Past and Cultural Show", classification: "Y", pointClass: "Y" },

  // Z - General: 10 / 7 / 5
  { id: "cricket", name: "Cricket", classification: "Z", pointClass: "Z" },
  { id: "volleyball", name: "Volleyball", classification: "Z", pointClass: "Z" },
  { id: "football", name: "Football", classification: "Z", pointClass: "Z" },
  { id: "arm-wrestling", name: "Arm Wrestling", classification: "Z", pointClass: "Z" },
  { id: "push-up", name: "Push Up", classification: "Z", pointClass: "Z" },
  { id: "pull-up", name: "Pull Up", classification: "Z", pointClass: "Z" },

  // Codex classification not yet confirmed.
  { id: "crossbar-kick", name: "Crossbar Kick", classification: undefined, pointClass: undefined },
  { id: "juggling", name: "Juggling", classification: undefined, pointClass: undefined },
  { id: "race-walking-100m", name: "Race Walking 100m", classification: undefined, pointClass: undefined },
  { id: "throwball", name: "Throwball", classification: undefined, pointClass: undefined },
  { id: "uriyadi-hifz", name: "Uriyadi Hifz", classification: undefined, pointClass: undefined },
  { id: "chess-hifz", name: "Chess Hifz", classification: undefined, pointClass: undefined },
  { id: "swimming-hifz", name: "Swimming Hifz", classification: undefined, pointClass: undefined },
];

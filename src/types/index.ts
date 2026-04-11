export type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type ShiftKey = 'shift1' | 'shift2';
export type PositionName =
  | 'GK'
  | 'Left Wing'
  | 'Right Wing'
  | 'Striker'
  | 'Center Mid'
  | 'Left Back'
  | 'Right Back';

export interface Player {
  id: string;
  name: string;
  goalieWilling: boolean;
  seasonGKQuarters: number;
}

export interface PlayerAvailability {
  playerId: string;
  quarters: Record<QuarterKey, boolean>;
}

export interface SlotAssignment {
  playerId: string | null;
  locked: boolean;
}

export interface ShiftRotation {
  positions: Record<PositionName, SlotAssignment>;
  bench: SlotAssignment[];
}

export interface QuarterRotation {
  gkPlayerId: string | null;
  gkLocked: boolean;
  shift1: ShiftRotation;
  shift2: ShiftRotation;
}

export type RotationGrid = Record<QuarterKey, QuarterRotation>;

export interface Game {
  id: string;
  label: string;
  date: string;
  availability: PlayerAvailability[];
  rotation: RotationGrid | null;
}

export interface AppStorage {
  schemaVersion: number;
  roster: Player[];
  games: Game[];
}

export type ViewName = 'roster' | 'game-setup' | 'rotation';

// Warnings produced by the algorithm
export interface RotationWarning {
  quarterId: QuarterKey;
  message: string;
}

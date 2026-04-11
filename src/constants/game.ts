import type { ShiftKey, PositionName, QuarterKey } from '../types';

export const QUARTERS: QuarterKey[] = ['Q1', 'Q2', 'Q3', 'Q4'];
export const SHIFTS: ShiftKey[] = ['shift1', 'shift2'];

export const FIELD_POSITIONS: PositionName[] = [
  'Left Wing',
  'Right Wing',
  'Striker',
  'Center Mid',
  'Left Back',
  'Right Back',
];

export const GK_POSITION: PositionName = 'GK';
export const ALL_POSITIONS: PositionName[] = [GK_POSITION, ...FIELD_POSITIONS];

export const TEAM_SIZE = 7; // players on field at once (GK + 6 field)

// Flat sequence of all shift-quarters in game order
export const SHIFT_QUARTER_SEQUENCE: { quarter: QuarterKey; shift: ShiftKey }[] =
  QUARTERS.flatMap((q) => SHIFTS.map((s) => ({ quarter: q, shift: s })));

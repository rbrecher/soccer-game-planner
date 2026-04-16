import { describe, it, expect } from 'vitest';
import { computeSeasonPositions, getSeasonCount } from './seasonStats';
import type { Game, QuarterRotation, RotationGrid, SlotAssignment } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSlot(playerId: string | null): SlotAssignment {
  return { playerId, locked: false };
}

/**
 * Minimal QuarterRotation with explicit GK and per-shift field assignments.
 * shift1Positions / shift2Positions: partial map of PositionName → playerId
 */
function makeQuarterRotation(
  gkPlayerId: string | null,
  shift1Positions: Record<string, string | null> = {},
  shift2Positions: Record<string, string | null> = {},
): QuarterRotation {
  const toSlots = (map: Record<string, string | null>) =>
    Object.fromEntries(Object.entries(map).map(([pos, pid]) => [pos, makeSlot(pid)])) as never;

  return {
    gkPlayerId,
    gkLocked: false,
    shift1: { positions: toSlots(shift1Positions), bench: [] },
    shift2: { positions: toSlots(shift2Positions), bench: [] },
  };
}

function makeGame(id: string, rotation: RotationGrid | null): Game {
  return { id, label: 'Game', date: '2026-04-16', availability: [], rotation };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('computeSeasonPositions', () => {
  it('returns an empty map for an empty games array', () => {
    const result = computeSeasonPositions([]);
    expect(result.size).toBe(0);
  });

  it('returns an empty map when no game has a rotation', () => {
    const games = [makeGame('g1', null), makeGame('g2', null)];
    const result = computeSeasonPositions(games);
    expect(result.size).toBe(0);
  });

  it('counts GK as +2 per quarter (plays both shifts)', () => {
    const rotation: RotationGrid = {
      Q1: makeQuarterRotation('p1'),
      Q2: makeQuarterRotation(null),
      Q3: makeQuarterRotation(null),
      Q4: makeQuarterRotation(null),
    };
    const result = computeSeasonPositions([makeGame('g1', rotation)]);
    expect(getSeasonCount(result, 'p1', 'GK')).toBe(2);
  });

  it('counts GK +2 for each quarter the player is GK', () => {
    const rotation: RotationGrid = {
      Q1: makeQuarterRotation('p1'),
      Q2: makeQuarterRotation('p1'),
      Q3: makeQuarterRotation(null),
      Q4: makeQuarterRotation(null),
    };
    const result = computeSeasonPositions([makeGame('g1', rotation)]);
    expect(getSeasonCount(result, 'p1', 'GK')).toBe(4); // 2 quarters × 2
  });

  it('counts a field position +1 per shift played', () => {
    const rotation: RotationGrid = {
      Q1: makeQuarterRotation(null, { 'Left Wing': 'p1' }, { 'Left Wing': 'p2' }),
      Q2: makeQuarterRotation(null),
      Q3: makeQuarterRotation(null),
      Q4: makeQuarterRotation(null),
    };
    const result = computeSeasonPositions([makeGame('g1', rotation)]);
    expect(getSeasonCount(result, 'p1', 'Left Wing')).toBe(1);
    expect(getSeasonCount(result, 'p2', 'Left Wing')).toBe(1);
  });

  it('accumulates counts across multiple shifts of the same position', () => {
    const rotation: RotationGrid = {
      Q1: makeQuarterRotation(null, { 'Striker': 'p1' }, { 'Striker': 'p1' }),
      Q2: makeQuarterRotation(null, { 'Striker': 'p1' }, {}),
      Q3: makeQuarterRotation(null),
      Q4: makeQuarterRotation(null),
    };
    const result = computeSeasonPositions([makeGame('g1', rotation)]);
    expect(getSeasonCount(result, 'p1', 'Striker')).toBe(3);
  });

  it('accumulates counts across multiple games', () => {
    const rotation1: RotationGrid = {
      Q1: makeQuarterRotation('p1'),
      Q2: makeQuarterRotation(null),
      Q3: makeQuarterRotation(null),
      Q4: makeQuarterRotation(null),
    };
    const rotation2: RotationGrid = {
      Q1: makeQuarterRotation('p1'),
      Q2: makeQuarterRotation('p1'),
      Q3: makeQuarterRotation(null),
      Q4: makeQuarterRotation(null),
    };
    const result = computeSeasonPositions([
      makeGame('g1', rotation1),
      makeGame('g2', rotation2),
    ]);
    // g1: 1 quarter × 2 = 2; g2: 2 quarters × 2 = 4; total = 6
    expect(getSeasonCount(result, 'p1', 'GK')).toBe(6);
  });

  it('excludes a game by id when excludeGameId is provided', () => {
    const rotation: RotationGrid = {
      Q1: makeQuarterRotation('p1'),
      Q2: makeQuarterRotation(null),
      Q3: makeQuarterRotation(null),
      Q4: makeQuarterRotation(null),
    };
    const result = computeSeasonPositions([makeGame('g1', rotation)], 'g1');
    expect(getSeasonCount(result, 'p1', 'GK')).toBe(0);
  });

  it('only excludes the specified game, not others', () => {
    const rotation: RotationGrid = {
      Q1: makeQuarterRotation('p1'),
      Q2: makeQuarterRotation(null),
      Q3: makeQuarterRotation(null),
      Q4: makeQuarterRotation(null),
    };
    const result = computeSeasonPositions(
      [makeGame('g1', rotation), makeGame('g2', rotation)],
      'g1',
    );
    // Only g2 counted: 1 quarter × 2 = 2
    expect(getSeasonCount(result, 'p1', 'GK')).toBe(2);
  });

  it('skips null playerId slots without throwing', () => {
    const rotation: RotationGrid = {
      Q1: makeQuarterRotation(null, { 'Left Wing': null }, { 'Left Wing': null }),
      Q2: makeQuarterRotation(null),
      Q3: makeQuarterRotation(null),
      Q4: makeQuarterRotation(null),
    };
    const result = computeSeasonPositions([makeGame('g1', rotation)]);
    expect(result.size).toBe(0);
  });
});

describe('getSeasonCount', () => {
  it('returns 0 for an unknown player', () => {
    expect(getSeasonCount(new Map(), 'unknown', 'GK')).toBe(0);
  });

  it('returns 0 for a known player with no count for that position', () => {
    const map = new Map([['p1', { 'Left Wing': 3 } as Record<string, number>]]);
    expect(getSeasonCount(map as never, 'p1', 'GK')).toBe(0);
  });
});

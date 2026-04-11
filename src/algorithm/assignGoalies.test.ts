import { describe, it, expect } from 'vitest';
import { assignGoalies } from './assignGoalies';
import { makePlayer, makeAvailabilityAll, makeAvailability } from '../test-utils/fixtures';
import type { RotationGrid } from '../types';

// Helper to build the minimal QuarterRotation shape that assignGoalies reads
// (only gkPlayerId and gkLocked are accessed)
function lockedQuarter(gkPlayerId: string): Partial<RotationGrid[keyof RotationGrid]> {
  return {
    gkPlayerId,
    gkLocked: true,
    shift1: { positions: {} as never, bench: [] },
    shift2: { positions: {} as never, bench: [] },
  };
}

describe('assignGoalies', () => {
  it('assigns a non-null GK to each quarter when enough willing players exist', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', goalieWilling: true }),
      makePlayer({ id: 'p2', name: 'Bob', goalieWilling: true }),
      makePlayer({ id: 'p3', name: 'Carol', goalieWilling: true }),
      makePlayer({ id: 'p4', name: 'Dave', goalieWilling: true }),
    ];
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    const { gkMap, warnings } = assignGoalies(players, availability, {});

    expect(gkMap.Q1).not.toBeNull();
    expect(gkMap.Q2).not.toBeNull();
    expect(gkMap.Q3).not.toBeNull();
    expect(gkMap.Q4).not.toBeNull();
    expect(warnings).toHaveLength(0);
  });

  it('prefers willing players over non-willing players', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', goalieWilling: false }),
      makePlayer({ id: 'p2', name: 'Bob', goalieWilling: true, seasonGKQuarters: 99 }),
    ];
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    const { gkMap } = assignGoalies(players, availability, {});

    // Q1 should get the willing player even though they have many season GK quarters
    expect(gkMap.Q1).toBe('p2');
  });

  it('prefers the player with fewer seasonGKQuarters', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', goalieWilling: true, seasonGKQuarters: 2 }),
      makePlayer({ id: 'p2', name: 'Bob', goalieWilling: true, seasonGKQuarters: 0 }),
    ];
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    const { gkMap } = assignGoalies(players, availability, {});

    expect(gkMap.Q1).toBe('p2'); // fewer season GK quarters = higher priority
  });

  it('breaks ties in seasonGKQuarters by name ASC', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Zara', goalieWilling: true, seasonGKQuarters: 0 }),
      makePlayer({ id: 'p2', name: 'Alice', goalieWilling: true, seasonGKQuarters: 0 }),
    ];
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    const { gkMap } = assignGoalies(players, availability, {});

    expect(gkMap.Q1).toBe('p2'); // Alice < Zara alphabetically
  });

  it('falls back to a non-willing player when no willing player is available and emits a warning', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', goalieWilling: false }),
    ];
    const availability = [makeAvailabilityAll('p1')];
    const { gkMap, warnings } = assignGoalies(players, availability, {});

    expect(gkMap.Q1).toBe('p1');
    const q1Warning = warnings.find((w) => w.quarterId === 'Q1');
    expect(q1Warning).toBeDefined();
    expect(q1Warning?.message).toContain('fallback');
  });

  it('assigns null and emits a warning when no player is available for a quarter', () => {
    // p1 is the only player, unavailable for Q1
    const players = [makePlayer({ id: 'p1', name: 'Alice', goalieWilling: true })];
    const availability = [makeAvailability('p1', { Q1: false })];
    const { gkMap, warnings } = assignGoalies(players, availability, {});

    expect(gkMap.Q1).toBeNull();
    const q1Warning = warnings.find((w) => w.quarterId === 'Q1');
    expect(q1Warning).toBeDefined();
    expect(q1Warning?.message).toContain('No players available');
  });

  it('treats a player with no PlayerAvailability record as available (default)', () => {
    const players = [makePlayer({ id: 'p1', name: 'Alice', goalieWilling: true })];
    // No availability record provided at all
    const { gkMap } = assignGoalies(players, [], {});

    // Player defaults to available for all quarters; Q1 assigned, Q2+ null (only one player)
    expect(gkMap.Q1).toBe('p1');
  });

  it('preserves locked GK assignments from existingGrid', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', goalieWilling: true, seasonGKQuarters: 0 }),
      makePlayer({ id: 'p2', name: 'Bob', goalieWilling: true, seasonGKQuarters: 0 }),
    ];
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    // Lock Q1 to p2 (normally p1/Alice would win the sort)
    const existingGrid: Partial<RotationGrid> = {
      Q1: lockedQuarter('p2') as RotationGrid['Q1'],
    };
    const { gkMap } = assignGoalies(players, availability, existingGrid);

    expect(gkMap.Q1).toBe('p2'); // locked → preserved despite sort order
  });

  it('excludes a locked-GK player from the eligibility pool for subsequent quarters', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', goalieWilling: true, seasonGKQuarters: 0 }),
      makePlayer({ id: 'p2', name: 'Bob', goalieWilling: true, seasonGKQuarters: 5 }),
    ];
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    // Lock Q1 to p1 (Alice) — she would normally be preferred for Q2 too
    const existingGrid: Partial<RotationGrid> = {
      Q1: lockedQuarter('p1') as RotationGrid['Q1'],
    };
    const { gkMap } = assignGoalies(players, availability, existingGrid);

    expect(gkMap.Q1).toBe('p1');
    // p1 is in usedAsGK, so Q2 must fall to p2
    expect(gkMap.Q2).toBe('p2');
  });

  it('respects per-quarter availability when assigning GK', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', goalieWilling: true, seasonGKQuarters: 0 }),
      makePlayer({ id: 'p2', name: 'Bob', goalieWilling: true, seasonGKQuarters: 0 }),
    ];
    const availability = [
      makeAvailability('p1', { Q2: false }), // Alice unavailable Q2
      makeAvailabilityAll('p2'),
    ];
    // Alice comes first alphabetically → assigned Q1. Q2 must go to Bob.
    const { gkMap } = assignGoalies(players, availability, {});

    expect(gkMap.Q1).toBe('p1'); // Alice gets Q1
    expect(gkMap.Q2).toBe('p2'); // Bob gets Q2 (Alice unavailable)
  });
});

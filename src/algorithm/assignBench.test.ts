import { describe, it, expect } from 'vitest';
import { assignBench } from './assignBench';
import { assignGoalies } from './assignGoalies';
import { makeFullRoster, makeAvailabilityAll, makeAvailability, makePlayer } from '../test-utils/fixtures';
import { QUARTERS, SHIFTS } from '../constants/game';
import type { QuarterKey, RotationGrid } from '../types';

/** Run assignGoalies + assignBench on a standard roster with all-available. */
function runBench(playerCount: number) {
  const players = makeFullRoster(playerCount);
  const availability = players.map((p) => makeAvailabilityAll(p.id));
  const { gkMap } = assignGoalies(players, availability, {});
  const benchMap = assignBench(players, availability, gkMap, {});
  return { players, availability, gkMap, benchMap };
}

describe('assignBench', () => {
  it('produces 1 bench player per shift when roster is exactly 8', () => {
    const { gkMap, benchMap } = runBench(8);

    for (const q of QUARTERS) {
      expect(benchMap[q].shift1).toHaveLength(1);
      expect(benchMap[q].shift2).toHaveLength(1);
      // GK should not be on bench
      expect(benchMap[q].shift1).not.toContain(gkMap[q]);
      expect(benchMap[q].shift2).not.toContain(gkMap[q]);
    }
  });

  it('produces an empty bench when roster is exactly 7', () => {
    const { benchMap } = runBench(7);

    for (const q of QUARTERS) {
      expect(benchMap[q].shift1).toHaveLength(0);
      expect(benchMap[q].shift2).toHaveLength(0);
    }
  });

  it('distributes bench time fairly (counts within ±2) across a 12-player roster', () => {
    const { benchMap } = runBench(12);

    const benchCounts = new Map<string, number>();
    for (const q of QUARTERS) {
      for (const shift of SHIFTS) {
        for (const pid of benchMap[q][shift]) {
          benchCounts.set(pid, (benchCounts.get(pid) ?? 0) + 1);
        }
      }
    }

    const counts = [...benchCounts.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });

  it('avoids consecutive bench stints when alternatives exist (8-player roster)', () => {
    const { benchMap } = runBench(8);

    // With 8 players, bench = 1 per shift and 7 non-GK candidates per shift.
    // The algorithm should always pick a different player for back-to-back shifts.
    for (const q of QUARTERS) {
      for (const pid of benchMap[q].shift1) {
        expect(benchMap[q].shift2).not.toContain(pid);
      }
    }
  });

  it('permits consecutive bench when forced (cross-quarter boundary)', () => {
    // With a very large roster (14+), forced consecutive is mathematically possible.
    // The key assertion: the algorithm should not throw, and should still produce
    // a valid bench (correct length).
    const players = makeFullRoster(14);
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    const { gkMap } = assignGoalies(players, availability, {});

    expect(() => assignBench(players, availability, gkMap, {})).not.toThrow();

    const benchMap = assignBench(players, availability, gkMap, {});
    // Bench count per shift = 14 - 7 = 7
    for (const q of QUARTERS) {
      expect(benchMap[q].shift1).toHaveLength(7);
      expect(benchMap[q].shift2).toHaveLength(7);
    }
  });

  it('preserves locked bench entries from existingGrid', () => {
    const players = makeFullRoster(10);
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    const { gkMap } = assignGoalies(players, availability, {});

    // Build an existingGrid with a locked bench slot in Q1/shift1.
    // Use a player that is not the Q1 GK.
    const nonGkPlayer = players.find((p) => p.id !== gkMap.Q1)!;
    const existingGrid: Partial<RotationGrid> = {
      Q1: {
        gkPlayerId: gkMap.Q1,
        gkLocked: false,
        shift1: {
          positions: {} as never,
          bench: [{ playerId: nonGkPlayer.id, locked: true }],
        },
        shift2: { positions: {} as never, bench: [] },
      },
    };

    const benchMap = assignBench(players, availability, gkMap, existingGrid);
    expect(benchMap.Q1.shift1).toContain(nonGkPlayer.id);
  });

  it('does not bench unavailable players', () => {
    const players = makeFullRoster(10);
    const targetPlayer = players[0];
    const availability = [
      makeAvailability(targetPlayer.id, { Q3: false }),
      ...players.slice(1).map((p) => makeAvailabilityAll(p.id)),
    ];
    const { gkMap } = assignGoalies(players, availability, {});
    const benchMap = assignBench(players, availability, gkMap, {});

    expect(benchMap.Q3.shift1).not.toContain(targetPlayer.id);
    expect(benchMap.Q3.shift2).not.toContain(targetPlayer.id);
  });

  it('still includes a locked bench entry even when benchNeeded is 0 (7 players)', () => {
    // With 7 players, bench = 0. But a locked bench slot in existingGrid should survive.
    const players = makeFullRoster(7);
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    const { gkMap } = assignGoalies(players, availability, {});

    const nonGkPlayer = players.find((p) => p.id !== gkMap.Q1)!;
    const existingGrid: Partial<RotationGrid> = {
      Q1: {
        gkPlayerId: gkMap.Q1,
        gkLocked: false,
        shift1: {
          positions: {} as never,
          bench: [{ playerId: nonGkPlayer.id, locked: true }],
        },
        shift2: { positions: {} as never, bench: [] },
      },
    };

    const benchMap = assignBench(players, availability, gkMap, existingGrid);
    // Locked player preserved despite benchNeeded = 0
    expect(benchMap.Q1.shift1).toContain(nonGkPlayer.id);
  });

  it('does not bench a player in the quarter they serve as GK', () => {
    const players = makeFullRoster(10);
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    const { gkMap } = assignGoalies(players, availability, {});
    const benchMap = assignBench(players, availability, gkMap, {});

    for (const q of QUARTERS as QuarterKey[]) {
      const gkId = gkMap[q];
      if (gkId) {
        expect(benchMap[q].shift1).not.toContain(gkId);
        expect(benchMap[q].shift2).not.toContain(gkId);
      }
    }
  });

  it('uses a single non-willing player as GK without crashing (edge: 1 player, no willing)', () => {
    const players = [makePlayer({ id: 'p1', name: 'Solo', goalieWilling: false })];
    const availability = [makeAvailabilityAll('p1')];
    const { gkMap } = assignGoalies(players, availability, {});

    expect(() => assignBench(players, availability, gkMap, {})).not.toThrow();
  });
});

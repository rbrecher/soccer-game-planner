import { describe, it, expect } from 'vitest';
import { assignPositions } from './assignPositions';
import { assignBench } from './assignBench';
import { assignGoalies } from './assignGoalies';
import { makeFullRoster, makeAvailabilityAll, makeAvailability } from '../test-utils/fixtures';
import { FIELD_POSITIONS, QUARTERS, SHIFTS } from '../constants/game';
import type { RotationGrid } from '../types';

/** Run the full pipeline up to assignPositions and return all results. */
function runPipeline(playerCount: number) {
  const players = makeFullRoster(playerCount);
  const availability = players.map((p) => makeAvailabilityAll(p.id));
  const { gkMap } = assignGoalies(players, availability, {});
  const benchMap = assignBench(players, availability, gkMap, {});
  const grid = assignPositions(players, availability, gkMap, benchMap, {});
  return { players, availability, gkMap, benchMap, grid };
}

describe('assignPositions', () => {
  it('fills every field position with a non-null playerId', () => {
    const { grid } = runPipeline(10);

    for (const q of QUARTERS) {
      for (const shift of SHIFTS) {
        for (const pos of FIELD_POSITIONS) {
          expect(grid[q][shift].positions[pos].playerId).not.toBeNull();
        }
      }
    }
  });

  it('does not assign the same player to two slots in the same shift', () => {
    const { grid } = runPipeline(10);

    for (const q of QUARTERS) {
      for (const shift of SHIFTS) {
        const seen = new Set<string>();

        // GK
        const gkId = grid[q].gkPlayerId;
        if (gkId) {
          expect(seen.has(gkId)).toBe(false);
          seen.add(gkId);
        }

        // Field positions
        for (const pos of FIELD_POSITIONS) {
          const pid = grid[q][shift].positions[pos].playerId;
          if (pid) {
            expect(seen.has(pid)).toBe(false);
            seen.add(pid);
          }
        }

        // Bench
        for (const slot of grid[q][shift].bench) {
          if (slot.playerId) {
            expect(seen.has(slot.playerId)).toBe(false);
            seen.add(slot.playerId);
          }
        }
      }
    }
  });

  it('preserves locked position assignments from existingGrid', () => {
    const { players, availability, gkMap, benchMap, grid: freshGrid } = runPipeline(10);

    const lockedPid = freshGrid.Q1.shift1.positions['Left Back'].playerId!;

    const existingGrid: Partial<RotationGrid> = {
      Q1: {
        gkPlayerId: gkMap.Q1,
        gkLocked: false,
        shift1: {
          positions: {
            ...freshGrid.Q1.shift1.positions,
            'Left Back': { playerId: lockedPid, locked: true },
          },
          bench: freshGrid.Q1.shift1.bench,
        },
        shift2: freshGrid.Q1.shift2,
      },
    };

    const newGrid = assignPositions(players, availability, gkMap, benchMap, existingGrid);
    expect(newGrid.Q1.shift1.positions['Left Back'].playerId).toBe(lockedPid);
    expect(newGrid.Q1.shift1.positions['Left Back'].locked).toBe(true);
  });

  it('maximises position variety: no player repeats a field position more than twice', () => {
    // 12 players; each gets ~4 field appearances across 8 shifts.
    // The greedy variety algorithm should keep per-position counts at ≤ 2.
    const { grid } = runPipeline(12);

    const posCounts = new Map<string, Map<string, number>>();
    for (const q of QUARTERS) {
      for (const shift of SHIFTS) {
        for (const pos of FIELD_POSITIONS) {
          const pid = grid[q][shift].positions[pos].playerId;
          if (!pid) continue;
          if (!posCounts.has(pid)) posCounts.set(pid, new Map());
          const counts = posCounts.get(pid)!;
          counts.set(pos, (counts.get(pos) ?? 0) + 1);
        }
      }
    }

    for (const [, counts] of posCounts) {
      for (const [, count] of counts) {
        expect(count).toBeLessThanOrEqual(2);
      }
    }
  });

  it('counts locked-shift position in history so the player gets a different slot the next shift', () => {
    // Use exactly 7 players so bench = 0 and all non-GK players must appear on field every shift.
    const players = makeFullRoster(7);
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    const { gkMap } = assignGoalies(players, availability, {});
    const benchMap = assignBench(players, availability, gkMap, {});

    // Generate fresh grid to find which players are on field in Q1
    const freshGrid = assignPositions(players, availability, gkMap, benchMap, {});

    // Pick any non-GK player to lock at Left Back in Q1/shift1
    const q1GkId = gkMap.Q1;
    const nonGkPlayer = players.find((p) => p.id !== q1GkId)!;

    const existingGrid: Partial<RotationGrid> = {
      Q1: {
        gkPlayerId: gkMap.Q1,
        gkLocked: false,
        shift1: {
          positions: {
            ...freshGrid.Q1.shift1.positions,
            'Left Back': { playerId: nonGkPlayer.id, locked: true },
          },
          bench: [],
        },
        shift2: freshGrid.Q1.shift2,
      },
    };

    const newGrid = assignPositions(players, availability, gkMap, benchMap, existingGrid);

    // With bench=0 and 7 players, non-GK players are always on field.
    // Left Back lock in Q1/shift1 adds to position history.
    // Q1/shift2 should assign a different player to Left Back.
    expect(newGrid.Q1.shift2.positions['Left Back'].playerId).not.toBe(nonGkPlayer.id);
  });

  it('does not assign bench players to field positions', () => {
    const { benchMap, grid } = runPipeline(10);

    for (const q of QUARTERS) {
      for (const shift of SHIFTS) {
        const benchIds = new Set(benchMap[q][shift]);
        for (const pos of FIELD_POSITIONS) {
          const pid = grid[q][shift].positions[pos].playerId;
          if (pid) {
            expect(benchIds.has(pid)).toBe(false);
          }
        }
      }
    }
  });

  it('does not assign unavailable players to field positions or bench', () => {
    const players = makeFullRoster(10);
    // Make player-0 unavailable for Q1 only
    const availability = players.map((p) =>
      p.id === 'player-0' ? makeAvailability(p.id, { Q1: false }) : makeAvailabilityAll(p.id),
    );
    const { gkMap } = assignGoalies(players, availability, {});
    const benchMap = assignBench(players, availability, gkMap, {});
    const grid = assignPositions(players, availability, gkMap, benchMap, {});

    // player-0 must not appear anywhere in Q1
    for (const shift of SHIFTS) {
      for (const pos of FIELD_POSITIONS) {
        expect(grid['Q1'][shift].positions[pos].playerId).not.toBe('player-0');
      }
      expect(grid['Q1'][shift].bench.map((s) => s.playerId)).not.toContain('player-0');
    }

    // player-0 should still appear in other quarters
    const appearsElsewhere = (['Q2', 'Q3', 'Q4'] as const).some((q) =>
      SHIFTS.some((shift) =>
        FIELD_POSITIONS.some(
          (pos) => grid[q][shift].positions[pos].playerId === 'player-0',
        ) || grid[q][shift].bench.some((s) => s.playerId === 'player-0'),
      ),
    );
    expect(appearsElsewhere).toBe(true);
  });
});

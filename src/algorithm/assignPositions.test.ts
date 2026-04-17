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

  it('player locked at a position in shift1 carries over to the same position in shift2 when bench=0', () => {
    // Use exactly 7 players so bench = 0 and all non-GK players stay on field every shift.
    // Carryover: a player remaining on field should keep their position from shift1 to shift2.
    const players = makeFullRoster(7);
    const availability = players.map((p) => makeAvailabilityAll(p.id));
    const { gkMap } = assignGoalies(players, availability, {});
    const benchMap = assignBench(players, availability, gkMap, {});

    const freshGrid = assignPositions(players, availability, gkMap, benchMap, {});

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

    // With bench=0, all non-GK players remain on field in shift2, so all carry over.
    // The locked player at Left Back in shift1 should also be at Left Back in shift2.
    expect(newGrid.Q1.shift2.positions['Left Back'].playerId).toBe(nonGkPlayer.id);
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

  describe('carryover: players remaining on field keep their position for shift2', () => {
    it('player on field in both shifts keeps their position from shift1', () => {
      const { grid } = runPipeline(10);

      for (const q of QUARTERS) {
        const shift2BenchIds = new Set(grid[q].shift2.bench.map((s) => s.playerId));

        for (const pos of FIELD_POSITIONS) {
          const pid = grid[q].shift1.positions[pos].playerId;
          if (!pid) continue;
          if (!shift2BenchIds.has(pid)) {
            // Player stays on field — must occupy the same position in shift2
            expect(grid[q].shift2.positions[pos].playerId).toBe(pid);
          }
        }
      }
    });

    it('player who subs out in shift2 vacates their shift1 position', () => {
      // With 8 players there will be bench slots, so some players sub out
      const players = makeFullRoster(8);
      const availability = players.map((p) => makeAvailabilityAll(p.id));
      const { gkMap } = assignGoalies(players, availability, {});
      const benchMap = assignBench(players, availability, gkMap, {});
      const grid = assignPositions(players, availability, gkMap, benchMap, {});

      let checkedAtLeastOne = false;
      for (const q of QUARTERS) {
        for (const pos of FIELD_POSITIONS) {
          const pid = grid[q].shift1.positions[pos].playerId;
          if (!pid) continue;
          const subbedOut = grid[q].shift2.bench.some((s) => s.playerId === pid);
          if (subbedOut) {
            // Their shift1 position should be filled by someone else in shift2
            expect(grid[q].shift2.positions[pos].playerId).not.toBe(pid);
            checkedAtLeastOne = true;
          }
        }
      }
      expect(checkedAtLeastOne).toBe(true);
    });

    it('with no bench (7 players), shift2 field positions are identical to shift1', () => {
      const players = makeFullRoster(7);
      const availability = players.map((p) => makeAvailabilityAll(p.id));
      const { gkMap } = assignGoalies(players, availability, {});
      const benchMap = assignBench(players, availability, gkMap, {});
      const grid = assignPositions(players, availability, gkMap, benchMap, {});

      for (const q of QUARTERS) {
        for (const pos of FIELD_POSITIONS) {
          expect(grid[q].shift2.positions[pos].playerId).toBe(
            grid[q].shift1.positions[pos].playerId,
          );
        }
      }
    });

    it('positions reshuffle at the start of a new quarter even when there is no bench', () => {
      const players = makeFullRoster(7);
      const availability = players.map((p) => makeAvailabilityAll(p.id));
      const { gkMap } = assignGoalies(players, availability, {});
      const benchMap = assignBench(players, availability, gkMap, {});
      const grid = assignPositions(players, availability, gkMap, benchMap, {});

      // Collect non-GK field assignments for shift1 of each quarter
      const fingerprints = QUARTERS.map((q) =>
        FIELD_POSITIONS.map((pos) => `${pos}:${grid[q].shift1.positions[pos].playerId}`).join('|'),
      );

      // With variety tracking across quarters, not every quarter can be identical
      const allIdentical = fingerprints.every((f) => f === fingerprints[0]);
      expect(allIdentical).toBe(false);
    });

    it('hard lock in shift2 for a different player overrides carryover', () => {
      const players = makeFullRoster(10);
      const availability = players.map((p) => makeAvailabilityAll(p.id));
      const { gkMap } = assignGoalies(players, availability, {});
      const benchMap = assignBench(players, availability, gkMap, {});
      const freshGrid = assignPositions(players, availability, gkMap, benchMap, {});

      const gkId = gkMap.Q1;
      const shift2BenchIds = new Set(freshGrid.Q1.shift2.bench.map((s) => s.playerId));

      // Find any position whose shift1 player is NOT benched in shift2 (a natural carryover candidate)
      let carryoverPos: (typeof FIELD_POSITIONS)[number] | null = null;
      let carryoverCandidate: string | null = null;
      for (const pos of FIELD_POSITIONS) {
        const pid = freshGrid.Q1.shift1.positions[pos].playerId;
        if (pid && !shift2BenchIds.has(pid)) {
          carryoverPos = pos;
          carryoverCandidate = pid;
          break;
        }
      }
      expect(carryoverCandidate).not.toBeNull();

      // Pick a different on-field player to hard-lock at the same position in shift2
      const override = players.find(
        (p) =>
          p.id !== gkId &&
          p.id !== carryoverCandidate &&
          !shift2BenchIds.has(p.id),
      )!;

      const existingGrid: Partial<RotationGrid> = {
        Q1: {
          gkPlayerId: gkMap.Q1,
          gkLocked: false,
          shift1: freshGrid.Q1.shift1,
          shift2: {
            ...freshGrid.Q1.shift2,
            positions: {
              ...freshGrid.Q1.shift2.positions,
              [carryoverPos!]: { playerId: override.id, locked: true },
            },
          },
        },
      };

      const newGrid = assignPositions(players, availability, gkMap, benchMap, existingGrid);
      // Hard lock wins — override player holds the position
      expect(newGrid.Q1.shift2.positions[carryoverPos!].playerId).toBe(override.id);
      // Displaced carryover candidate must appear somewhere else on the field
      const shift2FieldPids = FIELD_POSITIONS.map(
        (pos) => newGrid.Q1.shift2.positions[pos].playerId,
      );
      expect(shift2FieldPids).toContain(carryoverCandidate);
    });
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

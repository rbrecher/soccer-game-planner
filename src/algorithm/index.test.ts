import { describe, it, expect } from 'vitest';
import { generateRotation } from './index';
import { makeFullRoster, makeGame } from '../test-utils/fixtures';
import { FIELD_POSITIONS, QUARTERS, SHIFTS } from '../constants/game';
import type { RotationGrid } from '../types';

describe('generateRotation', () => {
  it('produces a grid with the correct shape for all quarters and shifts', () => {
    const players = makeFullRoster(10);
    const game = makeGame(players);
    const { grid } = generateRotation(players, game);

    for (const q of QUARTERS) {
      expect(grid[q]).toBeDefined();
      expect(grid[q].shift1).toBeDefined();
      expect(grid[q].shift2).toBeDefined();
      expect(Array.isArray(grid[q].shift1.bench)).toBe(true);
      expect(Array.isArray(grid[q].shift2.bench)).toBe(true);
      for (const shift of SHIFTS) {
        for (const pos of FIELD_POSITIONS) {
          expect(grid[q][shift].positions[pos]).toBeDefined();
        }
      }
    }
  });

  it('never assigns the same player twice in a single shift (positions + bench + GK)', () => {
    const players = makeFullRoster(10);
    const { grid } = generateRotation(players, makeGame(players));

    for (const q of QUARTERS) {
      for (const shift of SHIFTS) {
        const seen = new Set<string>();

        const gkId = grid[q].gkPlayerId;
        if (gkId) {
          expect(seen.has(gkId)).toBe(false);
          seen.add(gkId);
        }
        for (const pos of FIELD_POSITIONS) {
          const pid = grid[q][shift].positions[pos].playerId;
          if (pid) {
            expect(seen.has(pid)).toBe(false);
            seen.add(pid);
          }
        }
        for (const slot of grid[q][shift].bench) {
          if (slot.playerId) {
            expect(seen.has(slot.playerId)).toBe(false);
            seen.add(slot.playerId);
          }
        }
      }
    }
  });

  it('never places the quarter GK in the bench for that quarter', () => {
    const players = makeFullRoster(10);
    const { grid } = generateRotation(players, makeGame(players));

    for (const q of QUARTERS) {
      const gkId = grid[q].gkPlayerId;
      if (!gkId) continue;
      const shift1BenchIds = grid[q].shift1.bench.map((s) => s.playerId);
      const shift2BenchIds = grid[q].shift2.bench.map((s) => s.playerId);
      expect(shift1BenchIds).not.toContain(gkId);
      expect(shift2BenchIds).not.toContain(gkId);
    }
  });

  it('preserves a locked field-position slot when re-run with existingGrid', () => {
    const players = makeFullRoster(10);
    const game = makeGame(players);
    const { grid: initial } = generateRotation(players, game);

    const lockedPid = initial.Q1.shift1.positions['Striker'].playerId;
    if (!lockedPid) return; // guard

    const existingGrid: RotationGrid = JSON.parse(JSON.stringify(initial));
    existingGrid.Q1.shift1.positions['Striker'] = { playerId: lockedPid, locked: true };

    const { grid: reopt } = generateRotation(players, game, existingGrid);
    expect(reopt.Q1.shift1.positions['Striker'].playerId).toBe(lockedPid);
    expect(reopt.Q1.shift1.positions['Striker'].locked).toBe(true);
  });

  it('preserves a locked bench entry when re-run with existingGrid', () => {
    const players = makeFullRoster(10);
    const game = makeGame(players);
    const { grid: initial } = generateRotation(players, game);

    const firstBench = initial.Q1.shift1.bench;
    if (firstBench.length === 0) return; // guard — needs a benched player
    const lockedPid = firstBench[0].playerId!;

    const existingGrid: RotationGrid = JSON.parse(JSON.stringify(initial));
    existingGrid.Q1.shift1.bench = [{ playerId: lockedPid, locked: true }];

    const { grid: reopt } = generateRotation(players, game, existingGrid);
    const benchPids = reopt.Q1.shift1.bench.map((s) => s.playerId);
    expect(benchPids).toContain(lockedPid);
    const lockedSlot = reopt.Q1.shift1.bench.find((s) => s.playerId === lockedPid);
    expect(lockedSlot?.locked).toBe(true);
  });

  it('preserves a locked GK when re-run with existingGrid', () => {
    const players = makeFullRoster(10);
    const game = makeGame(players);
    const { grid: initial } = generateRotation(players, game);

    const lockedGkId = initial.Q1.gkPlayerId!;
    const existingGrid: RotationGrid = JSON.parse(JSON.stringify(initial));
    existingGrid.Q1.gkLocked = true;

    const { grid: reopt } = generateRotation(players, game, existingGrid);
    expect(reopt.Q1.gkPlayerId).toBe(lockedGkId);
    expect(reopt.Q1.gkLocked).toBe(true);
  });

  it('returns a fallback warning when no goalie-willing players exist', () => {
    const players = makeFullRoster(8).map((p) => ({ ...p, goalieWilling: false }));
    const game = makeGame(players);
    const { warnings } = generateRotation(players, game);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].quarterId).toBeDefined();
    expect(warnings[0].message).toContain('fallback');
  });

  it('returns a null-GK warning when no players are available for a quarter', () => {
    // Only 1 player; Q2+ will have no one left after Q1 claims them.
    const players = makeFullRoster(1);
    const game = makeGame(players);
    const { warnings } = generateRotation(players, game);

    const nullWarning = warnings.find((w) => w.message.includes('No players available'));
    expect(nullWarning).toBeDefined();
  });
});

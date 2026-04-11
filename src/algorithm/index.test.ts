import { describe, it, expect } from 'vitest';
import { generateRotation } from './index';
import { makeFullRoster, makeGame } from '../test-utils/fixtures';
import { FIELD_POSITIONS, QUARTERS, HALVES } from '../constants/game';
import type { RotationGrid } from '../types';

describe('generateRotation', () => {
  it('produces a grid with the correct shape for all quarters and halves', () => {
    const players = makeFullRoster(10);
    const game = makeGame(players);
    const { grid } = generateRotation(players, game);

    for (const q of QUARTERS) {
      expect(grid[q]).toBeDefined();
      expect(grid[q].first).toBeDefined();
      expect(grid[q].second).toBeDefined();
      expect(Array.isArray(grid[q].first.bench)).toBe(true);
      expect(Array.isArray(grid[q].second.bench)).toBe(true);
      for (const half of HALVES) {
        for (const pos of FIELD_POSITIONS) {
          expect(grid[q][half].positions[pos]).toBeDefined();
        }
      }
    }
  });

  it('never assigns the same player twice in a single half-quarter (positions + bench + GK)', () => {
    const players = makeFullRoster(10);
    const { grid } = generateRotation(players, makeGame(players));

    for (const q of QUARTERS) {
      for (const half of HALVES) {
        const seen = new Set<string>();

        const gkId = grid[q].gkPlayerId;
        if (gkId) {
          expect(seen.has(gkId)).toBe(false);
          seen.add(gkId);
        }
        for (const pos of FIELD_POSITIONS) {
          const pid = grid[q][half].positions[pos].playerId;
          if (pid) {
            expect(seen.has(pid)).toBe(false);
            seen.add(pid);
          }
        }
        for (const slot of grid[q][half].bench) {
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
      const firstBenchIds = grid[q].first.bench.map((s) => s.playerId);
      const secondBenchIds = grid[q].second.bench.map((s) => s.playerId);
      expect(firstBenchIds).not.toContain(gkId);
      expect(secondBenchIds).not.toContain(gkId);
    }
  });

  it('preserves a locked field-position slot when re-run with existingGrid', () => {
    const players = makeFullRoster(10);
    const game = makeGame(players);
    const { grid: initial } = generateRotation(players, game);

    const lockedPid = initial.Q1.first.positions['Striker'].playerId;
    if (!lockedPid) return; // guard

    const existingGrid: RotationGrid = JSON.parse(JSON.stringify(initial));
    existingGrid.Q1.first.positions['Striker'] = { playerId: lockedPid, locked: true };

    const { grid: reopt } = generateRotation(players, game, existingGrid);
    expect(reopt.Q1.first.positions['Striker'].playerId).toBe(lockedPid);
    expect(reopt.Q1.first.positions['Striker'].locked).toBe(true);
  });

  it('preserves a locked bench entry when re-run with existingGrid', () => {
    const players = makeFullRoster(10);
    const game = makeGame(players);
    const { grid: initial } = generateRotation(players, game);

    const firstBench = initial.Q1.first.bench;
    if (firstBench.length === 0) return; // guard — needs a benched player
    const lockedPid = firstBench[0].playerId!;

    const existingGrid: RotationGrid = JSON.parse(JSON.stringify(initial));
    existingGrid.Q1.first.bench = [{ playerId: lockedPid, locked: true }];

    const { grid: reopt } = generateRotation(players, game, existingGrid);
    const benchPids = reopt.Q1.first.bench.map((s) => s.playerId);
    expect(benchPids).toContain(lockedPid);
    const lockedSlot = reopt.Q1.first.bench.find((s) => s.playerId === lockedPid);
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

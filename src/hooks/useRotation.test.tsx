import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRotation } from './useRotation';
import { generateRotation } from '../algorithm';
import { makeFullRoster, makeGame } from '../test-utils/fixtures';
import { FIELD_POSITIONS, QUARTERS, SHIFTS } from '../constants/game';
import type { Game, RotationGrid } from '../types';

/** Extract the rotation saved via the most recent onGameUpdate call. */
function lastSavedGrid(onGameUpdate: ReturnType<typeof vi.fn>): RotationGrid {
  const lastCall = onGameUpdate.mock.calls[onGameUpdate.mock.calls.length - 1];
  return (lastCall[1] as Partial<Game>).rotation as RotationGrid;
}

/** Set up hook with a 10-player roster and a freshly generated rotation. */
function setup() {
  const players = makeFullRoster(10);
  const { grid: initialGrid } = generateRotation(players, makeGame(players));
  const game = makeGame(players, initialGrid);
  const onGameUpdate = vi.fn();

  const { result } = renderHook(() => useRotation({ players, game, allGames: [], onGameUpdate }));
  return { result, players, game, initialGrid, onGameUpdate };
}

describe('useRotation', () => {
  it('generateFresh populates the grid with 4 quarters', () => {
    const players = makeFullRoster(10);
    // Start with no rotation
    const game = makeGame(players, null);
    const onGameUpdate = vi.fn();

    const { result } = renderHook(() => useRotation({ players, game, allGames: [], onGameUpdate }));

    act(() => { result.current.generateFresh(); });

    expect(onGameUpdate).toHaveBeenCalledTimes(1);
    const savedGrid = lastSavedGrid(onGameUpdate);
    for (const q of QUARTERS) {
      expect(savedGrid[q]).toBeDefined();
      expect(savedGrid[q].shift1).toBeDefined();
      expect(savedGrid[q].shift2).toBeDefined();
    }
  });

  it('lockSlot locks the chosen position and the lock survives reoptimize', () => {
    const { result, initialGrid, onGameUpdate } = setup();

    const strikerId = initialGrid.Q1.shift1.positions['Striker'].playerId!;

    act(() => { result.current.lockSlot('Q1', 'shift1', 'Striker', strikerId); });

    const savedGrid = lastSavedGrid(onGameUpdate);
    expect(savedGrid.Q1.shift1.positions['Striker'].playerId).toBe(strikerId);
    expect(savedGrid.Q1.shift1.positions['Striker'].locked).toBe(true);
  });

  it('lockSlot clears the player from their previous position in the same shift', () => {
    const { result, initialGrid, onGameUpdate } = setup();

    // Find the player in Left Back in Q1/shift1
    const leftBackPid = initialGrid.Q1.shift1.positions['Left Back'].playerId!;

    // Lock them to Striker instead
    act(() => { result.current.lockSlot('Q1', 'shift1', 'Striker', leftBackPid); });

    const savedGrid = lastSavedGrid(onGameUpdate);
    // Striker is now locked to this player
    expect(savedGrid.Q1.shift1.positions['Striker'].playerId).toBe(leftBackPid);
    expect(savedGrid.Q1.shift1.positions['Striker'].locked).toBe(true);
    // Left Back should no longer hold this player
    expect(savedGrid.Q1.shift1.positions['Left Back'].playerId).not.toBe(leftBackPid);
    expect(savedGrid.Q1.shift1.positions['Left Back'].locked).toBe(false);
  });

  it('lockBench moves the player from a field position into the bench', () => {
    const { result, initialGrid, onGameUpdate } = setup();

    const strikerId = initialGrid.Q1.shift1.positions['Striker'].playerId!;

    act(() => { result.current.lockBench('Q1', 'shift1', strikerId); });

    const savedGrid = lastSavedGrid(onGameUpdate);

    // Player appears in bench with locked = true
    const benchPids = savedGrid.Q1.shift1.bench.map((s) => s.playerId);
    expect(benchPids).toContain(strikerId);
    const lockedSlot = savedGrid.Q1.shift1.bench.find((s) => s.playerId === strikerId);
    expect(lockedSlot?.locked).toBe(true);

    // Player no longer in any field position
    for (const pos of FIELD_POSITIONS) {
      expect(savedGrid.Q1.shift1.positions[pos].playerId).not.toBe(strikerId);
    }
  });

  it('lockGK sets gkPlayerId and gkLocked for the chosen quarter', () => {
    const { result, players, initialGrid, onGameUpdate } = setup();

    const currentGkId = initialGrid.Q1.gkPlayerId;
    // Pick a different player (first non-GK willing player)
    const newGk = players.find((p) => p.id !== currentGkId && p.goalieWilling)!;

    act(() => { result.current.lockGK('Q1', newGk.id); });

    const savedGrid = lastSavedGrid(onGameUpdate);
    expect(savedGrid.Q1.gkPlayerId).toBe(newGk.id);
    expect(savedGrid.Q1.gkLocked).toBe(true);
  });

  it('unlockSlot sets locked to false on the chosen position', () => {
    // Provide a grid that already has a locked slot
    const players = makeFullRoster(10);
    const { grid: initial } = generateRotation(players, makeGame(players));
    const lockedGrid: RotationGrid = JSON.parse(JSON.stringify(initial));
    const strikerId = lockedGrid.Q1.shift1.positions['Striker'].playerId!;
    lockedGrid.Q1.shift1.positions['Striker'] = { playerId: strikerId, locked: true };

    const game = makeGame(players, lockedGrid);
    const onGameUpdate = vi.fn();
    const { result } = renderHook(() => useRotation({ players, game, allGames: [], onGameUpdate }));

    act(() => { result.current.unlockSlot('Q1', 'shift1', 'Striker'); });

    const savedGrid = lastSavedGrid(onGameUpdate);
    expect(savedGrid.Q1.shift1.positions['Striker'].locked).toBe(false);
  });

  it('unlockGK sets gkLocked to false for the chosen quarter', () => {
    const players = makeFullRoster(10);
    const { grid: initial } = generateRotation(players, makeGame(players));
    const lockedGrid: RotationGrid = JSON.parse(JSON.stringify(initial));
    lockedGrid.Q1.gkLocked = true;

    const game = makeGame(players, lockedGrid);
    const onGameUpdate = vi.fn();
    const { result } = renderHook(() => useRotation({ players, game, allGames: [], onGameUpdate }));

    act(() => { result.current.unlockGK('Q1'); });

    const savedGrid = lastSavedGrid(onGameUpdate);
    expect(savedGrid.Q1.gkLocked).toBe(false);
  });

  it('resetGrid produces a grid with no locked slots', () => {
    const players = makeFullRoster(10);
    const { grid: initial } = generateRotation(players, makeGame(players));

    // Create a grid with multiple locks
    const lockedGrid: RotationGrid = JSON.parse(JSON.stringify(initial));
    lockedGrid.Q1.gkLocked = true;
    lockedGrid.Q1.shift1.positions['Striker'] = {
      playerId: lockedGrid.Q1.shift1.positions['Striker'].playerId,
      locked: true,
    };

    const game = makeGame(players, lockedGrid);
    const onGameUpdate = vi.fn();
    const { result } = renderHook(() => useRotation({ players, game, allGames: [], onGameUpdate }));

    act(() => { result.current.resetGrid(); });

    const savedGrid = lastSavedGrid(onGameUpdate);
    for (const q of QUARTERS) {
      expect(savedGrid[q].gkLocked).toBe(false);
      for (const shift of SHIFTS) {
        for (const pos of FIELD_POSITIONS) {
          expect(savedGrid[q][shift].positions[pos].locked).toBe(false);
        }
        for (const slot of savedGrid[q][shift].bench) {
          expect(slot.locked).toBe(false);
        }
      }
    }
  });

  it('unlockBench removes the bench lock so reoptimize can reassign the player', () => {
    const players = makeFullRoster(10);
    const { grid: initial } = generateRotation(players, makeGame(players));

    const lockedGrid: RotationGrid = JSON.parse(JSON.stringify(initial));
    const benchSlot = lockedGrid.Q1.shift1.bench[0];
    if (!benchSlot?.playerId) throw new Error('No bench player in Q1/shift1');
    const benchPlayerId = benchSlot.playerId;
    lockedGrid.Q1.shift1.bench = lockedGrid.Q1.shift1.bench.map((s) =>
      s.playerId === benchPlayerId ? { ...s, locked: true } : s,
    );

    const game = makeGame(players, lockedGrid);
    const onGameUpdate = vi.fn();
    const { result } = renderHook(() => useRotation({ players, game, allGames: [], onGameUpdate }));

    act(() => { result.current.unlockBench('Q1', 'shift1', benchPlayerId); });

    const savedGrid = lastSavedGrid(onGameUpdate);
    const slot = savedGrid.Q1.shift1.bench.find((s) => s.playerId === benchPlayerId);
    expect(slot?.locked).toBeFalsy();
  });

  it('calls onGameUpdate once for each mutation function', () => {
    const { result, initialGrid, players, onGameUpdate } = setup();

    const strikerId = initialGrid.Q1.shift1.positions['Striker'].playerId!;
    const currentGkId = initialGrid.Q1.gkPlayerId;
    const newGk = players.find((p) => p.id !== currentGkId && p.goalieWilling)!;

    act(() => { result.current.generateFresh(); });
    act(() => { result.current.lockSlot('Q1', 'shift1', 'Striker', strikerId); });
    act(() => { result.current.lockBench('Q1', 'shift2', strikerId); });
    act(() => { result.current.lockGK('Q1', newGk.id); });
    act(() => { result.current.unlockSlot('Q1', 'shift1', 'Striker'); });
    act(() => { result.current.unlockGK('Q1'); });
    const benchPlayer = initialGrid.Q1.shift1.bench[0];
    if (benchPlayer?.playerId) {
      act(() => { result.current.unlockBench('Q1', 'shift1', benchPlayer.playerId!); });
    }

    expect(onGameUpdate).toHaveBeenCalledTimes(benchPlayer?.playerId ? 7 : 6);
    // Every call should pass the game id and a rotation
    for (const call of onGameUpdate.mock.calls) {
      expect(call[0]).toBe('test-game-1');
      expect(call[1]).toHaveProperty('rotation');
    }
  });

  // ── Shift closing ──────────────────────────────────────────────

  it('closeShift marks the shift as closed', () => {
    const { result, onGameUpdate } = setup();

    act(() => { result.current.closeShift('Q1', 'shift1'); });

    const saved = lastSavedGrid(onGameUpdate);
    expect(saved.Q1.shift1.closed).toBe(true);
    expect(saved.Q1.shift2.closed).toBeFalsy(); // other shift unaffected
  });

  it('reopenShift marks the shift as not closed', () => {
    const { initialGrid } = setup();

    // Close first, then reopen
    const gridWithClose: RotationGrid = JSON.parse(JSON.stringify(initialGrid));
    gridWithClose.Q1.shift1.closed = true;

    const players = makeFullRoster(10);
    const game = makeGame(players, gridWithClose);
    const localUpdate = vi.fn();
    const { result: r2 } = renderHook(() =>
      useRotation({ players, game, allGames: [], onGameUpdate: localUpdate }),
    );

    act(() => { r2.current.reopenShift('Q1', 'shift1'); });

    const saved = lastSavedGrid(localUpdate);
    expect(saved.Q1.shift1.closed).toBe(false);
  });

  it('reoptimize preserves all position assignments in a closed shift', () => {
    const { result, initialGrid, onGameUpdate } = setup();

    // Close Q1/shift1
    act(() => { result.current.closeShift('Q1', 'shift1'); });

    const snapshot = { ...initialGrid.Q1.shift1.positions };

    // Trigger a reoptimize via lockSlot on a different shift
    const striker2Id = initialGrid.Q1.shift2.positions['Striker'].playerId!;
    act(() => { result.current.lockSlot('Q1', 'shift2', 'Striker', striker2Id); });

    const saved = lastSavedGrid(onGameUpdate);
    // Every position in the closed shift1 must still have the same player
    for (const pos of FIELD_POSITIONS) {
      expect(saved.Q1.shift1.positions[pos].playerId).toBe(snapshot[pos].playerId);
    }
  });

  it('generateFresh preserves position assignments in a closed shift', () => {
    const players = makeFullRoster(10);
    const { grid: initialGrid } = generateRotation(players, makeGame(players));

    // Mark Q2/shift1 as closed
    const closedGrid: RotationGrid = JSON.parse(JSON.stringify(initialGrid));
    closedGrid.Q2.shift1.closed = true;
    const snapshot = { ...closedGrid.Q2.shift1.positions };

    const game = makeGame(players, closedGrid);
    const onGameUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRotation({ players, game, allGames: [], onGameUpdate }),
    );

    act(() => { result.current.generateFresh(); });

    const saved = lastSavedGrid(onGameUpdate);
    for (const pos of FIELD_POSITIONS) {
      expect(saved.Q2.shift1.positions[pos].playerId).toBe(snapshot[pos].playerId);
    }
  });

  it('closing a shift locks the GK so generateFresh does not reassign it', () => {
    const players = makeFullRoster(10);
    const { grid: initialGrid } = generateRotation(players, makeGame(players));

    const closedGrid: RotationGrid = JSON.parse(JSON.stringify(initialGrid));
    closedGrid.Q1.shift1.closed = true;
    const originalGK = closedGrid.Q1.gkPlayerId;

    const game = makeGame(players, closedGrid);
    const onGameUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRotation({ players, game, allGames: [], onGameUpdate }),
    );

    act(() => { result.current.generateFresh(); });

    const saved = lastSavedGrid(onGameUpdate);
    expect(saved.Q1.gkPlayerId).toBe(originalGK);
  });
});

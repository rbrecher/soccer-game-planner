import { useCallback } from 'react';
import type {
  Game,
  ShiftKey,
  Player,
  PositionName,
  QuarterKey,
  RotationGrid,
  RotationWarning,
} from '../types';
import { ALL_POSITIONS, QUARTERS, SHIFTS } from '../constants/game';
import { generateRotation } from '../algorithm';
import { computeSeasonPositions } from '../utils/seasonStats';

/**
 * Returns a deep copy of the grid with closure locks applied for the algorithm.
 * Closed shifts have all their positions/bench forced to locked=true.
 * Quarters with any closed shift have gkLocked forced to true.
 * Existing manual locks on open shifts are also preserved.
 * Used for reoptimize (preserves all locks).
 */
function applyClosedShiftLocks(grid: RotationGrid): RotationGrid {
  const copy: RotationGrid = JSON.parse(JSON.stringify(grid));
  for (const q of QUARTERS) {
    const quarter = copy[q];
    for (const shift of SHIFTS) {
      if (quarter[shift].closed) {
        for (const pos of ALL_POSITIONS) {
          const slot = quarter[shift].positions[pos];
          if (slot?.playerId) slot.locked = true;
        }
        quarter[shift].bench = quarter[shift].bench.map((s) => ({ ...s, locked: true }));
      }
    }
    if (SHIFTS.some((s) => quarter[s].closed)) {
      quarter.gkLocked = true;
    }
  }
  return copy;
}

/**
 * Builds a minimal base grid carrying ONLY closed shift data.
 * Open shifts and manual GK/slot locks are discarded.
 * Returns undefined if no shifts are closed (so generateFresh runs fully fresh).
 * Used for generateFresh so "Reset & Regenerate" still clears manual locks.
 */
function buildFreshBaseGrid(grid: RotationGrid): RotationGrid | undefined {
  const hasAnyClosed = QUARTERS.some((q) => SHIFTS.some((s) => grid[q]?.[s]?.closed));
  if (!hasAnyClosed) return undefined;

  const base: RotationGrid = {} as RotationGrid;
  for (const q of QUARTERS) {
    const quarter = grid[q];
    const anyShiftClosed = SHIFTS.some((s) => quarter[s]?.closed);

    const buildShift = (shift: RotationGrid[QuarterKey][ShiftKey]) => {
      if (!shift.closed) {
        return { positions: {} as RotationGrid[QuarterKey][ShiftKey]['positions'], bench: [] };
      }
      const positions = {} as RotationGrid[QuarterKey][ShiftKey]['positions'];
      for (const pos of ALL_POSITIONS) {
        const slot = shift.positions[pos];
        if (slot?.playerId) positions[pos] = { playerId: slot.playerId, locked: true };
      }
      return { positions, bench: shift.bench.map((s) => ({ ...s, locked: true })), closed: true };
    };

    base[q] = {
      gkPlayerId: anyShiftClosed ? quarter.gkPlayerId : null,
      gkLocked: anyShiftClosed,
      shift1: buildShift(quarter.shift1),
      shift2: buildShift(quarter.shift2),
    };
  }
  return base;
}

interface UseRotationProps {
  players: Player[];
  game: Game | null;
  allGames: Game[];
  onGameUpdate: (id: string, changes: Partial<Omit<Game, 'id'>>) => void;
}

export function useRotation({ players, game, allGames, onGameUpdate }: UseRotationProps) {
  const grid = game?.rotation ?? null;
  const warnings: RotationWarning[] = [];

  const saveGrid = useCallback(
    (newGrid: RotationGrid) => {
      if (!game) return;
      onGameUpdate(game.id, { rotation: newGrid });
    },
    [game, onGameUpdate],
  );

  /** Generate a fresh rotation, discarding manual locks but preserving closed shifts */
  const generateFresh = useCallback((): RotationWarning[] => {
    if (!game) return [];
    const seasonPositions = computeSeasonPositions(allGames, game.id);
    // Only carry over closed shift data; discard manual locks so "reset" truly resets
    const baseGrid = grid ? buildFreshBaseGrid(grid) : undefined;
    const { grid: newGrid, warnings } = generateRotation(players, game, baseGrid, seasonPositions);
    saveGrid(newGrid);
    return warnings;
  }, [players, game, allGames, grid, saveGrid]);

  /** Re-run the algorithm preserving locked slots and closed shifts */
  const reoptimize = useCallback(
    (existingGrid: RotationGrid): RotationWarning[] => {
      if (!game) return [];
      const seasonPositions = computeSeasonPositions(allGames, game.id);
      const { grid: newGrid, warnings } = generateRotation(players, game, applyClosedShiftLocks(existingGrid), seasonPositions);
      saveGrid(newGrid);
      return warnings;
    },
    [players, game, allGames, saveGrid],
  );

  /** Lock a field position slot and reoptimize */
  const lockSlot = useCallback(
    (quarter: QuarterKey, shift: ShiftKey, position: PositionName, playerId: string): RotationWarning[] => {
      if (!grid) return [];

      const updatedGrid: RotationGrid = JSON.parse(JSON.stringify(grid));
      const shiftRot = updatedGrid[quarter][shift];

      // Unlock the player who was previously in this slot (if any)
      const previous = shiftRot.positions[position];
      if (previous.playerId && previous.playerId !== playerId) {
        // Find if they're locked anywhere else in this shift; if not, just displace them
        // (reoptimize will reassign them)
      }

      // Set the new locked assignment
      shiftRot.positions[position] = { playerId, locked: true };

      // If the new player was on bench, remove them from bench
      shiftRot.bench = shiftRot.bench.filter((s) => s.playerId !== playerId);

      // If the new player was in another position this shift, unlock that slot
      for (const pos of Object.keys(shiftRot.positions) as PositionName[]) {
        if (pos !== position && shiftRot.positions[pos].playerId === playerId) {
          shiftRot.positions[pos] = { playerId: null, locked: false };
        }
      }

      return reoptimize(updatedGrid);
    },
    [grid, reoptimize],
  );

  /** Lock a bench slot and reoptimize */
  const lockBench = useCallback(
    (quarter: QuarterKey, shift: ShiftKey, playerId: string): RotationWarning[] => {
      if (!grid) return [];

      const updatedGrid: RotationGrid = JSON.parse(JSON.stringify(grid));
      const shiftRot = updatedGrid[quarter][shift];

      // Remove from any field position
      for (const pos of Object.keys(shiftRot.positions) as PositionName[]) {
        if (shiftRot.positions[pos].playerId === playerId) {
          shiftRot.positions[pos] = { playerId: null, locked: false };
        }
      }

      // Add to bench if not already there
      const alreadyOnBench = shiftRot.bench.some((s) => s.playerId === playerId);
      if (!alreadyOnBench) {
        shiftRot.bench.push({ playerId, locked: true });
      } else {
        shiftRot.bench = shiftRot.bench.map((s) =>
          s.playerId === playerId ? { ...s, locked: true } : s,
        );
      }

      return reoptimize(updatedGrid);
    },
    [grid, reoptimize],
  );

  /** Override the GK for a quarter and reoptimize */
  const lockGK = useCallback(
    (quarter: QuarterKey, playerId: string): RotationWarning[] => {
      if (!grid) return [];

      const updatedGrid: RotationGrid = JSON.parse(JSON.stringify(grid));
      updatedGrid[quarter] = {
        ...updatedGrid[quarter],
        gkPlayerId: playerId,
        gkLocked: true,
        // Clear the GK from field/bench so reoptimize can reassign prior GK
        shift1: {
          ...updatedGrid[quarter].shift1,
          positions: {
            ...updatedGrid[quarter].shift1.positions,
            GK: { playerId, locked: false },
          },
        },
        shift2: {
          ...updatedGrid[quarter].shift2,
          positions: {
            ...updatedGrid[quarter].shift2.positions,
            GK: { playerId, locked: false },
          },
        },
      };

      return reoptimize(updatedGrid);
    },
    [grid, reoptimize],
  );

  /** Remove the lock on a field position slot and reoptimize */
  const unlockSlot = useCallback(
    (quarter: QuarterKey, shift: ShiftKey, position: PositionName): RotationWarning[] => {
      if (!grid) return [];
      const updatedGrid: RotationGrid = JSON.parse(JSON.stringify(grid));
      updatedGrid[quarter][shift].positions[position] = { playerId: null, locked: false };
      return reoptimize(updatedGrid);
    },
    [grid, reoptimize],
  );

  /** Remove the bench lock for a player in a shift and reoptimize */
  const unlockBench = useCallback(
    (quarter: QuarterKey, shift: ShiftKey, playerId: string): RotationWarning[] => {
      if (!grid) return [];
      const updatedGrid: RotationGrid = JSON.parse(JSON.stringify(grid));
      updatedGrid[quarter][shift].bench = updatedGrid[quarter][shift].bench.filter(
        (s) => s.playerId !== playerId,
      );
      return reoptimize(updatedGrid);
    },
    [grid, reoptimize],
  );

  /** Remove the GK lock for a quarter and reoptimize */
  const unlockGK = useCallback(
    (quarter: QuarterKey): RotationWarning[] => {
      if (!grid) return [];
      const updatedGrid: RotationGrid = JSON.parse(JSON.stringify(grid));
      updatedGrid[quarter] = { ...updatedGrid[quarter], gkLocked: false };
      return reoptimize(updatedGrid);
    },
    [grid, reoptimize],
  );

  /** Clear all locks and regenerate from scratch (closed shifts are still preserved) */
  const resetGrid = useCallback((): RotationWarning[] => {
    return generateFresh();
  }, [generateFresh]);

  /** Mark a shift as completed — read-only and locked for the algorithm */
  const closeShift = useCallback(
    (quarter: QuarterKey, shift: ShiftKey): void => {
      if (!grid) return;
      const updated: RotationGrid = JSON.parse(JSON.stringify(grid));
      updated[quarter][shift].closed = true;
      saveGrid(updated);
    },
    [grid, saveGrid],
  );

  /** Reopen a previously closed shift, making it editable again */
  const reopenShift = useCallback(
    (quarter: QuarterKey, shift: ShiftKey): void => {
      if (!grid) return;
      const updated: RotationGrid = JSON.parse(JSON.stringify(grid));
      updated[quarter][shift].closed = false;
      saveGrid(updated);
    },
    [grid, saveGrid],
  );

  return { grid, warnings, generateFresh, lockSlot, lockBench, lockGK, unlockSlot, unlockBench, unlockGK, resetGrid, closeShift, reopenShift };
}

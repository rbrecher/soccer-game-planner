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
import { generateRotation } from '../algorithm';

interface UseRotationProps {
  players: Player[];
  game: Game | null;
  onGameUpdate: (id: string, changes: Partial<Omit<Game, 'id'>>) => void;
}

export function useRotation({ players, game, onGameUpdate }: UseRotationProps) {
  const grid = game?.rotation ?? null;
  const warnings: RotationWarning[] = [];

  const saveGrid = useCallback(
    (newGrid: RotationGrid) => {
      if (!game) return;
      onGameUpdate(game.id, { rotation: newGrid });
    },
    [game, onGameUpdate],
  );

  /** Generate a fresh rotation, discarding all locks */
  const generateFresh = useCallback((): RotationWarning[] => {
    if (!game) return [];
    const { grid: newGrid, warnings } = generateRotation(players, game);
    saveGrid(newGrid);
    return warnings;
  }, [players, game, saveGrid]);

  /** Re-run the algorithm preserving locked slots */
  const reoptimize = useCallback(
    (existingGrid: RotationGrid): RotationWarning[] => {
      if (!game) return [];
      const { grid: newGrid, warnings } = generateRotation(players, game, existingGrid);
      saveGrid(newGrid);
      return warnings;
    },
    [players, game, saveGrid],
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

  /** Clear all locks and regenerate from scratch */
  const resetGrid = useCallback((): RotationWarning[] => {
    return generateFresh();
  }, [generateFresh]);

  return { grid, warnings, generateFresh, lockSlot, lockBench, lockGK, unlockSlot, unlockGK, resetGrid };
}

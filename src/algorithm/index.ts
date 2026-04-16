import type { Game, Player, RotationGrid, RotationWarning } from '../types';
import { assignGoalies } from './assignGoalies';
import { assignBench } from './assignBench';
import { assignPositions } from './assignPositions';
import { type SeasonPositionMap } from '../utils/seasonStats';

/**
 * Main entry point for rotation generation.
 *
 * When existingGrid is provided, all locked slots are preserved and only
 * unlocked slots are recalculated (used after manual edits).
 */
export function generateRotation(
  players: Player[],
  game: Pick<Game, 'availability'>,
  existingGrid?: RotationGrid,
  seasonPositions: SeasonPositionMap = new Map(),
): { grid: RotationGrid; warnings: RotationWarning[] } {
  const existing = existingGrid ?? {};

  // Step 1: Assign goalies
  const { gkMap, warnings } = assignGoalies(players, game.availability, existing, seasonPositions);

  // Step 2: Assign bench slots
  const benchMap = assignBench(players, game.availability, gkMap, existing);

  // Step 3: Assign field positions
  const grid = assignPositions(players, game.availability, gkMap, benchMap, existing, seasonPositions);

  return { grid, warnings };
}

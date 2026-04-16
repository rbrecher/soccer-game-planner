import { FIELD_POSITIONS, QUARTERS, SHIFTS } from '../constants/game';
import type { Game, PositionName } from '../types';

export type SeasonPositionMap = Map<string, Partial<Record<PositionName, number>>>;

/**
 * Compute how many shifts each player has spent at each position across all games.
 *
 * Counting unit: shifts
 *   - GK for a quarter = +2 (plays both shifts at GK)
 *   - Field position for one shift = +1
 *
 * @param games      All games in storage
 * @param excludeGameId  Optional: skip this game (used when generating a rotation so
 *                       the current game's prior run doesn't skew the input)
 */
export function computeSeasonPositions(
  games: Game[],
  excludeGameId?: string,
): SeasonPositionMap {
  const map: SeasonPositionMap = new Map();

  const add = (playerId: string, position: PositionName, count: number) => {
    if (!map.has(playerId)) map.set(playerId, {});
    const entry = map.get(playerId)!;
    entry[position] = (entry[position] ?? 0) + count;
  };

  for (const game of games) {
    if (game.id === excludeGameId) continue;
    if (!game.rotation) continue;

    for (const q of QUARTERS) {
      const quarter = game.rotation[q];
      if (!quarter) continue;

      // GK plays both shifts in the quarter → count as 2 shifts
      if (quarter.gkPlayerId) {
        add(quarter.gkPlayerId, 'GK', 2);
      }

      // Field positions: count per shift
      for (const shift of SHIFTS) {
        const shiftRot = quarter[shift];
        if (!shiftRot) continue;
        for (const pos of FIELD_POSITIONS) {
          const slot = shiftRot.positions[pos];
          if (slot?.playerId) {
            add(slot.playerId, pos, 1);
          }
        }
      }
    }
  }

  return map;
}

/**
 * Safely read a season position count for a player, returning 0 if unknown.
 */
export function getSeasonCount(
  map: SeasonPositionMap,
  playerId: string,
  position: PositionName,
): number {
  return map.get(playerId)?.[position] ?? 0;
}

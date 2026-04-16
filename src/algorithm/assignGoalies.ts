import { QUARTERS } from '../constants/game';
import type { Player, PlayerAvailability, QuarterKey, QuarterRotation, RotationGrid, RotationWarning } from '../types';
import { getSeasonCount, type SeasonPositionMap } from '../utils/seasonStats';

/**
 * Assigns a goalie for each quarter.
 * Prioritises willing players with the fewest season GK quarters.
 * Skips quarters where gkLocked = true in existingGrid.
 * Returns the updated gkPlayerId per quarter and any warnings.
 */
export function assignGoalies(
  players: Player[],
  availability: PlayerAvailability[],
  existingGrid: Partial<RotationGrid>,
  seasonPositions: SeasonPositionMap = new Map(),
): { gkMap: Record<QuarterKey, string | null>; warnings: RotationWarning[] } {
  const warnings: RotationWarning[] = [];
  const gkMap: Record<QuarterKey, string | null> = { Q1: null, Q2: null, Q3: null, Q4: null };
  const usedAsGK = new Set<string>();

  // Preserve locked GK assignments first
  for (const q of QUARTERS) {
    const existing = existingGrid[q] as QuarterRotation | undefined;
    if (existing?.gkLocked && existing.gkPlayerId) {
      gkMap[q] = existing.gkPlayerId;
      usedAsGK.add(existing.gkPlayerId);
    }
  }

  // Helper: is player available for this quarter?
  const isAvailable = (playerId: string, quarter: QuarterKey): boolean => {
    const avail = availability.find((a) => a.playerId === playerId);
    return avail ? avail.quarters[quarter] : true; // default available if no record
  };

  for (const q of QUARTERS) {
    const existing = existingGrid[q] as QuarterRotation | undefined;
    if (existing?.gkLocked) continue; // already handled above

    const eligible = players
      .filter((p) => p.goalieWilling && !usedAsGK.has(p.id) && isAvailable(p.id, q))
      .sort((a, b) =>
        getSeasonCount(seasonPositions, a.id, 'GK') - getSeasonCount(seasonPositions, b.id, 'GK') ||
        a.name.localeCompare(b.name),
      );

    if (eligible.length > 0) {
      gkMap[q] = eligible[0].id;
      usedAsGK.add(eligible[0].id);
    } else {
      // Fallback: any available player not yet used as GK this game
      const fallback = players
        .filter((p) => !usedAsGK.has(p.id) && isAvailable(p.id, q))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (fallback.length > 0) {
        gkMap[q] = fallback[0].id;
        usedAsGK.add(fallback[0].id);
        warnings.push({
          quarterId: q,
          message: `No goalie-willing players available for ${q}. ${fallback[0].name} assigned as fallback.`,
        });
      } else {
        gkMap[q] = null;
        warnings.push({ quarterId: q, message: `No players available to play GK in ${q}.` });
      }
    }
  }

  return { gkMap, warnings };
}

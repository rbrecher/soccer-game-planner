import { FIELD_POSITIONS, SHIFTS, QUARTERS } from '../constants/game';
import type {
  ShiftRotation,
  Player,
  PlayerAvailability,
  PositionName,
  QuarterKey,
  RotationGrid,
  SlotAssignment,
} from '../types';
import type { BenchMap } from './assignBench';
import { getSeasonCount, type SeasonPositionMap } from '../utils/seasonStats';

/**
 * Assigns field positions to players for each shift within each quarter.
 * Goal: maximise position variety (each player plays as many different positions as possible).
 * Respects locked position assignments in existingGrid.
 */
export function assignPositions(
  players: Player[],
  availability: PlayerAvailability[],
  gkMap: Record<QuarterKey, string | null>,
  benchMap: BenchMap,
  existingGrid: Partial<RotationGrid>,
  seasonPositions: SeasonPositionMap = new Map(),
): RotationGrid {
  const isAvailable = (playerId: string, quarter: QuarterKey): boolean => {
    const avail = availability.find((a) => a.playerId === playerId);
    return avail ? avail.quarters[quarter] : true;
  };

  // Track position history per player across the game
  const positionHistory = new Map<string, Map<PositionName, number>>();
  for (const p of players) {
    positionHistory.set(p.id, new Map());
  }

  const grid: RotationGrid = {} as RotationGrid;

  for (const q of QUARTERS) {
    const gkId = gkMap[q];
    const quarterGrid: { shift1: ShiftRotation; shift2: ShiftRotation } = {
      shift1: buildEmptyShift(),
      shift2: buildEmptyShift(),
    };

    for (const shift of SHIFTS) {
      const benchIds = new Set(benchMap[q][shift]);
      const existingShift = existingGrid[q]?.[shift];

      // Collect locked position assignments
      const lockedPositions = new Map<PositionName, string>(); // position → playerId
      const lockedPlayers = new Set<string>(); // playerIds locked to a position

      if (existingShift) {
        for (const pos of FIELD_POSITIONS) {
          const slot = existingShift.positions[pos];
          if (slot?.locked && slot.playerId) {
            lockedPositions.set(pos, slot.playerId);
            lockedPlayers.add(slot.playerId);
            // Count this as played for history
            const hist = positionHistory.get(slot.playerId)!;
            hist.set(pos, (hist.get(pos) ?? 0) + 1);
          }
        }
      }

      // Determine on-field players (not bench, not GK, available this quarter)
      const onFieldPlayers = players.filter(
        (p) => p.id !== gkId && !benchIds.has(p.id) && !lockedPlayers.has(p.id) && isAvailable(p.id, q),
      );

      // Free positions (not locked)
      const freePositions = FIELD_POSITIONS.filter((pos) => !lockedPositions.has(pos));

      // Greedy assignment: for each free position, pick the best available player
      // Sort positions by "most contested" (fewest candidate players with cost=0) first
      const positionOrder = [...freePositions].sort((posA, posB) => {
        const novelA = onFieldPlayers.filter(
          (p) => (positionHistory.get(p.id)?.get(posA) ?? 0) === 0,
        ).length;
        const novelB = onFieldPlayers.filter(
          (p) => (positionHistory.get(p.id)?.get(posB) ?? 0) === 0,
        ).length;
        return novelA - novelB; // hardest to fill first
      });

      const assignedThisShift = new Set<string>(lockedPlayers);
      const shiftPositions: Record<PositionName, SlotAssignment> = {} as Record<PositionName, SlotAssignment>;

      // Copy locked assignments first
      for (const [pos, pid] of lockedPositions) {
        shiftPositions[pos] = { playerId: pid, locked: true };
      }

      for (const pos of positionOrder) {
        const candidates = onFieldPlayers
          .filter((p) => !assignedThisShift.has(p.id))
          .sort((a, b) => {
            // Primary: fewer season shifts at this position across all games
            const seasonA = getSeasonCount(seasonPositions, a.id, pos);
            const seasonB = getSeasonCount(seasonPositions, b.id, pos);
            if (seasonA !== seasonB) return seasonA - seasonB;

            // Secondary: fewer in-game repeats at this position
            const costA = positionHistory.get(a.id)?.get(pos) ?? 0;
            const costB = positionHistory.get(b.id)?.get(pos) ?? 0;
            if (costA !== costB) return costA - costB;

            // Tiebreak: player who has played fewer distinct positions gets priority
            const distinctA = positionHistory.get(a.id)?.size ?? 0;
            const distinctB = positionHistory.get(b.id)?.size ?? 0;
            if (distinctA !== distinctB) return distinctA - distinctB;

            return a.name.localeCompare(b.name);
          });

        if (candidates.length > 0) {
          const chosen = candidates[0];
          shiftPositions[pos] = { playerId: chosen.id, locked: false };
          assignedThisShift.add(chosen.id);

          const hist = positionHistory.get(chosen.id)!;
          hist.set(pos, (hist.get(pos) ?? 0) + 1);
        } else {
          shiftPositions[pos] = { playerId: null, locked: false };
        }
      }

      // GK slot
      shiftPositions['GK'] = { playerId: gkId ?? null, locked: false };

      // Bench for this shift
      const benchSlots: SlotAssignment[] = Array.from(benchIds).map((pid) => {
        const wasLocked = existingGrid[q]?.[shift]?.bench.find(
          (s) => s.playerId === pid && s.locked,
        );
        return { playerId: pid, locked: wasLocked ? true : false };
      });

      quarterGrid[shift] = {
        positions: shiftPositions,
        bench: benchSlots,
      };
    }

    grid[q] = {
      gkPlayerId: gkId ?? null,
      gkLocked: existingGrid[q]?.gkLocked ?? false,
      shift1: quarterGrid.shift1,
      shift2: quarterGrid.shift2,
    };
  }

  return grid;
}

function buildEmptyShift(): ShiftRotation {
  const positions = {} as Record<PositionName, SlotAssignment>;
  return { positions, bench: [] };
}

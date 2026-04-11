import { FIELD_POSITIONS, HALVES, QUARTERS } from '../constants/game';
import type {
  HalfRotation,
  Player,
  PlayerAvailability,
  PositionName,
  QuarterKey,
  RotationGrid,
  SlotAssignment,
} from '../types';
import type { BenchMap } from './assignBench';

/**
 * Assigns field positions to players for each half-quarter.
 * Goal: maximise position variety (each player plays as many different positions as possible).
 * Respects locked position assignments in existingGrid.
 */
export function assignPositions(
  players: Player[],
  _availability: PlayerAvailability[],
  gkMap: Record<QuarterKey, string | null>,
  benchMap: BenchMap,
  existingGrid: Partial<RotationGrid>,
): RotationGrid {
  // Track position history per player across the game
  const positionHistory = new Map<string, Map<PositionName, number>>();
  for (const p of players) {
    positionHistory.set(p.id, new Map());
  }

  const grid: RotationGrid = {} as RotationGrid;

  for (const q of QUARTERS) {
    const gkId = gkMap[q];
    const quarterGrid: { first: HalfRotation; second: HalfRotation } = {
      first: buildEmptyHalf(),
      second: buildEmptyHalf(),
    };

    for (const half of HALVES) {
      const benchIds = new Set(benchMap[q][half]);
      const existingHalf = existingGrid[q]?.[half];

      // Collect locked position assignments
      const lockedPositions = new Map<PositionName, string>(); // position → playerId
      const lockedPlayers = new Set<string>(); // playerIds locked to a position

      if (existingHalf) {
        for (const pos of FIELD_POSITIONS) {
          const slot = existingHalf.positions[pos];
          if (slot.locked && slot.playerId) {
            lockedPositions.set(pos, slot.playerId);
            lockedPlayers.add(slot.playerId);
            // Count this as played for history
            const hist = positionHistory.get(slot.playerId)!;
            hist.set(pos, (hist.get(pos) ?? 0) + 1);
          }
        }
      }

      // Determine on-field players (not bench, not GK)
      const onFieldPlayers = players.filter(
        (p) => p.id !== gkId && !benchIds.has(p.id) && !lockedPlayers.has(p.id),
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

      const assignedThisHalf = new Set<string>(lockedPlayers);
      const halfPositions: Record<PositionName, SlotAssignment> = {} as Record<PositionName, SlotAssignment>;

      // Copy locked assignments first
      for (const [pos, pid] of lockedPositions) {
        halfPositions[pos] = { playerId: pid, locked: true };
      }

      for (const pos of positionOrder) {
        const candidates = onFieldPlayers
          .filter((p) => !assignedThisHalf.has(p.id))
          .sort((a, b) => {
            const costA = positionHistory.get(a.id)?.get(pos) ?? 0;
            const costB = positionHistory.get(b.id)?.get(pos) ?? 0;
            if (costA !== costB) return costA - costB; // fewer repeats = better

            // Tiebreak: player who has played fewer distinct positions gets priority
            const distinctA = positionHistory.get(a.id)?.size ?? 0;
            const distinctB = positionHistory.get(b.id)?.size ?? 0;
            if (distinctA !== distinctB) return distinctA - distinctB;

            return a.name.localeCompare(b.name);
          });

        if (candidates.length > 0) {
          const chosen = candidates[0];
          halfPositions[pos] = { playerId: chosen.id, locked: false };
          assignedThisHalf.add(chosen.id);

          const hist = positionHistory.get(chosen.id)!;
          hist.set(pos, (hist.get(pos) ?? 0) + 1);
        } else {
          halfPositions[pos] = { playerId: null, locked: false };
        }
      }

      // GK slot
      halfPositions['GK'] = { playerId: gkId ?? null, locked: false };

      // Bench for this half
      const benchSlots: SlotAssignment[] = Array.from(benchIds).map((pid) => {
        const wasLocked = existingGrid[q]?.[half]?.bench.find(
          (s) => s.playerId === pid && s.locked,
        );
        return { playerId: pid, locked: wasLocked ? true : false };
      });

      quarterGrid[half] = {
        positions: halfPositions,
        bench: benchSlots,
      };
    }

    grid[q] = {
      gkPlayerId: gkId ?? null,
      gkLocked: existingGrid[q]?.gkLocked ?? false,
      first: quarterGrid.first,
      second: quarterGrid.second,
    };
  }

  return grid;
}

function buildEmptyHalf(): HalfRotation {
  const positions = {} as Record<PositionName, SlotAssignment>;
  return { positions, bench: [] };
}

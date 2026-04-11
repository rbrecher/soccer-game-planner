import { FIELD_POSITIONS, SHIFT_QUARTER_SEQUENCE } from '../constants/game';
import type {
  ShiftKey,
  Player,
  PlayerAvailability,
  QuarterKey,
  RotationGrid,
} from '../types';

export type BenchMap = Record<QuarterKey, Record<ShiftKey, string[]>>;

/**
 * Determines which players sit on the bench for each shift within each quarter.
 * Priorities:
 *   1. Equal playing time (normalised by how many shifts a player is available for)
 *   2. No consecutive bench stints across the flat shift sequence
 *   3. Name ASC for determinism
 *
 * Respects locked bench assignments in existingGrid.
 */
export function assignBench(
  players: Player[],
  availability: PlayerAvailability[],
  gkMap: Record<QuarterKey, string | null>,
  existingGrid: Partial<RotationGrid>,
): BenchMap {
  // Build availability lookup: playerId → set of available shift indices
  const availableShifts = new Map<string, Set<number>>();
  for (const p of players) {
    const avail = availability.find((a) => a.playerId === p.id);
    const quarterAvail = avail?.quarters ?? { Q1: true, Q2: true, Q3: true, Q4: true };
    const set = new Set<number>();
    SHIFT_QUARTER_SEQUENCE.forEach(({ quarter }, idx) => {
      if (quarterAvail[quarter]) {
        // GK plays both shifts of their quarter — mark as "playing" not bench-eligible
        const isGKThisQuarter = gkMap[quarter] === p.id;
        if (!isGKThisQuarter) set.add(idx);
      }
    });
    availableShifts.set(p.id, set);
  }

  // Total available (non-GK) shifts per player
  const totalAvailableShifts = new Map<string, number>();
  for (const p of players) {
    totalAvailableShifts.set(p.id, availableShifts.get(p.id)!.size);
  }

  // Track bench counts and last bench shift index
  const benchCount = new Map<string, number>(players.map((p) => [p.id, 0]));
  const lastBenchedIdx = new Map<string, number>(players.map((p) => [p.id, -99]));

  // Initialise from locked bench assignments
  const benchMap: BenchMap = {
    Q1: { shift1: [], shift2: [] },
    Q2: { shift1: [], shift2: [] },
    Q3: { shift1: [], shift2: [] },
    Q4: { shift1: [], shift2: [] },
  };

  // First pass: collect locked bench players
  SHIFT_QUARTER_SEQUENCE.forEach(({ quarter, shift }, idx) => {
    const grid = existingGrid[quarter];
    if (!grid) return;
    const shiftRot = grid[shift];
    for (const slot of shiftRot.bench) {
      if (slot.locked && slot.playerId) {
        benchMap[quarter][shift].push(slot.playerId);
        benchCount.set(slot.playerId, (benchCount.get(slot.playerId) ?? 0) + 1);
        lastBenchedIdx.set(slot.playerId, idx);
      }
    }
  });

  // Second pass: assign unlocked bench slots
  SHIFT_QUARTER_SEQUENCE.forEach(({ quarter, shift }, idx) => {
    const gkId = gkMap[quarter];

    // Players available this shift (non-GK, available)
    const availableThisShift = players.filter(
      (p) => p.id !== gkId && availableShifts.get(p.id)!.has(idx),
    );

    const onFieldCount = FIELD_POSITIONS.length; // 6
    const benchNeeded = Math.max(0, availableThisShift.length - onFieldCount);
    const alreadyBenched = benchMap[quarter][shift];
    const additionalNeeded = Math.max(0, benchNeeded - alreadyBenched.length);

    if (additionalNeeded === 0) return;

    // Candidates: not already locked to bench this shift
    const candidates = availableThisShift
      .filter((p) => !alreadyBenched.includes(p.id))
      .sort((a, b) => {
        // Sort by bench burden ratio (bench count / available shifts)
        const ratioA = (benchCount.get(a.id) ?? 0) / Math.max(1, totalAvailableShifts.get(a.id) ?? 1);
        const ratioB = (benchCount.get(b.id) ?? 0) / Math.max(1, totalAvailableShifts.get(b.id) ?? 1);
        if (Math.abs(ratioA - ratioB) > 0.001) return ratioA - ratioB; // more bench burden first

        // Deprioritise players who benched immediately before this shift
        const prevBenchedA = lastBenchedIdx.get(a.id) === idx - 1 ? 1 : 0;
        const prevBenchedB = lastBenchedIdx.get(b.id) === idx - 1 ? 1 : 0;
        if (prevBenchedA !== prevBenchedB) return prevBenchedA - prevBenchedB;

        return a.name.localeCompare(b.name);
      });

    // But: enforce no-consecutive rule as a hard constraint before soft sort
    // Split into "can bench" (didn't bench previous shift) and "avoid benching"
    const canBench = candidates.filter((p) => lastBenchedIdx.get(p.id) !== idx - 1);
    const avoidBench = candidates.filter((p) => lastBenchedIdx.get(p.id) === idx - 1);

    // Fill from canBench first, then avoidBench if still needed
    const toSelect = [...canBench, ...avoidBench].slice(0, additionalNeeded);

    for (const p of toSelect) {
      alreadyBenched.push(p.id);
      benchCount.set(p.id, (benchCount.get(p.id) ?? 0) + 1);
      lastBenchedIdx.set(p.id, idx);
    }
  });

  return benchMap;
}

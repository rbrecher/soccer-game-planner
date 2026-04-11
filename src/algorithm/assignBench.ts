import { FIELD_POSITIONS, HALF_QUARTER_SEQUENCE } from '../constants/game';
import type {
  HalfKey,
  Player,
  PlayerAvailability,
  QuarterKey,
  RotationGrid,
} from '../types';

export type BenchMap = Record<QuarterKey, Record<HalfKey, string[]>>;

/**
 * Determines which players sit on the bench for each half-quarter.
 * Priorities:
 *   1. Equal playing time (normalised by how many half-quarters a player is available for)
 *   2. No consecutive bench stints across the flat half-quarter sequence
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
  // Build availability lookup: playerId → set of available half-quarter indices
  const availableHalves = new Map<string, Set<number>>();
  for (const p of players) {
    const avail = availability.find((a) => a.playerId === p.id);
    const quarterAvail = avail?.quarters ?? { Q1: true, Q2: true, Q3: true, Q4: true };
    const set = new Set<number>();
    HALF_QUARTER_SEQUENCE.forEach(({ quarter }, idx) => {
      if (quarterAvail[quarter]) {
        // GK plays both halves of their quarter — mark as "playing" not bench-eligible
        const isGKThisQuarter = gkMap[quarter] === p.id;
        if (!isGKThisQuarter) set.add(idx);
      }
    });
    availableHalves.set(p.id, set);
  }

  // Total available (non-GK) half-slots per player
  const totalAvailableHalves = new Map<string, number>();
  for (const p of players) {
    totalAvailableHalves.set(p.id, availableHalves.get(p.id)!.size);
  }

  // Track bench counts and last bench half-quarter index
  const benchCount = new Map<string, number>(players.map((p) => [p.id, 0]));
  const lastBenchedIdx = new Map<string, number>(players.map((p) => [p.id, -99]));

  // Initialise from locked bench assignments
  const benchMap: BenchMap = {
    Q1: { first: [], second: [] },
    Q2: { first: [], second: [] },
    Q3: { first: [], second: [] },
    Q4: { first: [], second: [] },
  };

  // First pass: collect locked bench players
  HALF_QUARTER_SEQUENCE.forEach(({ quarter, half }, idx) => {
    const grid = existingGrid[quarter];
    if (!grid) return;
    const halfRot = grid[half];
    for (const slot of halfRot.bench) {
      if (slot.locked && slot.playerId) {
        benchMap[quarter][half].push(slot.playerId);
        benchCount.set(slot.playerId, (benchCount.get(slot.playerId) ?? 0) + 1);
        lastBenchedIdx.set(slot.playerId, idx);
      }
    }
  });

  // Second pass: assign unlocked bench slots
  HALF_QUARTER_SEQUENCE.forEach(({ quarter, half }, idx) => {
    const gkId = gkMap[quarter];

    // Players available this half-quarter (non-GK, available)
    const availableThisHalf = players.filter(
      (p) => p.id !== gkId && availableHalves.get(p.id)!.has(idx),
    );

    const onFieldCount = FIELD_POSITIONS.length; // 6
    const benchNeeded = Math.max(0, availableThisHalf.length - onFieldCount);
    const alreadyBenched = benchMap[quarter][half];
    const additionalNeeded = Math.max(0, benchNeeded - alreadyBenched.length);

    if (additionalNeeded === 0) return;

    // Candidates: not already locked to bench this half
    const candidates = availableThisHalf
      .filter((p) => !alreadyBenched.includes(p.id))
      .sort((a, b) => {
        // Sort by bench burden ratio (bench count / available halves)
        const ratioA = (benchCount.get(a.id) ?? 0) / Math.max(1, totalAvailableHalves.get(a.id) ?? 1);
        const ratioB = (benchCount.get(b.id) ?? 0) / Math.max(1, totalAvailableHalves.get(b.id) ?? 1);
        if (Math.abs(ratioA - ratioB) > 0.001) return ratioA - ratioB; // more bench burden first

        // Deprioritise players who benched immediately before this half-quarter
        const prevBenchedA = lastBenchedIdx.get(a.id) === idx - 1 ? 1 : 0;
        const prevBenchedB = lastBenchedIdx.get(b.id) === idx - 1 ? 1 : 0;
        if (prevBenchedA !== prevBenchedB) return prevBenchedA - prevBenchedB;

        return a.name.localeCompare(b.name);
      });

    // But: enforce no-consecutive rule as a hard constraint before soft sort
    // Split into "can bench" (didn't bench previous half) and "avoid benching"
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

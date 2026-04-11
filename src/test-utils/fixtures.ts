import type { Game, Player, PlayerAvailability, QuarterKey, RotationGrid } from '../types';

/** Build a single player. All fields have defaults; pass overrides to customize. */
export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-default',
    name: 'Player',
    goalieWilling: true,
    seasonGKQuarters: 0,
    ...overrides,
  };
}

/** Build a PlayerAvailability record with the player available for all quarters. */
export function makeAvailabilityAll(playerId: string): PlayerAvailability {
  return {
    playerId,
    quarters: { Q1: true, Q2: true, Q3: true, Q4: true },
  };
}

/**
 * Build a PlayerAvailability record with explicit per-quarter availability.
 * Unspecified quarters default to true.
 */
export function makeAvailability(
  playerId: string,
  quarters: Partial<Record<QuarterKey, boolean>>,
): PlayerAvailability {
  return {
    playerId,
    quarters: { Q1: true, Q2: true, Q3: true, Q4: true, ...quarters },
  };
}

/**
 * Build a roster of `count` players with:
 *   - Unique IDs: player-0, player-1, ...
 *   - Names: "Player A", "Player B", ... (alphabetically predictable)
 *   - First half of roster is goalie-willing; second half is not
 *   - seasonGKQuarters cycles 0, 1, 2
 */
export function makeFullRoster(count = 10): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${String.fromCharCode(65 + i)}`, // Player A, B, C...
    goalieWilling: i < Math.ceil(count / 2),
    seasonGKQuarters: i % 3,
  }));
}

/**
 * Build a Game fixture. Availability is auto-generated (all-available) for each player.
 * Pass an existing RotationGrid (or null) as the rotation.
 */
export function makeGame(players: Player[], rotation: RotationGrid | null = null): Game {
  return {
    id: 'test-game-1',
    label: 'Test Game',
    date: '2026-04-11',
    availability: players.map((p) => makeAvailabilityAll(p.id)),
    rotation,
  };
}

/** Build a locked QuarterRotation shell — only the fields used by assignGoalies/assignBench. */
export function makeLockedQuarterShell(
  gkPlayerId: string,
  benched: { playerId: string; locked: boolean }[] = [],
): {
  gkPlayerId: string;
  gkLocked: true;
  first: { positions: Record<string, never>; bench: { playerId: string; locked: boolean }[] };
  second: { positions: Record<string, never>; bench: { playerId: string; locked: boolean }[] };
} {
  return {
    gkPlayerId,
    gkLocked: true,
    first: { positions: {} as Record<string, never>, bench: benched },
    second: { positions: {} as Record<string, never>, bench: [] },
  };
}

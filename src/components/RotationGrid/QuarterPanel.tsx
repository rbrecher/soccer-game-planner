import type { Game, HalfKey, Player, PositionName, QuarterKey, QuarterRotation } from '../../types';
import { GoalieRow } from './GoalieRow';
import { HalfPanel } from './HalfPanel';

interface QuarterPanelProps {
  quarter: QuarterKey;
  quarterRotation: QuarterRotation;
  allPlayers: Player[];
  availability: Game['availability'];
  onLockSlot: (quarter: QuarterKey, half: HalfKey, position: PositionName, playerId: string) => void;
  onUnlockSlot: (quarter: QuarterKey, half: HalfKey, position: PositionName) => void;
  onLockBench: (quarter: QuarterKey, half: HalfKey, playerId: string) => void;
  onLockGK: (quarter: QuarterKey, playerId: string) => void;
  onUnlockGK: (quarter: QuarterKey) => void;
}

export function QuarterPanel({
  quarter,
  quarterRotation,
  allPlayers,
  availability,
  onLockSlot,
  onUnlockSlot,
  onLockBench,
  onLockGK,
  onUnlockGK,
}: QuarterPanelProps) {
  const availablePlayerIds = new Set(
    availability.filter((a) => a.quarters[quarter]).map((a) => a.playerId),
  );
  const availablePlayers = allPlayers.filter((p) => availablePlayerIds.has(p.id));

  const gkPickerPlayers = [...availablePlayers].sort((a, b) => {
    if (a.goalieWilling !== b.goalieWilling) return a.goalieWilling ? -1 : 1;
    return a.seasonGKQuarters - b.seasonGKQuarters;
  });

  return (
    <div className="quarter-panel">
      <GoalieRow
        quarter={quarter}
        gkPlayerId={quarterRotation.gkPlayerId}
        gkLocked={quarterRotation.gkLocked}
        availablePlayers={gkPickerPlayers}
        allPlayers={allPlayers}
        onOverride={onLockGK}
        onUnlockGK={onUnlockGK}
      />

      <div className="quarter-panel__halves">
        <HalfPanel
          quarter={quarter}
          half="first"
          halfRotation={quarterRotation.first}
          allPlayers={allPlayers}
          availablePlayers={availablePlayers}
          onLockSlot={onLockSlot}
          onUnlockSlot={onUnlockSlot}
          onLockBench={onLockBench}
        />
        <HalfPanel
          quarter={quarter}
          half="second"
          halfRotation={quarterRotation.second}
          allPlayers={allPlayers}
          availablePlayers={availablePlayers}
          onLockSlot={onLockSlot}
          onUnlockSlot={onUnlockSlot}
          onLockBench={onLockBench}
        />
      </div>
    </div>
  );
}

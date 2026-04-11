import type { Game, ShiftKey, Player, PositionName, QuarterKey, QuarterRotation } from '../../types';
import { GoalieRow } from './GoalieRow';
import { ShiftPanel } from './ShiftPanel';

interface QuarterPanelProps {
  quarter: QuarterKey;
  quarterRotation: QuarterRotation;
  allPlayers: Player[];
  availability: Game['availability'];
  onLockSlot: (quarter: QuarterKey, shift: ShiftKey, position: PositionName, playerId: string) => void;
  onUnlockSlot: (quarter: QuarterKey, shift: ShiftKey, position: PositionName) => void;
  onLockBench: (quarter: QuarterKey, shift: ShiftKey, playerId: string) => void;
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

      <div className="quarter-panel__shifts">
        <ShiftPanel
          quarter={quarter}
          shift="shift1"
          shiftRotation={quarterRotation.shift1}
          allPlayers={allPlayers}
          availablePlayers={availablePlayers}
          onLockSlot={onLockSlot}
          onUnlockSlot={onUnlockSlot}
          onLockBench={onLockBench}
        />
        <ShiftPanel
          quarter={quarter}
          shift="shift2"
          shiftRotation={quarterRotation.shift2}
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

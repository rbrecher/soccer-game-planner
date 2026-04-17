import type { Game, ShiftKey, Player, PositionName, QuarterKey, QuarterRotation } from '../../types';
import { SHIFTS } from '../../constants/game';
import { GoalieRow } from './GoalieRow';
import { ShiftPanel } from './ShiftPanel';

interface QuarterPanelProps {
  quarter: QuarterKey;
  activeShift: ShiftKey;
  quarterRotation: QuarterRotation;
  allPlayers: Player[];
  availability: Game['availability'];
  onLockSlot: (quarter: QuarterKey, shift: ShiftKey, position: PositionName, playerId: string) => void;
  onUnlockSlot: (quarter: QuarterKey, shift: ShiftKey, position: PositionName) => void;
  onLockBench: (quarter: QuarterKey, shift: ShiftKey, playerId: string) => void;
  onUnlockBench: (quarter: QuarterKey, shift: ShiftKey, playerId: string) => void;
  onLockGK: (quarter: QuarterKey, playerId: string) => void;
  onUnlockGK: (quarter: QuarterKey) => void;
  onCloseShift: (quarter: QuarterKey, shift: ShiftKey) => void;
  onReopenShift: (quarter: QuarterKey, shift: ShiftKey) => void;
}

export function QuarterPanel({
  quarter,
  activeShift,
  quarterRotation,
  allPlayers,
  availability,
  onLockSlot,
  onUnlockSlot,
  onLockBench,
  onUnlockBench,
  onLockGK,
  onUnlockGK,
  onCloseShift,
  onReopenShift,
}: QuarterPanelProps) {
  const isGKReadOnly = SHIFTS.some((s) => quarterRotation[s]?.closed ?? false);

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
        readOnly={isGKReadOnly}
        availablePlayers={gkPickerPlayers}
        allPlayers={allPlayers}
        onOverride={onLockGK}
        onUnlockGK={onUnlockGK}
      />

      <div className="quarter-panel__shifts">
        <ShiftPanel
          quarter={quarter}
          shift={activeShift}
          shiftRotation={quarterRotation[activeShift]}
          prevPositions={activeShift === 'shift2' ? quarterRotation.shift1.positions : undefined}
          isClosed={quarterRotation[activeShift]?.closed ?? false}
          allPlayers={allPlayers}
          availablePlayers={availablePlayers}
          onLockSlot={onLockSlot}
          onUnlockSlot={onUnlockSlot}
          onLockBench={onLockBench}
          onUnlockBench={onUnlockBench}
          onClose={() => onCloseShift(quarter, activeShift)}
          onReopen={() => onReopenShift(quarter, activeShift)}
        />
      </div>
    </div>
  );
}

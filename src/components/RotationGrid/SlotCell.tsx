import type { Player, PositionName, SlotAssignment } from '../../types';

interface SlotCellProps {
  position: PositionName;
  slot: SlotAssignment;
  players: Player[];
  onClick: () => void;
}

export function SlotCell({ position, slot, players, onClick }: SlotCellProps) {
  const player = players.find((p) => p.id === slot.playerId);

  return (
    <button className={`slot-cell${slot.locked ? ' slot-cell--locked' : ''}`} onClick={onClick}>
      <span className="slot-cell__pos">{position}</span>
      <span className="slot-cell__player">{player ? player.name : '—'}</span>
      {slot.locked && <span className="slot-cell__lock" aria-label="Locked">🔒</span>}
    </button>
  );
}

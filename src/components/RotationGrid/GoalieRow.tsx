import { useState } from 'react';
import type { Player, QuarterKey } from '../../types';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { PlayerPicker } from '../shared/PlayerPicker';

interface GoalieRowProps {
  quarter: QuarterKey;
  gkPlayerId: string | null;
  gkLocked: boolean;
  availablePlayers: Player[];
  allPlayers: Player[];
  onOverride: (quarter: QuarterKey, playerId: string) => void;
}

export function GoalieRow({
  quarter,
  gkPlayerId,
  gkLocked,
  availablePlayers,
  allPlayers,
  onOverride,
}: GoalieRowProps) {
  const [open, setOpen] = useState(false);
  const gkPlayer = allPlayers.find((p) => p.id === gkPlayerId);

  return (
    <div className={`goalie-row${gkLocked ? ' goalie-row--locked' : ''}`}>
      <span className="goalie-row__label">GK (full quarter)</span>
      <span className="goalie-row__name">{gkPlayer ? gkPlayer.name : '—'}</span>
      {gkLocked && <span className="slot-cell__lock" aria-label="Locked">🔒</span>}
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Override GK
      </Button>

      {open && (
        <Modal title={`Override GK — ${quarter}`} onClose={() => setOpen(false)}>
          <PlayerPicker
            players={availablePlayers}
            currentPlayerId={gkPlayerId}
            goalieOnly={false}
            label="Select goalkeeper (goalie-willing players listed first)"
            onSelect={(id) => {
              onOverride(quarter, id);
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

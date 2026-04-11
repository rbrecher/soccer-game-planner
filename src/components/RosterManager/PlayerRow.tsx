import { useState } from 'react';
import type { Player } from '../../types';
import { Button } from '../shared/Button';

interface PlayerRowProps {
  player: Player;
  onUpdate: (id: string, changes: Partial<Omit<Player, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function PlayerRow({ player, onUpdate, onRemove }: PlayerRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);

  const saveName = () => {
    if (name.trim()) onUpdate(player.id, { name: name.trim() });
    setEditing(false);
  };

  return (
    <div className="player-row">
      <div className="player-row__name">
        {editing ? (
          <input
            className="player-row__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            autoFocus
          />
        ) : (
          <span onClick={() => setEditing(true)} className="player-row__name-text">
            {player.name}
          </span>
        )}
      </div>

      <div className="player-row__gk">
        <label className="player-row__toggle">
          <input
            type="checkbox"
            checked={player.goalieWilling}
            onChange={(e) => onUpdate(player.id, { goalieWilling: e.target.checked })}
          />
          <span>GK willing</span>
        </label>
      </div>

      <div className="player-row__season">
        <span className="badge">{player.seasonGKQuarters}Q as GK</span>
      </div>

      <Button
        variant="danger"
        size="sm"
        onClick={() => onRemove(player.id)}
        aria-label={`Remove ${player.name}`}
      >
        Remove
      </Button>
    </div>
  );
}

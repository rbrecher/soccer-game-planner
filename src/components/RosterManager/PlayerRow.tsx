import { useState } from 'react';
import type { Player, PositionName } from '../../types';
import { ALL_POSITIONS } from '../../constants/game';
import { Button } from '../shared/Button';

const POSITION_ABBR: Record<PositionName, string> = {
  'GK': 'GK',
  'Left Wing': 'LW',
  'Right Wing': 'RW',
  'Striker': 'ST',
  'Center Mid': 'CM',
  'Left Back': 'LB',
  'Right Back': 'RB',
};

interface PlayerRowProps {
  player: Player;
  playerSeasonPositions: Partial<Record<PositionName, number>>;
  onUpdate: (id: string, changes: Partial<Omit<Player, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function PlayerRow({ player, playerSeasonPositions, onUpdate, onRemove }: PlayerRowProps) {
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
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
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

      {ALL_POSITIONS.some((pos) => (playerSeasonPositions[pos] ?? 0) > 0) && (
        <div className="player-row__season-stats">
          <span className="season-stat season-stat--total">
            Tot·{ALL_POSITIONS.reduce((sum, pos) => sum + (playerSeasonPositions[pos] ?? 0), 0)}
          </span>
          {ALL_POSITIONS.filter((pos) => (playerSeasonPositions[pos] ?? 0) > 0).map((pos) => (
            <span key={pos} className="season-stat">
              {POSITION_ABBR[pos]}·{playerSeasonPositions[pos]}
            </span>
          ))}
        </div>
      )}

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

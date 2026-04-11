import type { Player } from '../../types';

interface PlayerPickerProps {
  players: Player[];
  currentPlayerId?: string | null;
  onSelect: (playerId: string) => void;
  goalieOnly?: boolean;
  label?: string;
}

export function PlayerPicker({
  players,
  currentPlayerId,
  onSelect,
  goalieOnly = false,
  label = 'Select player',
}: PlayerPickerProps) {
  const filtered = goalieOnly ? players.filter((p) => p.goalieWilling) : players;
  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="player-picker">
      <p className="player-picker__label">{label}</p>
      <ul className="player-picker__list">
        {sorted.map((p) => (
          <li key={p.id}>
            <button
              className={`player-picker__item${p.id === currentPlayerId ? ' player-picker__item--current' : ''}`}
              onClick={() => onSelect(p.id)}
            >
              <span className="player-picker__name">{p.name}</span>
              {goalieOnly && (
                <span className="player-picker__gk-badge">GK {p.seasonGKQuarters}Q</span>
              )}
            </button>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="player-picker__empty">No eligible players</li>
        )}
      </ul>
    </div>
  );
}

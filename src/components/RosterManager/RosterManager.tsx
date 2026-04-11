import { useState } from 'react';
import type { Player } from '../../types';
import { Button } from '../shared/Button';
import { PlayerRow } from './PlayerRow';

interface RosterManagerProps {
  roster: Player[];
  onAdd: (name: string, goalieWilling: boolean) => void;
  onUpdate: (id: string, changes: Partial<Omit<Player, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function RosterManager({ roster, onAdd, onUpdate, onRemove }: RosterManagerProps) {
  const [newName, setNewName] = useState('');
  const [newGKWilling, setNewGKWilling] = useState(true);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim(), newGKWilling);
    setNewName('');
    setNewGKWilling(true);
  };

  return (
    <div className="roster-manager">
      <h2 className="section-title">Team Roster</h2>
      <p className="section-subtitle">
        {roster.length} player{roster.length !== 1 ? 's' : ''} — tap a name to edit
      </p>

      <div className="roster-manager__add">
        <input
          className="input"
          placeholder="Player name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <label className="player-row__toggle">
          <input
            type="checkbox"
            checked={newGKWilling}
            onChange={(e) => setNewGKWilling(e.target.checked)}
          />
          <span>GK willing</span>
        </label>
        <Button onClick={handleAdd} disabled={!newName.trim()}>
          Add Player
        </Button>
      </div>

      {roster.length === 0 && (
        <p className="empty-state">No players yet. Add your first player above.</p>
      )}

      <div className="roster-manager__list">
        {roster.map((p) => (
          <PlayerRow key={p.id} player={p} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

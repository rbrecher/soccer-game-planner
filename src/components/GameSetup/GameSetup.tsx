import { useState } from 'react';
import type { Game, Player, PlayerAvailability, QuarterKey, RotationWarning } from '../../types';
import { QUARTERS, TEAM_SIZE } from '../../constants/game';
import { Button } from '../shared/Button';
import { AvailabilityGrid } from './AvailabilityGrid';

interface GameSetupProps {
  roster: Player[];
  games: Game[];
  selectedGame: Game | null;
  onCreateGame: (label: string, date: string) => Game;
  onUpdateGame: (id: string, changes: Partial<Omit<Game, 'id'>>) => void;
  onSelectGame: (id: string | null) => void;
  onDeleteGame: (id: string) => void;
  onGenerateRotation: () => RotationWarning[];
  onNavigateToRotation: () => void;
}

export function GameSetup({
  roster,
  games,
  selectedGame,
  onCreateGame,
  onUpdateGame,
  onSelectGame,
  onDeleteGame,
  onGenerateRotation,
  onNavigateToRotation,
}: GameSetupProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [warnings, setWarnings] = useState<RotationWarning[]>([]);

  const handleCreate = () => {
    if (!newLabel.trim()) return;
    onCreateGame(newLabel.trim(), newDate);
    setNewLabel('');
  };

  const handleAvailChange = (playerId: string, quarter: QuarterKey, available: boolean) => {
    if (!selectedGame) return;
    const updated: PlayerAvailability[] = selectedGame.availability.map((a) =>
      a.playerId === playerId ? { ...a, quarters: { ...a.quarters, [quarter]: available } } : a,
    );
    onUpdateGame(selectedGame.id, { availability: updated });
  };

  const availableCountPerQuarter = (quarter: QuarterKey): number => {
    if (!selectedGame) return 0;
    return selectedGame.availability.filter((a) => a.quarters[quarter]).length;
  };

  const canGenerate =
    selectedGame !== null &&
    QUARTERS.every((q) => availableCountPerQuarter(q) >= TEAM_SIZE);

  const handleGenerate = () => {
    const w = onGenerateRotation();
    setWarnings(w);
    if (w.length === 0) onNavigateToRotation();
  };

  return (
    <div className="game-setup">
      <h2 className="section-title">Games</h2>

      {/* Create new game */}
      <div className="game-setup__new">
        <h3 className="subsection-title">New Game</h3>
        <div className="game-setup__new-row">
          <input
            className="input"
            placeholder="e.g. vs. Northside FC"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <input
            className="input input--date"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <Button onClick={handleCreate} disabled={!newLabel.trim()}>
            Create
          </Button>
        </div>
      </div>

      {/* Game list */}
      {games.length > 0 && (
        <div className="game-setup__list">
          <h3 className="subsection-title">Select a Game</h3>
          {games.map((g) => (
            <div
              key={g.id}
              className={`game-card${selectedGame?.id === g.id ? ' game-card--selected' : ''}`}
              onClick={() => onSelectGame(g.id)}
            >
              <div className="game-card__info">
                <span className="game-card__label">{g.label}</span>
                <span className="game-card__date">{g.date}</span>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGame(g.id);
                }}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Availability for selected game */}
      {selectedGame && (
        <div className="game-setup__availability">
          <h3 className="subsection-title">
            Availability — {selectedGame.label}
          </h3>
          <p className="section-subtitle">Check which quarters each player is available for.</p>

          {roster.length === 0 ? (
            <p className="empty-state">Add players to your roster first.</p>
          ) : (
            <AvailabilityGrid
              roster={roster}
              availability={selectedGame.availability}
              onChange={handleAvailChange}
            />
          )}

          <div className="game-setup__quarter-counts">
            {QUARTERS.map((q) => {
              const count = availableCountPerQuarter(q);
              return (
                <span
                  key={q}
                  className={`quarter-count${count < TEAM_SIZE ? ' quarter-count--warn' : ''}`}
                >
                  {q}: {count} available{count < TEAM_SIZE ? ` (need ${TEAM_SIZE})` : ''}
                </span>
              );
            })}
          </div>

          {warnings.length > 0 && (
            <div className="warnings">
              {warnings.map((w, i) => (
                <p key={i} className="warning">
                  ⚠ {w.message}
                </p>
              ))}
            </div>
          )}

          <div className="game-setup__actions">
            <Button onClick={handleGenerate} disabled={!canGenerate}>
              {selectedGame.rotation ? 'Regenerate Rotation' : 'Generate Rotation'}
            </Button>
            {selectedGame.rotation && (
              <Button variant="secondary" onClick={onNavigateToRotation}>
                View Rotation
              </Button>
            )}
            {!canGenerate && (
              <p className="hint">
                Need at least {TEAM_SIZE} available players per quarter to generate a rotation.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

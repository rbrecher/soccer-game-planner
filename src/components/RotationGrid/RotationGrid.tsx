import { useState } from 'react';
import type { Game, ShiftKey, Player, PositionName, QuarterKey, RotationWarning } from '../../types';
import { QUARTERS } from '../../constants/game';
import { Button } from '../shared/Button';
import { QuarterPanel } from './QuarterPanel';

interface RotationGridProps {
  game: Game;
  allPlayers: Player[];
  warnings: RotationWarning[];
  onLockSlot: (quarter: QuarterKey, half: ShiftKey, position: PositionName, playerId: string) => void;
  onUnlockSlot: (quarter: QuarterKey, half: ShiftKey, position: PositionName) => void;
  onLockBench: (quarter: QuarterKey, half: ShiftKey, playerId: string) => void;
  onLockGK: (quarter: QuarterKey, playerId: string) => void;
  onUnlockGK: (quarter: QuarterKey) => void;
  onReset: () => RotationWarning[];
  onCloseShift: (quarter: QuarterKey, shift: ShiftKey) => void;
  onReopenShift: (quarter: QuarterKey, shift: ShiftKey) => void;
}

export function RotationGrid({
  game,
  allPlayers,
  warnings,
  onLockSlot,
  onUnlockSlot,
  onLockBench,
  onLockGK,
  onUnlockGK,
  onReset,
  onCloseShift,
  onReopenShift,
}: RotationGridProps) {
  const [activeQuarter, setActiveQuarter] = useState<QuarterKey>('Q1');
  const [activeShift, setActiveShift] = useState<ShiftKey>('shift1');
  const [localWarnings, setLocalWarnings] = useState<RotationWarning[]>(warnings);

  const grid = game.rotation;
  if (!grid) return <p className="empty-state">No rotation generated yet.</p>;

  const handleReset = () => {
    const w = onReset();
    setLocalWarnings(w);
  };

  const handleLockSlot = (quarter: QuarterKey, half: ShiftKey, position: PositionName, playerId: string) => {
    onLockSlot(quarter, half, position, playerId);
    setLocalWarnings([]);
  };

  const handleLockGK = (quarter: QuarterKey, playerId: string) => {
    onLockGK(quarter, playerId);
    setLocalWarnings([]);
  };

  return (
    <div className="rotation-view">
      <div className="rotation-view__header">
        <div>
          <h2 className="section-title">{game.label}</h2>
          <p className="section-subtitle">{game.date}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleReset}>
          Reset & Regenerate
        </Button>
      </div>

      {localWarnings.length > 0 && (
        <div className="warnings">
          {localWarnings.map((w, i) => (
            <p key={i} className="warning">⚠ {w.message}</p>
          ))}
        </div>
      )}

      <div className="quarter-tabs">
        {QUARTERS.map((q) => (
          <button
            key={q}
            className={`quarter-tab${activeQuarter === q ? ' quarter-tab--active' : ''}`}
            onClick={() => { setActiveQuarter(q); setActiveShift('shift1'); }}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="shift-tabs">
        {(['shift1', 'shift2'] as ShiftKey[]).map((s) => {
          const isClosed = grid[activeQuarter]?.[s]?.closed ?? false;
          return (
            <button
              key={s}
              className={[
                'shift-tab',
                activeShift === s ? 'shift-tab--active' : '',
                isClosed ? 'shift-tab--closed' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setActiveShift(s)}
            >
              {isClosed ? '✓ ' : ''}{s === 'shift1' ? '1st Shift' : '2nd Shift'}
            </button>
          );
        })}
      </div>

      <QuarterPanel
        quarter={activeQuarter}
        activeShift={activeShift}
        quarterRotation={grid[activeQuarter]}
        allPlayers={allPlayers}
        availability={game.availability}
        onLockSlot={handleLockSlot}
        onUnlockSlot={onUnlockSlot}
        onLockBench={onLockBench}
        onLockGK={handleLockGK}
        onUnlockGK={onUnlockGK}
        onCloseShift={onCloseShift}
        onReopenShift={onReopenShift}
      />
    </div>
  );
}

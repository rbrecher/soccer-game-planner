import { useState } from 'react';
import type { HalfKey, HalfRotation, Player, PositionName, QuarterKey } from '../../types';
import { Modal } from '../shared/Modal';
import { PlayerPicker } from '../shared/PlayerPicker';
import { Button } from '../shared/Button';
import { FieldView } from './FieldView';

interface HalfPanelProps {
  quarter: QuarterKey;
  half: HalfKey;
  halfRotation: HalfRotation;
  allPlayers: Player[];
  availablePlayers: Player[];
  onLockSlot: (quarter: QuarterKey, half: HalfKey, position: PositionName, playerId: string) => void;
  onUnlockSlot: (quarter: QuarterKey, half: HalfKey, position: PositionName) => void;
  onLockBench: (quarter: QuarterKey, half: HalfKey, playerId: string) => void;
}

export function HalfPanel({
  quarter,
  half,
  halfRotation,
  allPlayers,
  availablePlayers,
  onLockSlot,
  onUnlockSlot,
  onLockBench,
}: HalfPanelProps) {
  const [editingSlot, setEditingSlot] = useState<PositionName | 'bench' | null>(null);

  const getPlayer = (id: string | null) => allPlayers.find((p) => p.id === id);

  const handleSlotSelect = (playerId: string) => {
    if (editingSlot && editingSlot !== 'bench') {
      onLockSlot(quarter, half, editingSlot, playerId);
    } else if (editingSlot === 'bench') {
      onLockBench(quarter, half, playerId);
    }
    setEditingSlot(null);
  };

  const handleClearLock = () => {
    if (editingSlot && editingSlot !== 'bench') {
      onUnlockSlot(quarter, half, editingSlot);
    }
    setEditingSlot(null);
  };

  const halfLabel = half === 'first' ? '1st Half' : '2nd Half';
  const editingSlotLocked =
    editingSlot && editingSlot !== 'bench'
      ? (halfRotation.positions[editingSlot]?.locked ?? false)
      : false;

  return (
    <div className="half-panel">
      <h4 className="half-panel__title">{halfLabel}</h4>

      <FieldView
        positions={halfRotation.positions}
        players={allPlayers}
        onSlotClick={(pos) => setEditingSlot(pos)}
      />

      {halfRotation.bench.length > 0 && (
        <div className="half-panel__bench">
          <span className="half-panel__bench-label">Bench</span>
          {halfRotation.bench.map((slot, i) => {
            const p = getPlayer(slot.playerId);
            return (
              <span
                key={slot.playerId ?? i}
                className={`bench-tag${slot.locked ? ' bench-tag--locked' : ''}`}
              >
                {p ? p.name : '—'}
                {slot.locked && ' 🔒'}
              </span>
            );
          })}
        </div>
      )}

      {editingSlot && (
        <Modal
          title={`${editingSlot === 'bench' ? 'Move to bench' : editingSlot} — ${quarter} ${halfLabel}`}
          onClose={() => setEditingSlot(null)}
        >
          {editingSlotLocked && (
            <div className="modal-clear">
              <Button variant="secondary" size="sm" onClick={handleClearLock}>
                Clear lock — let algorithm decide
              </Button>
            </div>
          )}
          <PlayerPicker
            players={availablePlayers}
            currentPlayerId={
              editingSlot !== 'bench'
                ? halfRotation.positions[editingSlot]?.playerId
                : null
            }
            onSelect={handleSlotSelect}
            label="Or swap with:"
          />
        </Modal>
      )}
    </div>
  );
}

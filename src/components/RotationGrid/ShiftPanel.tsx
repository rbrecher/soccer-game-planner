import { useState } from 'react';
import type { ShiftKey, ShiftRotation, Player, PositionName, QuarterKey } from '../../types';
import { Modal } from '../shared/Modal';
import { PlayerPicker } from '../shared/PlayerPicker';
import { Button } from '../shared/Button';
import { FieldView } from './FieldView';

interface ShiftPanelProps {
  quarter: QuarterKey;
  shift: ShiftKey;
  shiftRotation: ShiftRotation;
  allPlayers: Player[];
  availablePlayers: Player[];
  onLockSlot: (quarter: QuarterKey, shift: ShiftKey, position: PositionName, playerId: string) => void;
  onUnlockSlot: (quarter: QuarterKey, shift: ShiftKey, position: PositionName) => void;
  onLockBench: (quarter: QuarterKey, shift: ShiftKey, playerId: string) => void;
}

export function ShiftPanel({
  quarter,
  shift,
  shiftRotation,
  allPlayers,
  availablePlayers,
  onLockSlot,
  onUnlockSlot,
  onLockBench,
}: ShiftPanelProps) {
  const [editingSlot, setEditingSlot] = useState<PositionName | 'bench' | null>(null);

  const getPlayer = (id: string | null) => allPlayers.find((p) => p.id === id);

  const handleSlotSelect = (playerId: string) => {
    if (editingSlot && editingSlot !== 'bench') {
      onLockSlot(quarter, shift, editingSlot, playerId);
    } else if (editingSlot === 'bench') {
      onLockBench(quarter, shift, playerId);
    }
    setEditingSlot(null);
  };

  const handleClearLock = () => {
    if (editingSlot && editingSlot !== 'bench') {
      onUnlockSlot(quarter, shift, editingSlot);
    }
    setEditingSlot(null);
  };

  const shiftLabel = shift === 'shift1' ? '1st Shift' : '2nd Shift';
  const editingSlotLocked =
    editingSlot && editingSlot !== 'bench'
      ? (shiftRotation.positions[editingSlot]?.locked ?? false)
      : false;

  return (
    <div className="shift-panel">
      <h4 className="shift-panel__title">{shiftLabel}</h4>

      <FieldView
        positions={shiftRotation.positions}
        players={allPlayers}
        onSlotClick={(pos) => setEditingSlot(pos)}
      />

      {shiftRotation.bench.length > 0 && (
        <div className="shift-panel__bench">
          <span className="shift-panel__bench-label">Bench</span>
          {shiftRotation.bench.map((slot, i) => {
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
          title={`${editingSlot === 'bench' ? 'Move to bench' : editingSlot} — ${quarter} ${shiftLabel}`}
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
                ? shiftRotation.positions[editingSlot]?.playerId
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

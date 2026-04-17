import { useState } from 'react';
import type { ShiftKey, ShiftRotation, SlotAssignment, Player, PositionName, QuarterKey } from '../../types';
import { Modal } from '../shared/Modal';
import { PlayerPicker } from '../shared/PlayerPicker';
import { Button } from '../shared/Button';
import { FieldView } from './FieldView';

interface ShiftPanelProps {
  quarter: QuarterKey;
  shift: ShiftKey;
  shiftRotation: ShiftRotation;
  prevPositions?: Record<PositionName, SlotAssignment>;
  isClosed: boolean;
  allPlayers: Player[];
  availablePlayers: Player[];
  onLockSlot: (quarter: QuarterKey, shift: ShiftKey, position: PositionName, playerId: string) => void;
  onUnlockSlot: (quarter: QuarterKey, shift: ShiftKey, position: PositionName) => void;
  onLockBench: (quarter: QuarterKey, shift: ShiftKey, playerId: string) => void;
  onUnlockBench: (quarter: QuarterKey, shift: ShiftKey, playerId: string) => void;
  onClose: () => void;
  onReopen: () => void;
}

export function ShiftPanel({
  quarter,
  shift,
  shiftRotation,
  prevPositions,
  isClosed,
  allPlayers,
  availablePlayers,
  onLockSlot,
  onUnlockSlot,
  onLockBench,
  onUnlockBench,
  onClose,
  onReopen,
}: ShiftPanelProps) {
  const [editingSlot, setEditingSlot] = useState<PositionName | 'bench' | null>(null);
  const [editingBenchPlayerId, setEditingBenchPlayerId] = useState<string | null>(null);

  const getPlayer = (id: string | null) => allPlayers.find((p) => p.id === id);

  const handleSlotSelect = (playerId: string) => {
    if (editingSlot && editingSlot !== 'bench') {
      onLockSlot(quarter, shift, editingSlot, playerId);
    } else if (editingSlot === 'bench') {
      onLockBench(quarter, shift, playerId);
    }
    setEditingSlot(null);
    setEditingBenchPlayerId(null);
  };

  const handleClearLock = () => {
    if (editingSlot && editingSlot !== 'bench') {
      onUnlockSlot(quarter, shift, editingSlot);
    } else if (editingSlot === 'bench' && editingBenchPlayerId) {
      onUnlockBench(quarter, shift, editingBenchPlayerId);
    }
    setEditingSlot(null);
    setEditingBenchPlayerId(null);
  };

  const shiftLabel = shift === 'shift1' ? '1st Shift' : '2nd Shift';
  const editingSlotLocked =
    editingSlot && editingSlot !== 'bench'
      ? (shiftRotation.positions[editingSlot]?.locked ?? false)
      : editingSlot === 'bench' && editingBenchPlayerId
        ? (shiftRotation.bench.find((s) => s.playerId === editingBenchPlayerId)?.locked ?? false)
        : false;

  return (
    <div className="shift-panel">
      <h4 className="shift-panel__title">{shiftLabel}</h4>

      <FieldView
        positions={shiftRotation.positions}
        prevPositions={prevPositions}
        players={allPlayers}
        readOnly={isClosed}
        onSlotClick={(pos) => { if (!isClosed) setEditingSlot(pos); }}
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
                onClick={isClosed ? undefined : () => {
                  setEditingSlot('bench');
                  setEditingBenchPlayerId(slot.playerId ?? null);
                }}
                style={isClosed ? { cursor: 'default' } : undefined}
              >
                {p ? p.name : '—'}
                {slot.locked && ' 🔒'}
              </span>
            );
          })}
        </div>
      )}

      <div className="shift-panel__close-row">
        {isClosed ? (
          <Button variant="secondary" size="sm" onClick={onReopen}>
            Reopen Shift
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Shift
          </Button>
        )}
      </div>

      {editingSlot && (
        <Modal
          title={
            editingSlot === 'bench'
              ? `${getPlayer(editingBenchPlayerId)?.name ?? 'Player'} — bench — ${quarter} ${shiftLabel}`
              : `${editingSlot} — ${quarter} ${shiftLabel}`
          }
          onClose={() => { setEditingSlot(null); setEditingBenchPlayerId(null); }}
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
                : editingBenchPlayerId
            }
            onSelect={handleSlotSelect}
            label="Or swap with:"
          />
        </Modal>
      )}
    </div>
  );
}

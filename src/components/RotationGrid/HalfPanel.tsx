import { useState } from 'react';
import type { HalfKey, HalfRotation, Player, PositionName, QuarterKey } from '../../types';
import { Modal } from '../shared/Modal';
import { PlayerPicker } from '../shared/PlayerPicker';
import { FieldView } from './FieldView';

interface HalfPanelProps {
  quarter: QuarterKey;
  half: HalfKey;
  halfRotation: HalfRotation;
  allPlayers: Player[];
  availablePlayers: Player[];
  onLockSlot: (quarter: QuarterKey, half: HalfKey, position: PositionName, playerId: string) => void;
  onLockBench: (quarter: QuarterKey, half: HalfKey, playerId: string) => void;
}

export function HalfPanel({
  quarter,
  half,
  halfRotation,
  allPlayers,
  availablePlayers,
  onLockSlot,
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

  const halfLabel = half === 'first' ? '1st Half' : '2nd Half';

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
          <PlayerPicker
            players={availablePlayers}
            currentPlayerId={
              editingSlot !== 'bench'
                ? halfRotation.positions[editingSlot]?.playerId
                : null
            }
            onSelect={handleSlotSelect}
            label="Swap with:"
          />
        </Modal>
      )}
    </div>
  );
}

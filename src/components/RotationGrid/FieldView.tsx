import type { Player, PositionName, SlotAssignment } from '../../types';
import { FIELD_POSITIONS } from '../../constants/game';

interface FieldViewProps {
  positions: Record<PositionName, SlotAssignment>;
  players: Player[];
  onSlotClick: (position: PositionName) => void;
}

const FIELD_COORDS: Partial<Record<PositionName, { top: string; left: string }>> = {
  'Striker':     { top: '8%',  left: '50%' },
  'Left Wing':   { top: '30%', left: '15%' },
  'Right Wing':  { top: '30%', left: '85%' },
  'Center Mid':  { top: '55%', left: '50%' },
  'Left Back':   { top: '76%', left: '25%' },
  'Right Back':  { top: '76%', left: '75%' },
};

const POSITION_ABBR: Partial<Record<PositionName, string>> = {
  'Striker':    'ST',
  'Left Wing':  'LW',
  'Right Wing': 'RW',
  'Center Mid': 'CM',
  'Left Back':  'LB',
  'Right Back': 'RB',
};

export function FieldView({ positions, players, onSlotClick }: FieldViewProps) {
  return (
    <div className="field">
      <div className="field__surface">
        {FIELD_POSITIONS.map((pos) => {
          const coords = FIELD_COORDS[pos];
          if (!coords) return null;

          const slot = positions[pos] ?? { playerId: null, locked: false };
          const player = players.find((p) => p.id === slot.playerId);
          const isEmpty = !player;

          return (
            <button
              key={pos}
              className={[
                'field__token',
                slot.locked ? 'field__token--locked' : '',
                isEmpty ? 'field__token--empty' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ top: coords.top, left: coords.left }}
              onClick={() => onSlotClick(pos)}
              aria-label={`${pos}: ${player ? player.name : 'empty'}`}
            >
              <span className="field__token-pos">{POSITION_ABBR[pos] ?? pos}</span>
              <span className="field__token-name">{player ? player.name : '—'}</span>
              {slot.locked && <span className="field__token-lock">🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

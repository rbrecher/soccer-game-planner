import { useRef, useEffect } from 'react';
import type { Player, PlayerAvailability, QuarterKey } from '../../types';
import { QUARTERS } from '../../constants/game';

interface AvailabilityGridProps {
  roster: Player[];
  availability: PlayerAvailability[];
  onChange: (playerId: string, quarter: QuarterKey, available: boolean) => void;
  onChangeAll: (playerId: string, available: boolean) => void;
}

function AllGameCheckbox({
  playerId,
  quarters,
  onChangeAll,
}: {
  playerId: string;
  quarters: Record<QuarterKey, boolean>;
  onChangeAll: (playerId: string, available: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const availCount = QUARTERS.filter((q) => quarters[q]).length;
  const allChecked = availCount === QUARTERS.length;
  const someChecked = availCount > 0 && availCount < QUARTERS.length;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someChecked;
  }, [someChecked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allChecked}
      onChange={(e) => onChangeAll(playerId, e.target.checked)}
      aria-label="Available for whole game"
    />
  );
}

export function AvailabilityGrid({ roster, availability, onChange, onChangeAll }: AvailabilityGridProps) {
  const getAvail = (playerId: string, quarter: QuarterKey): boolean => {
    const a = availability.find((x) => x.playerId === playerId);
    return a ? a.quarters[quarter] : true;
  };

  const getQuarters = (playerId: string): Record<QuarterKey, boolean> => {
    const a = availability.find((x) => x.playerId === playerId);
    return a?.quarters ?? { Q1: true, Q2: true, Q3: true, Q4: true };
  };

  return (
    <div className="avail-grid">
      <table className="avail-table">
        <thead>
          <tr>
            <th className="avail-table__name-col">Player</th>
            <th className="avail-table__quarter-col avail-table__all-col">All</th>
            {QUARTERS.map((q) => (
              <th key={q} className="avail-table__quarter-col">
                {q}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roster.map((p) => (
            <tr key={p.id}>
              <td className="avail-table__player">{p.name}</td>
              <td className="avail-table__cell">
                <AllGameCheckbox
                  playerId={p.id}
                  quarters={getQuarters(p.id)}
                  onChangeAll={onChangeAll}
                />
              </td>
              {QUARTERS.map((q) => (
                <td key={q} className="avail-table__cell">
                  <input
                    type="checkbox"
                    checked={getAvail(p.id, q)}
                    onChange={(e) => onChange(p.id, q, e.target.checked)}
                    aria-label={`${p.name} available ${q}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

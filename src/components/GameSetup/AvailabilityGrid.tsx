import type { Player, PlayerAvailability, QuarterKey } from '../../types';
import { QUARTERS } from '../../constants/game';

interface AvailabilityGridProps {
  roster: Player[];
  availability: PlayerAvailability[];
  onChange: (playerId: string, quarter: QuarterKey, available: boolean) => void;
}

export function AvailabilityGrid({ roster, availability, onChange }: AvailabilityGridProps) {
  const getAvail = (playerId: string, quarter: QuarterKey): boolean => {
    const a = availability.find((x) => x.playerId === playerId);
    return a ? a.quarters[quarter] : true;
  };

  return (
    <div className="avail-grid">
      <table className="avail-table">
        <thead>
          <tr>
            <th className="avail-table__name-col">Player</th>
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

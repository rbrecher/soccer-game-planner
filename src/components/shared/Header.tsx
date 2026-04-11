import type { ViewName } from '../../types';

interface HeaderProps {
  view: ViewName;
  onNavigate: (v: ViewName) => void;
  hasGame: boolean;
}

export function Header({ view, onNavigate, hasGame }: HeaderProps) {
  return (
    <header className="header">
      <span className="header__logo">⚽ Soccer Planner</span>
      <nav className="header__nav">
        <button
          className={`header__link${view === 'roster' ? ' header__link--active' : ''}`}
          onClick={() => onNavigate('roster')}
        >
          Roster
        </button>
        <button
          className={`header__link${view === 'game-setup' ? ' header__link--active' : ''}`}
          onClick={() => onNavigate('game-setup')}
        >
          Games
        </button>
        {hasGame && (
          <button
            className={`header__link${view === 'rotation' ? ' header__link--active' : ''}`}
            onClick={() => onNavigate('rotation')}
          >
            Rotation
          </button>
        )}
      </nav>
    </header>
  );
}

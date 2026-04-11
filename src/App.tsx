import { useState } from 'react';
import type { RotationWarning, ViewName } from './types';
import { useRoster } from './hooks/useRoster';
import { useGames } from './hooks/useGames';
import { useRotation } from './hooks/useRotation';
import { Header } from './components/shared/Header';
import { RosterManager } from './components/RosterManager/RosterManager';
import { GameSetup } from './components/GameSetup/GameSetup';
import { RotationGrid } from './components/RotationGrid/RotationGrid';
import './index.css';

export default function App() {
  const [view, setView] = useState<ViewName>('roster');
  const [rotationWarnings, setRotationWarnings] = useState<RotationWarning[]>([]);

  const { roster, addPlayer, updatePlayer, removePlayer } = useRoster();

  const {
    games,
    selectedGame,
    createGame,
    updateGame,
    deleteGame,
    selectGame,
  } = useGames(roster);

  const { generateFresh, lockSlot, lockBench, lockGK, resetGrid } = useRotation({
    players: roster,
    game: selectedGame,
    onGameUpdate: updateGame,
  });

  const handleGenerateRotation = (): RotationWarning[] => {
    const warnings = generateFresh();
    setRotationWarnings(warnings);
    return warnings;
  };

  return (
    <div className="app">
      <Header
        view={view}
        onNavigate={setView}
        hasGame={selectedGame !== null && selectedGame.rotation !== null}
      />

      <main className="main">
        {view === 'roster' && (
          <RosterManager
            roster={roster}
            onAdd={addPlayer}
            onUpdate={updatePlayer}
            onRemove={removePlayer}
          />
        )}

        {view === 'game-setup' && (
          <GameSetup
            roster={roster}
            games={games}
            selectedGame={selectedGame}
            onCreateGame={createGame}
            onUpdateGame={updateGame}
            onSelectGame={selectGame}
            onDeleteGame={deleteGame}
            onGenerateRotation={handleGenerateRotation}
            onNavigateToRotation={() => setView('rotation')}
          />
        )}

        {view === 'rotation' && selectedGame && selectedGame.rotation && (
          <RotationGrid
            game={selectedGame}
            allPlayers={roster}
            warnings={rotationWarnings}
            onLockSlot={lockSlot}
            onLockBench={lockBench}
            onLockGK={lockGK}
            onReset={resetGrid}
          />
        )}

        {view === 'rotation' && (!selectedGame || !selectedGame.rotation) && (
          <div className="empty-state-page">
            <p>No rotation to display. Go to Games and generate a rotation first.</p>
          </div>
        )}
      </main>
    </div>
  );
}

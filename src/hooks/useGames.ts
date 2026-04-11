import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Game, Player, PlayerAvailability } from '../types';
import { loadStorage, saveStorage } from '../storage/localStorage';

export function useGames(roster: Player[]) {
  const [games, setGames] = useState<Game[]>(() => loadStorage().games);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const selectedGame = games.find((g) => g.id === selectedGameId) ?? null;

  const persist = useCallback((updated: Game[]) => {
    setGames(updated);
    const storage = loadStorage();
    saveStorage({ ...storage, games: updated });
  }, []);

  const createGame = useCallback(
    (label: string, date: string): Game => {
      // Default: all players available all quarters
      const availability: PlayerAvailability[] = roster.map((p) => ({
        playerId: p.id,
        quarters: { Q1: true, Q2: true, Q3: true, Q4: true },
      }));

      const game: Game = {
        id: uuidv4(),
        label,
        date,
        availability,
        rotation: null,
      };

      const updated = [game, ...games];
      persist(updated);
      setSelectedGameId(game.id);
      return game;
    },
    [games, roster, persist],
  );

  const updateGame = useCallback(
    (id: string, changes: Partial<Omit<Game, 'id'>>) => {
      persist(games.map((g) => (g.id === id ? { ...g, ...changes } : g)));
    },
    [games, persist],
  );

  const deleteGame = useCallback(
    (id: string) => {
      persist(games.filter((g) => g.id !== id));
      if (selectedGameId === id) setSelectedGameId(null);
    },
    [games, selectedGameId, persist],
  );

  const selectGame = useCallback((id: string | null) => {
    setSelectedGameId(id);
  }, []);

  /**
   * Sync availability when roster changes — add new players as available,
   * remove players no longer on the roster.
   */
  const syncAvailabilityForGame = useCallback(
    (gameId: string) => {
      const game = games.find((g) => g.id === gameId);
      if (!game) return;

      const existingIds = new Set(game.availability.map((a) => a.playerId));
      const rosterIds = new Set(roster.map((p) => p.id));

      const newAvailability: PlayerAvailability[] = [
        ...game.availability.filter((a) => rosterIds.has(a.playerId)),
        ...roster
          .filter((p) => !existingIds.has(p.id))
          .map((p) => ({
            playerId: p.id,
            quarters: { Q1: true, Q2: true, Q3: true, Q4: true } as Record<
              'Q1' | 'Q2' | 'Q3' | 'Q4',
              boolean
            >,
          })),
      ];

      updateGame(gameId, { availability: newAvailability });
    },
    [games, roster, updateGame],
  );

  return {
    games,
    selectedGame,
    selectedGameId,
    createGame,
    updateGame,
    deleteGame,
    selectGame,
    syncAvailabilityForGame,
  };
}

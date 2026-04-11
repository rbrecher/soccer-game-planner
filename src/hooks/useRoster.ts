import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Player } from '../types';
import { loadStorage, saveStorage } from '../storage/localStorage';

export function useRoster() {
  const [roster, setRoster] = useState<Player[]>(() => loadStorage().roster);

  const persist = useCallback((updated: Player[]) => {
    setRoster(updated);
    const storage = loadStorage();
    saveStorage({ ...storage, roster: updated });
  }, []);

  const addPlayer = useCallback(
    (name: string, goalieWilling: boolean) => {
      const player: Player = {
        id: uuidv4(),
        name: name.trim(),
        goalieWilling,
        seasonGKQuarters: 0,
      };
      persist([...roster, player]);
    },
    [roster, persist],
  );

  const updatePlayer = useCallback(
    (id: string, changes: Partial<Omit<Player, 'id'>>) => {
      persist(roster.map((p) => (p.id === id ? { ...p, ...changes } : p)));
    },
    [roster, persist],
  );

  const removePlayer = useCallback(
    (id: string) => {
      persist(roster.filter((p) => p.id !== id));
    },
    [roster, persist],
  );

  const incrementGKQuarters = useCallback(
    (id: string, delta: number) => {
      persist(
        roster.map((p) =>
          p.id === id ? { ...p, seasonGKQuarters: Math.max(0, p.seasonGKQuarters + delta) } : p,
        ),
      );
    },
    [roster, persist],
  );

  return { roster, addPlayer, updatePlayer, removePlayer, incrementGKQuarters };
}

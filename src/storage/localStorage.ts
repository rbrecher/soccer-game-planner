import type { AppStorage } from '../types';

const STORAGE_KEY = 'soccer-planner-v1';
const CURRENT_SCHEMA_VERSION = 2;

const defaultStorage: AppStorage = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  roster: [],
  games: [],
};

function migrateIfNeeded(raw: unknown): AppStorage {
  if (!raw || typeof raw !== 'object') return { ...defaultStorage };

  const data = raw as Record<string, unknown>;

  if (!data.schemaVersion) {
    data.schemaVersion = 1;
  }

  // v1 → v2: rename QuarterRotation properties first/second → shift1/shift2
  if ((data.schemaVersion as number) < 2) {
    if (Array.isArray(data.games)) {
      data.games = (data.games as unknown[]).map((game) => {
        if (!game || typeof game !== 'object') return game;
        const g = game as Record<string, unknown>;
        if (!g.rotation || typeof g.rotation !== 'object') return g;
        const rotation = g.rotation as Record<string, Record<string, unknown>>;
        const newRotation: Record<string, unknown> = {};
        for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
          if (!rotation[q]) continue;
          const { first, second, ...rest } = rotation[q];
          newRotation[q] = { ...rest, shift1: first, shift2: second };
        }
        return { ...g, rotation: newRotation };
      });
    }
    data.schemaVersion = 2;
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    roster: Array.isArray(data.roster) ? data.roster : [],
    games: Array.isArray(data.games) ? data.games : [],
  };
}

export function loadStorage(): AppStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultStorage };
    return migrateIfNeeded(JSON.parse(raw));
  } catch {
    return { ...defaultStorage };
  }
}

export function saveStorage(data: AppStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded — silently fail rather than crash the app
  }
}

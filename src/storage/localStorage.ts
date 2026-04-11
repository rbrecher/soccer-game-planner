import type { AppStorage } from '../types';

const STORAGE_KEY = 'soccer-planner-v1';
const CURRENT_SCHEMA_VERSION = 1;

const defaultStorage: AppStorage = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  roster: [],
  games: [],
};

function migrateIfNeeded(raw: unknown): AppStorage {
  if (!raw || typeof raw !== 'object') return { ...defaultStorage };

  const data = raw as Record<string, unknown>;

  // v1 is the only version; future migrations go here
  if (!data.schemaVersion) {
    data.schemaVersion = 1;
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

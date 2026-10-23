import { MISSIONS } from '../content/missions';
import { EMPTY, isEmpty, type Loaded, type PlayRecord, type Progress } from './core';

/**
 * The app's only storage key. GitHub Pages sites under one user share an origin, so the version lives
 * inside the value and delete touches this key alone (never `clear()`).
 */
const KEY = 'erabit:save';
const VERSION = 1;

export function readSave(): Loaded {
  let raw: string | null = null;
  try {
    raw = safeStorage()?.getItem(KEY) ?? null;
  } catch {
    raw = null;
  }
  return raw === null ? { progress: EMPTY, stored: false } : { progress: decode(raw), stored: true };
}

/**
 * Mirrors state into the key. `stored === false` is the delete path and removes the key.
 * Empty progress with the key present leaves an unreadable value alone until the player deletes it.
 */
export function writeSave(progress: Progress, stored: boolean): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    if (!stored) {
      storage.removeItem(KEY);
      return;
    }
    if (isEmpty(progress)) return;
    const value = encode(progress);
    if (storage.getItem(KEY) !== value) storage.setItem(KEY, value);
  } catch {
    // Storage disabled or full: the app keeps playing from memory.
  }
}

/** Calls back with a fresh read whenever another tab changes or removes the key. Returns the unsubscribe. */
export function subscribeSave(listener: (incoming: Loaded) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener(readSave());
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function encode(p: Progress): string {
  const records = MISSIONS.flatMap(({ id }) => {
    const r = p[id];
    return r
      ? [{ missionId: r.missionId, selectedChoiceId: r.selectedChoiceId, timestamp: r.timestamp, completed: r.completed, replayed: r.replayed }]
      : [];
  });
  return JSON.stringify({ version: VERSION, records });
}

/** Never throws. Unknown versions and malformed values decode to EMPTY; records for missing content are dropped. */
function decode(raw: string): Progress {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!isObject(data) || data.version !== VERSION || !Array.isArray(data.records)) return EMPTY;
  const out: Partial<Record<PlayRecord['missionId'], PlayRecord>> = {};
  for (const r of data.records) {
    if (!isObject(r)) continue;
    const mission = MISSIONS.find((m) => m.id === r.missionId);
    const choice = mission?.choices.find((c) => c.id === r.selectedChoiceId);
    if (!mission || !choice || typeof r.timestamp !== 'string' || typeof r.completed !== 'boolean') continue;
    out[mission.id] = {
      missionId: mission.id,
      selectedChoiceId: choice.id,
      timestamp: r.timestamp,
      completed: r.completed,
      replayed: r.replayed === true,
    };
  }
  return isEmpty(out) ? EMPTY : out;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

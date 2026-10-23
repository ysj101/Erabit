import { MISSIONS } from '../../src/content/missions';
import { initialState, statusOf, type State } from '../../src/game/core';
import { readSave, writeSave } from '../../src/game/storage';
import { driver, expectKind, openMission } from './behavior';

const SPEC_KEY = 'erabit:save';
const NEIGHBOUR = 'another-app:data';

class MemoryStorage implements Storage {
  readonly map = new Map<string, string>();
  readonly touched = new Set<string>();
  failReads = false;
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    if (this.failReads) throw new Error('SecurityError');
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.touched.add(k);
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.touched.add(k);
    this.map.delete(k);
  }
  clear(): never {
    throw new Error('localStorage.clear() must never be called');
  }
}

function install(): MemoryStorage {
  const mem = new MemoryStorage();
  mem.setItem(NEIGHBOUR, 'keep me');
  mem.touched.clear();
  Object.defineProperty(globalThis, 'localStorage', { value: mem, configurable: true, writable: true });
  return mem;
}

/** Like `useErabit`: state comes from `readSave()`, and each change is mirrored with `writeSave()`. */
function boot() {
  return driver(initialState(readSave()), undefined, (s: State) => writeSave(s.progress, s.stored));
}

function playToLearning(d: ReturnType<typeof boot>, id: (typeof MISSIONS)[number]['id']) {
  openMission(d, id);
  expectKind(d.view(), 'situation').next();
  const choice = expectKind(d.view(), 'choice');
  choice.confirm(choice.mission.choices[0]!.id);
  expectKind(d.view(), 'result').next();
  expectKind(d.view(), 'learning').toList();
}

export function checkStorage(): string[] {
  const out: string[] = [];
  const fail = (name: string, message: string) => out.push(`${name}: ${message}`);
  const neighbourIntact = (name: string, mem: MemoryStorage) => {
    if (mem.getItem(NEIGHBOUR) !== 'keep me') fail(name, `another app's key "${NEIGHBOUR}" was changed`);
    for (const k of mem.touched) if (k !== SPEC_KEY) fail(name, `wrote key "${k}"`);
  };
  const run = (name: string, body: (mem: MemoryStorage) => void) => {
    const mem = install();
    try {
      body(mem);
      neighbourIntact(name, mem);
    } catch (error) {
      fail(name, (error as Error).message);
    }
  };

  run('empty storage', () => {
    const title = expectKind(boot().view(), 'title');
    if (title.deleteSavedData !== null) fail('empty storage', 'offers delete with nothing saved');
  });

  run('reload keeps clear state', (mem) => {
    const d = boot();
    expectKind(d.view(), 'title').start();
    playToLearning(d, 'M01');
    if (!mem.map.has(SPEC_KEY)) return fail('reload keeps clear state', `nothing written under "${SPEC_KEY}"`);
    const reloaded = boot();
    expectKind(reloaded.view(), 'title').start();
    const list = expectKind(reloaded.view(), 'list');
    const statuses = list.missions.map((c) => `${c.id}:${c.status}`).join(' ');
    if (statuses !== 'M01:cleared M02:unplayed M03:unplayed') fail('reload keeps clear state', `list after reload is ${statuses}`);
  });

  run('delete returns missions to unplayed', (mem) => {
    const d = boot();
    expectKind(d.view(), 'title').start();
    for (const m of MISSIONS) playToLearning(d, m.id);
    expectKind(d.view(), 'list').toTitle();
    const reloaded = boot();
    const del = expectKind(reloaded.view(), 'title').deleteSavedData;
    if (!del) return fail('delete', 'no delete action with data saved');
    del();
    if (mem.map.has(SPEC_KEY)) fail('delete', `"${SPEC_KEY}" still present`);
    const title = expectKind(reloaded.view(), 'title');
    if (title.deleteSavedData !== null) fail('delete', 'delete still offered after deleting');
    title.start();
    const statuses = expectKind(reloaded.view(), 'list').missions.map((c) => c.status);
    if (statuses.some((s) => s !== 'unplayed')) fail('delete', `statuses after delete: ${statuses}`);
  });

  for (const [name, raw] of [
    ['corrupt value', '{not json'],
    ['unknown version', '{"version":99,"records":[]}'],
    ['wrong shape', '[1,2,3]'],
  ] as const) {
    run(name, (mem) => {
      mem.map.set(SPEC_KEY, raw);
      const loaded = readSave();
      if (loaded.stored !== true || Object.keys(loaded.progress).length !== 0) fail(name, 'must load as empty progress with the key present');
      const d = boot();
      if (mem.map.get(SPEC_KEY) !== raw) fail(name, 'reading changed the stored value');
      const del = expectKind(d.view(), 'title').deleteSavedData;
      if (!del) return fail(name, 'delete is not offered, so the value can never be removed');
      del();
      if (mem.map.has(SPEC_KEY)) fail(name, 'delete did not remove the key');
    });
  }

  run('unknown records are dropped', (mem) => {
    mem.map.set(SPEC_KEY, JSON.stringify({
      version: 1,
      records: [
        { missionId: 'M99', selectedChoiceId: 'A', timestamp: 't', completed: true },
        { missionId: 'M02', selectedChoiceId: 'Z', timestamp: 't', completed: true },
        { missionId: 'M03', selectedChoiceId: 'B', timestamp: 't', completed: true },
      ],
    }));
    const { progress } = readSave();
    const ids = Object.keys(progress).join(',');
    if (ids !== 'M03' || statusOf(progress.M03) !== 'cleared') fail('unknown records', `decoded ${ids}`);
  });

  run('storage that throws', (mem) => {
    mem.failReads = true;
    const loaded = readSave();
    if (loaded.stored) fail('storage that throws', 'reported a stored value');
    writeSave(loaded.progress, true);
    mem.failReads = false;
  });

  return out;
}

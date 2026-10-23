import { BIASES, MISSIONS } from '../content/missions';
import type { ChoiceId, Mission, MissionId, Reveal } from '../content/types';

// ── Views (what one step may show, plus the actions allowed there) ────────────

/** Pre-confirm projection. An allowlist, so a new Mission field never reaches a pre-confirm screen by accident. */
export type Brief = Pick<Mission, 'id' | 'title' | 'scenario' | 'prompt' | 'choices'>;
/** Post-confirm header. No choices, so the UI cannot work out which choice id was confirmed. */
export type MissionHeader = Pick<Mission, 'id' | 'title'>;

export type EllaPose = 'hero' | 'smile' | 'front' | 'thinking' | 'surprised' | 'idea';
export type MissionStatus = 'unplayed' | 'inProgress' | 'cleared';

export interface MissionCard {
  readonly id: MissionId;
  readonly title: string;
  readonly status: MissionStatus;
  open(): void;
}

interface ViewBase {
  /** Changes exactly when focus should move and local UI state should reset. */
  readonly key: string;
  readonly pose: EllaPose;
}

export interface TitleView extends ViewBase {
  readonly kind: 'title';
  start(): void;
  /** Present whenever the save key exists, including a corrupt or unknown-version value. */
  readonly deleteSavedData: (() => void) | null;
}
export interface ListView extends ViewBase {
  readonly kind: 'list';
  readonly missions: readonly MissionCard[];
  readonly clearedCount: number;
  readonly total: number;
  toTitle(): void;
}
export interface SituationView extends ViewBase {
  readonly kind: 'situation';
  readonly mission: Brief;
  next(): void;
  toList(): void;
}
export interface ChoiceView extends ViewBase {
  readonly kind: 'choice';
  readonly mission: Brief;
  /** A second call (double tap) and an unknown id are no-ops. */
  confirm(choiceId: ChoiceId): void;
  toList(): void;
}
export interface ResultView extends ViewBase {
  readonly kind: 'result';
  readonly mission: MissionHeader;
  /** The only choice-dependent value on any post-confirm view. */
  readonly chosenLabel: string;
  readonly reveal: Reveal;
  readonly ellaLine: string | null;
  next(): void;
  toList(): void;
}
export interface LearningView extends ViewBase {
  readonly kind: 'learning';
  readonly mission: MissionHeader;
  /** The only place a theme name exists in any view. */
  readonly themeName: string;
  readonly explanation: readonly [string, ...string[]];
  readonly nextMission: (() => void) | null;
  toList(): void;
}

export type View = TitleView | ListView | SituationView | ChoiceView | ResultView | LearningView;
export type ScreenKind = View['kind'];

/** Ella's face is a function of the screen kind only. No choice, status, or mission can change it. */
export const POSE_BY_SCREEN: Readonly<Record<ScreenKind, EllaPose>> = {
  title: 'hero',
  list: 'smile',
  situation: 'front',
  choice: 'thinking',
  result: 'surprised',
  learning: 'idea',
};

// ── State ─────────────────────────────────────────────────────────────────────

/** Result and learning require a confirmed choice, so the debrief cannot be reached without one. */
type Step =
  | { readonly at: 'title' }
  | { readonly at: 'list' }
  | { readonly at: 'situation'; readonly missionId: MissionId }
  | { readonly at: 'choice'; readonly missionId: MissionId }
  | { readonly at: 'result'; readonly missionId: MissionId; readonly choiceId: ChoiceId }
  | { readonly at: 'learning'; readonly missionId: MissionId; readonly choiceId: ChoiceId };

/** MVP §11 PlayRecord without confidence (out of scope). */
export interface PlayRecord {
  readonly missionId: MissionId;
  /** First confirmed answer; replays never overwrite it (§4). */
  readonly selectedChoiceId: ChoiceId;
  readonly timestamp: string;
  readonly completed: boolean;
  readonly replayed: boolean;
}

/** Absent key means never confirmed. */
export type Progress = Readonly<Partial<Record<MissionId, PlayRecord>>>;
export const EMPTY: Progress = Object.freeze({});

/** What storage holds: decoded progress, and whether the save key exists at all (even if unreadable). */
export interface Loaded {
  readonly progress: Progress;
  readonly stored: boolean;
}

export interface State {
  readonly step: Step;
  readonly progress: Progress;
  readonly stored: boolean;
}

export type Event =
  | { readonly type: 'start' }
  | { readonly type: 'toTitle' }
  | { readonly type: 'toList' }
  | { readonly type: 'open'; readonly missionId: MissionId }
  | { readonly type: 'next' }
  | { readonly type: 'confirm'; readonly choiceId: ChoiceId; readonly at: string }
  | { readonly type: 'nextMission' }
  | { readonly type: 'deleteSavedData' }
  | { readonly type: 'external'; readonly incoming: Loaded };

// ── Transitions ───────────────────────────────────────────────────────────────

/** Reload always lands on the title; only progress survives. */
export function initialState(loaded: Loaded): State {
  return { step: { at: 'title' }, progress: loaded.progress, stored: loaded.stored };
}

/**
 * The single writer of State. An event that is invalid for the current step returns `state` itself,
 * which makes double taps and stale closures harmless.
 */
export function reduce(state: State, event: Event): State {
  const { step } = state;
  switch (event.type) {
    case 'start':
      return step.at === 'title' ? { ...state, step: { at: 'list' } } : state;
    case 'toTitle':
      return step.at === 'list' ? { ...state, step: { at: 'title' } } : state;
    case 'toList':
      return 'missionId' in step ? { ...state, step: { at: 'list' } } : state;
    case 'open':
      return step.at === 'list' && findMission(event.missionId)
        ? { ...state, step: { at: 'situation', missionId: event.missionId } }
        : state;
    case 'next':
      if (step.at === 'situation') return { ...state, step: { at: 'choice', missionId: step.missionId } };
      if (step.at === 'result') {
        // Learning meets every clearsAt, so entering it always clears.
        return { ...state, step: { ...step, at: 'learning' }, progress: markCleared(state.progress, step.missionId) };
      }
      return state;
    case 'confirm': {
      if (step.at !== 'choice') return state;
      const mission = missionOf(step.missionId);
      if (!mission.choices.some((c) => c.id === event.choiceId)) return state;
      let progress = recordAnswer(state.progress, mission.id, event.choiceId, event.at);
      if (mission.clearsAt === 'result') progress = markCleared(progress, mission.id);
      return { step: { at: 'result', missionId: mission.id, choiceId: event.choiceId }, progress, stored: true };
    }
    case 'nextMission': {
      if (step.at !== 'learning') return state;
      const next = nextMissionId(step.missionId);
      return next ? { ...state, step: { at: 'situation', missionId: next } } : state;
    }
    case 'deleteSavedData':
      return step.at === 'title' && state.stored ? { ...state, progress: EMPTY, stored: false } : state;
    case 'external': {
      if (!event.incoming.stored) {
        return state.stored || !isEmpty(state.progress) ? { ...state, progress: EMPTY, stored: false } : state;
      }
      const progress = mergeProgress(state.progress, event.incoming.progress);
      return progress === state.progress && state.stored ? state : { ...state, progress, stored: true };
    }
  }
}

/** Builds the view for the current step and binds each allowed action to `send`. `now` stamps confirms. */
export function project(state: State, send: (event: Event) => void, now: () => string): View {
  const { step } = state;
  const toList = () => send({ type: 'toList' });
  const next = () => send({ type: 'next' });
  switch (step.at) {
    case 'title':
      return {
        ...base('title'),
        start: () => send({ type: 'start' }),
        deleteSavedData: state.stored ? () => send({ type: 'deleteSavedData' }) : null,
      };
    case 'list': {
      const missions = MISSIONS.map((m): MissionCard => ({
        id: m.id,
        title: m.title,
        status: statusOf(state.progress[m.id]),
        open: () => send({ type: 'open', missionId: m.id }),
      }));
      return {
        ...base('list'),
        missions,
        clearedCount: missions.filter((c) => c.status === 'cleared').length,
        total: MISSIONS.length,
        toTitle: () => send({ type: 'toTitle' }),
      };
    }
    case 'situation': {
      const m = missionOf(step.missionId);
      return { ...base('situation', m.id), mission: toBrief(m), next, toList };
    }
    case 'choice': {
      const m = missionOf(step.missionId);
      return {
        ...base('choice', m.id),
        mission: toBrief(m),
        confirm: (choiceId) => send({ type: 'confirm', choiceId, at: now() }),
        toList,
      };
    }
    case 'result': {
      const m = missionOf(step.missionId);
      return {
        ...base('result', m.id),
        mission: toHeader(m),
        chosenLabel: labelOf(m, step.choiceId),
        reveal: m.reveal,
        ellaLine: m.ellaReaction,
        next,
        toList,
      };
    }
    case 'learning': {
      const m = missionOf(step.missionId);
      return {
        ...base('learning', m.id),
        mission: toHeader(m),
        themeName: BIASES[m.biasIds[0]].name,
        explanation: m.explanation.points,
        nextMission: nextMissionId(m.id) ? () => send({ type: 'nextMission' }) : null,
        toList,
      };
    }
  }
}

function base<K extends ScreenKind>(kind: K, missionId?: MissionId) {
  return { kind, key: `${kind}:${missionId ?? ''}`, pose: POSE_BY_SCREEN[kind] };
}

function toBrief(m: Mission): Brief {
  return {
    id: m.id,
    title: m.title,
    scenario: m.scenario,
    prompt: m.prompt,
    choices: m.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

function toHeader(m: Mission): MissionHeader {
  return { id: m.id, title: m.title };
}

function findMission(id: MissionId): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

function missionOf(id: MissionId): Mission {
  const mission = findMission(id);
  if (!mission) throw new Error(`Unknown mission ${id}`);
  return mission;
}

function labelOf(m: Mission, choiceId: ChoiceId): string {
  const choice = m.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`Unknown choice ${m.id}/${choiceId}`);
  return choice.label;
}

function nextMissionId(id: MissionId): MissionId | null {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return MISSIONS[i + 1]?.id ?? null;
}

// ── Progress algebra ──────────────────────────────────────────────────────────

export function isEmpty(p: Progress): boolean {
  return Object.keys(p).length === 0;
}

/** New record if none; otherwise keep the first answer and timestamp and set replayed. */
export function recordAnswer(p: Progress, id: MissionId, choice: ChoiceId, at: string): Progress {
  const prev = p[id];
  if (prev?.replayed) return p;
  const record: PlayRecord = prev
    ? { ...prev, replayed: true }
    : { missionId: id, selectedChoiceId: choice, timestamp: at, completed: false, replayed: false };
  return { ...p, [id]: record };
}

/** Idempotent. No-op without a record (e.g. another tab deleted the data mid-mission). */
export function markCleared(p: Progress, id: MissionId): Progress {
  const record = p[id];
  return !record || record.completed ? p : { ...p, [id]: { ...record, completed: true } };
}

/**
 * Cross-tab join: commutative, associative, idempotent. The earliest confirm supplies the answer;
 * completed and replayed are ORed, and two distinct confirms imply replayed.
 * Returns `a` itself when the merge adds nothing.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  let out: Partial<Record<MissionId, PlayRecord>> | null = null;
  for (const { id } of MISSIONS) {
    const x = a[id];
    const y = b[id];
    if (!y) continue;
    const merged = x ? mergeRecord(x, y) : y;
    if (x && sameRecord(x, merged)) continue;
    out ??= { ...a };
    out[id] = merged;
  }
  return out ?? a;
}

function mergeRecord(x: PlayRecord, y: PlayRecord): PlayRecord {
  const first =
    x.timestamp < y.timestamp || (x.timestamp === y.timestamp && x.selectedChoiceId <= y.selectedChoiceId) ? x : y;
  const distinct = x.timestamp !== y.timestamp || x.selectedChoiceId !== y.selectedChoiceId;
  return {
    missionId: first.missionId,
    selectedChoiceId: first.selectedChoiceId,
    timestamp: first.timestamp,
    completed: x.completed || y.completed,
    replayed: x.replayed || y.replayed || distinct,
  };
}

function sameRecord(x: PlayRecord, y: PlayRecord): boolean {
  return (
    x.selectedChoiceId === y.selectedChoiceId &&
    x.timestamp === y.timestamp &&
    x.completed === y.completed &&
    x.replayed === y.replayed
  );
}

export function statusOf(record: PlayRecord | undefined): MissionStatus {
  if (!record) return 'unplayed';
  return record.completed ? 'cleared' : 'inProgress';
}

import { BIASES, MISSIONS } from '../../src/content/missions';
import type { MissionId } from '../../src/content/types';
import {
  EMPTY, initialState, project, reduce, statusOf,
  type Brief, type ChoiceView, type EllaPose, type Event, type ListView, type ScreenKind,
  type SituationView, type State, type TitleView, type View,
} from '../../src/game/core';
import { themeStems } from './content';

export const CLOCK = '2026-01-01T00:00:00.000Z';

/** The contract's pose table. Kept here as the oracle the projection is checked against. */
const EXPECTED_POSE: Readonly<Record<ScreenKind, EllaPose>> = {
  title: 'hero', list: 'smile', situation: 'front', choice: 'thinking', result: 'surprised', learning: 'idea',
};

// Allowlists for pre-confirm views; `satisfies` keeps them equal to the interfaces at compile time,
// and the runtime comparison catches a projection that spreads extra fields in.
const PRE_CONFIRM_KEYS = {
  title: { kind: true, key: true, pose: true, start: true, deleteSavedData: true } satisfies Record<keyof TitleView, true>,
  list: { kind: true, key: true, pose: true, missions: true, clearedCount: true, total: true, toTitle: true } satisfies Record<keyof ListView, true>,
  situation: { kind: true, key: true, pose: true, mission: true, next: true, toList: true } satisfies Record<keyof SituationView, true>,
  choice: { kind: true, key: true, pose: true, mission: true, confirm: true, toList: true } satisfies Record<keyof ChoiceView, true>,
};
const BRIEF_KEYS = { id: true, title: true, scenario: true, prompt: true, choices: true } satisfies Record<keyof Brief, true>;

/** Drives the real reducer and projection, the way `useErabit` does, with an optional mirror hook. */
export function driver(initial: State, clock = () => CLOCK, onState?: (s: State) => void) {
  let state = initial;
  const send = (event: Event) => {
    state = reduce(state, event);
    onState?.(state);
  };
  return {
    view: (): View => project(state, send, clock),
    get state() {
      return state;
    },
  };
}

export function expectKind<K extends ScreenKind>(view: View, kind: K): Extract<View, { kind: K }> {
  if (view.kind !== kind) throw new Error(`expected ${kind} view, got ${view.kind}`);
  return view as Extract<View, { kind: K }>;
}

export function openMission(d: ReturnType<typeof driver>, id: MissionId): void {
  const list = expectKind(d.view(), 'list');
  const card = list.missions.find((c) => c.id === id);
  if (!card) throw new Error(`list has no card ${id}`);
  card.open();
}

const sameKeys = (value: object, allowed: object) =>
  Object.keys(value).sort().join(',') === Object.keys(allowed).sort().join(',');

export function checkBehavior(): string[] {
  const out: string[] = [];
  const stems = themeStems(BIASES);
  const explanations = MISSIONS.flatMap((m) => m.explanation.points);
  const caughtWords = ['引っかか', 'ひっかか', '騙', 'だまさ'];

  for (const mission of MISSIONS) {
    const postConfirm = new Map<string, string>();
    for (const choice of mission.choices) {
      const where = `${mission.id}/${choice.id}`;
      try {
        const d = driver(initialState({ progress: EMPTY, stored: false }));
        const seen: View[] = [];
        const step = <K extends ScreenKind>(kind: K) => {
          const v = expectKind(d.view(), kind);
          seen.push(v);
          if (v.pose !== EXPECTED_POSE[kind]) out.push(`${where} ${kind}: Ella pose "${v.pose}", contract says "${EXPECTED_POSE[kind]}"`);
          return v;
        };

        step('title').start();
        step('list');
        openMission(d, mission.id);
        step('situation').next();
        const choiceView = step('choice');
        choiceView.confirm(choice.id);
        const afterConfirm = d.state;
        choiceView.confirm(mission.choices[0]!.id);
        if (d.state !== afterConfirm) out.push(`${where}: a second confirm changed state`);

        const result = step('result');
        if (result.chosenLabel !== choice.label) out.push(`${where}: result shows "${result.chosenLabel}"`);
        if (JSON.stringify(result.reveal) !== JSON.stringify(mission.reveal)) out.push(`${where}: result reveal is not the mission reveal`);
        if (result.ellaLine !== mission.ellaReaction) out.push(`${where}: result Ella line is not the mission's §6 line`);
        const expectAfterResult = mission.clearsAt === 'result' ? 'cleared' : 'inProgress';
        if (statusOf(d.state.progress[mission.id]) !== expectAfterResult) {
          out.push(`${where}: status after result is ${statusOf(d.state.progress[mission.id])}, expected ${expectAfterResult}`);
        }
        result.next();

        const learning = step('learning');
        if (learning.themeName !== BIASES[mission.biasIds[0]].name) out.push(`${where}: learning theme is "${learning.themeName}"`);
        if (statusOf(d.state.progress[mission.id]) !== 'cleared') out.push(`${where}: not cleared on learning`);
        const isLast = mission === MISSIONS[MISSIONS.length - 1];
        if ((learning.nextMission === null) !== isLast) out.push(`${where}: nextMission availability is wrong`);

        for (const v of seen) {
          const text = JSON.stringify(v);
          for (const w of caughtWords) if (text.includes(w)) out.push(`${where} ${v.kind}: contains verdict "${w}"`);
          if (v.kind === 'result' || v.kind === 'learning') {
            const { chosenLabel: _ignored, ...rest } = v as View & { chosenLabel?: string };
            const key = `${v.kind}`;
            const serialized = JSON.stringify(rest);
            const first = postConfirm.get(key);
            if (first === undefined) postConfirm.set(key, serialized);
            else if (first !== serialized) out.push(`${where} ${v.kind}: differs from choice ${mission.choices[0]!.id} beyond the chosen label`);
            continue;
          }
          for (const s of stems) if (text.includes(s)) out.push(`${where} ${v.kind}: shows theme "${s}" before confirm`);
          for (const e of explanations) if (text.includes(e)) out.push(`${where} ${v.kind}: shows explanation before confirm`);
          if (!sameKeys(v, PRE_CONFIRM_KEYS[v.kind])) out.push(`${where} ${v.kind}: fields [${Object.keys(v)}] exceed the allowlist`);
          if ((v.kind === 'situation' || v.kind === 'choice') && !sameKeys(v.mission, BRIEF_KEYS)) {
            out.push(`${where} ${v.kind}: mission fields [${Object.keys(v.mission)}] are not Brief`);
          }
        }
      } catch (error) {
        out.push(`${where}: ${(error as Error).message}`);
      }
    }
  }

  out.push(...checkReplay());
  return out;
}

/** Replay keeps the first answer and timestamp, flags replayed, and still echoes this visit's choice. */
function checkReplay(): string[] {
  const out: string[] = [];
  const mission = MISSIONS[0]!;
  const [first, second] = mission.choices;
  if (!first || !second) return [`${mission.id}: replay check needs two choices`];
  let clock = CLOCK;
  const d = driver(initialState({ progress: EMPTY, stored: false }), () => clock);
  expectKind(d.view(), 'title').start();
  for (const [choice, at] of [[first, CLOCK], [second, '2026-01-02T00:00:00.000Z']] as const) {
    clock = at;
    openMission(d, mission.id);
    expectKind(d.view(), 'situation').next();
    expectKind(d.view(), 'choice').confirm(choice.id);
    const result = expectKind(d.view(), 'result');
    if (result.chosenLabel !== choice.label) out.push(`replay: result shows "${result.chosenLabel}", expected "${choice.label}"`);
    result.next();
    expectKind(d.view(), 'learning').toList();
  }
  const record = d.state.progress[mission.id];
  if (record?.selectedChoiceId !== first.id || record.timestamp !== CLOCK) out.push('replay: first answer was overwritten');
  if (record?.replayed !== true) out.push('replay: replayed flag not set');
  return out;
}

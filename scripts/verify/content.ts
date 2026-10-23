import type { Bias, BiasId, Choice, Mission, RevealGroup } from '../../src/content/types';
import { sentences, type Section6Mission } from './section6';

type Biases = Readonly<Record<BiasId, Bias>>;
type S6 = ReadonlyMap<string, Section6Mission>;

// `satisfies` makes the compiler keep these key lists equal to the interfaces.
const MISSION_KEYS = {
  id: true, title: true, scenario: true, prompt: true, choices: true, reveal: true,
  ellaReaction: true, biasIds: true, explanation: true, clearsAt: true,
} satisfies Record<keyof Mission, true>;
const CHOICE_KEYS = { id: true, label: true } satisfies Record<keyof Choice, true>;
const GROUP_KEYS = { heading: true, items: true } satisfies Record<keyof RevealGroup, true>;
const BIAS_KEYS = { id: true, name: true } satisfies Record<keyof Bias, true>;

/** Paths whose values are identifiers, not display copy. */
const IDENTIFIER_PATH = /^(id|choices\.\d+\.id|biasIds\.\d+|clearsAt)$/;

/** Theme names plus their stems (アンカリング効果 → アンカリング), so a bare stem also counts as a leak. */
export function themeStems(biases: Biases): string[] {
  const names = Object.values(biases).map((b) => b.name);
  return [...new Set(names.flatMap((n) => [n, n.replace(/効果$/, '')]))];
}

function extraKeys(value: object, allowed: object): string[] {
  return Object.keys(value).filter((k) => !(k in allowed));
}

export function checkShape(missions: readonly Mission[], biases: Biases, s6: S6): string[] {
  const out: string[] = [];
  const ids = missions.map((m) => m.id);
  const s6Ids = [...s6.keys()];
  if (ids.join(',') !== s6Ids.join(',')) {
    out.push(`MISSIONS ids [${ids}] must equal MVP §6 ids in order [${s6Ids}]`);
  }
  for (const [key, bias] of Object.entries(biases)) {
    if (bias.id !== key) out.push(`BIASES.${key}.id is "${bias.id}"`);
    for (const k of extraKeys(bias, BIAS_KEYS)) out.push(`BIASES.${key}: unexpected field "${k}"`);
  }
  for (const m of missions) {
    for (const k of extraKeys(m, MISSION_KEYS)) out.push(`${m.id}: unexpected field "${k}"`);
    if (m.choices.length < 2 || m.choices.length > 4) out.push(`${m.id}: needs 2–4 choices (§9)`);
    const choiceIds = m.choices.map((c) => c.id);
    if (new Set(choiceIds).size !== choiceIds.length) out.push(`${m.id}: duplicate choice ids`);
    m.choices.forEach((c, i) => {
      for (const k of extraKeys(c, CHOICE_KEYS)) out.push(`${m.id}.choices[${i}]: unexpected field "${k}"`);
    });
    for (const k of extraKeys(m.reveal, { groups: true })) out.push(`${m.id}.reveal: unexpected field "${k}"`);
    m.reveal.groups.forEach((g, i) => {
      for (const k of extraKeys(g, GROUP_KEYS)) out.push(`${m.id}.reveal.groups[${i}]: unexpected field "${k}"`);
      if (g.items.length === 0) out.push(`${m.id}.reveal.groups[${i}]: no items`);
    });
    for (const k of extraKeys(m.explanation, { points: true })) {
      out.push(`${m.id}.explanation: unexpected field "${k}"`);
    }
    if (m.biasIds.length !== 1) out.push(`${m.id}: Phase 1 missions have exactly one theme`);
    for (const b of m.biasIds) if (!(b in biases)) out.push(`${m.id}: biasId "${b}" is not in BIASES`);
  }
  return out;
}

function walkStrings(value: unknown, path: string, visit: (path: string, text: string) => void): void {
  if (typeof value === 'string') visit(path, value);
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, path ? `${path}.${i}` : `${i}`, visit));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkStrings(v, path ? `${path}.${k}` : k, visit);
  }
}

const show = (s: string | null | undefined) => (s === null || s === undefined ? 'null' : `"${s}"`);

/** Every mission string must be MVP §6 text: exact per field, or a contiguous substring where §6 is prose. */
export function checkProvenance(missions: readonly Mission[], biases: Biases, s6: S6): string[] {
  const out: string[] = [];
  for (const m of missions) {
    const src = s6.get(m.id);
    if (!src) {
      out.push(`${m.id}: not a mission in MVP §6`);
      continue;
    }
    const exact = (field: string, actual: string | null, expected: string | null) => {
      if (actual !== expected) {
        out.push(`${m.id}.${field}: must equal MVP §6 exactly\n      §6:      ${show(expected)}\n      content: ${show(actual)}`);
      }
    };
    exact('title', m.title, src.title);
    exact('scenario', m.scenario, src.intro);
    exact('prompt', m.prompt, src.prompt);
    if (m.choices.length !== src.choices.length) {
      out.push(`${m.id}.choices: §6 lists ${src.choices.length}, content has ${m.choices.length}`);
    }
    m.choices.forEach((c, i) => {
      exact(`choices[${i}].id`, c.id, src.choices[i]?.id ?? null);
      exact(`choices[${i}].label`, c.label, src.choices[i]?.label ?? null);
    });
    exact('theme name', biases[m.biasIds[0]]?.name ?? null, src.theme);
    exact('ellaReaction', m.ellaReaction, src.ellaLine);
    const expectedPoints = sentences(src.learning);
    if (JSON.stringify(m.explanation.points) !== JSON.stringify(expectedPoints)) {
      out.push(
        `${m.id}.explanation.points: must be the §6 学習 sentences, one per entry\n` +
          `      §6:      ${expectedPoints.join(' | ')}\n      content: ${m.explanation.points.join(' | ')}`,
      );
    }
    const allowedReveal = [src.intro, src.after];
    m.reveal.groups.forEach((g, gi) => {
      for (const [where, text] of [['heading', g.heading], ...g.items.map((t, ii) => [`items[${ii}]`, t])] as const) {
        if (text.length === 0 || !allowedReveal.some((s) => s.includes(text))) {
          out.push(`${m.id}.reveal.groups[${gi}].${where}: ${show(text)} is not a contiguous substring of §6 導入 or 回答後`);
        }
      }
    });
    const expectedClear = src.clear.includes('解説') ? 'learning' : 'result';
    if (m.clearsAt !== expectedClear) {
      out.push(`${m.id}.clearsAt: §6 クリア条件 "${src.clear}" implies "${expectedClear}", content has "${m.clearsAt}"`);
    }
    walkStrings(m, '', (path, text) => {
      if (IDENTIFIER_PATH.test(path)) return;
      if (!src.block.includes(text)) out.push(`${m.id}.${path}: ${show(text)} does not appear in MVP §6 ${m.id}`);
    });
  }
  return out;
}

/** No theme name or explanation sentence may sit in a field that is shown before confirm. */
export function checkNoLeak(missions: readonly Mission[], biases: Biases): string[] {
  const out: string[] = [];
  const stems = themeStems(biases);
  const explanations = missions.flatMap((m) => m.explanation.points);
  for (const m of missions) {
    const brief: [string, string][] = [
      ['title', m.title],
      ['scenario', m.scenario],
      ['prompt', m.prompt],
      ...m.choices.map((c, i): [string, string] => [`choices[${i}].label`, c.label]),
    ];
    for (const [field, text] of brief) {
      for (const stem of stems) if (text.includes(stem)) out.push(`${m.id}.${field} names the theme "${stem}"`);
      for (const e of explanations) if (text.includes(e)) out.push(`${m.id}.${field} contains explanation "${e}"`);
    }
  }
  return out;
}

/** Words that would judge the player. Mission text is exempt (§6 M02 says 「必ず撤退」が正解ではない). */
export const VERDICT_WORDS = ['正解', '不正解', '間違', '引っかか', 'ひっかか', '騙', 'だまさ', '失敗', '弱い', '残念', 'ハズレ', 'はずれ'];

/** UI chrome must never name a theme or pass a verdict. */
export function checkChrome(copy: Readonly<Record<string, string>>, biases: Biases): string[] {
  const out: string[] = [];
  const stems = themeStems(biases);
  for (const [key, text] of Object.entries(copy)) {
    for (const stem of stems) if (text.includes(stem)) out.push(`COPY.${key} names the theme "${stem}"`);
    for (const word of VERDICT_WORDS) if (text.includes(word)) out.push(`COPY.${key} contains verdict word "${word}"`);
  }
  return out;
}

export function checkContent(missions: readonly Mission[], biases: Biases, s6: S6): string[] {
  return [...checkShape(missions, biases, s6), ...checkProvenance(missions, biases, s6), ...checkNoLeak(missions, biases)];
}

/** Proves the checks above still reject invented copy: each mutation must produce at least one failure. */
export function checkCanaries(missions: readonly Mission[], biases: Biases, s6: S6): string[] {
  const edit = (id: string, fn: (m: Mission) => Mission) => missions.map((m) => (m.id === id ? fn(m) : m));
  const canaries: [string, readonly Mission[]][] = [
    ['M03 learning gains an invented sentence', edit('M03', (m) => ({
      ...m, explanation: { points: [...m.explanation.points, '人数も見よう。'] as [string, ...string[]] },
    }))],
    ['M02 gains an invented Ella line', edit('M02', (m) => ({ ...m, ellaReaction: 'よく考えたね' }))],
    ['M01 choice B uses the mockup wording', edit('M01', (m) => ({
      ...m, choices: m.choices.map((c) => (c.id === 'B' ? { ...c, label: 'ほかの商品と比較する' } : c)),
    }))],
    ['M01 prompt uses the mockup wording', edit('M01', (m) => ({ ...m, prompt: 'このイヤホン、あなたならどうする？' }))],
    ['M01 reveal gains an invented item', edit('M01', (m) => ({
      ...m, reveal: { groups: [{ heading: 'まだ分からないこと', items: ['そのイヤホンの機能', 'レビューの数'] }] },
    }))],
    ['M01 gains an unlisted field', edit('M01', (m) => ({ ...m, hint: '比べてみよう' }) as Mission)],
    ['M01 scenario names the theme', edit('M01', (m) => ({ ...m, scenario: `アンカリング：${m.scenario}` }))],
    ['M02 clears on learning', edit('M02', (m) => ({ ...m, clearsAt: 'learning' }))],
  ];
  return canaries
    .filter(([, mutated]) => checkContent(mutated, biases, s6).length === 0)
    .map(([name]) => `canary accepted, the content check is blind to: ${name}`);
}

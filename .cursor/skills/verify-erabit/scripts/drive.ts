/**
 * Browser journeys for Erabit. Drives the served build with real clicks and key presses, checks what a player
 * sees against MVP §6 (parsed from docs/MVP.md, not from the app's content module), and writes evidence.
 *
 *   drive <journey> [--viewport 375x812] [--mission M01] [--choice B] [--video] [--quiet]
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join, resolve } from 'node:path';
import { parseSection6, sentences, type Section6Mission } from '../../../../scripts/verify/section6';

const REPO = resolve(import.meta.dirname, '../../../..');
const URL = process.env.ERABIT_URL ?? 'http://127.0.0.1:4173/Erabit/';
const EVIDENCE = resolve(process.env.ERABIT_EVIDENCE_DIR ?? '/tmp/verify-erabit/evidence');
const TOOLS = process.env.ERABIT_TOOLS_DIR ?? join(process.env.HOME ?? '/tmp', '.cache/verify-erabit-tools');
const { chromium } = createRequire(join(TOOLS, 'package.json'))('playwright-core');

const KEY = 'erabit:save';
const VERDICTS = ['引っかか', 'ひっかか', '騙', 'だまさ', '不正解', '間違', '失敗', '弱い'];
const POSE: Record<ScreenKind, string> = {
  title: 'era-hero',
  list: 'era-expression-smile',
  situation: 'era-front',
  choice: 'era-expression-thinking',
  result: 'era-expression-surprised',
  learning: 'era-expression-idea',
};
/** §6 回答後 is prose ("…ことを示す"); these are the facts in it that the result screen must show. */
const POST_ANSWER: Record<string, string[]> = {
  M01: ['そのイヤホンの機能', '代替候補', '割引前価格の根拠', 'まだ分からない'],
  M02: ['すでに回収不能な支出', 'これから発生する費用'],
  M03: ['高評価の人数', 'レビューの集め方', '広告表示の有無', '未確認'],
};

type ScreenKind = 'title' | 'list' | 'situation' | 'choice' | 'result' | 'learning';
type Page = any;
interface Check { label: string; ok: boolean; detail: string }

const S6 = [...parseSection6(readFileSync(join(REPO, 'docs/MVP.md'), 'utf8')).missions.values()];
const mission = (id: string) => {
  const m = S6.find((x) => x.id === id);
  if (!m) throw new Error(`MVP §6 has no mission ${id}`);
  return m;
};
const themes = S6.map((m) => m.theme);
const explanations = S6.flatMap((m) => sentences(m.learning));

// ── Evidence recorder ───────────────────────────────────────────────────────────

class Run {
  readonly checks: Check[] = [];
  readonly shots: string[] = [];
  private n = 0;
  constructor(readonly name: string, readonly page: Page, readonly dir: string, readonly quiet: boolean) {}

  check(label: string, ok: boolean, detail = ''): boolean {
    this.checks.push({ label, ok, detail });
    if (!this.quiet || !ok) console.log(`${ok ? 'PASS' : 'FAIL'} [${this.name}] ${label}${detail ? ` — ${detail}` : ''}`);
    return ok;
  }

  /** Screenshot plus ARIA snapshot of <main>, numbered in journey order. */
  async shot(name: string): Promise<string> {
    await settle(this.page);
    const base = `${String(++this.n).padStart(2, '0')}-${name}`;
    await this.page.screenshot({ path: join(this.dir, `${base}.png`), fullPage: true });
    writeFileSync(join(this.dir, `${base}.aria.txt`), await this.page.locator('main').ariaSnapshot());
    this.shots.push(`${base}.png`);
    return `${base}.png`;
  }
}

async function settle(page: Page) {
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 10_000 });
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'), null, { timeout: 4000 })
    .catch(() => {});
  // Motion may drive the ~1.6s learning glow from JS, which getAnimations() cannot see.
  const learning = await page.evaluate(() => document.querySelector('main')?.textContent?.includes('学習テーマ') ?? false);
  await page.waitForTimeout(learning ? 1700 : 300);
}

// ── App handles (all user-visible: roles, names, text; plus img[data-ella]) ─────

async function waitScreen(page: Page, kind: ScreenKind, m?: Section6Mission) {
  const timeout = 8000;
  if (kind === 'title') await page.getByRole('img', { name: 'エラビット' }).waitFor({ timeout });
  if (kind === 'list') await page.getByRole('heading', { level: 1, name: 'ミッション一覧' }).waitFor({ timeout });
  if (kind === 'situation') {
    await page.getByRole('heading', { level: 1, name: m!.title, exact: true }).waitFor({ timeout });
    await page.getByRole('button', { name: '次へ', exact: true }).waitFor({ timeout });
  }
  if (kind === 'choice') await page.getByRole('group', { name: m!.prompt }).waitFor({ timeout });
  if (kind === 'result') await page.getByRole('heading', { level: 2, name: '自分の選択' }).waitFor({ timeout });
  if (kind === 'learning') await page.getByText(`${m!.id} 学習テーマ`, { exact: true }).waitFor({ timeout });
}

/** Ella's portrait file without Vite's content hash, e.g. `era-expression-thinking`. */
async function ella(page: Page): Promise<string> {
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('img[data-ella]');
    return img !== null && img.complete && img.naturalWidth > 0;
  });
  const src: string = await page.locator('img[data-ella]').getAttribute('src');
  return basename(src).replace(/\.png$/, '').replace(/-[\w-]{8}$/, '');
}

const mainText = async (page: Page): Promise<string> => (await page.locator('main').innerText()).replace(/\s+/g, ' ');
/** DOM text without layout line breaks; the scene card draws 「…」 as a block, which innerText splits. */
const mainSource = async (page: Page): Promise<string> => (await page.locator('main').textContent()) ?? '';

async function cards(page: Page) {
  return page.locator('main li button').evaluateAll((buttons: HTMLButtonElement[]) =>
    buttons.map((b) => {
      const badge = b.querySelector<HTMLElement>(':scope > span:last-child')!;
      return {
        text: b.innerText.replace(/\s+/g, ' ').trim(),
        badge: badge.innerText.trim(),
        badgeBorder: getComputedStyle(badge).borderStyle,
        cardBorder: getComputedStyle(b).borderStyle,
        icon: badge.querySelector('svg')?.innerHTML.replace(/\s+/g, ' ') ?? '',
      };
    }),
  );
}

async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return 'body';
    const label = el instanceof HTMLInputElement ? el.closest('label')?.innerText : el.innerText;
    const name = (el.getAttribute('aria-label') ?? label ?? '').replace(/\s+/g, ' ').trim();
    return `${el.tagName.toLowerCase()}${el instanceof HTMLInputElement ? `[${el.type}]` : ''} "${name}"`;
  });
}

async function storageKeys(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k) ?? ''])));
}

async function toList(r: Run) {
  await r.page.goto(URL);
  await waitScreen(r.page, 'title');
  await r.page.getByRole('button', { name: 'はじめる', exact: true }).click();
  await waitScreen(r.page, 'list');
}

async function openCard(r: Run, m: Section6Mission) {
  await r.page.getByRole('button', { name: new RegExp(`^${m.id}`) }).click();
  await waitScreen(r.page, 'situation', m);
}

async function chooseAndConfirm(r: Run, m: Section6Mission, label: string) {
  await r.page.getByText(label, { exact: true }).click();
  await r.page.getByRole('button', { name: '確定', exact: true }).click();
  await waitScreen(r.page, 'result', m);
}

/** From the list: open, read, choose, confirm, open learning, and return to the list. */
async function playThrough(r: Run, m: Section6Mission, label: string) {
  await openCard(r, m);
  await r.page.getByRole('button', { name: '次へ', exact: true }).click();
  await waitScreen(r.page, 'choice', m);
  await chooseAndConfirm(r, m, label);
  await r.page.getByRole('button', { name: '次へ', exact: true }).click();
  await waitScreen(r.page, 'learning', m);
  await r.page.getByRole('button', { name: 'ミッション一覧へ', exact: true }).click();
  await waitScreen(r.page, 'list');
}

function noPreConfirmLeak(r: Run, where: string, text: string) {
  const leaks = [...themes, ...themes.map((t) => t.replace(/効果$/, '')), ...explanations].filter((s) => text.includes(s));
  r.check(`${where}: no theme name or explanation before confirm`, leaks.length === 0, leaks.join(' | '));
}

function noVerdict(r: Run, where: string, text: string) {
  const found = VERDICTS.filter((w) => text.includes(w));
  r.check(`${where}: no verdict that the player was caught`, found.length === 0, found.join(' '));
}

// ── Journeys ────────────────────────────────────────────────────────────────────

type Options = { mission: string; choice: string };
type Journey = (r: Run, o: Options) => Promise<void>;

const JOURNEYS: Record<string, Journey> = {
  async smoke(r) {
    await r.page.goto(URL);
    await waitScreen(r.page, 'title');
    r.check('title has the logo', await r.page.getByRole('img', { name: 'エラビット' }).isVisible());
    r.check('title has Ella (hero)', (await ella(r.page)) === POSE.title);
  },

  async title(r) {
    await r.page.goto(URL);
    await waitScreen(r.page, 'title');
    r.check('logo is visible with alt エラビット', await r.page.getByRole('img', { name: 'エラビット' }).isVisible());
    const pose = await ella(r.page);
    r.check('Ella is shown (hero)', pose === POSE.title, pose);
    r.check('document title is エラビット', (await r.page.title()) === 'エラビット');
    const start = r.page.getByRole('button', { name: 'はじめる', exact: true });
    r.check('start control is labelled はじめる', await start.isVisible());
    await r.shot('title');
    await start.click();
    await waitScreen(r.page, 'list');
    const ids = (await cards(r.page)).map((c) => c.text.slice(0, 3));
    r.check('はじめる opens the mission list', ids.join(',') === 'M01,M02,M03', ids.join(','));
    await r.shot('list');
  },

  async 'list-status'(r) {
    await toList(r);
    let c = await cards(r.page);
    r.check('list shows M01–M03 in order', c.map((x) => x.text.slice(0, 3)).join(',') === 'M01,M02,M03');
    r.check('fresh profile: every card says 未プレイ', c.every((x) => x.badge === '未プレイ'), c.map((x) => x.badge).join(','));
    await r.shot('all-unplayed');

    const m01 = mission('M01');
    await openCard(r, m01);
    await r.page.getByRole('button', { name: '次へ', exact: true }).click();
    await waitScreen(r.page, 'choice', m01);
    await chooseAndConfirm(r, m01, m01.choices[0]!.label);
    await r.page.getByRole('button', { name: 'ミッション一覧へ', exact: true }).click();
    await waitScreen(r.page, 'list');
    c = await cards(r.page);
    r.check('M01 left at result says 途中 (§6: M01 clears on opening the explanation)', c[0]!.badge === '途中', c[0]!.badge);
    await r.shot('m01-in-progress');

    await playThrough(r, m01, m01.choices[0]!.label);
    c = await cards(r.page);
    r.check('M01 says クリア after learning', c[0]!.badge === 'クリア', c[0]!.badge);
    r.check('M02 and M03 still say 未プレイ', c[1]!.badge === '未プレイ' && c[2]!.badge === '未プレイ');
    r.check('progress reads クリア 1 / 3', (await mainText(r.page)).includes('クリア 1 / 3'));
    const [cleared, , unplayed] = c;
    r.check(
      'クリア and 未プレイ differ without color: text, icon shape, border style',
      cleared!.badge !== unplayed!.badge && cleared!.icon !== unplayed!.icon && cleared!.badgeBorder !== unplayed!.badgeBorder,
      `text ${cleared!.badge}/${unplayed!.badge}, border ${cleared!.badgeBorder}/${unplayed!.badgeBorder}, card ${cleared!.cardBorder}/${unplayed!.cardBorder}`,
    );
    await r.shot('m01-cleared');
    await r.page.addStyleTag({ content: 'html { filter: grayscale(1) }' });
    await r.shot('m01-cleared-grayscale');
  },

  async mission(r, o) {
    const m = mission(o.mission);
    const choice = m.choices.find((c) => c.id === o.choice) ?? m.choices[0]!;
    await toList(r);
    await openCard(r, m);
    let text = await mainText(r.page);
    r.check('situation: heading is the §6 title', await r.page.getByRole('heading', { level: 1, name: m.title, exact: true }).isVisible());
    r.check('situation: shows §6 導入 verbatim', (await mainSource(r.page)).includes(m.intro), m.intro);
    noPreConfirmLeak(r, 'situation', text);
    r.check('situation: Ella front', (await ella(r.page)) === POSE.situation);
    await r.shot('situation');

    await r.page.getByRole('button', { name: '次へ', exact: true }).click();
    await waitScreen(r.page, 'choice', m);
    text = await mainText(r.page);
    const labels: string[] = await r.page.locator('label').allInnerTexts();
    r.check('choice: question is the §6 問い', await r.page.getByRole('group', { name: m.prompt }).isVisible(), m.prompt);
    r.check('choice: options are the §6 choices in order', labels.join('|') === m.choices.map((c) => c.label).join('|'), labels.join(' | '));
    r.check('choice: 確定 is disabled until a choice is picked', await r.page.getByRole('button', { name: '確定' }).isDisabled());
    r.check('choice: no explanation before confirm', !explanations.some((e) => text.includes(e)));
    noPreConfirmLeak(r, 'choice', text);
    r.check('choice: Ella thinking', (await ella(r.page)) === POSE.choice);
    await r.shot('choice');
    await r.page.getByText(choice.label, { exact: true }).click();
    r.check(`choice: picked ${choice.id} is checked`, await r.page.getByRole('radio', { name: choice.label }).isChecked());
    await r.shot(`choice-picked-${choice.id}`);
    await r.page.getByRole('button', { name: '確定', exact: true }).click();
    await waitScreen(r.page, 'result', m);

    text = await mainText(r.page);
    r.check('result: echoes the confirmed choice', text.includes(`自分の選択 ${choice.label}`), choice.label);
    for (const fact of POST_ANSWER[m.id]!) {
      r.check(`result: shows §6 回答後 fact 「${fact}」`, m.after.includes(fact) && text.includes(fact));
    }
    if (m.id === 'M02') {
      const groups = await r.page.locator('main section:has(ul)').count();
      r.check('result: past spending and future cost are shown separately', groups === 2, `${groups} cards`);
    }
    r.check(
      m.ellaLine ? 'result: Ella says the §6 line' : 'result: no Ella line (§6 gives none)',
      m.ellaLine ? text.includes(m.ellaLine) : !S6.some((x) => x.ellaLine && text.includes(x.ellaLine)),
      m.ellaLine ?? '',
    );
    r.check('result: theme name not shown yet', !themes.some((t) => text.includes(t)));
    noVerdict(r, 'result', text);
    r.check('result: Ella surprised', (await ella(r.page)) === POSE.result);
    await r.shot('result');

    await r.page.getByRole('button', { name: '次へ', exact: true }).click();
    await waitScreen(r.page, 'learning', m);
    text = await mainText(r.page);
    r.check(`learning: heading is the theme ${m.theme}`, await r.page.getByRole('heading', { level: 1, name: m.theme, exact: true }).isVisible());
    for (const s of sentences(m.learning)) r.check(`learning: shows §6 学習 「${s}」`, text.includes(s));
    r.check('learning: クリア badge', text.includes('クリア'));
    noVerdict(r, 'learning', text);
    r.check('learning: Ella idea', (await ella(r.page)) === POSE.learning);
    const hasNext = await r.page.getByRole('button', { name: '次のミッション' }).isVisible();
    r.check('learning: 次のミッション only when one exists', hasNext === (m !== S6[S6.length - 1]));
    await r.shot('learning');

    await r.page.getByRole('button', { name: 'ミッション一覧へ', exact: true }).click();
    await waitScreen(r.page, 'list');
    const card = (await cards(r.page)).find((c) => c.text.startsWith(m.id))!;
    r.check(`list: ${m.id} is クリア`, card.badge === 'クリア', card.badge);
    await r.shot('list-after');
  },

  async 'every-choice'(r) {
    const poses: Record<string, Record<string, string>> = {};
    for (const m of S6) {
      const debrief = new Map<string, string>();
      for (const c of m.choices) {
        const ctx = await newContext(r.page.context().browser(), viewportOf(r.page));
        const page = await ctx.newPage();
        const sub = new Run(r.name, page, r.dir, true);
        const seen: Record<string, string> = {};
        await page.goto(URL);
        await waitScreen(page, 'title');
        seen.title = await ella(page);
        await page.getByRole('button', { name: 'はじめる', exact: true }).click();
        await waitScreen(page, 'list');
        seen.list = await ella(page);
        await openCard(sub, m);
        seen.situation = await ella(page);
        await page.getByRole('button', { name: '次へ', exact: true }).click();
        await waitScreen(page, 'choice', m);
        seen.choice = await ella(page);
        await chooseAndConfirm(sub, m, c.label);
        seen.result = await ella(page);
        const result = await mainText(page);
        noVerdict(r, `${m.id}/${c.id} result`, result);
        await page.screenshot({ path: join(r.dir, `${m.id}-${c.id}-result.png`), fullPage: true });
        await page.getByRole('button', { name: '次へ', exact: true }).click();
        await waitScreen(page, 'learning', m);
        seen.learning = await ella(page);
        const learning = await mainText(page);
        noVerdict(r, `${m.id}/${c.id} learning`, learning);
        debrief.set(c.id, `${result.replace(c.label, '<chosen>')}\n${learning}`);
        poses[`${m.id}/${c.id}`] = seen;
        await ctx.close();
      }
      const variants = new Set(debrief.values());
      r.check(`${m.id}: result and learning are identical for every choice except the echoed label`, variants.size === 1, `${variants.size} variants`);
    }
    writeFileSync(join(r.dir, 'poses.json'), `${JSON.stringify(poses, null, 2)}\n`);
    for (const kind of Object.keys(POSE) as ScreenKind[]) {
      const values = new Set(Object.values(poses).map((p) => p[kind]));
      r.check(`Ella on ${kind} is ${POSE[kind]} for every mission and choice`, values.size === 1 && values.has(POSE[kind]), [...values].join(','));
    }
    r.check('Ella shows six different faces across the six scenes', new Set(Object.values(POSE)).size === 6);
  },

  async 'saved-data'(r) {
    await r.page.goto(URL);
    await waitScreen(r.page, 'title');
    r.check('fresh profile: no 設定 (nothing to delete)', !(await r.page.getByText('設定', { exact: true }).isVisible()));
    await r.page.getByRole('button', { name: 'はじめる', exact: true }).click();
    await waitScreen(r.page, 'list');
    const m01 = mission('M01');
    await playThrough(r, m01, m01.choices[1]!.label);
    await r.shot('m01-cleared');
    const saved = await storageKeys(r.page);
    r.check(`progress is saved under the one key ${KEY}`, Object.keys(saved).join(',') === KEY, Object.keys(saved).join(','));
    writeFileSync(join(r.dir, 'storage-after-play.json'), `${JSON.stringify(saved, null, 2)}\n`);

    await r.page.reload();
    await waitScreen(r.page, 'title');
    r.check('reload lands on the title', await r.page.getByRole('img', { name: 'エラビット' }).isVisible());
    await r.shot('reloaded-title');
    await r.page.getByRole('button', { name: 'はじめる', exact: true }).click();
    await waitScreen(r.page, 'list');
    let c = await cards(r.page);
    r.check('after reload M01 is still クリア', c[0]!.badge === 'クリア', c.map((x) => x.badge).join(','));
    await r.shot('reloaded-list');

    await r.page.getByRole('button', { name: 'タイトルへ', exact: true }).click();
    await waitScreen(r.page, 'title');
    await r.page.getByText('設定', { exact: true }).click();
    await r.page.getByRole('button', { name: 'データ削除', exact: true }).click();
    await r.shot('delete-confirm');
    await r.page.getByRole('button', { name: '削除する', exact: true }).click();
    r.check(`delete removes ${KEY}`, !(KEY in (await storageKeys(r.page))));
    r.check('設定 disappears once nothing is saved', !(await r.page.getByText('設定', { exact: true }).isVisible()));
    await r.shot('deleted-title');
    await r.page.getByRole('button', { name: 'はじめる', exact: true }).click();
    await waitScreen(r.page, 'list');
    c = await cards(r.page);
    r.check('after delete every mission is 未プレイ', c.every((x) => x.badge === '未プレイ'), c.map((x) => x.badge).join(','));
    await r.shot('deleted-list');

    // Fixture: a value this app cannot read, next to another app's key on the same Pages origin.
    await r.page.evaluate(([key]: string[]) => {
      localStorage.setItem(key!, '{corrupt');
      localStorage.setItem('another-app:data', 'keep me');
    }, [KEY]);
    await r.page.reload();
    await waitScreen(r.page, 'title');
    r.check('corrupt value: the title still renders', await r.page.getByRole('button', { name: 'はじめる' }).isVisible());
    r.check('corrupt value: 設定 offers delete', await r.page.getByText('設定', { exact: true }).isVisible());
    await r.page.getByText('設定', { exact: true }).click();
    await r.shot('corrupt-settings');
    await r.page.getByRole('button', { name: 'はじめる', exact: true }).click();
    await waitScreen(r.page, 'list');
    c = await cards(r.page);
    r.check('corrupt value: missions read as 未プレイ', c.every((x) => x.badge === '未プレイ'));
    await r.page.getByRole('button', { name: 'タイトルへ', exact: true }).click();
    await waitScreen(r.page, 'title');
    await r.page.getByText('設定', { exact: true }).click();
    await r.page.getByRole('button', { name: 'データ削除', exact: true }).click();
    await r.page.getByRole('button', { name: '削除する', exact: true }).click();
    const after = await storageKeys(r.page);
    r.check('corrupt value: delete removes the key', !(KEY in after));
    r.check("corrupt value: another app's key is untouched", after['another-app:data'] === 'keep me');
    writeFileSync(join(r.dir, 'storage-after-corrupt-delete.json'), `${JSON.stringify(after, null, 2)}\n`);
    await r.shot('corrupt-deleted');
  },

  async keyboard(r, o) {
    const m = mission(o.mission);
    const choice = m.choices.find((c) => c.id === o.choice) ?? m.choices[1]!;
    const steps: string[] = [];
    const press = async (key: string) => {
      await r.page.keyboard.press(key);
      steps.push(`${key.padEnd(9)} → ${await focused(r.page)}`);
    };
    const expectFocus = async (label: string, want: RegExp) => {
      const f = await focused(r.page);
      r.check(`focus: ${label}`, want.test(f), f);
    };
    await r.page.goto(URL);
    await waitScreen(r.page, 'title');
    await press('Tab');
    await expectFocus('Tab reaches はじめる', /button "はじめる"/);
    await r.shot('title-focus-start');
    await press('Enter');
    await waitScreen(r.page, 'list');
    await expectFocus('list heading takes focus', /h1 "ミッション一覧"/);
    const card = new RegExp(`button "${m.id}`);
    for (let i = 0; i < S6.length && !card.test(await focused(r.page)); i++) await press('Tab');
    await expectFocus(`Tab reaches ${m.id}`, card);
    await r.shot('list-focus-card');
    await press('Enter');
    await waitScreen(r.page, 'situation', m);
    await press('Tab');
    await expectFocus('Tab reaches 次へ', /button "次へ"/);
    await r.shot('situation-focus-next');
    await press('Enter');
    await waitScreen(r.page, 'choice', m);
    await press('Tab');
    await expectFocus('Tab enters the choices', /input\[radio\]/);
    const target = m.choices.indexOf(choice);
    for (let i = 0; i < target; i++) await press('ArrowDown');
    if (target === 0) await press('Space');
    r.check(`arrow keys pick ${choice.id} ${choice.label}`, await r.page.getByRole('radio', { name: choice.label }).isChecked());
    await r.shot('choice-picked');
    await press('Tab');
    await expectFocus('Tab reaches 確定', /button "確定"/);
    await press('Enter');
    await waitScreen(r.page, 'result', m);
    r.check('result echoes the keyboard choice', (await mainText(r.page)).includes(choice.label));
    await r.shot('result');
    await press('Tab');
    await expectFocus('Tab reaches 次へ', /button "次へ"/);
    await press('Enter');
    await waitScreen(r.page, 'learning', m);
    await r.shot('learning');
    const last = m === S6[S6.length - 1];
    await press('Tab');
    if (!last) await press('Tab');
    await expectFocus('Tab reaches ミッション一覧へ', /button "ミッション一覧へ"/);
    await press('Enter');
    await waitScreen(r.page, 'list');
    const after = (await cards(r.page)).find((c) => c.text.startsWith(m.id))!;
    r.check(`${m.id} cleared with the keyboard alone`, after.badge === 'クリア', after.badge);
    await r.shot('list-cleared');
    writeFileSync(join(r.dir, 'keys.txt'), `${steps.join('\n')}\n`);
  },

  async layout(r) {
    const audit = async (where: string) => {
      const report = await r.page.evaluate(() => {
        const targets = [...document.querySelectorAll<HTMLElement>('button, a[href], summary, input, select, textarea')]
          .filter((el) => el.getClientRects().length > 0)
          .map((el) => {
            const box = (el.matches('input[type=radio], input[type=checkbox]') ? el.closest('label') ?? el : el).getBoundingClientRect();
            return { name: (el.innerText || el.closest('label')?.innerText || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 24), w: Math.round(box.width), h: Math.round(box.height) };
          });
        return { overflow: document.documentElement.scrollWidth - window.innerWidth, targets };
      });
      r.check(`${where}: no horizontal overflow`, report.overflow <= 0, `${report.overflow}px`);
      const small = report.targets.filter((t: { w: number; h: number }) => t.w < 44 || t.h < 44);
      r.check(`${where}: ${report.targets.length} tap targets all ≥ 44×44`, small.length === 0, JSON.stringify(small));
      await r.shot(where);
    };
    await r.page.goto(URL);
    await waitScreen(r.page, 'title');
    await audit('title');
    await r.page.getByRole('button', { name: 'はじめる', exact: true }).click();
    await waitScreen(r.page, 'list');
    await audit('list');
    for (const m of S6) {
      await openCard(r, m);
      await audit(`${m.id}-situation`);
      await r.page.getByRole('button', { name: '次へ', exact: true }).click();
      await waitScreen(r.page, 'choice', m);
      const longest = [...m.choices].sort((a, b) => b.label.length - a.label.length)[0]!;
      await r.page.getByText(longest.label, { exact: true }).click();
      await audit(`${m.id}-choice`);
      await r.page.getByRole('button', { name: '確定', exact: true }).click();
      await waitScreen(r.page, 'result', m);
      await audit(`${m.id}-result`);
      await r.page.getByRole('button', { name: '次へ', exact: true }).click();
      await waitScreen(r.page, 'learning', m);
      await audit(`${m.id}-learning`);
      await r.page.getByRole('button', { name: 'ミッション一覧へ', exact: true }).click();
      await waitScreen(r.page, 'list');
    }
    await audit('list-all-cleared');
    await r.page.getByRole('button', { name: 'タイトルへ', exact: true }).click();
    await waitScreen(r.page, 'title');
    await r.page.getByText('設定', { exact: true }).click();
    await r.page.getByRole('button', { name: 'データ削除', exact: true }).click();
    await audit('title-settings-open');
  },

  async 'reduced-motion'(r) {
    const sample = async (reduce: boolean) => {
      const ctx = await newContext(r.page.context().browser(), viewportOf(r.page), reduce);
      const page = await ctx.newPage();
      const sub = new Run(r.name, page, r.dir, true);
      const m = mission('M01');
      await toList(sub);
      await openCard(sub, m);
      await page.getByRole('button', { name: '次へ', exact: true }).click();
      await waitScreen(page, 'choice', m);
      await page.getByText(m.choices[0]!.label, { exact: true }).click();
      await page.getByRole('button', { name: '確定', exact: true }).click();
      const reveal = await page
        .getByRole('heading', { level: 2, name: 'まだ分からないこと' })
        .evaluate((h: HTMLElement) => getComputedStyle(h.parentElement!.parentElement!).transform);
      await page.getByRole('button', { name: '次へ', exact: true }).click();
      const glow = await page.locator('img[data-ella]').evaluate((img: HTMLElement) => Number(getComputedStyle(img.previousElementSibling!).opacity));
      const media = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
      await ctx.close();
      return { reduce, media, reveal, glow };
    };
    const reduced = await sample(true);
    const normal = await sample(false);
    writeFileSync(join(r.dir, 'motion-samples.json'), `${JSON.stringify({ reduced, normal }, null, 2)}\n`);
    const still = (t: string) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';
    r.check('reduce: browser reports prefers-reduced-motion', reduced.media);
    r.check('reduce: reveal card appears without movement', still(reduced.reveal), reduced.reveal);
    r.check('reduce: learning glow is static from the first frame', Math.abs(reduced.glow - 0.7) < 0.01, String(reduced.glow));
    r.check('no-preference: reveal card is mid-animation right after confirm', !still(normal.reveal), normal.reveal);
    r.check('no-preference: learning glow is still fading in', normal.glow < 0.69, String(normal.glow));
  },
};

// ── Runner ──────────────────────────────────────────────────────────────────────

function viewportOf(page: Page) {
  return page.viewportSize() as { width: number; height: number };
}

async function newContext(browser: any, viewport: { width: number; height: number }, reduce = false, videoDir?: string) {
  return browser.newContext({
    viewport,
    locale: 'ja-JP',
    reducedMotion: reduce ? 'reduce' : 'no-preference',
    ...(videoDir ? { recordVideo: { dir: videoDir, size: viewport } } : {}),
  });
}

async function runJourney(browser: any, name: string, viewportArg: string, o: Options, flags: { video: boolean; quiet: boolean }) {
  const journey = JOURNEYS[name];
  if (!journey) throw new Error(`unknown journey "${name}"; one of: ${Object.keys(JOURNEYS).join(', ')}`);
  const [width, height] = viewportArg.split('x').map(Number) as [number, number];
  const label = name === 'mission' || name === 'keyboard' ? `${name}-${o.mission}-${o.choice}` : name;
  const dir = join(EVIDENCE, label, viewportArg);
  const videoDir = flags.video ? join(EVIDENCE, '.video-tmp', `${label}-${viewportArg}`) : undefined;
  const ctx = await newContext(browser, { width, height }, false, videoDir);
  const page = await ctx.newPage();
  // Replace earlier evidence only once the browser is known to work.
  if (name !== 'smoke') {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
  const run = new Run(`${label} ${viewportArg}`, page, dir, flags.quiet);
  try {
    await journey(run, o);
  } catch (error) {
    run.check('journey completed without an error', false, (error as Error).message.split('\n')[0]!);
    if (name !== 'smoke') await page.screenshot({ path: join(dir, 'error.png'), fullPage: true }).catch(() => {});
  }
  const video = page.video();
  await ctx.close();
  if (video && videoDir) {
    const webm = join(dir, `${label}.webm`);
    renameSync(await video.path(), webm);
    rmSync(join(EVIDENCE, '.video-tmp'), { recursive: true, force: true });
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', webm.replace(/\.webm$/, '.mp4')]);
      rmSync(webm);
    } catch {
      // ffmpeg missing: keep the .webm
    }
  }
  const ok = run.checks.length > 0 && run.checks.every((c) => c.ok);
  const result = { journey: label, viewport: viewportArg, ok, url: URL, at: new Date().toISOString(), checks: run.checks, shots: run.shots };
  if (name !== 'smoke') {
    writeFileSync(join(dir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
    mkdirSync(EVIDENCE, { recursive: true });
    appendFileSync(join(EVIDENCE, 'runs.jsonl'), `${JSON.stringify({ journey: label, viewport: viewportArg, ok, at: result.at, dir })}\n`);
  }
  const passed = run.checks.filter((c) => c.ok).length;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label} @ ${viewportArg}: ${passed}/${run.checks.length} checks${name === 'smoke' ? '' : ` → ${dir}`}`);
  return ok;
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n: string) => {
    const i = argv.indexOf(`--${n}`);
    return i < 0 ? undefined : argv[i + 1] && !argv[i + 1]!.startsWith('--') ? argv[i + 1]! : 'true';
  };
  const name = argv[0];
  if (!name || name.startsWith('--')) {
    console.log(`usage: drive <${[...Object.keys(JOURNEYS), 'all'].join('|')}> [--viewport 375x812] [--mission M01] [--choice B] [--video] [--quiet]`);
    process.exit(2);
  }
  const o: Options = { mission: flag('mission') ?? 'M01', choice: flag('choice') ?? 'B' };
  const flags = { video: flag('video') === 'true', quiet: flag('quiet') === 'true' };
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  let ok = true;
  const attempt = async (journey: string, vp: string, opts: Options) => {
    try {
      ok = (await runJourney(browser, journey, vp, opts, flags)) && ok;
    } catch (error) {
      ok = false;
      console.log(`FAIL ${journey} @ ${vp}: could not run — ${(error as Error).message.split('\n')[0]}`);
    }
  };
  try {
    if (name === 'all') {
      for (const vp of ['375x812', '1280x800']) {
        for (const j of ['title', 'list-status', 'every-choice', 'saved-data', 'layout']) await attempt(j, vp, o);
        for (const m of S6) await attempt('mission', vp, { mission: m.id, choice: o.choice });
        await attempt('keyboard', vp, o);
      }
      await attempt('reduced-motion', '375x812', o);
    } else {
      await attempt(name, flag('viewport') ?? '375x812', o);
    }
  } finally {
    await browser.close();
  }
  if (!existsSync(EVIDENCE) && name !== 'smoke') console.log('warning: no evidence written');
  else if (name !== 'smoke') console.log(`evidence: ${EVIDENCE} (${readdirSync(EVIDENCE).length} entries)`);
  process.exit(ok ? 0 : 1);
}

void main();

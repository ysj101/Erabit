import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BIASES, MISSIONS } from '../src/content/missions';
import { checkBehavior } from './verify/behavior';
import { checkBoundaries, loadSources } from './verify/boundaries';
import { checkCanaries, checkContent, themeStems } from './verify/content';
import { parseSection6 } from './verify/section6';
import { checkStorage } from './verify/storage';
import { checkTokens } from './verify/tokens';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

const s6 = parseSection6(read('docs/MVP.md'));

const checks: readonly (readonly [string, () => readonly string[]])[] = [
  ['MVP §6 parses', () => s6.errors],
  ['content is MVP §6 text (shape, provenance, no pre-confirm leak)', () => checkContent(MISSIONS, BIASES, s6.missions)],
  ['content check rejects invented copy (canaries)', () => checkCanaries(MISSIONS, BIASES, s6.missions)],
  ['every mission × choice: no leak before confirm, identical debrief, pose by screen', checkBehavior],
  ['storage: one key, reload keeps clears, delete (including corrupt values)', checkStorage],
  ['import boundaries and forbidden APIs', () => checkBoundaries(loadSources(root))],
  ['index.html title names no theme', () => {
    const title = /<title>(.*?)<\/title>/.exec(read('index.html'))?.[1] ?? '';
    return themeStems(BIASES).filter((s) => title.includes(s)).map((s) => `<title> contains "${s}"`);
  }],
  ['styles.css @theme equals DESIGN_TOKENS.json', () => checkTokens(read('src/styles.css'), JSON.parse(read('docs/DESIGN_TOKENS.json')))],
];

let failures = 0;
for (const [name, run] of checks) {
  const found = run();
  failures += found.length;
  console.log(`${found.length === 0 ? '✓' : '✗'} ${name}`);
  for (const f of found) console.log(`    ${f}`);
}
console.log(failures === 0 ? '\nverify: all checks passed' : `\nverify: ${failures} failure(s)`);
process.exitCode = failures === 0 ? 0 : 1;

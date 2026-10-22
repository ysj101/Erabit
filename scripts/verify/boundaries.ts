import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

interface SourceFile {
  /** Repo-relative, forward slashes, e.g. `src/game/core.ts`. */
  readonly path: string;
  readonly text: string;
  /** Text with comments removed, for content scans. */
  readonly code: string;
  readonly imports: readonly string[];
}

export function loadSources(root: string): SourceFile[] {
  const files: SourceFile[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = readFileSync(full, 'utf8');
        const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
        const imports = [...code.matchAll(/(?:^|\n)\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g)]
          .map((m) => (m[1] ?? m[2])!);
        files.push({ path: relative(root, full).split('\\').join('/'), text, code, imports });
      }
    }
  };
  walk(join(root, 'src'));
  return files;
}

const JAPANESE = /[\u3040-\u30FF\u3400-\u9FFF\uFF01-\uFF60]/;

/** Resolves a relative specifier against the importing file to a repo-relative path (no extension). */
function target(from: string, spec: string): string {
  if (!spec.startsWith('.')) return spec;
  const parts = from.split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/').replace(/\.(ts|tsx)$/, '');
}

/** Import rules and forbidden APIs that TypeScript cannot express. */
export function checkBoundaries(files: readonly SourceFile[]): string[] {
  const out: string[] = [];
  for (const f of files) {
    const inGame = f.path.startsWith('src/game/');
    const inContent = f.path.startsWith('src/content/');
    const isUi = !inGame && !inContent;

    for (const spec of f.imports) {
      const to = target(f.path, spec);
      if (/\.png$/.test(spec) && f.path !== 'src/game/portraits.ts') {
        out.push(`${f.path} imports ${spec}: only src/game/portraits.ts may import art`);
      }
      if (to.startsWith('assets/') && !/^assets\/(character|brand)\//.test(to)) {
        out.push(`${f.path} imports ${spec}: only assets/character and assets/brand may ship`);
      }
      if (/react-router/.test(spec)) out.push(`${f.path} imports ${spec}: no router in Phase 1`);
      if (inContent && !to.startsWith('src/content/')) out.push(`${f.path} imports ${spec}: content imports nothing app-side`);
      if (isUi && to.startsWith('src/content')) out.push(`${f.path} imports ${spec}: content is private to src/game`);
      if (isUi && to.startsWith('src/game/')) out.push(`${f.path} imports ${spec}: UI may import only the game index ("game")`);
      if ((to === 'src/game/storage' || to === 'src/game/portraits') && f.path !== 'src/game/useErabit.ts') {
        out.push(`${f.path} imports ${spec}: only useErabit.ts may use storage and portraits`);
      }
      if (f.path === 'src/game/core.ts' && !to.startsWith('src/content/')) {
        out.push(`${f.path} imports ${spec}: core stays pure so verify can drive it in Node`);
      }
    }

    if (/\blocalStorage\b/.test(f.code) && f.path !== 'src/game/storage.ts') out.push(`${f.path} touches localStorage`);
    if (/\.clear\s*\(/.test(f.code)) out.push(`${f.path} calls .clear(): delete must remove only the app key`);
    if (f.code.includes('erabit:save') && f.path !== 'src/game/storage.ts') out.push(`${f.path} names the storage key`);
    if (/['"`]\/assets\//.test(f.code)) out.push(`${f.path} has an "/assets/" string literal (breaks under /Erabit/)`);
    if (/new\s+Audio\s*\(|<audio\b/i.test(f.code)) out.push(`${f.path} plays audio (out of Phase 1 scope)`);
    if (f.path !== 'src/content/missions.ts' && f.path !== 'src/ui/copy.ts' && JAPANESE.test(f.code)) {
      out.push(`${f.path} has Japanese text: mission copy lives in content/missions.ts, chrome in ui/copy.ts`);
    }
  }
  return out;
}

/** One mission block of MVP.md §6, split into its labelled fields. */
export interface Section6Mission {
  readonly id: string;
  readonly title: string;
  readonly theme: string;
  readonly intro: string;
  readonly prompt: string;
  readonly choices: readonly { readonly id: string; readonly label: string }[];
  readonly after: string;
  readonly learning: string;
  readonly clear: string;
  /** The 「…」 that follows エラが in 回答後, or null when §6 gives Ella no line. */
  readonly ellaLine: string | null;
  /** Raw block text; every mission string must be a contiguous substring of it. */
  readonly block: string;
}

export interface Section6 {
  readonly missions: ReadonlyMap<string, Section6Mission>;
  readonly errors: readonly string[];
}

export function parseSection6(md: string): Section6 {
  const errors: string[] = [];
  const missions = new Map<string, Section6Mission>();
  const start = md.search(/^## 6\. /m);
  const end = md.search(/^## 7\. /m);
  if (start < 0 || end < start) {
    return { missions, errors: ['MVP.md: cannot find "## 6." followed by "## 7."'] };
  }
  const section = md.slice(start, end);
  for (const block of section.split(/^### /m).slice(1)) {
    const heading = /^(M\d\d)：(.+)$/m.exec(block.split('\n', 1)[0] ?? '');
    if (!heading) continue;
    const id = heading[1]!;
    const field = (label: string): string => {
      const match = new RegExp(`^\\*\\*${label}\\*\\*：(.+)$`, 'm').exec(block);
      if (!match) {
        errors.push(`MVP.md §6 ${id}: missing **${label}**`);
        return '';
      }
      return match[1]!.trim();
    };
    const rawPrompt = field('問い');
    const prompt = /^「(.+)」$/.exec(rawPrompt)?.[1];
    if (prompt === undefined) errors.push(`MVP.md §6 ${id}: 問い is not wrapped in 「」`);
    const after = field('回答後');
    missions.set(id, {
      id,
      title: heading[2]!.trim(),
      theme: field('学習テーマ'),
      intro: field('導入'),
      prompt: prompt ?? '',
      choices: [...block.matchAll(/^- ([A-D])：(.+)$/gm)].map((m) => ({ id: m[1]!, label: m[2]!.trim() })),
      after,
      learning: field('学習'),
      clear: field('クリア条件'),
      ellaLine: /エラが「(.+?)」/.exec(after)?.[1] ?? null,
      block,
    });
  }
  if (missions.size === 0) errors.push('MVP.md §6: no "### M0x：" mission blocks found');
  return { missions, errors };
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=。)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface DesignTokens {
  readonly color: Readonly<Record<string, string>>;
  readonly radius: Readonly<Record<string, number>>;
}

/** Every DESIGN_TOKENS.json color and radius must appear with the same value in the styles.css @theme block. */
export function checkTokens(css: string, tokens: DesignTokens): string[] {
  const theme = /@theme\s*\{([^}]*)\}/.exec(css)?.[1];
  if (theme === undefined) return ['src/styles.css: no @theme block'];
  const vars = new Map([...theme.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
  const out: string[] = [];
  const expect = (name: string, value: string) => {
    const actual = vars.get(name);
    if (actual?.toLowerCase() !== value.toLowerCase()) {
      out.push(`--${name}: DESIGN_TOKENS.json says ${value}, styles.css has ${actual ?? 'nothing'}`);
    }
  };
  for (const [k, v] of Object.entries(tokens.color)) expect(`color-${k}`, v);
  for (const [k, v] of Object.entries(tokens.radius)) expect(`radius-${k}`, `${v}px`);
  return out;
}

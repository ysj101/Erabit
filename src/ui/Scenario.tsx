/** Splits 導入 so each 「…」 segment (the price tag, the rating banner) can be drawn as the scene. */
export function splitQuoted(text: string): { text: string; quoted: boolean }[] {
  return text
    .split(/(「[^」]*」)/)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, quoted: part.startsWith('「') }));
}

/** The 導入 itself is the illustration: no per-mission art exists, so the quoted sign is drawn as a card. */
export function Scenario({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`rounded-card bg-yellow/25 ${compact ? 'p-4' : 'p-5'}`}>
      <p className={compact ? 'text-base leading-relaxed' : 'text-lg leading-relaxed'}>
        {splitQuoted(text).map((part, i) =>
          part.quoted ? (
            <span
              key={i}
              className={`my-2 block rounded-2xl border-2 border-ink/10 bg-white text-center font-bold tracking-tight break-keep [overflow-wrap:anywhere] ${
                compact ? 'px-3 py-2 text-lg' : 'px-4 py-5 text-xl min-[400px]:text-2xl sm:text-3xl'
              }`}
            >
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </p>
    </div>
  );
}

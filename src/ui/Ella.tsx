import { motion, useReducedMotion } from 'motion/react';

const SIZE = {
  md: 'h-32 w-24',
  lg: 'h-72 w-56 sm:h-80 sm:w-60',
} as const;

/**
 * Renders whatever portrait the screen carries; it never chooses a face. The box has a fixed size so the
 * image cannot shift layout as it loads. alt is empty because the meaning always lives in DOM text.
 */
export function Ella({ src, size = 'md', glow = false }: { src: string; size?: keyof typeof SIZE; glow?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative shrink-0 ${SIZE[size]}`}>
      {glow && (
        <motion.div
          aria-hidden
          className="absolute -inset-2 rounded-full bg-yellow blur-xl"
          initial={{ opacity: reduce ? 0.7 : 0 }}
          animate={{ opacity: reduce ? 0.7 : [0, 0.95, 0.5, 0.95, 0.7] }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        />
      )}
      <img data-ella src={src} alt="" className="relative h-full w-full object-contain" draggable={false} />
    </div>
  );
}

export function Bubble({ line }: { line: string }) {
  return (
    <div className="relative rounded-card border-2 border-ink/10 bg-white px-5 py-4 text-base font-bold leading-relaxed">
      <span
        aria-hidden
        className="absolute -top-2 right-10 size-4 rotate-45 border-l-2 border-t-2 border-ink/10 bg-white"
      />
      <p>{line}</p>
    </div>
  );
}

import { motion } from 'motion/react';
import type { ScreenOf } from '../game';
import { Button } from '../ui/Button';
import { COPY } from '../ui/copy';
import { Frame } from '../ui/Frame';

export function ResultScreen({ screen }: { screen: ScreenOf<'result'> }) {
  const { groups } = screen.reveal;
  return (
    <Frame
      eyebrow={screen.mission.id}
      heading={screen.mission.title}
      ella={screen.ella}
      ellaLine={screen.ellaLine}
      onExit={screen.toList}
    >
      <section className="rounded-card border-2 border-ink/10 bg-white px-5 py-4">
        <h2 className="text-sm font-bold text-ink/70">{COPY.yourChoice}</h2>
        <p className="mt-1 text-lg font-bold">{screen.chosenLabel}</p>
      </section>
      <motion.div
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
      >
        {groups.map((group) => (
          <section key={group.heading} className="rounded-card border-2 border-coral bg-coral/10 px-4 py-4">
            <h2 className="font-bold leading-snug">{group.heading}</h2>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 marker:text-coral">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </motion.div>
      <div className="mt-auto">
        <Button onClick={screen.next}>{COPY.next}</Button>
      </div>
    </Frame>
  );
}

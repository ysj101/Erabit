import { motion } from 'motion/react';
import type { ScreenOf } from '../game';
import { Button } from '../ui/Button';
import { COPY } from '../ui/copy';
import { Frame } from '../ui/Frame';
import { CheckIcon } from '../ui/icons';

export function LearningScreen({ screen }: { screen: ScreenOf<'learning'> }) {
  return (
    <Frame eyebrow={`${screen.mission.id} ${COPY.theme}`} heading={screen.themeName} ella={screen.ella} glow>
      <motion.p
        className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-ink bg-mint px-4 py-1.5 font-bold"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.15 }}
      >
        <CheckIcon />
        {COPY.cleared}
      </motion.p>
      <div className="flex flex-col gap-3 rounded-card bg-white px-5 py-5 text-lg leading-relaxed">
        {screen.explanation.map((point) => (
          <p key={point}>{point}</p>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-3">
        {screen.nextMission && <Button onClick={screen.nextMission}>{COPY.nextMission}</Button>}
        <Button variant={screen.nextMission ? 'secondary' : 'primary'} onClick={screen.toList}>
          {COPY.toList}
        </Button>
      </div>
    </Frame>
  );
}

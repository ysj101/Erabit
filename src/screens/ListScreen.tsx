import type { ReactNode } from 'react';
import type { ScreenOf } from '../game';
import { Button } from '../ui/Button';
import { COPY } from '../ui/copy';
import { Frame } from '../ui/Frame';
import { CheckIcon, CircleIcon, HalfIcon } from '../ui/icons';

type Status = ScreenOf<'list'>['missions'][number]['status'];

// Text label, icon shape, and border style each differ, so status never rests on color alone.
const STATUS: Record<Status, { label: string; icon: ReactNode; badge: string; card: string }> = {
  unplayed: {
    label: COPY.unplayed,
    icon: <CircleIcon className="size-4" />,
    badge: 'border-2 border-dashed border-ink/50 bg-white',
    card: 'border-dashed border-ink/25',
  },
  inProgress: {
    label: COPY.inProgress,
    icon: <HalfIcon className="size-4" />,
    badge: 'border-2 border-ink/50 bg-yellow/50',
    card: 'border-ink/25',
  },
  cleared: {
    label: COPY.cleared,
    icon: <CheckIcon className="size-4" />,
    badge: 'border-2 border-ink bg-mint',
    card: 'border-ink/60',
  },
};

export function ListScreen({ screen }: { screen: ScreenOf<'list'> }) {
  return (
    <Frame heading={COPY.missionList} ella={screen.ella}>
      <div>
        <p className="text-sm font-bold">
          {COPY.cleared} {screen.clearedCount} / {screen.total}
        </p>
        <div aria-hidden className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-coral" style={{ width: `${(screen.clearedCount / screen.total) * 100}%` }} />
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {screen.missions.map((card) => {
          const status = STATUS[card.status];
          return (
            <li key={card.id}>
              <button
                type="button"
                onClick={card.open}
                data-status={card.status}
                className={`flex min-h-20 w-full items-center gap-4 rounded-card border-2 bg-white px-5 py-4 text-left transition-colors hover:border-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink motion-safe:active:scale-[.99] ${status.card}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink/70">{card.id}</span>
                  <span className="block text-lg font-bold leading-snug">{card.title}</span>
                </span>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${status.badge}`}>
                  {status.icon}
                  {status.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto">
        <Button variant="secondary" onClick={screen.toTitle}>
          {COPY.toTitle}
        </Button>
      </div>
    </Frame>
  );
}

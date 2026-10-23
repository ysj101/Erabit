import type { ReactNode } from 'react';
import { COPY } from './copy';
import { Bubble, Ella } from './Ella';
import { Button } from './Button';
import { BackIcon } from './icons';
import { useFocusOnMount } from './useFocusOnMount';

export function Frame({
  eyebrow,
  heading,
  ella,
  ellaLine,
  glow,
  onExit,
  children,
}: {
  eyebrow?: string;
  heading: string;
  ella: string;
  ellaLine?: string | null;
  glow?: boolean;
  onExit?: () => void;
  children: ReactNode;
}) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="-ml-3 min-h-11">
        {onExit && (
          <Button variant="quiet" onClick={onExit}>
            <BackIcon />
            {COPY.toList}
          </Button>
        )}
      </div>
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1 pb-2">
          {eyebrow && (
            <p className="inline-block rounded-full bg-coral/25 px-3 py-0.5 text-sm font-bold tracking-wide">{eyebrow}</p>
          )}
          <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-bold leading-snug focus:outline-none sm:text-3xl">
            {heading}
          </h1>
        </div>
        <Ella src={ella} glow={glow} />
      </header>
      {ellaLine && <Bubble line={ellaLine} />}
      {children}
    </div>
  );
}

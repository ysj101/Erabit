import { useRef, useState } from 'react';
import type { ScreenOf } from '../game';
import { Button } from '../ui/Button';
import { COPY } from '../ui/copy';
import { Ella } from '../ui/Ella';
import { useFocusOnMount } from '../ui/useFocusOnMount';

export function TitleScreen({ screen }: { screen: ScreenOf<'title'> }) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const startRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const del = screen.deleteSavedData;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 text-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6">
        <h1 ref={headingRef} tabIndex={-1} className="focus:outline-none">
          <img src={screen.logo} alt={COPY.appName} className="mx-auto h-auto w-64 sm:w-72" width={920} height={270} />
        </h1>
        <Ella src={screen.ella} size="lg" />
      </div>
      <div className="flex w-full flex-col gap-4">
        <Button ref={startRef} onClick={screen.start}>
          {COPY.start}
        </Button>
        {del && (
          <details className="group rounded-card border-2 border-ink/10 bg-white text-left">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-card px-5 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
              {COPY.settings}
              <span aria-hidden className="text-ink/60 transition-transform group-open:rotate-180">
                <svg viewBox="0 0 24 24" className="size-5" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
            </summary>
            <div className="flex flex-col gap-3 px-5 pb-5">
              {confirming ? (
                <>
                  <Button
                    onClick={() => {
                      del();
                      setConfirming(false);
                      startRef.current?.focus();
                    }}
                  >
                    {COPY.deleteConfirm}
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirming(false)}>
                    {COPY.cancel}
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setConfirming(true)}>
                  {COPY.deleteData}
                </Button>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

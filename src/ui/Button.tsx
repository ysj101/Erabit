import type { ComponentProps } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet';

const BASE =
  'inline-flex items-center justify-center gap-2 font-bold transition-[transform,background-color,border-color] ' +
  'motion-safe:active:scale-[.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink ' +
  'disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100';

// Ink on coral is 4.9:1; white on coral (the mockup) fails AA, so coral is only ever a fill.
const VARIANT: Record<Variant, string> = {
  primary: 'min-h-13 w-full rounded-button bg-coral px-5 py-3 text-lg text-ink shadow-[0_4px_0_rgb(39_63_90/0.18)] enabled:hover:brightness-105',
  secondary: 'min-h-12 w-full rounded-button border-2 border-ink/20 bg-white px-5 py-3 text-base text-ink enabled:hover:border-ink/50',
  quiet: 'min-h-11 min-w-11 rounded-button px-3 text-sm text-ink underline-offset-4 hover:underline',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return <button type="button" {...props} className={`${BASE} ${VARIANT[variant]} ${className}`} />;
}

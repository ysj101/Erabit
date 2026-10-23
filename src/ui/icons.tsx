const common = { 'aria-hidden': true, focusable: false, viewBox: '0 0 24 24', fill: 'none' } as const;

export function CheckIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...common} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CircleIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...common} className={className}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3" />
    </svg>
  );
}

export function HalfIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...common} className={className}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </svg>
  );
}

export function BackIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg {...common} className={className}>
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

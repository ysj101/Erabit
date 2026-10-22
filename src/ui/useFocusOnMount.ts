import { useEffect, useRef } from 'react';

/** Screens remount on every step change, so this moves keyboard and screen-reader focus to the new heading. */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);
  return ref;
}

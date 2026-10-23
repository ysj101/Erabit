import { useEffect, useMemo, useReducer, useRef } from 'react';
import { initialState, project, reduce, type View } from './core';
import { LOGO, PORTRAIT } from './portraits';
import { readSave, subscribeSave, writeSave } from './storage';

type Resolve<V> = V extends { readonly kind: 'title' }
  ? Omit<V, 'pose'> & { readonly ella: string; readonly logo: string }
  : Omit<V, 'pose'> & { readonly ella: string };

/** One variant per step. `ella` is a resolved image URL; screens render it and never choose a face. */
export type Screen = Resolve<View>;
export type ScreenKind = Screen['kind'];
export type ScreenOf<K extends ScreenKind> = Extract<Screen, { readonly kind: K }>;

const now = () => new Date().toISOString();

/**
 * The whole game: step machine, progress, clear rules, persistence, and cross-tab sync.
 * Callers render `screen` and call the actions it carries; they cannot send anything else.
 */
export function useErabit(): Screen {
  const [state, send] = useReducer(reduce, undefined, () => initialState(readSave()));

  const mirrored = useRef(state);
  useEffect(() => {
    const last = mirrored.current;
    if (last.progress === state.progress && last.stored === state.stored) return;
    mirrored.current = state;
    writeSave(state.progress, state.stored);
  }, [state]);

  useEffect(() => subscribeSave((incoming) => send({ type: 'external', incoming })), []);

  return useMemo(() => resolve(project(state, send, now)), [state]);
}

function resolve(view: View): Screen {
  const { pose, ...rest } = view;
  const ella = PORTRAIT[pose];
  return (view.kind === 'title' ? { ...rest, ella, logo: LOGO } : { ...rest, ella }) as Screen;
}

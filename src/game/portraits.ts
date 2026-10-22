import type { EllaPose } from './core';
import hero from '../../assets/character/era-hero.png';
import smile from '../../assets/character/era-expression-smile.png';
import front from '../../assets/character/era-front.png';
import thinking from '../../assets/character/era-expression-thinking.png';
import surprised from '../../assets/character/era-expression-surprised.png';
import idea from '../../assets/character/era-expression-idea.png';
import wordmark from '../../assets/brand/wordmark-transparent.png';

/** The only module that imports art. Only these files ship, and only `useErabit` reads them. */
export const PORTRAIT: Readonly<Record<EllaPose, string>> = { hero, smile, front, thinking, surprised, idea };
export const LOGO: string = wordmark;

export type MissionId = 'M01' | 'M02' | 'M03';
export type ChoiceId = 'A' | 'B' | 'C' | 'D';
export type BiasId = 'anchoring' | 'sunk-cost' | 'social-proof';

/** Only an id and a label. A correctness, weight, feedback, or style field must never be added. */
export interface Choice {
  readonly id: ChoiceId;
  readonly label: string;
}

/** §6 回答後. One group renders as a list; two groups render side by side, which is 「別々に見せる」. */
export interface Reveal {
  readonly groups: readonly [RevealGroup, ...RevealGroup[]];
}
export interface RevealGroup {
  readonly heading: string;
  readonly items: readonly [string, ...string[]];
}

export interface Bias {
  readonly id: BiasId;
  readonly name: string;
}

/**
 * Field names follow MVP §11 where Phase 1 has the field. Nothing is keyed by ChoiceId except `choices`:
 * what follows a confirm is identical for every choice.
 */
export interface Mission {
  readonly id: MissionId;
  readonly title: string;
  readonly scenario: string;
  readonly prompt: string;
  readonly choices: readonly Choice[];
  readonly reveal: Reveal;
  /** null where §6 has no エラが「…」 line, so no bubble is shown. */
  readonly ellaReaction: string | null;
  readonly biasIds: readonly [BiasId];
  readonly explanation: { readonly points: readonly [string, ...string[]] };
  /** First step at which §6 クリア条件 is met. */
  readonly clearsAt: 'result' | 'learning';
}

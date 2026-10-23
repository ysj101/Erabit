import type { Bias, BiasId, Mission } from './types';

export const BIASES: Readonly<Record<BiasId, Bias>> = {
  'anchoring': { id: 'anchoring', name: 'アンカリング効果' },
  'sunk-cost': { id: 'sunk-cost', name: 'サンクコスト効果' },
  'social-proof': { id: 'social-proof', name: '社会的証明' },
};

export const MISSIONS: readonly Mission[] = [
  {
    id: 'M01',
    title: '本日限定50%OFF！',
    scenario: 'イヤホンに「通常30,000円 → 本日15,000円」と表示されている。',
    prompt: 'あなたならどうする？',
    choices: [
      { id: 'A', label: '今すぐ買う' },
      { id: 'B', label: '比較してから決める' },
      { id: 'C', label: '買わない' },
    ],
    reveal: {
      groups: [{ heading: 'まだ分からないこと', items: ['そのイヤホンの機能', '代替候補', '割引前価格の根拠'] }],
    },
    ellaReaction: '安くなっていることと、欲しいものかどうかは別だね',
    biasIds: ['anchoring'],
    explanation: {
      points: ['最初に見た数字が評価の基準になることがある。', '割引で買うこと自体が不合理とは限らない。'],
    },
    clearsAt: 'learning',
  },
  {
    id: 'M02',
    title: '100万円をかけた新事業',
    scenario: '事業に100万円を投資済み。今後も追加費用が必要で、市場調査の見通しも厳しい。',
    prompt: '次の会議で、どう提案する？',
    choices: [
      { id: 'A', label: '投資済みなので続ける' },
      { id: 'B', label: '今後の期待収益と追加費用で再評価する' },
      { id: 'C', label: '今すぐ撤退する' },
    ],
    reveal: {
      groups: [
        { heading: 'すでに回収不能な支出', items: ['100万円を投資済み'] },
        { heading: 'これから発生する費用', items: ['今後も追加費用が必要'] },
      ],
    },
    ellaReaction: null,
    biasIds: ['sunk-cost'],
    explanation: {
      points: [
        '過去の費用を取り戻そうとする気持ちだけで継続を決めると、将来の選択を誤ることがある。',
        'なお「必ず撤退」が正解ではない。',
      ],
    },
    clearsAt: 'result',
  },
  {
    id: 'M03',
    title: 'みんなが買っている',
    scenario: 'SNSで話題の美容家電。「購入者の95%が高評価」と表示されている。',
    prompt: '買いたいと思う？',
    choices: [
      { id: 'A', label: 'かなり買いたい' },
      { id: 'B', label: 'もう少し情報を見たい' },
      { id: 'C', label: '買いたいと思わない' },
    ],
    reveal: {
      groups: [{ heading: '未確認', items: ['高評価の人数', 'レビューの集め方', '広告表示の有無'] }],
    },
    ellaReaction: null,
    biasIds: ['social-proof'],
    explanation: { points: ['他者の評価は役に立つが、母数や偏りによって解釈が変わる。'] },
    clearsAt: 'result',
  },
];

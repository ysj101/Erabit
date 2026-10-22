# Erabit — 画像アセット集

エラ（白ウサギ、青いスカーフ、茶色のバッグ）のMVP用画像素材。

![表情集](previews/expressions-contact-sheet.png)

![全身・動作](previews/poses-contact-sheet.png)

## ディレクトリ

| フォルダ | 内容 |
| --- | --- |
| [`character/`](character/) | 背景透過のメインキャラ、表情14種、アクション6種、正面・側面・背面 |
| [`props/`](props/) | 背景透過の小物6種 |
| [`brand/`](brand/) | アプリアイコン1024/512/256、GitHub向けSNSカード |
| [`previews/`](previews/) | 表情／動作の一覧、ミッション画面のモック |
| [`source/`](source/) | 元のコンセプトボード（画像加工前の参照用） |
| [`manifest.json`](manifest.json) | アセットの相対パス・画像サイズ・透過有無 |

## 収録例

| 用途 | ファイル |
| --- | --- |
| タイトル | `character/era-hero.png` |
| 通常会話 | `character/era-front.png` |
| ひらめき | `character/era-expression-idea.png` |
| 調べる | `character/era-action-investigating.png` |
| アプリアイコン | `brand/app-icon-1024.png` |
| SNS / GitHubプレビュー | `brand/github-social-preview.png` |

## 実装時の注意

- PNGの背景は透過済み（一部のコンセプトボードやプレビューは非透過）。
- 必要に応じて表示時に縮小する。原寸サイズがそのままデザイン上の推奨サイズではない。
- アニメーションは静止画の切り替え、平行移動、拡大縮小、回転を中心に実装する。
- 画像切り出し時の縁や各表情の一貫性は本実装前に確認する。
- `source/` のボード内の文章・細かな画面案は正式な仕様ではない。
- 画像の公開ライセンス・二次利用条件は別途決定する。

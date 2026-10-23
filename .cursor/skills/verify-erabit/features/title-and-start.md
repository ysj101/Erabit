# Title and start

The title shows the エラビット logo and Ella waving (hero pose), and a single `はじめる` button that opens the mission list. A `設定` disclosure with data deletion appears only when the save key exists.

## Sub-features

- `title-logo` shows the wordmark image with alt text `エラビット`.
- `title-ella` shows Ella in the hero pose.
- `title-start` opens the mission list from `はじめる`.
- `title-settings` shows `設定` only when `erabit:save` exists, including a value the app cannot read.

## How to get to it (user POV)

- Open `http://127.0.0.1:$ERABIT_PORT/Erabit/`. Every load and reload lands here.
- Choose `タイトルへ` on the mission list.

## Driving it with verify-erabit

Preconditions:

- `$S/doctor.sh` passes.
- Fresh profile (every journey starts with one).

- **Open the title.** Run `$S/drive title --viewport 375x812`. The checks `logo is visible with alt エラビット`, `Ella is shown (hero) — era-hero`, and `document title is エラビット` pass, and `01-title.png` shows both images.
- **Start.** The same journey chooses `はじめる`. The check `はじめる opens the mission list — M01,M02,M03` passes and `02-list.png` shows the list.
- **Wide screen.** Run `$S/drive title --viewport 1280x800`. The same checks pass with the game centered as a card.
- **Settings visibility.** Run `$S/drive saved-data`. The check `fresh profile: no 設定` passes before play, and `corrupt value: 設定 offers delete` passes after the fixture.

## Gotchas

- The logo sits inside the `<h1>`. Find it by `img "エラビット"`, not by heading text.
- The page focuses the `<h1>` on load, so the first Tab lands on `はじめる`.
- `設定` is a `<details>` summary, not a button. Click its text to open it.

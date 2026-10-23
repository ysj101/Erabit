# Erabit verification map

This directory is the maintained source for verifying Erabit's user-facing behavior. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `$S/launch.sh` (`S=.cursor/skills/verify-erabit/scripts`) and require the `ready http://127.0.0.1:$ERABIT_PORT/Erabit/` line.
- Run `$S/doctor.sh` and require `doctor: instance is worth driving`.
- Set `ERABIT_EVIDENCE_DIR` to where proof must survive.
- Every journey opens a fresh browser profile, so `erabit:save` starts absent and all missions start 未プレイ.
- Never drive an instance that this run did not launch.

## Driving conventions

- Prefer journeys (`$S/drive <journey>`) over ad-hoc scripts. They encode the waits and handles below.
- Handles are roles and visible names: `button "はじめる"`, `button /^M01/` (mission cards), `button "次へ"`, the radio `group` named by the §6 問い, `button "確定"`, `heading level 2 "自分の選択"`, text `M0x 学習テーマ`, `button "次のミッション"`, `button "ミッション一覧へ"`, `button "タイトルへ"`, the `設定` summary, `button "データ削除"`, and `button "削除する"`.
- Ella's face is read from `img[data-ella]` `src` with Vite's 8-character hash removed, for example `era-expression-thinking`.
- Expected copy is parsed from MVP §6 in `docs/MVP.md`. Do not copy expected strings from `src/content/`.
- Run both viewports for layout claims: `--viewport 375x812` and `--viewport 1280x800`.

## Proof and skip reporting

- Capture the action and the resulting screen. The numbered screenshots and ARIA snapshots in each journey folder do this.
- Mutation proof includes a second read of the stored value (`storage-*.json` in `saved-data`).
- Record the journey, viewport, mission, and choice with every artifact. The folder name carries them.
- If a journey cannot reach a screen, report the failing check line and `error.png`. Do not report it as verified through a different journey.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-erabit` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Title and start](./title-and-start.md) covers the logo, Ella, `はじめる`, and when `設定` appears.
- [Mission list](./mission-list.md) covers the three cards and their 未プレイ, 途中, and クリア states.
- [Play a mission](./play-mission.md) covers situation → choice → result → learning for M01–M03, the no-verdict rule, and Ella's faces.
- [Saved data](./saved-data.md) covers reload, delete, and deleting a corrupt value.
- [Keyboard, layout, and motion](./keyboard-layout-motion.md) covers keyboard-only play, 375px and 1280px layout, tap targets, and reduced motion.

# Mission list

The list shows M01–M03 as cards with the mission title and a status badge: 未プレイ, 途中, or クリア. The badge text, icon, and border style all differ, so status never depends on color. A progress line reads `クリア n / 3`. Ella smiles here.

## Sub-features

- `list-cards` shows M01, M02, and M03 in order. Every mission is open; there are no locks.
- `list-unplayed` shows 未プレイ (dashed circle icon, dashed border) before any confirm.
- `list-in-progress` shows 途中 (half-filled icon, solid border) for M01 when the player leaves at the result. M01 clears only on learning.
- `list-cleared` shows クリア (check icon, solid border) once a mission's clear condition is met. M02 and M03 clear on the result.
- `list-progress` reads `クリア n / 3`.

## How to get to it (user POV)

- Choose `はじめる` on the title.
- Choose `ミッション一覧へ` on any mission screen.

## Driving it with verify-erabit

Preconditions:

- `$S/doctor.sh` passes.
- Fresh profile.

- **All unplayed.** Run `$S/drive list-status --viewport 375x812`. The check `fresh profile: every card says 未プレイ` passes and `01-all-unplayed.png` shows three dashed cards.
- **In progress.** The journey confirms M01 choice A and leaves from the result. The check `M01 left at result says 途中` passes and `02-m01-in-progress.png` shows it.
- **Cleared.** The journey replays M01 to learning. The checks `M01 says クリア after learning`, `M02 and M03 still say 未プレイ`, and `progress reads クリア 1 / 3` pass.
- **Not color alone.** The check `クリア and 未プレイ differ without color` reports the text, badge border (`solid`/`dashed`), and card border. `04-m01-cleared-grayscale.png` shows the same list in grayscale.
- **Wide screen.** Repeat with `--viewport 1280x800`.

## Gotchas

- Card accessible names start with the mission id (`M01 本日限定50%OFF！ 未プレイ`). Match `button /^M01/`, not the full name, because the status is part of it.
- A replay of a cleared mission does not reset its status.
- 途中 is reachable only for M01, because M02 and M03 clear on the result.

# Play a mission

A mission runs situation (§6 導入) → choice (§6 問い and options, then 確定) → result (the echoed choice, the §6 回答後 facts, and Ella's §6 line where one exists) → learning (theme name, §6 学習 sentences, and a クリア badge). No theme name or explanation appears before 確定. No choice is judged: result and learning are identical for every choice except the echoed label. Ella's face depends only on the scene.

## Sub-features

- `play-situation` shows the §6 title and 導入 verbatim, Ella `era-front`.
- `play-choice` shows the §6 問い as the radio group name and the §6 options in order; `確定` stays disabled until one is picked. Ella `era-expression-thinking`.
- `play-result` echoes `自分の選択 <label>` and shows the §6 回答後 facts. M01 adds Ella's line 「安くなっていることと、欲しいものかどうかは別だね」; M02 shows past spending and future cost in two separate cards. Ella `era-expression-surprised`.
- `play-learning` shows `M0x 学習テーマ`, the theme as the heading, every §6 学習 sentence, and クリア. Ella `era-expression-idea` with a yellow glow.
- `play-next` offers `次のミッション` after M01 and M02, and only `ミッション一覧へ` after M03.
- `play-no-verdict` means no screen says 引っかかった or any other verdict, whichever choice is made.
- `play-ella-by-scene` means the title, list, situation, choice, result, and learning each have one fixed face that never changes with the choice.

## How to get to it (user POV)

- Choose a mission card on the list.
- Choose `次のミッション` on a learning screen.

## Driving it with verify-erabit

Preconditions:

- `$S/doctor.sh` passes.
- Fresh profile.

- **M01 end to end.** Run `$S/drive mission --mission M01 --choice B --viewport 375x812`. Every check passes, including `choice: no explanation before confirm`, `result: shows §6 回答後 fact 「代替候補」`, `result: Ella says the §6 line`, `learning: heading is the theme アンカリング効果`, and `list: M01 is クリア`. Screenshots `01-situation` to `06-list-after` show each step.
- **M02 and M03.** Run `$S/drive mission --mission M02 --choice B` and `$S/drive mission --mission M03 --choice B`. M02 passes `result: past spending and future cost are shown separately — 2 cards`. M03 passes the four 未確認 facts and `learning: 次のミッション only when one exists`.
- **Every choice.** Run `$S/drive every-choice --viewport 375x812`. For each mission it passes `result and learning are identical for every choice except the echoed label — 1 variants` and every `no verdict that the player was caught` check. It writes `M0x-<choice>-result.png` for all nine choices and `poses.json`.
- **Ella by scene.** The same journey passes `Ella on <scene> is <file> for every mission and choice` for all six scenes and `Ella shows six different faces across the six scenes`.
- **Wide screen.** Repeat the commands with `--viewport 1280x800`.

## Gotchas

- Click the option text, not the radio. The radio is visually hidden inside its label.
- Result and learning share a `次へ`/`ミッション一覧へ` vocabulary with other screens. Wait for the screen (`heading "自分の選択"`, text `M0x 学習テーマ`) before acting.
- The reveal card and the learning glow animate. Screenshots wait for images, animations, and about 1.7s on learning. Do not assert pixels mid-animation.
- §6 M02 学習 contains 「必ず撤退」が正解ではない. The verdict scan therefore looks for 不正解, not 正解.

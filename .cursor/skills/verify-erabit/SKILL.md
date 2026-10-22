---
name: verify-erabit
description: Drive the Erabit web game (React + Vite SPA served under /Erabit/, M01–M03) in real Chrome through Playwright, the way a player does, and capture screenshot, ARIA, and storage evidence. Use when verifying any change to Erabit's screens, mission flow, Ella's faces, saved progress, keyboard use, layout at 375px/1280px, or reduced motion.
---

# verify-erabit

Erabit is a static single-page game. A player goes title → mission list → situation → choice → result → learning for M01–M03, and progress lives in one `localStorage` key, `erabit:save`. This skill builds the checkout, serves `dist/` under `/Erabit/` exactly as GitHub Pages will, and drives it in Chrome with real clicks and key presses. Expected copy comes from MVP §6 in `docs/MVP.md`, not from the app's own content module, so a wrong transcription still fails.

All helpers live in `.cursor/skills/verify-erabit/scripts/` and run from any directory. In the commands below, `S=.cursor/skills/verify-erabit/scripts`, run from the repo root.

| Variable | Default | Meaning |
| --- | --- | --- |
| `ERABIT_PORT` | `4173` | Preview port. Use another port for a second instance. |
| `ERABIT_EVIDENCE_DIR` | `/tmp/verify-erabit/evidence` | Where proof goes. Cleanup never deletes it. |
| `ERABIT_RUN_DIR` | `/tmp/verify-erabit/run-$ERABIT_PORT` | Scratch for one instance (pid, logs). Cleanup deletes it. |
| `ERABIT_TOOLS_DIR` | `~/.cache/verify-erabit-tools` | playwright-core, kept outside the repo so the app gains no dependency. |
| `PLAYWRIGHT_BROWSERS_PATH` | `$ERABIT_TOOLS_DIR/browsers` | Playwright's ffmpeg (needed by `--video`) and fallback Chromium. |
| `CHROME` | first of `google-chrome-stable`, `google-chrome`, `chromium` | Browser binary. |

## Launch

```bash
$S/setup-tools.sh   # once per machine: playwright-core, Playwright's ffmpeg, Chromium if no Chrome, repo node_modules
$S/launch.sh        # npm run build, then vite preview on 127.0.0.1:$ERABIT_PORT under /Erabit/
```

Ready is the line `ready http://127.0.0.1:4173/Erabit/ (pid N, rev abc1234)`. It prints only after `index.html`, its JS bundle, and the built Ella images are served. The app needs no seed data or migrations: an empty browser profile is the starting state, and every journey opens a fresh profile. `launch.sh` refuses a port it does not own, and it is a no-op if this run dir already has a live server. Teardown is `$S/cleanup.sh`.

## Doctor

```bash
$S/doctor.sh
```

Read-only. It checks that the pid is alive and owns the port, that the served `index.html` equals `dist/index.html`, that the build matches `HEAD` and the working tree (outside `.cursor/`), and that the harness is installed. Then it renders the title in a fresh profile and requires the logo and Ella. Run it first, and again whenever anything looks off. If it says the checkout changed, run `cleanup.sh` then `launch.sh`.

## Drive

```bash
$S/drive <journey> [--viewport 375x812|1280x800] [--mission M01|M02|M03] [--choice A|B|C] [--video] [--quiet]
$S/drive all        # every journey at 375x812 and 1280x800, plus reduced-motion
```

| Journey | Proves | Feature file |
| --- | --- | --- |
| `smoke` | Title renders with logo and Ella (doctor uses it; writes no evidence). | [title-and-start](features/title-and-start.md) |
| `title` | Logo and Ella on the title; `はじめる` opens the list of M01–M03. | [title-and-start](features/title-and-start.md) |
| `list-status` | 未プレイ, 途中, and クリア, and that they differ without color (text, icon, border; grayscale shot). | [mission-list](features/mission-list.md) |
| `mission --mission M0x --choice X` | Whole flow with §6 copy, no theme or explanation before confirm, §6 post-answer facts, theme on learning, clear on the list. | [play-mission](features/play-mission.md) |
| `every-choice` | Every mission × choice: no verdict text, identical debrief apart from the echoed label, Ella's face fixed per scene. | [play-mission](features/play-mission.md) |
| `saved-data` | Reload keeps クリア; delete returns 未プレイ; a corrupt `erabit:save` can be deleted; another app's key survives. | [saved-data](features/saved-data.md) |
| `keyboard --mission M0x --choice X` | One mission finished with Tab, arrows, Space, and Enter only (`--video` records it). | [keyboard-layout-motion](features/keyboard-layout-motion.md) |
| `layout` | Every screen of all three missions: no horizontal overflow, every tap target ≥ 44×44. | [keyboard-layout-motion](features/keyboard-layout-motion.md) |
| `reduced-motion` | With `prefers-reduced-motion: reduce`, the reveal and the learning glow do not animate; without it they do. | [keyboard-layout-motion](features/keyboard-layout-motion.md) |

The driver uses roles and visible names (`button "はじめる"`, `group "<§6 問い>"`, `heading level 2 "自分の選択"`) plus one data handle, `img[data-ella]`, whose file name (hash stripped) names Ella's face. Each line prints `PASS` or `FAIL`, then a summary `OK|FAIL <journey> @ <viewport>: n/m checks → <dir>`. The exit code is non-zero on any failure.

Non-UI proof stays in npm: `npm run typecheck`, `npm run verify` (copy provenance, leak, behavior, storage, and import boundaries), and `npm run build`.

## Evidence

Each run writes `$ERABIT_EVIDENCE_DIR/<journey>[-<mission>-<choice>]/<viewport>/`:

- `NN-<step>.png`, a full-page screenshot, and `NN-<step>.aria.txt`, the ARIA snapshot of `<main>`, in the order the player saw them.
- `result.json`, with every check's label, pass or fail, and the observed value.
- Journey extras: `poses.json` (every-choice), `storage-*.json` (saved-data), `keys.txt` (keyboard), `motion-samples.json` (reduced-motion), and `<journey>.mp4` with `--video` (`.webm` if ffmpeg is missing).
- `$ERABIT_EVIDENCE_DIR/runs.jsonl`, one line per journey run.

Proof standards: drive the real user path (clicks and keys on the served build, never internal setters). Capture each action and the screen it produced, not only the last one. Check side effects as well as pixels: `saved-data` reads `localStorage` after each mutation. The only direct storage write is the corrupt-value fixture in `saved-data`, a precondition that no user path can create. A re-run of a journey replaces that journey's own folder. Nothing else is removed.

## Cleanup

```bash
$S/cleanup.sh
```

Stops only the pid recorded in `$ERABIT_RUN_DIR/server.pid` (TERM, then KILL), deletes `$ERABIT_RUN_DIR`, and prints how many evidence files remain. It never kills by process name and never touches `$ERABIT_EVIDENCE_DIR`. Run it after every failed attempt too.

## Helpers

| Script | Use |
| --- | --- |
| `setup-tools.sh` | Install playwright-core and Playwright's ffmpeg (and Chromium only if no Chrome exists) under `$ERABIT_TOOLS_DIR`; `npm ci` if the repo lacks `tsx`. |
| `launch.sh` | Build and serve; prints `ready …`. |
| `doctor.sh` | Read-only health check; exits non-zero with the reason. A `--video` run additionally needs the ffmpeg that `setup-tools.sh` installs. |
| `drive` | Journeys above (`drive.ts` run by the repo's `tsx`). |
| `cleanup.sh` | Stop our server, remove scratch, keep evidence. |
| `env.sh` | Sourced by the others: defaults, `port_owner`, `find_chrome`. |

Isolation: two instances can run side by side with different `ERABIT_PORT` values, because each gets its own run dir. Browser state is per journey (fresh profile), so parallel drives against one server do not share progress. Never point the driver at a server this run did not launch.

Start with [features/README.md](features/README.md) for the map of what to drive.

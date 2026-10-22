# Keyboard, layout, and motion

Every screen moves focus to its heading, so Tab reaches the next action and a mission can be finished with the keyboard alone. The layout holds from 375px phones to a 1280px desktop, where the game sits in a centered card. Every tap target is at least 44×44 CSS px. With `prefers-reduced-motion: reduce`, the reveal card and the learning glow do not animate. There is no audio.

## Sub-features

- `kbd-flow` finishes a mission with Tab, arrows or Space, and Enter: title → list → situation → choice → result → learning → list.
- `kbd-focus` focuses the new `<h1>` on every screen change, with a visible focus ring on the controls.
- `layout-375` and `layout-1280` mean no horizontal overflow on any screen of M01–M03, the title, the list, and the open settings.
- `layout-targets` means every visible button, summary, and radio label is ≥ 44×44.
- `motion-reduced` makes the reveal card appear without movement and keeps the learning glow static.

## How to get to it (user POV)

- Use a keyboard from the first page load.
- Resize the browser or use a phone.
- Turn on the OS setting for reduced motion.

## Driving it with verify-erabit

Preconditions:

- `$S/doctor.sh` passes.
- Fresh profile.

- **Keyboard only.** Run `$S/drive keyboard --mission M01 --choice B --viewport 375x812 --video`. The driver only presses keys. It passes `focus: Tab reaches はじめる`, `focus: list heading takes focus`, `focus: Tab enters the choices`, `arrow keys pick B 比較してから決める`, `focus: Tab reaches 確定`, and `M01 cleared with the keyboard alone`. `keys.txt` lists each key and the element it focused, and `keyboard-M01-B.mp4` records the run.
- **Layout at 375px.** Run `$S/drive layout --viewport 375x812`. Every screen passes `no horizontal overflow` and `n tap targets all ≥ 44×44`, with one screenshot per screen.
- **Layout at 1280px.** Run `$S/drive layout --viewport 1280x800`. The same checks pass.
- **Reduced motion.** Run `$S/drive reduced-motion`. It passes `reduce: reveal card appears without movement`, `reduce: learning glow is static from the first frame`, and the two `no-preference` checks that prove the animation exists otherwise. `motion-samples.json` holds the sampled transform and opacity.

## Gotchas

- The radio inputs are visually hidden. Measure their `<label>` for tap size, which the layout journey does.
- On the choice screen, Tab enters the radio group once. Arrow keys move the selection, and Space picks the focused option when none is picked.
- `確定` is disabled until a choice is picked, so Tab skips it until then.
- Reduced-motion sampling reads values right after the click. A slow machine can let the normal animation finish first and fail the `no-preference` checks. Re-run before suspecting the app.

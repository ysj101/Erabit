# Saved data

Progress is saved in the one `localStorage` key `erabit:save`, so a reload keeps クリア. Reload always lands on the title. `設定` → `データ削除` → `削除する` removes that key only, and every mission returns to 未プレイ. A corrupt or unknown-version value still shows `設定` so the player can delete it. Another app's key on the same GitHub Pages origin is never touched.

## Sub-features

- `save-one-key` writes progress under `erabit:save` and nothing else.
- `save-reload` keeps クリア across a reload. The reload lands on the title.
- `save-delete` uses a two-step delete from `設定` that removes the key; `設定` disappears and the list is all 未プレイ.
- `save-corrupt` means an unreadable value does not crash the game, reads as 未プレイ, and can be deleted.
- `save-neighbour` means another key on the origin survives delete.

## How to get to it (user POV)

- Play any mission, then reload the page.
- On the title, open `設定` and choose `データ削除`, then `削除する`. `やめる` cancels.

## Driving it with verify-erabit

Preconditions:

- `$S/doctor.sh` passes.
- Fresh profile.

- **Save.** Run `$S/drive saved-data --viewport 375x812`. It plays M01 with choice B to learning. The check `progress is saved under the one key erabit:save` passes and `storage-after-play.json` holds the value.
- **Reload.** The journey reloads. The checks `reload lands on the title` and `after reload M01 is still クリア` pass (`02-reloaded-title.png`, `03-reloaded-list.png`).
- **Delete.** The journey opens `設定`, chooses `データ削除`, then `削除する`. The checks `delete removes erabit:save`, `設定 disappears once nothing is saved`, and `after delete every mission is 未プレイ` pass.
- **Corrupt value.** The journey's fixture writes `{corrupt` to `erabit:save` and `keep me` to `another-app:data`, then reloads. The checks `corrupt value: the title still renders`, `corrupt value: 設定 offers delete`, `corrupt value: missions read as 未プレイ`, `corrupt value: delete removes the key`, and `corrupt value: another app's key is untouched` pass. `storage-after-corrupt-delete.json` shows only `another-app:data`.
- **Wide screen.** Repeat with `--viewport 1280x800`.

## Gotchas

- The corrupt value is a fixture written with `page.evaluate`. No user path can create it, so this is the one sanctioned direct storage write.
- `設定` exists only while the key exists. A fresh profile has no settings to open.
- Playing after a corrupt value overwrites it with valid progress. Prove deletion before playing.
- Reload does not resume mid-mission. It always lands on the title.

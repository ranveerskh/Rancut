# RanCut 0.6.4 validation — 2026-09-24

Validated in the provided Linux workspace using Node 24.19.0 and `/usr/bin/ffmpeg`.

- `RANCUT_FFMPEG=/usr/bin/ffmpeg npm test`: 115 passed, 0 failed, 0 skipped.
- Regression test covers trashing a project, typing into the new-project name field immediately, and creating the next project.
- `npm run build`: passed (1,620 modules).
- Electron main, updater, and server syntax checks: passed.
- Existing trim, update-channel selection, license, proxy, export, and 4K decode tests passed.

The Windows installer and actual startup notification still require a Windows test against a published GitHub Release. The old 0.6.3 app cannot see an Actions artifact or a draft release; publish 0.6.4 with `RanCut-0.6.4-Setup.exe` and `release-metadata.json` first.

No Supabase SQL or Edge Function changes are included.

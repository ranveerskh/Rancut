# RanCut 0.6.3 validation — 2026-09-24

Validated in the provided Linux workspace using Node 24.19.0 and `/usr/bin/ffmpeg`.

- `RANCUT_FFMPEG=/usr/bin/ffmpeg npm test`: 115 passed, 0 failed, 0 skipped.
- `npm run build`: Vite production build passed (1,620 modules).
- `node --check electron.cjs`, `desktop-updates.cjs`, `server.mjs`, and the startup update test: passed.
- Update regression verifies a stale Platform release does not hide a newer GitHub release, and startup subscribes before it checks.
- Q regression verifies ripple trim starts from the selected clip's start despite an earlier overlapping clip.
- Help UI regression verifies the Pro trial, Free and Pro limits render on Plans.
- Existing real MP4 export, proxy, and 4K decode tests passed.

The Windows installer and in-app release notification still need a Windows install test against a published GitHub Release. A GitHub source push or Actions artifact alone is not a published installer. Supabase SQL and the Edge Function were not changed or deployed by this editor-only update.

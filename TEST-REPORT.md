# RanCut 0.6.2 validation — 2026-09-24

Executed in the provided Linux workspace with Node 24.19.0.

- `RANCUT_FFMPEG=/usr/bin/ffmpeg npm test`: 111 passed, 0 failed, 0 skipped. This includes real MP4 export, media proxy, and 4K decode checks using the system FFmpeg binary.
- `npm run build`: Vite production build passed (1619 modules).
- `rancut-platform060`: 2 platform tests passed; admin JavaScript syntax and the 0.6.2 Edge Function bundle passed.
- Added regression checks for selection-scoped X splitting, the exact W-trim boundary, the +10 dB linked audio default, −62 dB silence detection, and pausing while media is still loading.

The package includes the SQL migration and Edge Function source but has not been deployed to Supabase or Netlify. The Windows installer workflow is included, but no Windows EXE was built in this Linux workspace. Test the installer, UAC flow, audio playback and GPU preview on Windows before sharing the beta build.

SHA-256 update verification is not publisher code signing and does not make the local client tamper-proof.

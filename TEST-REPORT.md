# RanCut 0.6.0 validation — 2026-09-22

Executed on Linux with Node 24.19.0 using the available local dependency installation.

- `node --test tests/*.test.js`: 104 tests; 97 passed, 0 failed, 7 skipped.
- The 7 skipped tests need a working FFmpeg executable for real encode/proxy/export validation. Windows CI runs the FFmpeg preflight in `npm test` and must pass before building.
- `npm run build`: Vite production build passed (1619 transformed modules).
- Platform `node --test tests/*.test.cjs`: 2 passed, 0 failed.
- Electron/preload and admin JavaScript syntax checked; Edge TypeScript transpile/bundle passed.

New checks cover update deadlines, optional releases, untrusted redirect rejection, cancellation, bad installer bytes, post-download tampering, offline cached update policy, feedback persistence/retry with a stable submission ID, omission of media/license secrets, partial backend availability, preserved admin drafts, required-release selection and unauthorized admin requests.

The installer fixtures are mocked bytes, not a Windows installation. No Windows installer was built here; no real Windows updater, UAC, GPU, live browser rendering, Supabase migration or hosted Netlify feedback test was performed. Existing save-close handshake is reused before opening the installer. Test these on Windows after building, then complete backend deployment and end-to-end checks.

No live SQL, Edge Function, Netlify or GitHub deployment was performed. SHA-256 verification is not publisher code signing and does not make a local client tamper-proof.

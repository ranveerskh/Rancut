# RanCut 0.5.9 — validation

Executed 2026-09-22 on Linux with Node 24.19.0.

## Passed

```sh
node --test tests/*.test.js
```

- 90 passed
- 0 failed
- 7 skipped because this environment does not expose a local FFmpeg binary for
  real proxy / MP4 / 4K encode tests

The new regression test verifies a Feature request sends only the typed request
and bounded app context to `submit_feedback`; it does not send arbitrary
diagnostics. Existing Auto Edit, license, UI, project, framing and export-unit
tests remain green.

```sh
npm run build
```

Vite production build passed for `rancut@0.5.9`.

## Platform companion checks

- `admin/admin.js` passes `node --check`.
- The SQL migration and Edge Function were prepared locally, but this package
  does not claim a live Supabase/Netlify deployment test. Run the three steps
  in the matching Platform package's `FEEDBACK-SETUP.md` before using Feedback.

## Remaining device checks

Build/install the Windows NSIS installer and test a real 4K source, a real
feedback submission, and the Platform inbox on your own deployment before a
public release.

# RanCut 0.5.8 licensing correction — validation

2026-09-22. Based on RanCut-0.5.8-License-Integrated-Source.zip.
Executed on Linux, Node 24.19.0, system FFmpeg 6.1.1 (CPU).
The included Windows GitHub workflow still targets Node 22.

## Reproduced before fixing

The delivered source produced 85 passes and 3 failures out of 88 tests:

1. workflow-ui: the generic fetch mock returned export settings to the new license request, so Auto Edit could not complete.
2. project-home: the Account assertion expected obsolete "no account required" text.
3. ui-build: rendering Help without browser localStorage threw an exception.

## Fixes

- Added a license response mock only inside the workflow test. Verified creating a copy consumes one trial request and refining it consumes none.
- Updated the Home test to verify the actual license input, disabled empty-key activation, and inactive status.
- Made saved-key reads safe during Help rendering when storage is absent or blocked. Real authorization still requires storage and the server; access is not granted as a fallback.
- Reject malformed license-service responses explicitly instead of misreporting them as exhausted trial quota.
- Successful activation now returns active status to the Account UI.
- Added eight license-client regression tests covering storage, trial limits, licensed access, inactive access, successful/rejected activation, malformed responses, and network/server failure.

## Executed after fixing

RANCUT_FFMPEG=/usr/bin/ffmpeg npm test

96 tests passed; 0 failed, 0 skipped, 0 cancelled.

npm run build

Production Vite build passed.

Tests include real short CPU MP4 exports, synthetic 4K encode/decode, seeking proxies and original-byte preservation, plus simulated editor, refinement, recovery/Trash, framing, timeline and transition workflows.

## Limits

License tests mock HTTP responses: no live Supabase account, key, quota or database was changed. This is not an end-to-end validation of the deployed backend.
DOM tests mock GPU/media rendering and native reconnect. Windows installer/upgrade/uninstall, native dialogs, icon cache, RTX/WebCodecs, real-footage chroma, long-video sync/export and sleep behaviour still require device testing.

This patch does not implement a signed offline license, stronger device identity, automatic EXE delivery or the 30-day update lock. Existing licensing still uses a local installation identifier and client-side gates. The existing backend consumes trial quota when authorizing a copy; a later local save failure can still spend that use. These are remaining product/security limitations, not covered up by passing tests.

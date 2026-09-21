# RanCut 0.5.8 validation

2026-09-21. Linux, Node 24, system FFmpeg CPU. Windows CI targets Node 22.

## Executed

- Full automated suite: 88 tests, zero failures, zero skips.
- Vite production build.
- Refinement regressions: BGM-only changes preserve clips/manual exposure; crop retains transform/timing; Style changes retain source clips; recut and locked changes reject safely; CSS no longer overrides timeline sizing.
- Simulated full-editor workflow: timeline pointer drag changes row height; reopen Auto Edit, change BGM, Apply changes, retain clip IDs and exactly two projects (no extra rebuilt copy).
- Existing regressions include recovery/Trash, framing, timeline operations, transitions, real short CPU MP4 exports, synthetic 4K encode/decode, proxies and mocked sleep-blocker lifecycle.
- Exact supplied PNG rendered through a rounded SVG mask. Result visually inspected; transparent PNG and multi-size ICO generated.

## Not verified

DOM tests mock media decoding, GPU, native reconnect and analysis. They do not prove real-browser layout/playback. A discovered Chromium binary failed to launch due to permission denial; no workaround attempted.

Windows installer/upgrade/uninstall, native dialogs, icon cache, RTX/WebCodecs, real-footage chroma, long-video sync/export and lid/sleep behaviour remain unverified. Prior shader fixtures are not claimed as rerun in 0.5.8. No performance benchmark or public-release certification.

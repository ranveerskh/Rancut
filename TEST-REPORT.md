# Executed validation — RanCut 0.4.9

Date: 2026-09-19. Host: Linux, Node 24, system FFmpeg (CPU encoding).
Windows workflow targets Node 22. Production dependencies are unchanged.
New dev-only test dependencies: fake-indexeddb and jsdom.

## Tests
- Final result: **57 passed, 0 failed, 0 skipped**.
- Production build: passed (1596 modules). Electron/preload syntax: passed.
- Original 52 regression tests retained and passing.
- Four catalog/recovery tests: independent project persistence, legacy recovery
  compatibility, bounded history, safe recovery copies, rename, sorting and Trash.
- One full-app DOM integration test: create, Home, rename, duplicate, Trash,
  restore, About, Account, restart into Home and reopen. Uses simulated DOM,
  fake IndexedDB and mocked GPU/media renderer; not browser visual verification.
- Test command: RANCUT_FFMPEG=/usr/bin/ffmpeg npm test.
- Production build and Electron/preload syntax checks.
- Custom icon inspected; ICO includes 16 through 256 px sizes.

Existing tests include ripple/cut/gap logic, links, selections, Style and transition
presets, audio gain, actual short FFmpeg exports/muxing/cancellation, a short 4K
encode/decode and proxy generation. These are not long-project benchmarks.

## Not verified here
- Real Windows installation, upgrade, uninstall, native save dialogs/close prompts,
  shortcut appearance, native reconnect and RTX performance.
- Real Chromium mouse/visual tests: browser installation repeatedly timed out.
- Long 4K videos, real source quality, battery/suspend behaviour or crash injection.
- Live updates, feedback submission, accounts, subscriptions or payments.
  These services are not configured or active in this build.
- Code signing, antivirus clearance, full licensing/public-release approval.

Use the GitHub workflow to build the Windows installer. Back up project files;
check an existing project and a short export before a long editing session.

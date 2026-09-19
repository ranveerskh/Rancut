# RanCut 0.4.9 — Project Home Preview

Based on the working 0.4.8 source, not a rebuild of the editor. Original timeline
math, chroma shader and editing shortcuts are preserved.

## New in this update
- Startup opens Project Home. Named local projects survive restart; search, pin,
  rename, duplicate, Trash and Restore. Original media is never deleted.
- One-time migration of the old latest autosave into a project card. Other older
  project files must be opened once to add them to the list.
- Separate autosave per project, save-state indicator, up to five previous
  recovery snapshots. Recovery creates a copy, never replaces the current edit.
- Home/open/new flush pending saves. Project switching pauses playback and clears
  decoder/runtime media to prevent footage leaking between projects.
- Native close waits for save acknowledgement. Save failure keeps the app open
  unless the user explicitly chooses Close without local save.
- Custom mint R/play icon: desktop, taskbar, Start Menu and NSIS installer assets.
- Help: About / version / Build 49, feedback draft download, Account & Plan panel.
  Feedback is NOT sent anywhere. Subscription/login/billing are NOT connected;
  all preview features remain available. No secrets, fake payment screens or gates.
- Existing rendering/export engine and default Reliable mode preserved.

## Project Home usage
Name a project and click New project. Click Projects to return Home. Project cards
are stored in this app's local data, not a scan of all folders on your PC. Save
still downloads a .rancut.json backup via the normal save dialog. That file does
not include the videos: keep the original media or relink it after moving files.
Trash is reversible; there is no permanent-delete button in this preview.
The local database upgrades to schema 2. If you roll back to an older app, open
your exported project JSON backups; its older autosave reader may not open the
upgraded database.

## Existing features retained
- Compact dark UI, consistent controls, visual framing choices, red missing
  media cards/clips, Help/Shortcuts/Privacy/Licences/Updates and local diagnostics.
- Creator Style: all cuts, selected clips, or selected clip to end on the chosen
  main video track. Person + background move together. Story mix varies framing
  per cut. Single looks apply one look. Fine tuning and preset save/import/export
  remain. Manual Style pose edits lock that segment against regeneration.
- Export-only desktop sleep protection, released on success/failure/cancel/exit.
  Display stays awake too. Manual sleep, lid close, shutdown and battery loss
  are NOT prevented. Detected system suspend aborts the export.
- Completion notification and remembered output folder.
- True 720p/1080p proxy files, made sequentially with a two-thread CPU encoder.
  Video preview uses proxies; audio and final export use originals. Proxies are
  temporary and regenerated after restart. Wait for preparation before export.
- Unchanged paused previews no longer redraw GPU frames repeatedly.
- Direct export fixes: preserve codec configuration object; avoid passing the
  click event as the compatibility flag; bounded finite H264 packets work with
  local HTTP/1; exact seeking replaces loose continuous-play export timing.
  Failure falls back once to compatibility; failed decoders are recreated.
- Reliable FFmpeg export remains default; Direct H264 is selectable/experimental.
  No unmeasured GPU speed guarantee.
- Modern Electron path capture via webUtils. Native imported files register
  directly for analysis/export rather than being copied again.
  Previously imported unchanged files reconnect from a local allowlist.
  Older projects need one manual relink to establish that permission.
- Manual HTTPS update checker implementation. Release URLs stay unconfigured
  pending the publisher's verified hosting/branding decisions.
- Existing presets, manual transitions + sound, chroma, gain-scaled waveforms,
  silence cuts, linked ripple, selection, Fit/follow, dynamic tracks, autosave,
  output-folder saving and desktop exit remain.

## Windows installer
Use Node 22:
    npm ci
    npm test
    npm run dist:win

The included .github/workflows/build.yml builds without publishing or GH_TOKEN.
Run it on the updated commit and download the Installer artifact.
Output: release/RanCut-0.4.9-Setup.exe. This source ZIP has no executable payload.

Back up saved project JSON and presets before upgrading. Public distribution
must pass PUBLIC-RELEASE-CHECKLIST.md. Unsigned builds can still be flagged;
this update does not certify antivirus clearance or replace code signing.

## Quick use
1. Background on V1, person footage on V2; set up Chroma as before.
2. Creator -> main track V2 -> Story mix or single look -> Apply.
3. Select a Style segment to fine tune; its lock protects manual changes.
4. Add transitions manually at cut markers, with optional attached sound.
5. Media -> Smooth preview -> Prepare preview proxies for slow 4K previews.
6. Export -> Reliable -> choose folder. Keep power connected and lid open.

## Validation and limits
See TEST-REPORT.md. Browser visual testing and Windows/RTX/installer testing
could not be completed here. DOM interaction tests use a simulated DOM and mocked renderer; they do not
replace real browser/GPU or installer testing. This is not a zero-bug guarantee or a fully
cleared public release. No captions, cloud accounts or heavy AI modules added.

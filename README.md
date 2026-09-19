# RanCut 0.5.1 — Creator Framing & Repeat Tools Preview

Built on 0.4.9. Project Home/recovery, native source reconnect, chroma shader,
Reliable export, experimental Direct export and sleep protection are retained.

## 0.5.1 additions
- Duplicate selected clips or linked A/V, repeat a selection to the timeline end,
  and extend images/still backgrounds/adjustment layers to the end.
- Video Inspector now has a real rectangular Crop tool. Crop is rendered in the
  same WebGL path used by preview and export, with Reset crop.
- Protect person framing stores a manual body/head box. Creator Styles and Auto
  Edit use it to limit aggressive zooms. It is a conservative framing helper,
  not frame-by-frame AI body tracking; review the result.
- Auto Edit adds a Crop & framing step and an expandable guided workspace.

## 1. Timeline and audio
- Track × now removes populated unlocked tracks after confirmation. Other-track
  linked clips remain and are unlinked. Locked counterparts block the operation.
  Undo restores the deletion. Original media is never deleted.
- Audio track name opens a full-track master gain dialog. Audio Inspector offers
  This clip / Selected clips / Full track. Master gain adds to clip gain, with
  combined gain limited to −60…+12 dB. Waveforms and exports reflect master gain.
- Q = Ripple Left; W = Ripple Right. M remains Add marker. Key labels use a clear
  non-monospace font so W is not mistaken for M.

## 2. Creator Styles
Styles has its own panel with Simple and Dynamic presets and Apply / Edit.
Edit includes Reset to default, Save style and Export; Import and Capture edited
Style are retained. Choose the main video track and Full timeline or Selected
clip only. Existing manually locked Style segments remain protected.
Styles transform person + background together. Auto Edit logo tracks stay above
Style transforms by default; Include logo overrides this. For manual logo tracks,
Video Inspector has Keep this track above Creator Styles.
Selected application still requires Style segments aligned with main cuts; the
app reports a mismatch rather than overwriting unrelated framing.

## 3. Transitions
Click + at a touching video cut, or open Transitions. Choose Paper, Whoosh,
Shutter, Glitch or Fade, duration and optional matching/custom sound.
Scope is This cut or Full video (all touching cuts on that video track).
Replace existing requires explicit consent. Remove acts on the selected cut.
Visual transitions stay attached to cut badges, not a separate visual layer.
Attached sounds remain virtual until export; they move with the cut.
Preset file import/export and custom sound import are retained.

## 4. Clean short leftovers
Select a main/voice clip -> Audio -> Clean short leftovers -> Scan.
Default candidates are short clips (up to 2 s, adjustable) with at least 80%
quiet analysis windows. Aggressive mode includes all short clips, even speech.
Review candidates, seek to listen, click Keep for wanted pieces, then remove
reviewed pieces with linked ripple. Undo is available. A changed timeline
invalidates the review. This is NOT speech recognition or reliable cough removal.

## 5. Auto Edit
Auto Edit beside Follow opens:
1. Green-screen / Regular, imported main video and voice source, voice leveling.
2. Optional background/logo, Simple/Dynamic/no Style, optional transition/sound.
3. Optional BGM, gain/ducking, pause removal and short-leftover cleanup.
4. Analyse & prepare -> inspect source ranges -> Generate editable project copy.

The original project is saved first and never replaced. Generated clips, layers,
audio and settings remain editable. This starts from the selected source media,
not from the already-edited timeline. A separate voice recording must align at
0:00 and cover the main video. Background video and BGM repeat to fill the edit;
background audio is not included. All processing is local.
Regular mode skips keying/background selection. Every editing effect can be skipped.

## Honest limits
- Auto green key samples the first frame. Unclear/black first frames can fail.
  Check the result and refine Chroma manually; it is not semantic background AI.
- Voice leveling uses measured RMS windows with sample-peak headroom, not LUFS
  loudness mastering. It may reduce already-loud audio instead of boosting it.
- BGM ducking lowers music while unmuted voice clips are active, not word-by-word
  speech recognition. Preview and export share the interval logic; tiny export
  fades avoid hard audio edges.
- Auto Edit cleanup is optional and can remove wanted short speech. Review first.
- Some existing transitions on different tracks can conflict with a full-video
  application. The complete operation is rejected rather than partially applied.
- No new render-speed promise. No heavy AI/runtime dependencies were added.
- This preview has no active subscriptions, rewarded ads or live feedback service.

## Windows installer / GitHub
Use Node 22:
    npm ci
    npm test
    npm run dist:win

The included GitHub workflow builds with --publish never, no GH_TOKEN required.
Artifact: release/RanCut-0.5.0-Setup.exe. The source ZIP is not a Windows installer.
Custom desktop/Start Menu/taskbar/NSIS icons are included.
Back up saved project JSON and presets before upgrading. Media remains external.
The local catalog retains schema 2 from 0.4.9; older app versions may need JSON
backups when rolling back.

## Validation
68 automated tests, production build and Electron/preload syntax checks passed.
See TEST-REPORT.md for exact boundaries. Actual Windows/RTX, browser visuals,
long-project endurance and installer testing remain outstanding. Public release
still requires signing, licensing review and configured release/support services.

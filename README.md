# RanCut 0.3.8

Local video editor prototype. Extract into a new folder, save your existing project before switching, then run START-RANCUT.bat. Node.js 22 is required; the first run installs dependencies. Open your saved project and relink its original media if requested.

## 0.3.8 fixes

- Playhead follow now responds to paused seeks and zoom changes as well as playback. Horizontal manual scrolling temporarily suspends following for 2.5 seconds, then resumes. Vertical scrolling does not switch Follow off. The Follow button is a real ON/OFF toggle. Starting playback clears a temporary suspension.
- Waveform peaks now scale by the clip gain (10^(dB/20)). Attenuation reduces waveform height; amplification increases it. Peaks above full scale are bounded to the lane and shown red. Both Inspector gain and the clip gain line update it.
- Click a leading/internal empty gap to highlight it, then press Delete/Backspace or the toolbar Delete button. This explicitly closes the selected interval across all unlocked tracks, including spanning backgrounds, regardless of clip-edit scope. Clip selection is cleared when a gap is selected, preventing accidental deletion of the previously selected clip. Locked linked tracks block edits. Ctrl+Z restores the whole edit. Trailing space after the last clip is not a bounded removable gap.
- Context-menu Ripple delete and Close gap use the same selected-gap action.

Reusable random framing/zoom presets were discussed but are not included in this release. Existing adjustment layers currently apply colour grading; animated transforms would require a separate clip-preset/keyframe implementation.

## Editing controls

- **Selection:** Shift/Ctrl-click toggles clips. Drag on empty timeline space to box-select across tracks. Ctrl+A selects unlocked clips; Escape clears. Drag an already selected clip to move the group; linked partners move once. Overlaps and locked edits are rejected atomically. Delete removes the selection and its linked partners. Ctrl+Z undoes the entire operation.
- **Scope:** All unlocked tracks (default) or Selected + linked clips. Applies to Split, Z crop-left, Trim/Ripple buttons and gap closing. A locked linked counterpart blocks the edit to preserve sync. Unrelated locked layers remain in place.
- **Z:** removes the interval from project start to playhead in the chosen scope and moves retained material left. Playhead returns to zero.
- **Gaps:** right-click empty space inside a track's leading or internal gap, then Ripple delete this gap. With no highlighted gap, Close gap uses the gap at the playhead; Close all gaps uses every gap on the reference track shown beside the scope control. A selected clip determines the reference track; otherwise the first unlocked track with gaps is used. With all-track scope, spanning backgrounds are also shortened to preserve timing. Trailing empty space is not a gap.
- **Panels:** drag the divider above the timeline to resize vertically. Media and Inspector buttons collapse their panels. The focused divider also supports up/down arrows.
- **Snapping:** ON/OFF control beside scope. Moving clips snap to nearby clip boundaries/playhead. A dashed outline previews the anchor clip's proposed destination. Final placement still checks track compatibility and collisions.
- **Effects:** select a source clip and Copy in Inspector. Select destination clips, choose All visual effects / Chroma / Colour / Position-scale, then Paste. Audio gain and fade settings are not copied by this visual-effects action.
- **Cut fades:** 5 ms in/out fades on audio clips by default; Audio Inspector allows 0–20 ms. Preview gain scheduling and MP4 audio export both apply fades. These are short edge fades, not overlapping crossfades.
- **Preview:** Full / Half / Quarter scales rendering relative to project canvas. Export resolution remains independently selected. Source video still decodes at its original resolution; this is not a proxy-generation feature.

## Commands

```
npm ci
npm run dev
npm test
npm run build
npm run dist:win
```

GitHub Actions installs dependencies, runs tests, builds the Windows portable EXE, and uploads the EXE and web assets. Workflow artifact paths are updated to 0.3.8. The ZIP includes source and web build; it is not a prebuilt Windows EXE. The local API is needed for audio analysis/export, so opening dist/index.html directly is unsupported.

## Validation for this release

- 23 tests passed, including real FFmpeg MP4 export with two audio segments and fades (tested with RANCUT_FFMPEG=/usr/bin/ffmpeg).
- Tests cover atomic linked group moves, collisions, leading/internal gaps, scopes, locks, effects copying, fades, and existing timeline invariants.
- Production build passed.
- Browser interaction/visual checks could not run in this environment: Chromium was unavailable and its download timed out. Windows EXE packaging and 10–20 minute 4K playback/export have not been executed here.

Before using a long project, try a short clip: Shift-select and move linked cuts; box-select; close one gap; undo; crop with each scope; copy keying; resize/collapse panels; change preview resolution; export a short MP4.

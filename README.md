# RanCut 0.4.0 — Creator update

This ZIP contains source, the web build and a Windows installer build workflow. It does not contain a compiled Windows installer.

## Run / install

For the local browser version, install Node.js 22, extract this ZIP into a new folder and run START-RANCUT.bat. Keep your existing project backup and relink original media when requested. Do not open dist/index.html directly: the local server provides export and audio analysis.

For the installed desktop app, upload the extracted project (including .github) to your GitHub repository. Run the “RanCut Windows and Web” Actions workflow. Download the RanCut-v0.4.0-Installer artifact, extract it and run RanCut-0.4.0-Setup.exe. This is an assisted installer with install-location choice, Start menu/desktop shortcuts and uninstall support. Alternatively run BUILD-INSTALLER.bat on Windows with Node.js 22 installed. Build outputs go to release/. Dependencies must be downloaded on first build.

## Style Layer

Open Creator, choose the main video track containing your cuts, edit the shot choices, and Apply. A top Style adjustment track applies one framing segment per cut to the complete scene below it, including keyed person and background. Shots include normal, close-up, left/right and animated zoom. Regenerate changes the sequence; locked style segments stay unchanged.

Select a Style segment to adjust its starting/ending scale and position, or lock it against regeneration. Positions are constrained to avoid exposing blank edges. “Capture edited Style layer” collects edited shots into a reusable preset. Save stores presets locally; Export/Import exchanges JSON files between installations. Existing footage and source transforms remain editable.

New video tracks are placed below the Style track. Other adjustment layers above it can apply further grading. Hidden tracks are excluded from preview/render. Style segments use the cuts present when Apply is pressed: after changing your edit, apply/regenerate again to update coverage. Locked segments that no longer fit the cuts must be unlocked or adjusted first.

## Manual transitions and sound

Transitions are separate from Style. In Creator choose a touching cut, then Apply, or drag the transition onto a cut badge. Paper, whoosh, shutter, glitch and fade are procedural cover/push effects; these are not two-source dissolves or realistic 3D paper curls. Only touching cuts accept transitions, and overlapping transition intervals are rejected.

Enable the attached sound and choose its volume. Built-in matching sounds are original synthesized effects, not recorded commercial sound packs. Import your own sound up to 5 seconds / 10 MB. Exported transition presets include custom sound data. Sound follows its cut; remove the transition to remove attached sound. Unlink sound creates an independent audio clip. Visual duration changes do not stretch the sound. Save, export and import transition presets independently of Style presets.

## Editing and layout

- Box select explicitly enables dragging a selection rectangle, including starting over clips. Shift/Ctrl-click toggles individual clips. Drag a selected clip to move the group; linked audio follows. Locked edits and overlaps are rejected together.
- “From clip → end” selects clips starting at or after the selected clip, across unlocked tracks in all-track scope, or on its track in selected scope. Earlier spanning clips are not selected. Use group move to create space, then insert media.
- Fit supports long timelines; zoom uses a logarithmic range. Fullscreen has an Exit button and F toggle; Escape also exits native fullscreen.
- Follow playhead responds to playback, paused seeks and zoom. Manual horizontal scrolling temporarily suspends following.
- Waveforms scale with clip gain. Amplified peaks exceeding full scale show red.
- Click a bounded empty gap, then Delete to remove that interval across unlocked tracks. Close gap / Close all gaps use the reference track shown in the toolbar. Spanning backgrounds are shortened to preserve timing. Trailing unbounded space is not a removable gap.
- All unlocked tracks is the default edit scope. Z removes material before the playhead and shifts retained material left. Selected + linked scope limits edits. Ctrl+Z undoes the operation.
- Resize the preview/timeline divider and collapse side panels. Compact controls and dark scrollbars leave more space for tracks.

## Export and exit

The desktop app defaults to your Windows Videos folder → RanCut Exports. Choose folder changes and remembers it. The browser version shows an editable absolute folder path on the machine running the local server; Set folder or starting export saves that choice. Each completed MP4 is automatically saved with a unique filename. The success view shows its full path; desktop also has Open output folder. No browser download is needed.

Progress reports frame rendering, sound mixing and saving, with elapsed time, cancellation and errors. A final MP4 is published only when encoding finishes. Cancel removes partial output. Closing the desktop app requests project recovery save, stops encoding and shuts down its local server with bounded timeouts. Completed exports are retained. Original media still needs to remain available for relinking.

Export now transfers raw frames to FFmpeg instead of compressing each frame as PNG first. Preview UI updates are throttled and transition sound preparation is cached. Half/Quarter preview reduces render size, but does not generate proxies or reduce original media decoding. This is not a promise of realtime 4K playback/export; encoding currently uses software H.264, not NVENC. Exports can be large/slow and should first be tried with a short project.

## Development / validation

```
npm ci
npm run dev
npm test
npm run build
npm run dist:win
```

35 automated tests passed with real FFmpeg available. They cover timeline operations, selection geometry, group moves, style/transition data, sounds, real MP4 audio/video export, remembered folders, raw-frame orientation, cancellation and retention of completed files after cleanup. Production web build passed. The actual GLES shader compiled and passed synthetic whole-scene transform and transition pixel checks.

Browser interaction and visual testing could not run because Chromium was unavailable. Windows installer execution, Windows close behaviour and 10–20 minute 4K playback/export have not been verified here. Installer packaging was attempted locally; see BUILD-STATUS.md for the result. The GitHub workflow builds on Windows and runs the automated tests before publishing its installer artifact.

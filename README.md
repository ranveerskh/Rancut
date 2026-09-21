# RanCut 0.5.7 — Resizable creator workspace

This ZIP contains the complete updated source and Windows installer workflow.
It is not a prebuilt EXE. Replace the repository contents with the contents of
the rancut folder, including .github/workflows/build.yml.

## Brand update

- The supplied icon-only artwork is included as public/rancut-icon.png.
- Header, Project Home, About, favicon and desktop shortcuts use the icon only;
  the RanCut name is rendered separately in the app header.
- Windows PNG/ICO assets are proportional size conversions of that supplied icon.
- Dark navy panels with restrained purple/blue accents on selected controls,
  sliders, Style clips and Export. Audio remains green; missing media remains red.
- No animated glow, background video, blur effects or additional runtime dependencies.
- Editor controls, timeline geometry and base/close-up framing behaviour are retained.

## Creator workspace

- Shared Creator Styles / Auto Edit camera workspace: normal base and maximum
  close-up are locked 16:9 boxes. Move the box or resize its lower-right handle.
  X, Y and Zoom have sliders plus numeric fields. Fit, Fill and Reset are visible.
- Clean edges is a separate source mask. It never squeezes or stretches the person.
  It opens by default in Auto Edit. The mask may have any aspect ratio.
- Source frame slider, seconds field and Show frame work independently of the
  timeline playhead. Changing the displayed time preserves the selected boxes.
- Simple uses gentle close-ups and zooms. Dynamic cycles Normal, Close-up,
  Slow zoom in, Slow zoom out, Left framing and Right framing. Lateral shots are
  steady. Short clips under 1.2 seconds keep a steady pose.
- Normal uses the saved base. Dynamic zoom-in goes base to close-up; zoom-out
  reverses it. Person and background move as one scene. Fixed logos stay outside
  the scene transform unless explicitly included.
- Full-window Auto Edit: preview left, settings right, draggable divider,
  independent scrolling, fixed step navigation and footer. Preview does not
  replace the controls.
- Broken More menu removed. Timeline actions are directly visible on one compact
  row; narrow screens can scroll the row. Clear/Delete toolbar buttons removed.
  Delete/Backspace and Escape still work. Duplicate, Repeat/Extend to end,
  Q/W ripple, gap, selection, link, Auto Edit, Follow and Fit are retained.
- Trash supports selection, Select all, Restore selected, and confirmed permanent
  deletion of selected projects and their recovery copies. Original media files
  are never deleted.
- Media and Inspector panels have keyboard-accessible vertical dividers, and the
  timeline divider keeps pointer capture so all three panel sizes can be adjusted.
- Auto Edit saves its complete options on the generated project. Opening Auto Edit
  again loads those options so the crop, framing, style, sound and cut choices can
  be corrected without starting over.

## Use the new framing

1. Open Auto Edit, choose the main video and Green-screen or Regular.
2. Use the time slider or type seconds (120 = 2 minutes), then Show frame.
3. Clean edges: remove unwanted source corners. Choose background under Look.
4. Normal base: frame the normal shot you want. Max close-up: put the smaller
   16:9 box around head/chest, leaving headroom. Belly cropping is allowed.
5. Style preview: pick a shot, play it, or drag Shot progress. Inspect several
   source times if the person moves. These are fixed framing limits, not AI tracking.
6. Select Simple/Dynamic, sound/cut options, Analyse & prepare, then generate the
   editable project copy. Skipping Style motion retains the chosen normal base.

For an existing timeline: Styles -> Set base & maximum close-up -> Save framing
-> Apply Simple/Dynamic. Choose full timeline or selected clips. Saving boxes
alone does not change existing cuts. Manually locked Style segments are kept;
use Reset shot / unlock before regenerating those segments.

Style JSON import/export and Capture edited Style remain available. Built-in
shots follow the saved boxes. Numeric preset edits and captured presets store
absolute poses; they need review when used with different footage.

## Retained

Project Home, recovery copies, original-path media reconnect, red missing-media
markers, chroma controls, cut-attached transitions and optional sound, audio gain,
silence cleanup, duplicate/repeat, proxies, undo, GPU-capable encoding and
remembered output folder are retained. Reliable export stays default;
Direct export remains experimental. There is no new export-speed claim.

Existing projects are not silently reframed. Save a .rancut.json backup before
upgrading, especially if you may return to an older version.

## Windows build

Use Node 22 or newer:

```sh
npm ci
npm test
npm run dist:win
```

GitHub Actions also runs these checks, uses --publish never (no GH_TOKEN needed),
and uploads release/*-Setup.exe. Expected installer: RanCut-0.5.7-Setup.exe.
Install over the existing preview to retain local projects.

## Validation and limits

83 automated tests, Vite build, syntax checks, and 18 native shader-rendered
start/middle/end frames were checked. Read TEST-REPORT.md for exact scope.
Native shader checks use Linux Mesa software rendering with synthetic media;
they do not establish Windows/RTX/browser or long-project performance.

Automatic head protection follows your selected static close-up box. It cannot
track a moving person outside that region. Green sampling still needs a clear
green source frame. Review cuts, keying and sound before final export.

Subscriptions, rewarded ads, live support and release hosting are not connected.
This is a preview source release; public-release requirements remain in
PUBLIC-RELEASE-CHECKLIST.md.

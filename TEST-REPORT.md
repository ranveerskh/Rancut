# RanCut 0.5.7 validation

Date: 2026-09-21. Linux, Node 24, system FFmpeg CPU. Windows CI targets Node 22.

## Executed

- 83 automated tests: zero failures and zero skips.
- Vite production build and Electron/preload/server syntax checks.
- Version agreement across package, lockfile, header, Home, Help, server and workflow.
- No production dependency added. moderngl is an optional QA-only Python tool.

## Brand update validation

- Original JPEG checksum matches the supplied upload exactly.
- Desktop PNG decoded RGB pixels match the original JPEG; ICO uses proportional size conversion.
- JSX, CSS, static assets and desktop MIME routing build successfully.
- Full regression suite rerun. Native shader report is retained from the previous release;
  rendering logic did not change. No new browser visual/Windows icon test claimed.

## 0.5.7 additions

- Production build completed after adding real media/Inspector vertical panel dividers.
- Auto Edit generated projects retain all wizard options for later correction.
- CI workflow selector no longer depends on a Unicode arrow surviving checkout encoding.

## Creator workspace coverage

- 16:9 box/pose roundtrips at boundaries, nested frame validation and clamping.
- Selected close-up rectangle retained at endpoints and intermediate camera poses.
- Visible scale change in both zoom directions; gentle versus Dynamic strength.
- Steady short shots; six distinct balanced Dynamic shot choices.
- Style scope and manually locked segments, untouched source mask, JSON persistence.
- Captured/imported absolute presets retain their exact saved poses.
- Auto Edit and Creator share camera calculations; skipping motion keeps the base.
- Shared framing simulated DOM: source-time seek, box drag, zoom control,
  frame preservation, mask refresh at chosen time, error/retry and preview mode.
- Full-editor simulated DOM: direct toolbar actions; no More/Clear/Delete toolbar.
- Trash simulated DOM: selection, cancelled deletion, confirmed deletion and reopen.
- Atomic batch restore/delete preserves active projects; legacy recovery tombstone
  prevents permanently deleted recovery from reappearing on next startup.

## Actual rendered image checks

scripts/render-framing-fixture.mjs extracts the application vertex/fragment shader
and JS motion poses. scripts/render-framing-check.py compiles that shader with
only GLSL API syntax adaptation on native Mesa/EGL (llvmpipe).

18 PNG frames cover six shots at start, midpoint and end. Pixel assertions check:
proportional circular head; retained headroom; no transparent outer edge;
correct JS-to-shader positions; visible zoom-in/out; source mask leaving interior
pixels unchanged. The contact sheet was visually inspected. Results and PNGs
are in qa/framing/. These are actual shader renders, using synthetic media.

To reproduce (optional QA packages: moderngl, Pillow, numpy):
```sh
node scripts/render-framing-fixture.mjs /tmp/rancut-framing.json
python scripts/render-framing-check.py /tmp/rancut-framing.json qa/framing
```

## Retained coverage

Linked timeline edits, locks, selection/gaps, track deletion, gain/waveform math,
project catalog/recovery, presets, transition sound, real short CPU FFmpeg MP4
exports and audio, proxies, synthetic 4K encode/decode, cancellation/packet ordering,
and mocked sleep-blocker lifecycle.

## Not verified

A Chromium binary could not be downloaded in this environment (network timeouts).
Simulated DOM tests do not prove real-browser layout, actual mouse scaling or
browser media decoding. Native shader testing does not replace those tests.

Windows installer/upgrade/uninstall, native dialogs, RTX/WebCodecs, real footage
chroma quality, long-video audio sync/export endurance and sleep/lid behavior on
the user's laptop remain unverified. No signing, antivirus clearance, subscription,
ad service or public-release approval is claimed.

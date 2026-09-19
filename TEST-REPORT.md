# RanCut 0.5.1 validation
Date: 2026-09-19. Linux, Node 24, system FFmpeg CPU. Windows CI uses Node 22.

## Executed
- 71 tests passed; 0 failed; 0 skipped.
- Production Vite build passed (1606 modules).
- Electron and preload syntax checks passed.
- Version, lockfile and runtime-package checks passed.
- SVG rendered into PNG/ICO; icon visually inspected.
- No production dependency was added for this update.

## 0.5.1 coverage added
- Clip duplication/repeat keeps linked A/V together and trims the final repeat.
- Still image/adjustment extend-to-end, validated picture crop, and subject-frame data.
- Auto Edit carries optional crop and a manual protected-subject frame into its editable copy.
- DOM workflow covers the new Crop & framing Auto Edit step.

## Coverage added
- Auto Edit green/regular modes; skip options; invalid or mismatched sources;
  peak-safe voice gain; silence padding; source immutability; repeating background
  and BGM; linked main A/V; logo exclusion/inclusion; Style and cut-attached sound.
- Track removal preserves source media and unlinks surviving clips. Locked
  counterparts remain protected.
- Clip / selected / track gain, preview/export effective-gain parity.
- BGM interval ducking, export splitting and voice mute behaviour.
- Conservative/aggressive short-leftover candidates using source offsets.
- Both built-in Style presets and explicit transition replacement.
- Simulated DOM integration: edit/reset/save/apply Style, + transition modal,
  full-video/no-sound settings, full-track gain, Auto Edit review/generate,
  separate project persistence, track × and Undo.
  GPU, native reconnect, green sample and audio analysis are mocked in this DOM
  test. Pure processing tests use fixture analysis; these are not real footage QA.

## Retained tests
Project Home/recovery; linked ripple; cuts/gaps/selection; waveform math;
Style/transition presets; existing FFmpeg MP4/audio export tests; proxy generation;
short synthetic 4K encode/decode; Direct encoder packet/cancel logic and sleep
blocker lifecycle mocks. These are NOT long-video RTX benchmarks.

## Not verified here
Real Windows installer/upgrade/uninstall, native dialogs, real browser visual
layout/mouse scaling, RTX/WebCodecs/chroma visual quality, speech/cough accuracy,
long-project audio sync and export endurance. Browser binary download previously
timed out. No Windows or real browser test is claimed.
No signing, antivirus clearance, live subscriptions/ads or public-release approval.

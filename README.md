# RanCut 0.4.3 — RTX/NVENC detection update

RanCut is a local video editor for YouTube creators. It runs locally; no account or cloud upload is required for editing.

## What changed in 0.4.3

- Installer workflow builds the NSIS installer without attempting a GitHub release or requiring `GH_TOKEN`.
- Export frames are sent as high-quality JPEG instead of uncompressed RGBA, cutting the local 4K transfer bottleneck while keeping the final H.264 quality setting.
- Saved projects remember each imported file's source path/folder when the desktop provides it. Missing media can be matched from a selected source folder or relinked one clip at a time, with filename/size/duration checks.
- The app checks `nvidia-smi` separately from FFmpeg, reports the GPU model/driver, and tries PATH/system FFmpeg when the bundled binary cannot use NVENC.
- The header distinguishes `h264_nvenc active`, `GPU found · CPU fallback`, and `CPU encoder` instead of hiding a failed GPU probe.
- The workflow artifact points to the actual `RanCut-0.4.3-Setup.exe` filename.
- FFmpeg probes hardware encoders at startup. If a working NVIDIA NVENC, AMD AMF, Intel Quick Sync or Apple VideoToolbox encoder is available, export uses it automatically. Otherwise it uses `libx264`. A failed or unavailable hardware encoder safely falls back to CPU mode.
- The header and export dialog show the active encoder (`h264_nvenc active` or `CPU encoder`).
- The source archive contains no prebuilt executable, `node_modules`, or installer helper scripts. Build the installer on a clean Windows runner.
- Existing Style Layer, manual transitions with matching sound, chroma controls, follow-playhead, box selection, selected-to-end selection, gap closing, autosave and automatic output-folder saving remain included.

## Build

Install Node.js 22, then run:

```
npm ci
npm test
npm run dev
npm run build
npm run dist:win
```

`npm run dist:win` creates `release/RanCut-0.4.3-Setup.exe` and never publishes a GitHub release. The included GitHub Actions workflow runs the tests and uploads the installer and web build as separate artifacts. Do not rerun an old failed workflow attempt; run the workflow from the current `main` commit.

## GPU behaviour

The app does not require an RTX card. It tests the FFmpeg encoders that are actually usable on the machine. RTX systems with a working NVIDIA driver normally show `h264_nvenc active`; systems without it use CPU encoding. Preview compositing already uses WebGL when the browser/Electron GPU is available. This is acceleration, not a guarantee of realtime 4K playback: source codec, effects, storage and driver state still matter.

## Safety and distribution

The source archive is the safer reviewable package and has no executable payload. Windows installers built without an Authenticode certificate can trigger SmartScreen or antivirus heuristics. Do not restore an installer that Defender quarantines. For public distribution, build from a clean runner, scan the resulting executable, sign it with a trusted certificate and submit a suspected false positive to Microsoft before sharing it.

## Creator workflow

Creator includes a reusable Style adjustment layer for cut-to-cut normal, close-up, left/right and animated zoom framing across the complete scene, including the keyed person and background. Style presets can be saved/imported and individual segments can be edited or locked. Transitions remain manual and separate from Style: paper, whoosh, shutter, glitch and fade can carry a matching sound effect. Custom transition audio is limited to 5 seconds.

The timeline supports linked A/V ripple editing, automatic playhead following, box selection, multi-clip group moves, selection from a clip to the end, bounded empty-gap deletion, actual gain-scaled waveforms and fullscreen exit. Export saves MP4 automatically to the remembered output directory and reports progress, cancellation and errors.

## Validation

36 automated tests pass with FFmpeg, including real MP4 export, JPEG-frame export, raw-frame orientation, output-folder retention, cancellation cleanup, Style/transition data and timeline operations. Production web build passes. Browser interaction, Windows installer execution, Defender scanning, Windows NVENC availability and long 4K workloads must still be checked on Windows.

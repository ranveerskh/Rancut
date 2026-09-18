# RanCut 0.4.6 — direct GPU export

RanCut is a local video editor for YouTube creators. It runs locally; no account or cloud upload is required for editing.

## What changed in 0.4.6

- Electron/WebCodecs now use a direct H.264 stream when the local Chromium build supports a hardware encoder. Canvas frames go straight to the encoded stream; the expensive JPEG conversion is removed.
- During direct export, source video elements play continuously instead of seeking every frame. Cuts still seek exactly when a clip changes.
- FFmpeg receives the encoded H.264 stream and only performs the final audio mux, avoiding a second video encode. The previous JPEG-batch pipeline remains an automatic fallback.
- The export dialog labels the active path as `Direct H.264` or shows the fallback render/JPEG/send timings.

## Carried forward from 0.4.5

- Electron requests the high-performance GPU before its graphics process starts. On hybrid AMD/NVIDIA laptops this asks Windows/Chromium to put the WebGL canvas on the discrete GPU instead of silently leaving effects rendering on the integrated Radeon GPU.
- The header now reports both jobs separately: the active H.264 encoder and the actual WebGL canvas renderer. Hover it to see the complete detected GPU strings.
- Export sends four length-prefixed JPEG frames per local request and overlaps encoding of the previous batch with rendering of the next batch. This removes most of the per-frame request overhead without buffering the whole project in RAM.
- The export dialog reports average render, JPEG-compression, and send/encode time per frame. This makes the remaining bottleneck measurable on the target Windows PC.
- Intermediate JPEG quality now follows Good/High/Maximum instead of always using the most expensive setting.

## Carried forward from 0.4.4

- Installer workflow builds the NSIS installer without attempting a GitHub release or requiring `GH_TOKEN`.
- Export frames are sent as high-quality JPEG instead of uncompressed RGBA, cutting the local 4K transfer bottleneck while keeping the final H.264 quality setting.
- Saved projects remember each imported file's source path/folder when the desktop provides it. Missing media can be matched from a selected source folder or relinked one clip at a time, with filename/size/duration checks.
- The NVENC probe now uses a 256×256 test frame. Older builds used 16×16, which NVIDIA correctly rejects as below the minimum encoder frame size and incorrectly forced CPU fallback.
- The app checks `nvidia-smi` separately from FFmpeg, reports the GPU model/driver, and tries PATH/system FFmpeg when the bundled binary cannot use NVENC.
- The header distinguishes `h264_nvenc active`, `GPU found · CPU fallback`, and `CPU encoder` instead of hiding a failed GPU probe.
- The workflow artifact points to the actual `RanCut-0.4.6-Setup.exe` filename.
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

`npm run dist:win` creates `release/RanCut-0.4.6-Setup.exe` and never publishes a GitHub release. The included GitHub Actions workflow runs the tests and uploads the installer and web build as separate artifacts. Do not rerun an old failed workflow attempt; run the workflow from the current `main` commit.

## GPU behaviour

The app does not require an RTX card. It tests the FFmpeg encoders that are actually usable on the machine. RTX systems with a working NVIDIA driver normally show `h264_nvenc`; systems without it use CPU encoding. The canvas label separately shows NVIDIA, AMD or Intel. Electron requests the high-performance GPU, but Windows Graphics Settings and the driver retain final control. If WebCodecs does not expose a supported H.264 configuration, the app safely uses the JPEG fallback.

## Safety and distribution

The source archive is the safer reviewable package and has no executable payload. Windows installers built without an Authenticode certificate can trigger SmartScreen or antivirus heuristics. Do not restore an installer that Defender quarantines. For public distribution, build from a clean runner, scan the resulting executable, sign it with a trusted certificate and submit a suspected false positive to Microsoft before sharing it.

## Creator workflow

Creator includes a reusable Style adjustment layer for cut-to-cut normal, close-up, left/right and animated zoom framing across the complete scene, including the keyed person and background. Style presets can be saved/imported and individual segments can be edited or locked. Transitions remain manual and separate from Style: paper, whoosh, shutter, glitch and fade can carry a matching sound effect. Custom transition audio is limited to 5 seconds.

The timeline supports linked A/V ripple editing, automatic playhead following, box selection, multi-clip group moves, selection from a clip to the end, bounded empty-gap deletion, actual gain-scaled waveforms and fullscreen exit. Export saves MP4 automatically to the remembered output directory and reports progress, cancellation and errors.

## Validation

37 automated tests pass with FFmpeg, including direct H.264 stream input, real MP4 export, legacy single-JPEG input, batched JPEG input, raw-frame orientation, output-folder retention, cancellation cleanup, Style/transition data and timeline operations. Production web build passes. Browser WebCodecs availability, Windows installer execution, Defender scanning, actual discrete-GPU assignment and long 4K workloads must still be checked on Windows.

# Build status — 0.4.3

- Production web build: passed.
- Automated tests: 36 passed with real FFmpeg export, including JPEG-frame export.
- GPU probe: passed on this Linux test host with a safe CPU fallback (`libx264`). On Windows the app will test NVENC/AMF/QSV/VideoToolbox at startup and use only an encoder that completes a test frame.
- The Windows workflow now runs `npm run dist:win`, which includes `--publish never`; it does not need `GH_TOKEN`.
- The workflow artifact path is `release/RanCut-0.4.3-Setup.exe`.
- No prebuilt installer is included in the source ZIP. Windows installer execution, Defender scanning, code signing, browser UI interaction and 10–20 minute 4K workloads still need Windows verification.

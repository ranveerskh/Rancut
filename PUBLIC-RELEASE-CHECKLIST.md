# Public release gates — preview, NOT a cleared public release

- Choose final product name/publisher; check trademarks separately.
- Supply publisher contact, support address and final privacy/terms.
- Review all runtime/transitive licences and retain notices.
- Verify the licence/configuration of the precise FFmpeg binary distributed.
  Supply corresponding source or source access as required by that licence.
  Package notices alone do not satisfy all GPL obligations.
- On a clean Windows runner, build the installer. Verify install/upgrade,
  saved projects and presets, offline launch, exit and uninstall.
- Sign with the publisher's certificate; verify signature/hashes and scan.
  Investigate Defender detections. Never disable security to run a flagged file.
- Verify 10–20 minute real 4K footage on an NVIDIA laptop and a CPU-only PC:
  cuts, chroma edges, Style, sound sync, colour, direct and fallback export.
- Test idle sleep protection, manual sleep/lid close, cancellation, low disk
  space and power loss. Export has no restart-from-checkpoint support.
- Check Windows scaling at 100/125/150%, mouse selection/group moves, Fit,
  follow, fullscreen return, shortcuts and old projects.

## Manual update checks

release-config.json intentionally has null URLs. Configure your own verified
HTTPS manifestUrl and downloadPage. Manifest format: {"version":"0.4.9"}.
Use plain x.y.z versions. Redirects are rejected. The release download page
comes from packaged configuration, not arbitrary manifest content.
Help / Updates checks only when clicked; it never silently installs anything.
Hosting, signing, branding and legal publisher decisions remain outstanding.

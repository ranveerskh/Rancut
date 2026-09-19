# Third-party notices — initial inventory

Copied installed package licences are in licenses/:

- React 19.1.1 and React DOM 19.1.1 — MIT.
- Lucide React 0.468.0 — ISC.
- Electron 35.7.5 package — MIT. Its Chromium and other distributed components
  have additional notices supplied with the Electron distribution.
- ffmpeg-static 5.2.0 package — GPL-3.0-or-later. The executable is separately
  built FFmpeg software; verify its exact licence and source obligations.

Vite 6.1.6 (MIT), electron-builder and transitive dependencies are pinned in
package-lock.json. This inventory is not a complete SBOM or legal clearance.
Review transitive/runtime notices and FFmpeg source compliance before launch.

Implementation references:
- https://www.electronjs.org/docs/latest/api/power-save-blocker
- https://www.electronjs.org/docs/latest/api/web-utils
- https://ffmpeg.org/legal.html

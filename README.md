# RanCut 0.6.3 Private Beta

RanCut is a local-first video editor for creator-led edits. This source ZIP includes the Vite app, desktop shell, tests, and Windows GitHub Actions workflows. It does not contain a ready-made Windows installer.

## Changes in 0.6.3

- Q ripple-trim now takes its start from the selected clip, even when another overlapping clip starts earlier.
- Startup checks register the update notice before checking. Update checks compare the newest Platform release and published GitHub release, so an older Platform row cannot hide a newer installer.
- The Updates page distinguishes a successful up-to-date check from a missing public installer and explains what needs to be published.
- Help now has a visible Free, Pro trial, and Pro comparison. It lists the 30-day trial, Free's 1080p cap and two Auto Edits per calendar month, and Pro's unlimited Auto Edit and 2K/4K export.
- W ripple-trim, Space pause during pending media load, −62 dB silence detection, +10 dB main-video audio, and New Project name-field fixes from 0.6.2 remain included.

See [RELEASE-NOTES-0.6.3.md](RELEASE-NOTES-0.6.3.md) for details.

## Run and verify

Use Node 22 or newer. From the editor folder:

```sh
npm ci
npm test
npm run build
```

Build the Windows installer on Windows with `npm run dist:win`, or use the included GitHub Actions workflows.

## Publish an update

A source-code push or an Actions artifact alone is not an in-app update. The updater needs a published GitHub Release whose version is newer than the installed app and whose assets include `RanCut-x.y.z-Setup.exe` and `release-metadata.json`. The included **Prepare downloadable installer** workflow creates a draft release; test it, then publish the draft. See [RELEASE-UPDATES.md](RELEASE-UPDATES.md).

The desktop app checks at startup, again every 24 hours while open, and when the user presses **Check for updates**. A published installer then appears in the startup notice and Updates tab.

## Plans

Open **Help → Plans** for the comparison. During the private beta, online purchase is not available; Pro access uses a license key in **Help → Account**. This 0.6.3 editor update does not change the Supabase SQL or Edge Function, so they do not need redeployment for these fixes.

## Included safeguards and limits

Source media and editing stay local. Release downloads are verified against the release metadata before the installer can be opened. This is not publisher code signing or tamper-proof DRM. Test the Windows installer on the target computer before sharing it.

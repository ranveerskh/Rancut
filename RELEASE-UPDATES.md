# Publish a downloadable RanCut update

1. Keep the version in `package.json`, `package-lock.json`, the app labels, and the GitHub release tag aligned.
2. Push the editor source to `ranveerskh/Rancut`. The regular workflow tests and builds an installer artifact, but the artifact is not visible to the in-app updater.
3. In GitHub Actions, run **Prepare downloadable installer**. It tests/builds a Windows installer and creates a draft release containing `RanCut-x.y.z-Setup.exe` and `release-metadata.json`.
4. Install and test the draft. Publish it only after the Windows build works. The repository/release must be publicly downloadable by beta users.
5. RanCut checks its Platform release endpoint and GitHub's latest public release at startup, every 24 hours while open, and on **Check for updates**. It selects the highest published version, so an older Platform record cannot hide a newer GitHub release.
6. The startup notice links to Help → Updates. **Download update** verifies the installer and saves it to Downloads/RanCut Updates. **Install now** waits for project saving, then opens the installer.

A code push, tag, draft release, or Actions artifact alone is not a published update. The release must be public, newer than the installed version, and include the installer plus metadata asset. Never replace an installer with different bytes under an existing version; publish a new version instead.

Required release deadlines remain managed by the Platform. The app warns after 7 days and restricts Auto Edit after 30 days for an outstanding required release. This client-side policy is not tamper-proof DRM. No signing certificate is bundled.

# Publish a downloadable RanCut update — after backend setup

1. Put the contents of the editor folder at the root of ranveerskh/Rancut. Keep .github/workflows. Do not upload the outer combined folder as the repository root.
2. The existing Windows and Web workflow builds an installer artifact. For a real direct download URL, manually run **Prepare downloadable installer** in GitHub Actions. It tests/builds Windows and creates a DRAFT release with the EXE and release-metadata.json. No release is published automatically by this package.
3. Install/test the EXE, then publish that draft on GitHub. The release asset must be accessible to users without GitHub authentication; private repository releases do not work with this public download channel.
4. After the 0.6.2 Platform Edge Function is deployed, an optional public GitHub release is auto-discovered from `release-metadata.json`; no Release Manager row is required. The app checks on startup, once every 24 hours, and from Check for updates. Use Platform → Releases only when you need an admin history entry or a Required deadline. If you do use it, copy version, downloadUrl, sha256 and size from the metadata and leave Required unchecked for an optional beta.
5. Publish the GitHub draft after testing. Newer app versions become available through the platform-first channel and the validated GitHub fallback. Download update saves the EXE under Downloads/RanCut Updates. Install now waits for project saving and opens the Windows installer.

Use a new x.y.z version for every release and update package.json, package-lock.json and displayed app versions together. Existing published release versions are immutable in this dashboard. Never replace an EXE asset with different bytes under the same version.

Required releases use the server's publication date. Warning starts after 7 days; Auto Edit is restricted after 30 days. The earliest outstanding required release controls its deadline, so publishing another release does not reset an overdue deadline. Existing downloaded policy survives ordinary offline restarts. This is not tamper-proof DRM. No signing certificate is bundled.

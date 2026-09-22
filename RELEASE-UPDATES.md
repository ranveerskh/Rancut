# RanCut release updates

The desktop build reads `release-config.json`, which points at
`release-manifest.json` in the `main` branch of the RanCut GitHub repository.

For each release:

1. Build and publish the Windows installer to a GitHub Release.
2. Update `release-manifest.json` with the new semantic version and the release
   or installer URL.
3. Commit the manifest to `main`.

The app checks the manifest over HTTPS. A release is shown only when the
manifest version is newer than the installed version; it never silently
replaces the installation.

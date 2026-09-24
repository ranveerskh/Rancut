RanCut 0.6.3 update-channel recheck:

- Startup listener is installed before the renderer starts the check.
- Platform and GitHub are queried together; the highest public version wins.
- A missing published installer is reported separately from a successful current-version check.
- For the end-to-end notice and download test, publish a higher-version GitHub Release with the installer and release-metadata.json, then launch the Windows installer build.

See TEST-REPORT.md for the current test results.

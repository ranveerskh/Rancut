RanCut 0.6.4 update-channel recheck:

- 0.6.3 startup subscribes to update events before requesting the update status/check.
- Platform and GitHub are queried together; the highest published version wins.
- A missing published installer is shown separately from a successful current-version check.
- The 0.6.4 release needs `RanCut-0.6.4-Setup.exe` and `release-metadata.json`.
- GitHub Actions creates a draft; publish it before launching 0.6.3, because the app ignores draft releases and source pushes.
- Help → Updates shows the release and its Download action starts the verified `.exe` download directly.

See START-HERE-0.6.4.txt and TEST-REPORT.md for the full test steps and current verification status.

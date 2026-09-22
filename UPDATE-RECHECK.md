# Installing this source correction

This ZIP contains the full RanCut editor source, with index.html, package.json,
src/, tests/ and the Windows build workflow at the root. It is not the separate
RanCut Platform admin website and does not require replacing that website.

Replace the matching files in the RanCut editor repository with these contents.
Keep the root directory structure; do not place this whole folder inside src/.
Commit to run the existing Windows workflow. The EXE is created by that workflow,
not included in this source ZIP.

Changed runtime file: src/license-client.js.
Changed tests: tests/workflow-ui.test.js and tests/project-home.test.js.
Added tests: tests/license-client.test.js.
Updated validation: TEST-REPORT.md and this note.

The earlier workflow mock correction is included, so no separate copy/paste is needed.
Version remains 0.5.8 to match the existing release configuration.
See TEST-REPORT.md for executed checks and outstanding limitations.

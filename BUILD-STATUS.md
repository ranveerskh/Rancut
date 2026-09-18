# Build status — 0.4.0

- Production web build: passed.
- Automated tests: 35 passed, including actual FFmpeg export.
- Local Windows installer packaging: attempted, failed before producing an installer. electron-builder's dependency collector could not resolve @derhuerst/http-basic under ffmpeg-static in this environment's shared/symlinked node_modules tree.
- No Setup.exe is included or claimed tested. The supplied GitHub Actions workflow installs a clean dependency tree on Windows and builds the NSIS Setup installer. That workflow has not been executed on a connected repository here.
- Windows install/uninstall, shutdown and browser UI interaction remain unverified. Long 4K workloads have not been benchmarked. Hardware NVENC export and proxy generation are not implemented.

Use BUILD-INSTALLER.bat in a fresh extracted folder on Windows, or the included GitHub workflow, to build the installer. Do not copy node_modules from another project.

# RanCut 0.6.3 — Editing, updates, and plan clarity

- Fixed Q ripple-trim so its range starts at the selected clip's start rather than the earliest overlapping clip under the playhead. The configured ripple scope still controls which tracks move.
- Fixed startup update-notice timing by subscribing before requesting the release check.
- The updater now checks Platform and GitHub together and selects the highest published version. A stale Platform release row no longer masks a newer GitHub installer.
- The Updates page no longer calls an unchecked or missing release “up to date.” It explains when GitHub has no published installer.
- Added a Help → Plans comparison for the 30-day Pro trial, Free plan, and Pro plan, including monthly Auto Edit limits and export caps.
- Bumped the editor to 0.6.3 / Build 63.

The editor update does not change Supabase SQL or the Edge Function.

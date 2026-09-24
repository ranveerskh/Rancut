# RanCut 0.6.2 — Editing fixes

This update fixes the reported timeline split and playback behavior and adjusts the requested audio and silence defaults.

- **X split** now edits the selected clip and its linked audio only. It no longer follows the broad “All unlocked tracks” scope. The playhead must be inside a selected clip.
- **W / Ripple R** removes through the selected clip’s exact end, then ripples the timeline.
- **Pause** cancels pending video/audio starts so a media load finishing after Space is pressed cannot restart sound.
- **Silence threshold** starts at −62 dB in the inspector and Auto Edit.
- **Main video audio** starts at +10 dB on its linked audio clip. Other audio and track gains are unchanged.
- **New Project** focuses the name field when the home screen opens and clears it after starting a named project.
- Version and build labels are updated to 0.6.2 / Build 62.

The default controls are not saved as user preferences in this update.

## Trial database repair

If the 0.6.1 trial SQL is already installed, run `RanCut-supabase-004-trial-rpc-fix.sql` in the Supabase SQL Editor. It recreates the trial status and usage functions with qualified table columns, preserves trial records, and refreshes the PostgREST schema cache. Deploy the included `license-api` Edge Function if the platform function has not already been updated.

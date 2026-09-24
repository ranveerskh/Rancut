# RanCut 0.6.4 — Project focus and update testing

- After moving a project to Trash, RanCut returns keyboard focus to the new-project name field. This lets you immediately type the next project name without navigating away or restarting.
- Added an integration regression that trashes a project, types a new name in the field, and creates another project.
- Bumped the editor to 0.6.4 / Build 64 so an installed 0.6.3 app can detect it as a newer release.
- Retained the 0.6.3 fixes for update notice startup timing, GitHub release checks, Q ripple trim, and Help → Plans.

This is an editor-only change. It does not change Supabase SQL or the Edge Function.

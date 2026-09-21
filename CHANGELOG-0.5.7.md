# RanCut 0.5.7 — Resizable workspace and editable Auto Edit settings

- Replaced in-app and desktop branding with the supplied icon-only artwork. The
  RanCut wordmark remains clean text beside the icon in the editor header.
- Fixed the timeline divider pointer interaction and added resizable media and
  Inspector panel dividers with keyboard arrow support.
- Auto Edit now stores its complete wizard options on the generated project and
  reloads them when the wizard is opened again, so framing, crop, style, sound and
  cleanup choices can be refined.
- Hardened the workflow UI test against Windows checkout encoding for the
  “From clip to end” toolbar label.

Validation: Vite production build and all 83 automated tests pass with system
FFmpeg. Windows installer and RTX hardware validation still belong to CI/local
machine checks.

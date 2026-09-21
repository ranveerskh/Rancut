# RanCut 0.5.8 Preview

Complete source, built frontend and Windows installer workflow. This ZIP is NOT a prebuilt EXE. Copy the ZIP root contents into your repository, including .github/workflows/build.yml. Back up project JSON before upgrading.

## Updated

- Supplied R/play artwork preserved, with transparent exterior corners. Icon-only desktop, Home, About and favicon; separate aligned RanCut wordmark.
- Compact header with restrained accents.
- Routine notifications disappear after 4.5 seconds without occupying a permanent row. Error/missing-media messages remain until replaced.
- Timeline CSS priority conflict removed so dragging changes row height; side dividers retained.
- Saved Auto Edit settings reopen directly. Apply changes updates only changed categories, preserving existing cuts and unrelated edits. Undo remains available.
- Refine crop, chroma, backgrounds, logo, BGM level/ducking, voice normalization, styles/framing or transitions without a full rebuild.
- Source and silence/cleanup cut changes explicitly require rebuilding a NEW project copy.

## Refine Auto Edit

Open the generated project, click Auto Edit, choose a settings tab, edit and click Apply changes. A BGM volume change preserves its clips; changing the BGM source replaces that category's clips. Background/logo replacement likewise replaces its own generated track clips. Changed Styles regenerate unlocked Style segments, preserving locked segments. Unlock target tracks before editing them.

Saved Auto Edit options are required (generated in 0.5.7 or later). Older projects without those options cannot reconstruct their wizard choices automatically.

16:9 framing, clean-edges mask, source frame selection, Simple/Dynamic motion, cut transitions, repeat/extend, Q/W ripple, recovery/Trash, proxies and GPU-capable export remain included. Framing limits are static, not body tracking. Reliable export remains default; Direct export is experimental.

## Windows build

Use Node 22 or newer:

```sh
npm ci
npm test
npm run dist:win
```

GitHub Actions tests and builds RanCut-0.5.8-Setup.exe with --publish never. Install over the current preview. Windows may cache an old shortcut icon; recreate the shortcut after installing if needed.

Original logo: public/rancut-icon.png. App: public/brand-icon.png. Installer: assets/icon.ico. Optional scripts/render-brand.cjs needs Sharp as a QA-only tool, not a runtime dependency.

Read TEST-REPORT.md for validation and limitations. No new export-speed guarantee. Subscriptions, rewarded ads, live support and production release hosting are not connected.

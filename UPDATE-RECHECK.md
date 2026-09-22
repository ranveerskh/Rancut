# Installing RanCut 0.5.9 source

This ZIP is the complete RanCut editor source with its existing Windows build
workflow. Extract its contents at the repository root; do not nest this folder
inside `src/`. The ZIP is not a prebuilt EXE.

## Build

```sh
npm ci
npm test
npm run dist:win
```

## Companion Platform update

Feedback submission needs the matching RanCut Platform package deployed first:

1. Run its feedback SQL migration once in Supabase.
2. Deploy its updated `license-api` Edge Function.
3. Publish its updated `admin/` folder to the private Platform site.

Without that companion deployment, Feedback correctly shows the Platform error
instead of silently saving a local draft.

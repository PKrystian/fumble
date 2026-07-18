# Generated compendium data

**Do not edit these files by hand.** They are produced by the data-prep pipeline:

```bash
npm run data:build -- --input <path-to-5etools-src-checkout>
# or set FIVE_E_TOOLS_SRC, or use the default .cache/5etools-src clone
```

These JSON files **must be committed**. CI and the GitHub Pages build do not run
`data:build` (they have no 5etools-src checkout), so the app relies on the committed
output here. Regenerate and re-commit whenever the upstream data is updated or new
categories are added in `scripts/data/build.ts`.

Source: https://github.com/5etools-mirror-3/5etools-src (pinned commit recorded in each
file's `meta.sourceCommit`).

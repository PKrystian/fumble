# Fumble - working rules

Free, client-side D&D 2024 toolkit + Obsidian-powered campaign wiki. Static, hosted on
GitHub Pages. No backend, no login, no cost. All state in localStorage.

Stack: React 19, TypeScript (strict), Tailwind v4, Vite 6, react-router 7, zustand 5.
Vitest + Testing Library (unit), Playwright (e2e). Node 22+.

## Non-negotiable house style

This repo is public and must not read as machine-written. These are hard rules for every
file that ships to GitHub (anything not gitignored):

1. **No emoji.** Not in code, docs, README, UI strings, or commit messages.
2. **No em-dash (`—`) or en-dash (`–`). Use a plain hyphen `-`.** Applies to UI strings in
   `src/i18n/dictionaries/*.ts` too.
3. **No comments, except functional ones.** Keep only: `eslint-disable*`, `@ts-ignore` /
   `@ts-expect-error` / `@ts-nocheck`, `/// <reference />`, `prettier-ignore`,
   `@vite-ignore`, `@preserve` / `@license`, and a short comment inside an intentionally
   empty `catch {}` (ESLint `no-empty` treats a commented block as non-empty).
   No explanatory comments, no JSDoc on trivial functions, no `// --- section ---`
   banners, no `{/* JSX markers */}`. Do not "helpfully" re-add them.
4. Avoid other AI tells: over-defensive `try/catch`, triple null guards, `=== true` where
   truthiness works, debug `console.log`, unused imports, catch blocks that only log.

**Exception:** `src/data/generated/**` is generated D&D data. Its `—` cells are meaningful
table content ("none"). Never hand-edit or de-dash those files.

## Quality gates - all must pass before you are done

```
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build
npx playwright test --project=chromium   # when UI behaviour changed
```

`npm run format` fixes formatting. Lint must be 0 errors (4 react-refresh warnings in
`src/i18n/path.tsx` are pre-existing and expected).

## Release hygiene

Every pull request or completed change intended to ship to GitHub must include a new
Semantic Versioning release and a matching entry in `CHANGELOG.md`. Update the version in
`package.json` and the root package entry in `package-lock.json` together. Use a patch
version for bug fixes, asset changes, and other small changes; the legal footer reads the
version from `package.json`, so never hardcode it in a component.

## Git

Never run git. The user commits and publishes themselves. Leave work in the working tree.

## Layout

- `src/app/` - `router.tsx` (routes), `navigation.ts` (sidebar), `layout/`
- `src/features/<name>/` - one folder per feature; persisted state in `store.ts`
  (zustand + persist, localStorage keys are `fumble-*`)
- `src/data/compendium/` - types, `localize.ts`, `overlay.ts` (locale overlay loader)
- `src/data/generated/` - committed build output; `pl/` holds translation overlays
- `src/i18n/` - `dictionaries/en.ts` + `pl.ts`, `useT()`, `path.tsx` (`useLocale`, `Link`)
- `scripts/data/` - the 5etools data pipeline; `scripts/wiki/` - the vault pipeline

## How to add things

**A UI string:** add the key to `src/i18n/dictionaries/en.ts` (it types the `Dictionary`),
then the same key to `pl.ts`. Read it with `const { t } = useT()` and `t('some.key')`.
Interpolate with `t('k', { name })` against `{{name}}` in the string. Never hardcode
user-facing English in a component - `en.ts` is the only place it belongs.

**A compendium category:** add the generated JSON to `src/data/generated/`, a type to
`src/data/compendium/types.ts`, a `renderDetail` component in
`src/features/compendium/details.tsx`, then register it in the `CATEGORIES` array in
`src/features/compendium/categories.tsx` (`id`, `load: loader(() => import(...))`,
`subtitle`, `renderDetail`, optional filter `field(...)`s). Add the label under
`compendium.categories.<id>` in both dictionaries.

**A route/page:** component under `src/features/<name>/`, route in `src/app/router.tsx`,
sidebar entry in `src/app/navigation.ts` (`labelKey` points at a dictionary key, not a
literal). Locale prefixing is automatic - use `Link` from `@/i18n/path`, not react-router's.

**A Polish translation:** never edit `src/data/generated/*.json`. Add a sparse overlay
entry in `src/data/generated/pl/<category>.json`, keyed by the entry `id`. At runtime it
is shallow-merged (`{...english, ...overlay[id]}`), so any field you provide replaces the
English one wholesale (arrays must be complete) and anything omitted falls back to English.

**5etools `{@tag}` markup:** rendered by `src/features/compendium/markup.tsx`. Only
segment 0 (link target) and segment 2 (display text) are read. The correct translated form
is `{@spell Fireball|XPHB|Kula Ognia}` - keep segments 0 and 1 in English so cross-links
resolve. Do not append a 4th segment. Reference links fall back to the target entry's
localized name automatically, so an untranslated tag still renders in Polish.

## Gotchas

- Regenerating data: `npm run data:build` needs a pinned 5etools checkout in `.cache/`
  (gitignored). CI does not rebuild; the committed JSON in `src/data/generated/` is what
  ships. Regenerating overwrites hand-fixes - prefer the `pl/` overlay.
- `@mlc-ai/web-llm` is lazy-loaded on purpose (huge chunk; `chunkSizeWarningLimit: 7000`).
- Vite `base` is `/` for `fumble.krystianpinczak.com` (`BASE_PATH` overrides).
- Strict TS: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`. Match existing `?? []` / `!` / optional-spread patterns.
- Never bulk-remove comments with regex - `//` appears in strings, URLs and regex
  literals. Use the TypeScript compiler API (`ts.createSourceFile` +
  `getLeadingCommentRanges` / `getTrailingCommentRanges`) and drop empty `JsxExpression`
  nodes whole so `{/* c */}` does not collapse to a broken `{}`.

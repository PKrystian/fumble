# Contributing to Fumble

Thanks for your interest in improving Fumble! This guide covers the basics.

## Prerequisites

- Node.js 22+ and npm (or use the provided Docker setup)
- Git

## Getting started

```bash
npm ci
npm run dev      # start the dev server at http://localhost:5173
```

With Docker instead:

```bash
docker compose up dev    # dev server with hot reload at :5173
docker compose up web    # production build served by nginx at :8080
```

## Quality gates

Every PR must pass the same checks CI runs. After installing the dependencies and the
Playwright browser, run the complete local check:

```bash
npm ci
npx playwright install chromium
npm run verify:ci
```

The command covers the full CI sequence: dependency audit, lint, formatting, SBOM
generation, TypeScript, unit coverage, production build, both Chromium and mobile E2E
projects with coverage, and coverage merging. The generated `fumble-sbom.cdx.json` is a
local CI artifact and is ignored by Git.

CodeQL runs as a separate GitHub Actions check on every PR and must be green after the
PR is opened or updated. It does not have a local npm equivalent in this repository.

If you are iterating on one change, these individual commands are also available:

```bash
npm run security:audit
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

The individual test commands are faster, but a PR is ready only after
`npm run verify:ci` passes. Stop the dev server before running it so Playwright can start
the coverage-enabled server.

`npm run format` will auto-fix formatting.

## Project conventions

- **Stack:** React + TypeScript + Tailwind CSS v4, bundled with Vite.
- **Structure:** code is grouped by feature under `src/features/*`; routing and layout live
  under `src/app`; compendium transforms and generated data live under `src/data`.
- **Comments:** do not add explanatory comments. Only functional tool directives and a short
  comment required inside an intentionally empty catch block are accepted.
- **Tests:** unit/component tests with Vitest + Testing Library live next to the code
  they cover (`*.test.ts[x]`); end-to-end flows live in `e2e/` (Playwright).
- **Accessibility & responsiveness:** every UI must work with keyboard and screen
  readers and look good on desktop, tablet, and mobile.
- **User-facing text:** add every string to both `src/i18n/dictionaries/en.ts` and
  `src/i18n/dictionaries/pl.ts`.
- **Persisted state:** preserve existing localStorage data or add and test a migration.
- **Generated data:** do not edit generated English data directly. Put documented Polish
  corrections in sparse overlay files.

## Branches & commits

- Branch off `main`; use short, descriptive branch names (`feat/...`, `fix/...`).
- Write [Conventional Commits](https://www.conventionalcommits.org/) where practical.
- Open a PR using the template and link any related issues.

## Content & licensing note

Fumble is offline-first and stores user data only in the browser. Game-reference data has
its own distribution status and is not covered by the project MIT License. Keep bundled
data in the dedicated data layer, preserve provenance metadata, and update
`THIRD_PARTY_NOTICES.md` when adding a source.

Do not submit copyrighted source books, artwork, or other third-party files without
documenting their origin and confirming that the maintainer intends to distribute them.

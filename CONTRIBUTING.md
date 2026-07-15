# Contributing to Fumble

Thanks for your interest in improving Fumble! This guide covers the basics.

## Prerequisites

- Node.js 22+ and npm (or use the provided Docker setup)
- Git

## Getting started

```bash
npm install
npm run dev      # start the dev server at http://localhost:5173
```

With Docker instead:

```bash
docker compose up dev    # dev server with hot reload at :5173
docker compose up web    # production build served by nginx at :8080
```

## Quality gates

Every PR must pass the same checks CI runs:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
```

`npm run format` will auto-fix formatting.

## Project conventions

- **Stack:** React + TypeScript + Tailwind CSS v4, bundled with Vite.
- **Structure:** code is grouped by feature under `src/features/*`; shared UI under
  `src/components`, shared logic under `src/lib`.
- **Comments:** keep them minimal - write self-explanatory code and only comment the
  non-obvious "why", never the obvious "what".
- **Tests:** unit/component tests with Vitest + Testing Library live next to the code
  they cover (`*.test.ts[x]`); end-to-end flows live in `e2e/` (Playwright).
- **Accessibility & responsiveness:** every UI must work with keyboard and screen
  readers and look good on desktop, tablet, and mobile.

## Branches & commits

- Branch off `main`; use short, descriptive branch names (`feat/...`, `fix/...`).
- Write [Conventional Commits](https://www.conventionalcommits.org/) where practical.
- Open a PR using the template and link any related issues.

## Content & licensing note

Fumble is offline-first and stores user data only in the browser. Be mindful that
game-reference data has its own licensing; keep bundled data in the dedicated data
layer so its source and license stay clearly tracked.

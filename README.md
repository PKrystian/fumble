# Fumble

A free, no-login, **client-side** toolkit for **Dungeons & Dragons 2024 (5.5e)** plus an
Obsidian-powered campaign wiki. Everything runs in the browser and is hosted on GitHub
Pages - no servers, no running costs.

> Live site: https://pkrystian.github.io/fumble/

## Features (planned)

**Player**

- Custom character sheet (abilities, skills, HP, actions, spells, inventory, features, rolls)
- Full D&D 2024 compendium: species, classes, feats, backgrounds, items, spells, conditions, rules
- Dice roller (bulk rolls)
- Session log: voice-to-text capture + one-button summary (in-browser model, optional API key)

**Dungeon Master**

- Initiative tracker
- Bestiary
- Loot generator
- Encounter / challenge-rating calculator
- Soundboard (ambience playlists)

**Campaign**

- Wiki generated from an external Obsidian vault, with player-safe secret hiding and map pins

See [docs/ROADMAP.md](docs/ROADMAP.md) for the build order and design decisions.

## Tech stack

React 19 · TypeScript · Tailwind CSS v4 · Vite · React Router · Zustand · Vitest +
Testing Library · Playwright · Docker · GitHub Actions.

## Development

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Start the dev server                |
| `npm run build`     | Type-check and build for production |
| `npm run preview`   | Preview the production build        |
| `npm run lint`      | Lint with ESLint                    |
| `npm run format`    | Auto-format with Prettier           |
| `npm run typecheck` | Type-check only                     |
| `npm run test`      | Run unit/component tests            |
| `npm run test:e2e`  | Run Playwright end-to-end tests     |

### Docker

```bash
docker compose up dev    # hot-reload dev server on :5173
docker compose up web    # nginx-served production build on :8080
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under [MIT](LICENSE).

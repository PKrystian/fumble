# Fumble

Fumble is a free, no-login, client-side toolkit for Dungeons & Dragons 2024
(5.5e) with an Obsidian-powered campaign wiki. It runs entirely in the browser.
Application state stays in localStorage and there is no Fumble account or backend.

Live site: https://fumble.krystianpinczak.com/

## Features

### Players

- Editable character roster and character sheets
- Compendium with English and Polish content
- Dice expressions, dice pools, advantage, disadvantage, and roll history
- Session notes and local speech-to-text transcription
- Import and export for characters and homebrew content

### Dungeon Masters

- Initiative tracker
- Encounter calculator backed by the bestiary
- Loot generator
- YouTube soundboard
- Searchable books, adventures, rules, creatures, items, and spells

### Campaign wiki

Fumble can build a player-facing wiki from an Obsidian vault. The generator supports
wikilinks, images, infoboxes, maps, player-safe locked sections, and removal of DM-only
content.

The hosted demo contains the example wiki from this repository. To publish your own wiki,
self-host Fumble and build the site with your own vault:

```bash
npm ci
npm run wiki:build -- --input /path/to/your/vault
BASE_PATH=/ npm run build
```

The generated wiki is written to `src/data/generated/wiki.json`, with assets copied to
`public/wiki-assets`. See [docs/wiki-templates.md](docs/wiki-templates.md) for the authoring
format.

## Privacy and local data

Fumble has no account system and does not send character, campaign, homebrew, or session
data to a Fumble server. Browser storage can be cleared by the browser, private mode, device
cleanup, or a site reset. Export important characters and homebrew data regularly.

Some features contact third-party services:

- Hugging Face hosts the optional speech-to-text model.
- 5e.tools hosts compendium images.
- YouTube hosts soundboard embeds and thumbnails.

See [PRIVACY.md](PRIVACY.md) for details. The deployed application also provides permanent
privacy, external-connections, terms, and licensing pages under `/legal`.

## Browser support

The current desktop versions of Chrome, Edge, and Firefox are the primary targets. Mobile
layouts are tested in Chromium. Speech transcription requires microphone permission and
browser APIs for audio recording and processing.

## Development

Requirements:

- Node.js 22.23.1 or a compatible Node 22 release
- npm 11.6.2

```bash
npm ci
npm run dev
```

The development server is available at `http://localhost:5173`.

New interfaces should follow [docs/UI_GUIDELINES.md](docs/UI_GUIDELINES.md).

| Command                     | Purpose                                  |
| --------------------------- | ---------------------------------------- |
| `npm run dev`               | Start the development server             |
| `npm run build`             | Type-check and build the production site |
| `npm run preview`           | Preview the production build             |
| `npm run lint`              | Run ESLint                               |
| `npm run format:check`      | Check formatting                         |
| `npm run test`              | Run unit and component tests             |
| `npm run test:coverage:all` | Run unit and browser coverage            |
| `npm run test:e2e`          | Run Playwright tests                     |
| `npm run security:audit`    | Check production dependency advisories   |
| `npm run wiki:build`        | Generate the campaign wiki               |

## Docker and self-hosting

```bash
docker compose up dev
docker compose up web
```

The development container is exposed on port 5173. The production nginx container is
exposed on port 8080 and supports direct navigation to client-side routes.

For deployment below a subpath, set `BASE_PATH` before building. It must include leading
and trailing slashes:

```bash
BASE_PATH=/tools/fumble/ npm run build
```

Serve the contents of `dist` from any static host. Configure unknown paths to return
`index.html` so React Router can handle deep links.

## Content and legal notice

The source code written for Fumble is licensed under the MIT License. Bundled game data,
book text, adventure text, artwork, trademarks, and other third-party materials are not
relicensed under MIT. Their respective owners retain all rights.

Fumble is an unofficial fan project. It is not approved, endorsed, or sponsored by Wizards
of the Coast. Portions of the materials used are property of Wizards of the Coast LLC.
Copyright Wizards of the Coast LLC.

The bundled reference data is derived from the 5e.tools dataset. 5e.tools describes its
service as a digital reference for products users already own. Users and self-hosters are
responsible for accessing and distributing content in accordance with the laws and terms
that apply to them.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before redistributing a build.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for development rules and
[SECURITY.md](SECURITY.md) for vulnerability reporting. General support, accessibility,
and content-reporting information is available in [SUPPORT.md](SUPPORT.md),
[ACCESSIBILITY.md](ACCESSIBILITY.md), and [COPYRIGHT.md](COPYRIGHT.md).

The project and public instance are maintained by
[Krystian Pińczak](https://github.com/PKrystian).

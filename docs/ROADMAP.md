# Fumble - Roadmap & Decisions

This document is the durable record of what Fumble is, the decisions that shape it, and
the order we build it in.

## Vision

Fumble is two products in one static, client-side web app hosted free on GitHub Pages:

1. **A D&D 2024 (5.5e) toolkit** for players and dungeon masters.
2. **A campaign wiki** generated from an external Obsidian vault.

Hard constraints:

- **Zero running cost.** Static hosting on GitHub Pages, no paid backend or servers.
- **Client-side only.** All state lives in the browser (localStorage / IndexedDB).
- **Responsive & accessible.** Desktop, tablet, mobile (left toolbar → burger menu).
- **SEO-friendly**, tested, clean code with minimal comments.

## Locked decisions

| Topic                | Decision                                                                                                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D&D content source   | Bundle the full 5e.tools dataset. Keep it in an isolated, swappable data layer so it can be reduced to SRD-only later without rework.                                                                                                   |
| Session summary      | In-browser local model by default, with an optional bring-your-own API key.                                                                                                                                                             |
| First feature        | Compendium / index.                                                                                                                                                                                                                     |
| Wiki source location | Obsidian vault lives **outside** this repo and is never committed. The build script takes an `--input` path to the vault. We author the Obsidian markdown templates/conventions (frontmatter for secrets, player visibility, map pins). |
| Stack                | React + TypeScript + Tailwind v4 + Vite, Docker, Vitest + Playwright, GitHub Actions.                                                                                                                                                   |

## Build order

- [x] **Phase 0 - Foundations:** scaffold, app shell (sidebar + mobile burger), routing, design
      tokens, testing, Docker, CI, GH Pages deploy, issue/PR templates, SEO base.
- [x] **Phase 1 - Shared core:** realized alongside the character sheet - a serializable D&D 2024
      character model with rules math (`features/character/model.ts`), a `zustand` + `persist`
      store backed by localStorage (`store.ts`), and per-character JSON import/export.
- [x] **Phase 2 - Compendium / index:** searchable reference. (Built before the character sheet
      so the sheet can pull real data.)
  - [x] Data-prep pipeline (`scripts/data/`) reading a pinned 5etools-src checkout, filtering to
        the 5e.tools **"Core/Supplements" source category** (every rulebook in `books.json` -
        core, supplements, and settings; adventures/homebrew excluded). Cleanup: drops unresolved
        `_copy` stubs and empty entries. Every printing is kept, but only the **newest of each
        same-named group** (by publication date) shows in the list; older printings are flagged
        `hidden` and cross-linked from the detail view as **"Other printings"** (e.g. jump from
        the 2024 Fireball to the 2014 one). Ids are de-duplicated with the newest keeping the
        clean slug.
  - [x] Artwork: fluff images (species/classes/items/feats/backgrounds) and monster tokens are
        attached from the 5etools fluff data and shown in the detail pane, served from the
        5e.tools image host (`data/compendium/images.ts`) with graceful fallback.
  - [x] Compendium UI: category tabs, search, master/detail, lazy-loaded code-split data, and
        5e.tools-style **filter facets** per category (level/school, CR/type/size, rarity, etc.)
        plus a **Source** filter on every category (`FilterBar.tsx`).
  - [x] `{@tag}` markup + recursive entry renderer, with cross-links between categories.
  - [x] All 14 categories shipped: **species**, **classes**, **backgrounds**, **feats**,
        **options & features**, **spells**, **items**, **bestiary**, **actions**, **conditions**,
        **rules**, **deities**, **hazards**, **boons**.
  - Class pages render the full level-progression table (prof. bonus, features per level,
    class-specific columns, and spell-slot progression) plus features and subclasses resolved
    by level. Items merge base gear and magic items. Bestiary renders full stat blocks.
  - Bestiary is in the compendium because players need it too (Wild Shape, companions,
    Polymorph); the DM screen will reuse this same data.
  - Nothing deferred - the 2024 core knowledge base is complete.
- [x] **Phase 3 - Character sheet.** Roster (create / delete / import / export), full editable
      sheet with live D&D 2024 math: ability scores + modifiers, proficiency bonus, saving throws,
      all 18 skills (none → proficient → expertise), passive senses, AC/initiative/speed, HP with
      heal/damage/temp-HP controls, heroic inspiration, and tabs for Actions, Spells (slots + save
      DC / attack), Inventory, Features, and Notes, plus proficiency/defense/tracking panels.
      Persists to localStorage; responsive desktop/tablet/mobile.
  - The Spells, Inventory, and Features tabs include a **compendium picker**
    (`CompendiumPicker.tsx`) - search and add real spells/items/feats from the compendium
    (free-text entry still works too).
  - A **Rolls tab** rolls d20 ability checks, saving throws, skills, and initiative using the
    character's own modifiers, with advantage/disadvantage and a roll history (reuses the dice
    engine).
- [x] **Phase 4 - Dice roller + initiative tracker.** Dice roller has a tested engine
      (`features/dice/engine.ts`): expression parser (`2d6 + 1d8 + 3`), dice-pool builder,
      advantage/disadvantage on d20s, per-die breakdown, and roll history. Initiative tracker
      (`features/initiative/`) is a localStorage-persisted combatant list sorted by initiative
      with round/turn advancement, editable HP/AC/conditions, and a d20 initiative roll.
- [x] **Phase 5 - DM screen:** **Encounter builder** (`features/dm/`) - party XP budgets from the
      2024 DMG, a bestiary-backed monster picker, CR→XP totals, and a difficulty verdict
      (tested in `xp.test.ts`). **Loot generator** - tier-based coins (via the dice engine), gems,
      and random magic items drawn from the compendium at tier-appropriate rarities. The initiative
      tracker (Phase 4) and the bestiary (in the compendium) round out the DM toolkit.
- [x] **Phase 6 - Session log:** free in-browser voice-to-text via the Web Speech API
      (`features/session-log/speech.ts`), persisted sessions with a live recording timer and
      editable transcript, and one-button summarization. Two summarizers: a tested, offline
      **extractive** summarizer (zero-cost default) and an optional **bring-your-own Anthropic
      key** AI summary (key stored locally, direct browser call).
  - Plus a fully **on-device** AI summary via WebLLM (`webllm.ts`), shown when the browser has
    WebGPU. The library and model are lazy-loaded on first use (~6 MB JS chunk + a one-time
    ~1 GB model download, both cached) so they never affect initial page load.
- [x] **Phase 7 - Soundboard.** A grid of YouTube tiles (thumbnail + name) that play in a single
      looping embedded player. Users add their own tracks by pasting a link + custom name (tested
      URL parser in `youtube.ts` handles watch/short/embed/shorts/bare-id), drag tiles to reorder
      (`reorder` helper is unit-tested), remove tiles, and reset to defaults. Ships with a starter
      list; everything persists to localStorage. Default links are placeholders pointing at the
      sample video - replace them with real ambience playlists.
- [x] **Phase 8 - Wiki generator:** `npm run wiki:build -- --input <vault>` reads an external
      Obsidian vault and writes a player-facing wiki to `src/data/generated/wiki.json` (+ assets
      to `public/wiki-assets/`), rendered in-app at `/wiki`.
  - DM-only pages (`visibility: dm` / `publish: false`) are never built; `:::secret` blocks are
    removed and `:::locked` blocks become "Not yet unlocked" placeholders.
  - Wikilinks `[[Page|alias]]` become in-app navigation (unknown/hidden targets degrade to plain
    text); image embeds `![[file]]` are copied and resolved. Both a simple `fumble-map` block and
    the **native Obsidian `leaflet` plugin block** render an image with player-visible pins
    (markers tagged `dm` are hidden); leaflet pixel coordinates are converted using the real image
    dimensions (`scripts/wiki/imageSize.ts`).
  - Transforms are unit-tested (`features/wiki/transform.test.ts`); authoring guide in
    `docs/wiki-templates.md`; runnable demo in `wiki-example/`.
  - **Incremental builds**: unchanged pages are reused from a content-hash cache
    (`.cache/wiki-cache.json`); the cache is invalidated when the set of pages changes (so
    links stay correct). Pass `--force` to rebuild everything.
- [x] **Phase 9 - Wiki infoboxes & templates.** Frontmatter (`type`, `image`, `summary`, `tags`,
      a nested `facts` map) renders a floated, Wikipedia-style infobox at the top of a page; a
      `fumble-box` fenced block renders the same style of card anywhere in the body. Fact values
      may contain `[[wikilinks]]`, resolved the same as body links.
  - A `wiki-templates/` folder ships ready-to-copy starter notes for Character, Location, Item,
    Quest, Faction, Event, and Session Recap pages, each pre-filled with a practical `facts` set.
  - The CLI (`scripts/wiki/build.ts`) now prompts for a vault path when run interactively with no
    `--input`/`WIKI_VAULT`, supports `--watch` to rebuild on save, and prints validation warnings
    for unknown frontmatter keys, broken `[[links]]`, and missing images.

## Open questions / notes

- Soundboard will embed YouTube ambience playlists via the IFrame API (playlist IDs TBD).
- Legal note: the full 5e.tools dataset includes copyrighted, non-SRD content. The data layer
  is intentionally isolated so a switch to SRD-only is low-effort if ever required.

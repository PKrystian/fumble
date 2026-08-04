# Fumble Wiki - Obsidian Authoring Guide

Write your campaigns in any Obsidian vault, then build the **player-facing** wiki from it.
Your vault stays outside this repo and is never committed - only the sanitized output is.

```bash
npm run wiki:build -- --input "C:/path/to/your/Vault" [--watch] [--force]
```

The first-level folders inside the input become campaigns. For example:

```text
Fumble-Vault/
  Głód Smoka/
  Grobowiec Zagłady/
  .obsidian/
  .git/
```

The last two folders are ignored automatically. The `_dm` folder is also ignored by
default, including all of its subfolders. Use `--ignore folder-name` more than once or set
`WIKI_IGNORE_DIRECTORIES=folder-name,another-folder` to add private folders. If the input
folder contains Markdown files directly, the input itself is treated as one campaign.

If you omit `--input`, Fumble checks the `WIKI_VAULT` env var, then - if you're running it
interactively - asks for the path. Non-interactive runs (CI) fall back to the bundled
`wiki-example/` demo vault.

- `--watch` rebuilds automatically whenever a file in the vault changes. Stop with Ctrl+C.
- `--force` ignores the incremental cache and rebuilds every page from scratch.

This regenerates `src/data/generated/wiki.json` and copies referenced images to
`public/wiki-assets/<campaign-id>/`. Commit both so they deploy. A full working example lives in
[`wiki-example/`](../wiki-example); ready-to-copy starter notes for every page type below live
in [`wiki-templates/`](../wiki-templates).

## Campaign maps

Campaign maps are separate read-only application views inside the selected campaign. The
Chult map uses `public/campaign-maps/chultmap.jpg` and the committed revealed-hex ranges in
`src/features/campaign-map/maps.ts`. Update those ranges in the repo and rebuild the site to
publish a new player-facing map state. Production does not contain an uncover control or a
map-state save in local storage.

The Chult map has 72 columns and 85 rows. Hex indexes start at zero in the top-left corner and
run left to right, then top to bottom. The index for a cell is `row * 72 + column`. The
`revealedRanges` list accepts one index such as `1762` or an inclusive range such as `1765-1828`.
Remove an index or range to hide those hexes again. Values outside `0-6119` are ignored. Keep the
list as revealed cells only, then run `npm run build` before publishing. Players can use the map
control to show or hide thin hex edges over revealed cells when they need to count travel distance.
The white parchment masks for hidden cells are not affected by this control.

When running the local Vite development server, open the Chult map and choose `Edit revealed
hexes`. Click any hex to toggle it, then use `Copy ranges` to copy the generated
`revealedRanges` block into `maps.ts`. The draft is saved under a campaign-specific local
storage key so the map can be refreshed while editing. `Reset local changes` returns to the
committed ranges. The editor is disabled from production builds.

Every build prints a summary and any validation warnings - unknown frontmatter keys, `[[links]]`
that don't resolve to any page (typos, not intentionally DM-hidden links, which stay silent),
and image references with no matching file. A clean build prints "No issues found."

Builds are **incremental** - only changed pages are re-rendered (the rest come from a local
cache). Add `--force` to rebuild everything from scratch.

## Page frontmatter

Every note may begin with a YAML-ish frontmatter block (a small documented subset, not full
YAML - see the field reference below for what each key does):

```markdown
---
title: Silverhaven # display title (defaults to the file name)
category: Locations # sidebar grouping (defaults to the top folder)
visibility: player # "player" (default) or "dm"
publish: true # set false to exclude this page
type: location # free-form; documents the page kind, no enforced list
image: silverhaven.svg # infobox avatar/cover, resolved like an image embed
summary: A bustling port city on the Argent Coast. # infobox subtitle
tags: [city, coastal] # inline array, shown as-is; useful for your own search/organizing
facts: # nested map -> infobox facts table
  Region: The Argent Coast
  Population: ~4,000
---
```

- **`visibility: dm`** or **`publish: false`** → the page is **never built**. DM-only notes
  simply stay in your vault.
- `type`, `tags`, `image`, `summary`, and `facts` are all optional - a page with none of them
  renders exactly like before, with no infobox.

## Infoboxes

Any page with an `image`, `summary`, and/or `facts` in its frontmatter gets a Wikipedia-style
infobox: a card floated at the top of the article with an avatar, a one-line summary, and a
table of facts. Fact values may themselves contain `[[wikilinks]]`, resolved exactly like links
in the body - a `facts` entry like `Home: "[[Silverhaven]]"` renders as a clickable link.

A page with none of `image`/`summary`/`facts` gets no infobox at all - it's opt-in per page.

> **Everything in the infobox is player-visible.** Keep `facts` to in-world details a
> character could observe or ask about (occupation, home, affiliation). Metagame info -
> alignment, exact class/level, whether an NPC is secretly a villain, whether they're alive -
> belongs in a `:::secret` block instead, so it never reaches players. See the
> [`Character.md` template](../wiki-templates/Character.md) for the pattern.

## Ad-hoc fact cards: `fumble-box`

Need a second card partway through a page (a stat block, a quick-reference table) instead of -
or in addition to - the page-level infobox? Drop a `fumble-box` fenced block anywhere in the
body. It renders with the same styling as the infobox:

````markdown
```fumble-box
title: Quick Stats
Str: 18 (+4)
Dex: 12 (+1)
Passive Perception: 15
```
````

`title` and `image` are optional special keys; every other `Key: Value` line becomes a row in
the facts table, and values may contain `[[wikilinks]]` too.

## Hiding parts of a page

Use fenced container blocks for content players shouldn't see yet. This is the key feature:
one page can hold both player lore and your private notes.

```markdown
:::secret
Removed entirely - players see nothing here. Use for pure DM notes.
:::

:::locked
Replaced with a "Not yet unlocked" placeholder, so players know there's more to learn.
:::
```

Obsidian's own `%% comment %%` syntax is also non-rendered in Obsidian, but Fumble keys off
the explicit `:::secret` / `:::locked` blocks above.

## Links between pages

Standard Obsidian wikilinks work and become in-app navigation:

```markdown
[[Silverhaven]] → links to the Silverhaven page
[[Silverhaven|the port city]] → custom link text
```

Links to DM-only or non-existent pages automatically degrade to plain text, so hidden pages
never leak as broken links.

## Images

Use Obsidian image embeds. The file is copied into the wiki automatically:

```markdown
![[silverhaven.svg]]
![[silverhaven.svg|Silverhaven harbor at dusk]] (with alt text)
```

## Maps with pins

Drop a `fumble-map` fenced block. Coordinates are **percentages** (0-100) of the image.
Add `dm` to any marker to hide it from players (your secret locations stay secret).

````markdown
```fumble-map
image: world.svg
marker: 28,38 | Silverhaven | [[Silverhaven]]
marker: 64,58 | Sunken Temple | [[The Sunken Temple]]
marker: 82,22 | The Black Citadel | dm
```
````

Each marker is `x,y | Label | target`. The target is optional and may be a `[[wikilink]]`
or an `https://` URL.

### Native Obsidian leaflet blocks

If you already use the **Obsidian leaflet plugin**, its blocks work directly - coordinates are
image pixels (leaflet's bottom-left origin) and are converted automatically using the image's
real dimensions. Tag a marker's **type** as `dm` to hide it from players:

````markdown
```leaflet
image: [[world.svg]]
marker: default, 310, 224, [[Silverhaven]]
marker: dm, 460, 640, [[Secret Lair]]
```
````

## Starter templates

The [`wiki-templates/`](../wiki-templates) folder has one ready-to-copy note per page type -
just drop the file into your vault and fill it in. Each comes with a practical `facts` set,
a `:::locked`/`:::secret` example, and (where it makes sense) a sample `fumble-box`:

| Template                                               | Suggested `facts` fields                         |
| ------------------------------------------------------ | ------------------------------------------------ |
| [`Character.md`](../wiki-templates/Character.md)       | Race, Occupation, Home, Affiliation              |
| [`Location.md`](../wiki-templates/Location.md)         | Region, Population, Government, Danger Level     |
| [`Item.md`](../wiki-templates/Item.md)                 | Rarity, Attunement, Type, Owner, Origin          |
| [`Quest.md`](../wiki-templates/Quest.md)               | Status, Giver, Reward, Location, Deadline        |
| [`Faction.md`](../wiki-templates/Faction.md)           | Leader, Headquarters, Alignment, Goals, Allies   |
| [`Event.md`](../wiki-templates/Event.md)               | Date, Era, Participants, Location, Consequences  |
| [`SessionRecap.md`](../wiki-templates/SessionRecap.md) | Session, Date, Party, Location                   |
| [`Deity.md`](../wiki-templates/Deity.md)               | Domain, Alignment, Symbol, Worshippers, Holy Day |
| [`Creature.md`](../wiki-templates/Creature.md)         | Type, Size, Habitat, Threat, First Sighted       |
| [`Species.md`](../wiki-templates/Species.md)           | Homeland, Lifespan, Language, Typical Build      |

These field names aren't enforced by the build - `facts` is a free-form map, so add, remove, or
rename rows however fits your campaign. The bundled [`wiki-example/`](../wiki-example) vault has
a fully cross-linked page of each type (Mira Voss, Silverhaven, the Tideglass Lantern, the Night
Ledger quest, the Harbor Guild, Ymara, the Harbor Drake, the Sundering Tide, and a session
recap), so you can see them all rendered together. A minimal page with no infobox still works:

```markdown
---
title:
category:
visibility: player
---

Intro paragraph visible to players.

## Section

Details…

:::locked
Hint that there's more to discover here.
:::

:::secret
Your private DM notes for this location.
:::
```

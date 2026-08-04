# Changelog

All notable user-facing changes will be recorded here.

This project follows Semantic Versioning.

## 1.2.18 - 2026-08-04

- Fixed the Polish Druid name casing.
- Hid sidekick classes and Fighting Style options by default, with filters to reveal them.
- Removed the Books link from the compendium category tags.

## 1.2.17 - 2026-08-04

- Fixed the player-facing revealed-area hex grid so it renders complete hex outlines.

## 1.2.16 - 2026-08-04

- Replaced the Chult map artwork and added a player-facing toggle for the revealed-area hex grid.

## 1.2.15 - 2026-08-04

- Added a local-only Chult hex editor with browser storage and copyable revealed ranges.

## 1.2.14 - 2026-08-04

- Styled hidden Chult hexes with opaque parchment fills and visible dark borders to match the reference map.

## 1.2.13 - 2026-08-04

- Removed the campaign chooser description and the redundant wiki page header.
- Added wiki breadcrumbs and interactive Chult map zoom, reset, wheel, and drag controls.
- Fixed map mask gaps and corrected the final revealed-cell range.
- Documented the zero-based Chult hex index used to reveal or hide cells in the repository.

## 1.2.12 - 2026-08-04

- Removed release and reveal status text from the player map view.
- Made the full map responsive without an internal scroll area.
- Restored opaque masks for unrevealed hexes.

## 1.2.11 - 2026-08-04

- Added campaign selection and nested campaign navigation to the Obsidian wiki.
- Added configurable ignored vault folders with `_dm` ignored by default.
- Added a responsive, read-only Chult hex map whose revealed state is versioned in the repository.
- Improved wiki category hierarchy and page counts in the sidebar.
- Fixed Polish diacritics in wiki slugs.

## 1.2.10 - 2026-08-03

- Updated the transitive brace-expansion dependency to 5.0.9 to address a high-severity denial-of-service advisory.

## 1.2.9 - 2026-08-03

- Fixed compendium result links dropping the active search query on mobile.

## 1.2.8 - 2026-08-03

- Remembered the selected interface language when returning to the home page.
- Added prerendered alternate language links for English, Polish, and the default locale.

## 1.2.7 - 2026-08-03

- Expanded automated tests to cover all application statements, branches, functions, and lines.
- Documented the complete coverage expectation for new features while retaining the 95 percent CI minimum.

## 1.2.6 - 2026-08-03

- Raised combined unit and end-to-end coverage thresholds to 99 percent.
- Added tests for previously uncovered application branches and data flows.

## 1.2.5 - 2026-08-03

- Fixed additional English fragments in Polish adventure and book data.
- Localized labels generated while importing 5etools homebrew content in Polish mode.

## 1.2.4 - 2026-08-03

- Completed Polish localization for interface text, compendium data, and additional materials.

## 1.2.3 - 2026-08-03

- Completed Polish localization for generated source, creature, book, and storyline data.
- Localized remaining interface fallbacks, session log prompts, wiki placeholders, and built-in soundboard names.
- Fixed loot generation and armor class detection for localized Polish data.

## 1.2.2 - 2026-08-02

- Added a complete Polish translation overlay for Tomb of Annihilation.
- Added Polish translation overlays for all remaining books and adventures, ordered from newest to oldest.
- Completed Polish coverage for static compendium data, including classes, species, spells, items, creatures, sources, and equipment.

## 1.2.1 - 2026-08-02

- Added a PNG favicon fallback for browsers and search results.
- Removed the opaque background from the Fumble app icons.

## 1.2.0 - 2026-08-01

- Fixed the Chromium smoke test so its footer version assertion follows `package.json`.
- Verified the release with the full unit test suite, build validation, security audit,
  and Chromium smoke suite.

## 1.1.0 - 2026-08-01

- Completed the 5etools data import update with weapon mastery, weapon property,
  localized name, and monster feature source fixes.
- Updated the displayed application version to 1.1.0.

## 1.0.0 - 2026-07-29

- Prepared repository documentation, security policy, privacy notice, and third-party
  notices for the first public release.
- Made GitHub Pages deployment depend on successful verification and browser tests.
- Separated application build configuration from unit test configuration.
- Added static discovery pages, canonical metadata, hreflang, structured data, sitemap,
  `robots.txt`, `llms.txt`, and social preview metadata.
- Added the custom `fumble.krystianpinczak.com` domain configuration.
- Added owner, support, accessibility, security, and content-removal channels.
- Added CodeQL scanning and a CycloneDX software bill of materials to CI.
- Added the XDMG Weapon of Warning to the item compendium with a Polish translation.
- Improved global and compendium search for English names in Polish content and
  diacritic-free Polish queries.
- Imported all 214 magic variants from 5etools, including their original variant data.
- Added compendium categories for psionics, encounter tables, loot tables, life tables,
  names, monster features, and homecrafts.
- Added Polish overlays for every entry in the new 5etools categories, including nested
  tables and descriptions.
- Fixed source data rendering for rollable tables, psionic modes, life trinkets, and
  anonymous dragon loot rows while preserving dice notation and 5etools references.
- Rendered nested dragon loot tables and craft measurements as readable tables and
  localized fields, and preserved canonical crochet abbreviations in Polish overlays.
- Preserved all 95 weapon mastery assignments and 306 weapon property references from
  5etools, with localized descriptions for weapon properties and mastery rules.
- Localized race names in the names compendium and mapped monster features to their
  Dungeon Master's Guide source.

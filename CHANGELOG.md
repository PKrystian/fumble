# Changelog

All notable user-facing changes will be recorded here.

This project follows Semantic Versioning.

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

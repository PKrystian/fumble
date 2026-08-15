# Changelog

All notable user-facing changes will be recorded here.

This project follows Semantic Versioning.

## 1.2.105 - 2026-08-15

- Updated lucide-react and eight compatible development dependencies from the requested dependency updates.
- Kept TypeScript 6 because the requested TypeScript 7 update is incompatible with typescript-eslint and the current compiler configuration.

## 1.2.104 - 2026-08-15

- Fixed an ESLint parser stack overflow caused by the Polish markup localization rules.

## 1.2.103 - 2026-08-15

- Continued the Polish translation audit across compendium content, books, homebrew, and soundboard entries.
- Corrected residual headings, creature and damage labels, recipe units, tools and treasure fields, and book navigation names.
- Fixed remaining English dice-pattern labels and display-only table references without changing technical link targets.

## 1.2.102 - 2026-08-14

- Completed another Polish translation audit across compendium data, homebrew content, and generated tables.
- Corrected residual English labels, creature names, species terminology, title fragments, units, and tag display text without changing reference targets.

## 1.2.101 - 2026-08-14

- Audited and corrected Polish UI, compendium metadata, homebrew content, and remaining translation terminology.
- Standardized creature, damage, item, spell, hazard, vehicle, language, and rules metadata in Polish.

## 1.2.100 - 2026-08-14

- Standardized Polish creature-type and damage-type names across compendium data, tables, books, and adventures.
- Corrected Force to Moc, Lightning to Piorun, Radiant to Promieniste, Thunder to Gromu, and related damage phrases.

## 1.2.99 - 2026-08-14

- Standardized Polish translations of fiend as czart across compendium data, books, adventures, items, spells, and markup labels.

## 1.2.98 - 2026-08-14

- Corrected Polish creature identities for goblins, hobgoblins, zombies, pixies, and bugbears.
- Fixed the same mistranslations in Polish books, adventures, and encounter tables.

## 1.2.97 - 2026-08-14

- Filled missing Polish translations in compendium entries, Fumble data, books, and adventures.
- Added missing hag lair actions, regional effects, language speakers, item lore, and storyline labels.

## 1.2.96 - 2026-08-11

- Expanded speed formatter coverage for imported 5etools movement data.

## 1.2.95 - 2026-08-11

- Stabilized legal-page E2E coverage around the remembered language preference.

## 1.2.94 - 2026-08-11

- Applied the remembered language preference to every route.
- Added Polish overlays for all newly imported 5etools compendium entries.

## 1.2.93 - 2026-08-11

- Imported 5etools copy-based records across the compendium, including adventure NPCs.
- Preserved newer conditional movement data from 5etools.

## 1.2.92 - 2026-08-10

- Restored direct compendium image URLs after removing Cloudflare Image Transformations.

## 1.2.91 - 2026-08-10

- Fixed Polish compendium labels, data values, book labels, and localized loot links.
- Added SEO validation for every generated page and limited descriptions to 160 characters.

## 1.2.90 - 2026-08-10

- Indexed distinct older and newer compendium printings while keeping library filtering unchanged.

## 1.2.89 - 2026-08-10

- Fixed Polish SEO locale metadata after client-side language switches.
- Revealed the interactive compendium landing page after prerender hydration.
- Corrected duplicate Eberron and Witchlight chapter names in the reader and SEO output.

## 1.2.88 - 2026-08-10

- Improved book chapter prerendering and excluded credits-only chapters from search indexes to prevent soft 404 reports.

## 1.2.87 - 2026-08-10

- Generated working static pages for every older compendium printing and redirected the renamed Mwaxanar route.

## 1.2.86 - 2026-08-09

- Replaced regex-based script filtering in the generated 404 document with boundary-aware HTML scanning.

## 1.2.85 - 2026-08-09

- Hardened the generated 404 document by removing all script elements and validating that none remain.

## 1.2.84 - 2026-08-09

- Fixed Polish subclass identity mapping, including duplicated-source class routes.
- Improved 5etools markup rendering for book links, feature labels, skill checks, units, external links, and hit or miss markers.
- Added localized static book content, safer sitemap alternates, social images, and a redirect for the known legacy item URL.
- Removed canonical and hreflang metadata from noindex routes and rendered long compendium lists in batches.

## 1.2.83 - 2026-08-09

- Prevented private tools, unresolved routes, failed data loads, and untranslated duplicate pages from being indexable.
- Added a dedicated noindex GitHub Pages 404 document, safer sitemap alternates, retry controls, cache recovery, and local-storage error handling.
- Reduced the static search index, avoided rendering the editor grid for public maps, improved clipboard and random loot handling, and added keyboard support for listbox controls.
- Split i18n path utilities to remove Fast Refresh warnings, pinned CI to Node 22.23.1, and updated DOMPurify to 3.4.13 and React Router to 7.18.2.

## 1.2.82 - 2026-08-09

- Fixed localized subclass route generation when several subclasses share a source.
- Marked query variants and unresolved compendium or book routes as non-indexable.
- Added static route validation so sitemap URLs must have generated HTML files.

## 1.2.81 - 2026-08-09

- Audited compendium, book, wiki, and dictionary references across the application and prevented unresolved targets from becoming broken links.
- Added global reference and wiki-link validation to the local CI checks.

## 1.2.80 - 2026-08-09

- Fixed broken Fumble compendium references and added a reference validation check.

## 1.2.79 - 2026-08-09

- Rendered the Witch GM guidance as a dedicated sidebar note.

## 1.2.78 - 2026-08-09

- Kept the reading position while switching class subclasses.
- Stabilized filter option order so selecting a value only changes its active styling.

## 1.2.77 - 2026-08-09

- Reset the compendium scroll position when opening a record so its details start at the top on desktop and mobile.

## 1.2.76 - 2026-08-09

- Unified search focus styling so rounded search containers receive the focus highlight instead of inner rectangular outlines.

## 1.2.75 - 2026-08-09

- Unified the Fumble homebrew header controls with the shared button height, typography, spacing, and alignment.

## 1.2.74 - 2026-08-09

- Added a persistent Fumble Compendium visibility editor for campaign and content type selection.
- Kept direct Fumble links available when their campaign or content type is filtered out.

## 1.2.73 - 2026-08-09

- Added the translated Talent and Apothecary classes, subclasses, powers, theories, spells, items, feats, actions, and related creatures for Seven Fugitives and Border Wanderers.
- Added psionic and action interlinks, campaign-aware filters, spell class assignments, and Polish reference preservation for the new content.

## 1.2.72 - 2026-08-09

- Documented the complete CI checklist and added a local `verify:ci` command.

## 1.2.71 - 2026-08-09

- Made compendium reference previews usable after direct interaction on touch devices.
- Stabilized the Chult map navigation check by targeting its concrete route.

## 1.2.70 - 2026-08-09

- Patched transitive `js-yaml` and `nanoid` vulnerabilities so the security audit passes.

## 1.2.69 - 2026-08-08

- Moved Fumble firearms, ammunition effects, grenades, sprays, and modifications into their own Compendium category.

## 1.2.68 - 2026-08-08

- Assigned Fumble content to the five campaign filters and moved firearm content to Seven Fugitives and Border Wanderers.
- Added the option to administer a healing potion to a nearby creature with the Utilize Action.

## 1.2.67 - 2026-08-08

- Corrected the Wooden Warforged creature type and kept Spiryknot as a Construct.
- Fixed Mire Arsenal links and removed the duplicate document scrollbar from long pages.

## 1.2.66 - 2026-08-08

- Added Mire Arsenal firearms, ammunition effects, grenades, sprays, and weapon modifications.
- Corrected Fumble feats against the Staring flaws source and removed duplicate taboo and healing entries.

## 1.2.65 - 2026-08-08

- Classified Oathbreaker as public UA content and completed the Fumble lineage catalog with Diurnal Moth.

## 1.2.64 - 2026-08-08

- Made Oathbreaker (UA) visible in Paladin subclass lists for every user and corrected its Polish name to Wiarołomca.

## 1.2.63 - 2026-08-08

- Added the translated Oathbreaker (UA) Paladin subclass and campaign tags for Fumble homebrew entries, including URL-persisted campaign filtering.

## 1.2.62 - 2026-08-08

- Fixed the Great Serpent Warlock's Strange Gifts to grant one chosen mutation and linked the related subclass rules more clearly.
- Restored omitted details in the Serpent subclasses, including the eye ritual, Yuan-ti option, spell-slot note, and Sap mastery link.

## 1.2.61 - 2026-08-08

- Persisted Fumble homebrew search and category filters in the URL so browser history restores the selected view.

## 1.2.60 - 2026-08-08

- Removed the remaining Fumble homebrew note about Compendium links from the library page.

## 1.2.59 - 2026-08-08

- Matched the Fumble Witch detail header to other class entries and shortened the Fumble homebrew search label.
- Removed redundant Fumble homebrew descriptions from the library page.
- Added hover previews for Fumble and personal homebrew references.

## 1.2.58 - 2026-08-08

- Normalized localized compendium filter values so class, school, item type, rarity, and property facets no longer show duplicate labels.
- Fixed the All and Clear facet actions to update every visible option in one operation.
- Added regression coverage for localized values and bulk filter actions.

## 1.2.57 - 2026-08-08

- Linked spell classes and subclasses to their compendium pages in English and Polish.
- Added class links to item attunement requirements and other prerequisite metadata.
- Preserved English spell references so translated names still resolve to stable subclass routes.

## 1.2.56 - 2026-08-08

- Added the Zerth Warriors' 17th-level features in English and Polish with linked spell references.
- Moved selected subclass lore and artwork into the subclass's first feature level and added shareable subclass routes with SEO and sitemap entries.
- Fixed localized spell subclass metadata so details and filters no longer render `[object Object]`.

## 1.2.55 - 2026-08-08

- Reworked Crystal of Possibilities as a structured artifact with official-style sections, tables, and linked references.
- Corrected mode placement so destructive spells are in Destruction, creation effects are in Creation, creature transformations are in Transformation, and Time Ravage is a Time Changer critical failure in both languages.
- Clarified high-DC risks, failures, and critical failures in English and Polish.

## 1.2.54 - 2026-08-08

- Removed the redundant Witch spell table while keeping its 195-spell class filter list.
- Changed the Witch class list tag to show Hit Die d8 and localized the Polish tag.
- Added Polish Witch spell filtering for official and Fumble spells.

## 1.2.53 - 2026-08-08

- Improved the Witch data with linked spells and magic items.
- Added 13 Witch spells, 9 magic items, and the Allied Hunter stat block with Polish localization.
- Added Polish data for Great Serpent, Serpent Bloodline, and Zerth Warrior.
- Removed Apothecary from the Fumble homebrew catalog.

## 1.2.52 - 2026-08-07

- Added complete Polish translations for the Witch and Apothecary classes, including tables, features, lore, and subclasses.

## 1.2.51 - 2026-08-07

- Added 5eTools subclass artwork to normalized class data and localized overlays.
- Added the supplied Fumble artwork to classes, subclasses, and selected items.
- Displayed selected subclass artwork in the class detail view.

## 1.2.50 - 2026-08-07

- Separated class introductions from lore so Apothecary and Witch descriptions are not duplicated.
- Removed the redundant core trait tables from Fumble class lore.
- Added Fumble subclasses to their parent class selectors with direct links that preselect the subclass.

## 1.2.49 - 2026-08-07

- Reworked Fumble homebrew data into structured JSON with compendium-style sections, tables, and links.
- Preserved class progression and rendered Witch, Apothecary, and standalone subclasses as class records.
- Expanded Crystal of Possibilities and the other supplied items, feats, species, and campaign rules.

## 1.2.48 - 2026-08-06

- Rebuilt Fumble homebrew records from the supplied source material and classified subclasses under Classes.

## 1.2.47 - 2026-08-06

- Moved the Fumble homebrew library to Campaign navigation and split its catalog into localized JSON files.

## 1.2.46 - 2026-08-06

- Added a curated Fumble homebrew library with localized Compendium links and opt-in visibility.

## 1.2.45 - 2026-08-06

- Fixed stale GitHub Pages cleanup to use documented deployment status endpoints.

## 1.2.44 - 2026-08-06

- Cleared stale GitHub Pages deployments before publishing a new site.

## 1.2.43 - 2026-08-06

- Compressed book data in the GitHub Pages artifact to prevent deployment timeouts.

## 1.2.42 - 2026-08-06

- Serialized GitHub Pages deployments so active production deploys are not cancelled.

## 1.2.41 - 2026-08-06

- Made the character sheet action bar responsive on mobile screens.

## 1.2.40 - 2026-08-06

- Improved the mobile character list layout and kept character deletion available without hover.

## 1.2.39 - 2026-08-06

- Shortened the footer issue-reporting link label.

## 1.2.38 - 2026-08-06

- Linked the footer version to the GitHub changelog and added a direct issue-reporting link.

## 1.2.37 - 2026-08-05

- Offloaded Bestiary JSON parsing, reduced its responsive artwork requests, and improved secondary text contrast.

## 1.2.36 - 2026-08-05

- Reserved primary image dimensions and revealed the interactive app only after prerendered content was ready to prevent layout shifts.

## 1.2.35 - 2026-08-05

- Kept prerendered detail-page content visible until the interactive page and its primary image are ready.
- Reduced the transformed primary image width to match its displayed size on mobile.

## 1.2.34 - 2026-08-05

- Validated image-host preconnects on every compendium image page instead of a text-only sample page.

## 1.2.33 - 2026-08-05

- Preloaded compendium route chunks and category data to shorten the critical request chain.

## 1.2.32 - 2026-08-05

- Reduced transformed image variants to 480 pixels for faster detail-page delivery.
- Added prerendered image markup to warm decoding before the interactive app loads.
- Removed unused direct image-host preconnects when Cloudflare transformations are enabled.

## 1.2.31 - 2026-08-05

- Hardened release CSP validation to match exact source origins instead of URL substrings.

## 1.2.30 - 2026-08-05

- Fixed constrained artwork stretching its border across the full detail panel after loading.
- Kept image sizing controlled by responsive CSS instead of mutating natural dimensions at runtime.

## 1.2.29 - 2026-08-05

- Applied image loading, transformation, and dimension handling across the public site.
- Added image preloads for compendium, book, wiki, and campaign map pages.
- Validated every generated compendium image preload instead of one sample entry.
- Removed nested table controls that caused browser hydration errors in book content.

## 1.2.28 - 2026-08-05

- Improved compendium image discovery and layout stability for the primary detail artwork.
- Fixed the class detail heading hierarchy, select labeling, and Cloudflare Web Analytics CSP compatibility.
- Added opt-in Cloudflare image transformations for smaller responsive compendium artwork.

## 1.2.27 - 2026-08-05

- Added localized metadata and structured data across public tools, books, maps, and wiki pages.
- Marked local data and session pages as noindex and excluded them from sitemap discovery.

## 1.2.26 - 2026-08-05

- Extended localized SEO metadata to every compendium category and entry.
- Added collection and website structured data and removed duplicate social metadata.

## 1.2.25 - 2026-08-05

- Improved compendium SEO metadata, prerendered descriptions, structured data, and Artificer page content.
- Reduced layout shift on compendium detail pages and prioritized above-the-fold artwork.

## 1.2.24 - 2026-08-05

- Fixed release URL validation so lookalike external hosts are rejected.
- Sanitized image object URLs before rendering uploaded artwork.

## 1.2.23 - 2026-08-05

- Stabilized the generated wiki import error test under coverage runs.

## 1.2.22 - 2026-08-05

- Kept campaign map tests fast and stable on CI with a focused map fixture.

## 1.2.21 - 2026-08-05

- Optimized Chult map rendering to keep campaign map tests and interactions responsive.

## 1.2.20 - 2026-08-05

- Fixed the development dependency peer conflict between TypeScript and typescript-eslint.

## 1.2.19 - 2026-08-05

- Fixed clean dependency installs by synchronizing the npm lockfile with Tailwind's bundled WASI dependencies.

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

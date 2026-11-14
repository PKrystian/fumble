# Fumble UI guidelines

This document defines the visual and interaction rules for new features. Use the shared
components in `src/features/ui/primitives.tsx` and the helpers in
`src/features/ui/styles.ts` before adding local Tailwind class sets.

## Core principles

- Familiar actions must look and behave the same on every page.
- Controls must have visible hover, keyboard focus, disabled, and selected states.
- Primary actions are rare. A page or panel normally has one primary action.
- Destructive actions must use the danger variant and require confirmation when data can
  be lost.
- Do not encode meaning with color alone. Use text, an icon, `aria-pressed`, or another
  semantic state as well.
- Keep controls usable at 200 percent zoom and on a 320 px wide viewport.
- All user-facing text belongs in both translation dictionaries.

## Shared components

Import controls from `@/features/ui/primitives`.
Import `inputClass`, `panelClass`, and link-compatible style helpers from
`@/features/ui/styles`.

### Button

Use `Button` for actions.

| Variant     | Use                                               |
| ----------- | ------------------------------------------------- |
| `primary`   | The main action, such as save, create, or roll    |
| `secondary` | Normal actions, such as import, edit, or apply    |
| `danger`    | Delete, replace, clear all, or another risky step |
| `success`   | A positive state change, such as healing          |
| `ghost`     | Low-priority toolbar and inline actions           |

Sizes are `sm`, `md`, and `lg`. The default is `md`. Use `IconButton` for an action that
contains only an icon. Always provide its `label` prop.

```tsx
<Button variant="primary" onClick={save}>
  <Save size={16} aria-hidden="true" />
  {t('common.save')}
</Button>

<IconButton label={t('common.close')} variant="ghost" onClick={close}>
  <X size={16} aria-hidden="true" />
</IconButton>
```

Do not create a new set of border, background, hover, focus, padding, and disabled classes
for a normal button. Add a shared variant only when the action has a recurring semantic
role that the existing variants cannot express.

### Fields

Use `TextInput` for text and number fields, `Select` for native select controls, and
`inputClass()` for a textarea or a specialized native control.

Every field needs a visible label. A visually hidden label is acceptable for search when
the surrounding context and placeholder are clear. Place help text below the control and
associate validation errors with `aria-describedby`.

Fields use a 40 px default height, an `ink-950` background, an `ink-600` border, and an
`arcane-500` focus border. Do not use a different field height on the same toolbar.

Single-choice dropdowns use the shared chevron, inset 12 px from the right border,
with 40 px of reserved end padding so text never touches the icon. Apply this to all
native dropdowns, including compact controls. Preserve native list boxes and the
browser indicator in forced-colors mode.

### Search

Use `SearchField` for every standard search box. It provides the same search icon, border,
focus treatment, spacing, and optional clear action.

```tsx
<SearchField
  value={query}
  onChange={(event) => setQuery(event.target.value)}
  onClear={() => setQuery('')}
  label={t('search.title')}
  clearLabel={t('common.clearSearch')}
  placeholder={t('search.placeholder')}
/>
```

Search behavior:

- Update results as the user types.
- Ignore leading and trailing whitespace when matching.
- Make matching case-insensitive unless the feature has a documented reason not to.
- Show a clear action only when the query is not empty.
- Preserve the query in the URL on browsable collections such as books and compendium
  categories.
- Keep keyboard navigation in command palettes. Standard list searches do not capture
  arrow keys.
- Show an explicit empty state when there are no matches.

### Filters and selection

Use `ToggleChip` for compact filters and mode selection. Use `toggleChipClass()` when the
interactive element must be a `Link`.

Every toggle must expose its state with `aria-pressed` or `aria-selected`. Selected chips
use the arcane color. Unselected chips use the neutral ink color. Do not invent a second
selected color for a normal filter.

Filter behavior:

- Multiple values within one facet use OR logic.
- Different facets use AND logic.
- A filter toolbar shows the active count when filters are hidden in a dialog.
- A reset action appears only when there is something to reset.
- Resetting filters does not clear the search query unless the action explicitly says it
  clears all search options.
- Sorting is independent from filtering and remains stable when filters change.
- Filter and sort state belongs in the URL for browsable collections.

### Homebrew library

- Keep search, result count, sorting, and active facet labels visible. Collapse facet
  controls on mobile behind a named button with `aria-expanded` and an active count.
- Keep library filters separate from the collapsible Compendium visibility settings.
  Show whether visibility is enabled and, when enabled, the number of entries before opening.
- Use 50 entries per page. Keep the page in the URL, reset it on search or facet changes,
  and preserve sorting. Announce the result count and page range with a polite status.
- Card excerpts are plain text. Distinguish classes from subclasses and show the parent
  class when available. Keep whole-card navigation and the original entry routes.
- Wrap dialog action rows on narrow screens; keep the save action visible.
- Start the personal library with the list and a named New entry action. Open editors
  in a dialog with a scrollable form and fixed Save and Cancel actions. Warn before
  discarding edits. Confirm named deletions with initial Cancel focus and offer undo.
- Search personal names in both languages, subtitles, and parent classes with Polish
  normalization. Wrap long labels and omit blank metadata. Sort by localized name or
  creation date and announce the result count and visible range.
- Preview imported content before adding it. Report duplicates and skipped records by
  reason. Keep invalid pasted text available for correction. Replacing restores live on
  Data backup and preserve identifiers, dates, translations, and local artwork.
- Report failed writes, unreadable storage, and conflicts between tabs persistently.
  Offer retry, current-data export, original export, and explicit recovery actions.
- Keep local artwork visible. Require an explicit action per detail view to load remote
  Homebrew artwork. Provide keyboard panning and visible image errors in the crop dialog.

### Compendium browsing

- Browse all entries within the application, with URL pagination and the current search,
  content edition, source visibility, filters, and sort order preserved.
- Filter using canonical source values. Translations provide labels, never identifiers.
  Keep unavailable selections visible and removable. Count selections from URL state.
- Group facet options in collapsible sections. Use searchable checkbox lists for large
  groups, show matching record counts, and keep selected options available at zero matches.
- Keep the dialog close action visible at 320 px. Show the live result count and a named
  action to return to the results. Reset facets without clearing the search query.
- Sort semantic scales by rank and numeric quantities by normalized units. Missing values
  stay last in both directions. Small catalogs need no filters with only one value.
- Omit empty metadata containers. Preserve the exact source when inheriting species fields.
- Long details use a collapsible table of contents. Subclass search and view mode belong
  in the URL. Keep printing sources alongside subclass names without duplicating them.
- Tables have one named roll action, an announced result, and a highlighted matching row.
  Percentile ranges treat 00 as 100. Article illustrations retain their natural proportions.

### Books and adventures

- Keep search, a live count, edition, sort, and active facet labels above the catalog.
  Open facets in a named dialog with an active count. Inherit the shared content edition
  unless the catalog URL selects another edition. Reset facets without clearing search or
  sort. Keep the catalog state when returning from the reader.
- Keep default edition and category groups. Alternate sorts order the whole result set.
  Cards use the localized and original title, wrapping metadata, and a neutral placeholder
  when artwork is unavailable. Omit missing metadata.
- Use a bounded desktop contents pane and a mobile contents dialog. Keep the reading
  controls reachable while scrolling. Mark the selected chapter, focus the target after
  navigation, and leave room above anchors for the controls. Preserve published chapter
  URLs and legacy anchors. Distinguish exact from approximate source jumps.
- Localize and render only the chapters being shown. In whole-book view start with the
  selected chapter and allow loading adjacent chapters in batches. Keep chapter jumps,
  readable static HTML, and a visible retry for unavailable translations.
- Keep the last opened chapter and section, reading mode, and width locally. Resume is
  explicit. Confirm clearing reading history and include it in Data backup. Report failed
  writes, preserve unreadable data, and offer recovery without touching other tools.

### Panels and cards

Use `panelClass()` for standard panels and cards. The default is an `ink-900` surface with
an `ink-700` border and a 12 px radius. Add padding and layout classes at the call site.

Clickable cards should change the border and background on hover. The entire intended card
area should activate the action. If a card contains secondary actions, those actions must
remain keyboard-visible and must not trigger the card action.

Do not add decorative colored strips, rounded bars, or capsule accents along one edge
of cards, panels, buttons, or list rows. Mark a selected row with its background, font
weight, and semantic state. When a colored border is needed, use the whole outline
with equal thickness on every side.

## Layout rules

- Standard content pages use `page-shell` with the documented width variant.
- Page titles use `page-title`; detail titles use `detail-title`.
- Place a short subtitle below the title with `page-description`.
- Major page sections use 24 to 32 px vertical separation.
- Toolbars wrap on narrow screens. Do not allow actions to overflow horizontally.
- Dialogs use a dark overlay, an `ink-900` panel, an `ink-700` border, and a maximum height
  with internal scrolling.
- On mobile, keep the primary action visible and move secondary actions below it when
  horizontal space is limited.

## Interaction rules

- Buttons perform actions. Links navigate.
- Native button type defaults to `button` through the shared component. Set `type="submit"`
  only in a form submission flow.
- Icon-only controls need an accessible label and normally a tooltip through `title`.
- Disabled controls remain readable and use the shared disabled treatment.
- Do not hide an essential action until hover. If a secondary card action is visually
  hidden on desktop, reveal it on `group-focus-within` and keep it visible on touch layouts.
- Enter submits a single-purpose text action, such as rolling a dice expression. Escape
  closes the topmost dialog or menu.
- Opening a dialog moves focus inside it. Closing it should return focus to the control
  that opened it when practical.
- Status changes use an `aria-live` region. Errors that need immediate attention use
  `role="alert"`.

### Backup imports

- Choosing a backup only validates it and opens a preview; it never writes stored data.
- Show the filename, creation date, format version, and collection counts before restore.
- Offer a current-data download before replacement and explain that entries are not merged.
- Empty backups need an explicit acknowledgement as well as destructive confirmation.
- Hidden file inputs stay out of the tab order; a named shared button opens the chooser.
- Routine backups of a single tool live only on Data backup, in one list with a named
  Download and Restore from file action per tool and the current item count. All tools
  share one preview with the filename, date, format, counts, the scope warning, a
  current-data download, and the empty acknowledgement. A scoped restore replaces only
  that tool and never reloads the page. Characters are the first row: Download exports all
  characters with the panel layout, and Import from file opens the character import
  dialog, which adds copies or replaces after confirmation. The Characters page keeps the
  single-character export on each card and links to Data backup. Personal Homebrew keeps
  its own import and export for exchanging content.
- Tool pages show the saved status as text. Recovery actions (retry, current-memory
  download, original download, reload, explicit replacement) appear only while saving
  failed, the stored data is unreadable, or another tab changed it, with a link to Data
  backup. A tool that needs recovery is marked unavailable in the Data backup list.
- Data backup shows the date of the last full backup and the share of browser storage in
  use, with a warning from 80 percent.
- Stores reload silently when another tab changes their key and nothing is unsaved here.
  With unsaved or conflicting data they stop writing and ask the user which version to keep.

### Typed damage and dice results

- Damage accents identify the thirteen damage types using the shared `damage-badge` and
  `damage-panel` classes with `data-damage`. Keep names and Lucide icons alongside color.
- Damage panels use a uniform 1 px border in the damage type color on all sides, visible
  without hover. Do not add a thicker accent on one edge.
- Damage type selectors list bludgeoning, slashing, and piercing first, in that order.
  Sort the remaining types alphabetically by their labels in the current locale.
- Damage accents use dedicated pale colors on ink surfaces; they do not replace the
  arcane selection, danger actions, validation, or keyboard focus colors.
- Build mixed damage from named expression components. Target defenses belong to the
  current target, separately from saved weapon and spell recipes.
- Sum matching damage types before resistance and vulnerability. Show original and
  adjusted totals, including immunity and rounding.
- The dice page owns its inline latest result and history. Other pages use a collapsible
  result dock, initially compact, with the same detail presentation.

### Session journal

- Keep session selection, search, campaign filtering, and sorting in the journal list.
  Remember the selected session locally; keep private search text out of public URLs.
- Use separate Notes, Transcript, and Summary views. Notes and summary save locally;
  transcript edits have explicit save and cancel. Load long transcripts in batches,
  with opt-in following of new entries.
- Recording belongs to the session and language selected at start, including queued
  audio. Show starting, listening, processing, retry, and error states. Audio is not archived.
- Reusable campaign context boards have a name and plain text. Sessions select boards by
  stable identifier. Make shared edits explicit and allow adding facts from the session.
  Export previews separate context from session events, notes, and summary.
- Keep recording controls and language labels readable at 320 px. Export and context
  management are secondary actions. Clipboard and file exports show their scope.
- Show local-save failures with an emergency export and a link to Data backup. Journal
  delete dialogs name the item, request initial focus on Cancel, and offer undo.
- Opening the journal never writes. Keep an unreadable journal and a journal changed in
  another tab untouched until the user loads the saved version or replaces it explicitly.

### Soundboard

- Keep private search text local. Categories, favorites, and independent sorting may
  use URL state. Search localized and original names with Polish normalization.
- Show category counts, a live result count, distinct empty states, and fifty cards
  per page. Reorder only in manual order, using a handle, keyboard, or named moves.
- Cards have wrapping names, a track or playlist label, and visible secondary actions.
  Use one column at 320 px. Card action toolbars use the shared compact size and
  retain the shared 44 px touch targets. Forms stack fields before desktop columns.
- Track and category edits have explicit save and cancel. Validate blank and duplicate
  category names. Confirm named deletions with initial Cancel focus and offer undo.
- Keep a small visible YouTube player and a sticky playback status with a stop action.
  Loading, blocked autoplay, paused, playing, and error states must be accurate.
  Never hide a playing iframe. Read events only from the exact YouTube iframe and origin after a playback action.
  Do not load third-party scripts in the application origin.
- Report local save failures persistently, allow retry, and download current in-memory
  tracks, categories, favorites, and order. Preserve unreadable storage without overwriting
  it; offer its original contents for recovery and an explicit replacement flow.
- Backup validation checks identifiers and category references before replacement.
  Preserve old snapshots through migration without discarding user tracks. The page keeps
  only library cleanup (clear, restore examples); backups live on Data backup.

### Campaign wiki

- Keep the campaign title and introduction visible on mobile. Open the campaign page
  catalog in a named dialog with focus containment, Escape, and focus restoration.
  Desktop catalogs stay available while reading, with their own bounded scrolling.
- Search titles and plain article text with normalized Polish characters. Keep search,
  category, and catalog page in the URL, including when opening another article.
  Sort by localized category and title, and show at most 50 links per catalog page.
- Count meaningful articles, excluding empty starter placeholders. Campaigns with only
  a map show their campaign name, an empty article state, and the map link.
- Long articles have collapsible contents with stable section anchors. Show the source
  language when it differs from the interface language. Keep native link behavior.
- Wiki fact cards use wrapping labels and values; stack each pair on narrow article
  widths. Put artwork beside facts when the article has room and above them on narrow
  screens. Preserve the image proportions. Omit blank facts. Wide tables have named,
  focusable scroll containers.
- Map viewports allow page scrolling at base zoom, keyboard panning when enlarged,
  and visible instructions. Editor cells use one Tab stop and arrow-key navigation.
- Local map drafts show saved or unsaved state. Keep failed drafts in memory, offer
  retry and a current-draft download, and confirm deletion with initial Cancel focus.
  Do not discard the displayed draft when deleting its stored copy fails.
- Static wiki pages contain complete sanitized articles, headings, internal links,
  campaign navigation, and the map link. Visual map masks are not a security boundary.

### Loot generator

- Keep generator configuration and the selected result locally across modes, navigation,
  refresh, and language changes. Results own immutable generation parameters; rerolling
  items uses those parameters rather than the current form. Explain pending form changes.
- Use canonical item metadata for eligibility and the shared content edition filter.
  Skip incomplete entries with a named Homebrew link. Unknown rarities require opt-in.
- Party selection searches names, classes, and subclasses locally with Polish normalization.
  Keep role filtering, stable sorting, counts, and actions for matching results together.
  Default to party characters. Bound the scrolling list and paginate fifty entries so
  generation actions remain reachable. Wrap character names and put metadata below them.
- Validate integer levels 1-20 and positive integer party counts beside their fields.
  Return focus to Add level group after removal. Announce loading, failures, empty pools,
  selection counts, and generated results without moving focus away from the action.
- Show source, meaningful metadata, and explicit attunement requirements in result rows.
  Proficiency matching is advisory; unknown requirements and unresolved variant bases
  need visible review text. Choose a concrete variant base from the original eligible pool.
- Show coins, valuables, and their combined known value without pricing magic items.
  Optional division uses copper precision and shows the remaining amount.
- Keep at most fifty named, dated results. Selecting history does not change the form.
  Copy and text download include the selected result and its parameters. Confirm named
  deletions with initial Cancel focus. The general backup includes configuration and history.
- Loot backups follow the Backup imports rules: Data backup holds the download and the
  scoped restore; the generator shows only its saved status and recovery actions.
- Keep failed writes in memory with retry and an emergency JSON backup. Preserve unreadable
  stored contents, offer their original download, and require explicit replacement before
  overwriting them. Use shared controls, notices, panels, and uniform selected outlines.

### Encounter builder

- Keep the current draft and named encounters locally. Opening, duplicating, or deleting
  a named encounter requires an explicit action. Open a copy for editing and save updates
  explicitly. Confirm deletions and replacing a draft with initial focus on Cancel.
- Validate party counts and levels beside their inputs. Explain incomplete totals, separate
  zero XP from missing XP, and show the remaining budget for the selected difficulty.
- Keep the creature catalog in normal page flow, with localized and original name search,
  source, habitat, result counts, sorting, and pagination. Use the shared content edition
  and Homebrew visibility. Distinguish Any habitat from missing habitat.
- Keep totals above long rosters. Put wrapping creature names before metadata and count
  controls on mobile. Return focus to search after adding and to a nearby control after
  removal. Announce totals, empty results, and loading failures.
- Preview the selected combatants before appending them to Initiative. Explain missing
  stats and keep the current round, turn, and participants. Keep the encounter available.
- Preserve unreadable storage, allow retry and emergency export, and include the draft
  and library in full backups. Scoped backups and restores live on Data backup.

### Initiative tracker

- Keep round, active participant, and turn actions together above the queue, visible
  while scrolling. Mark the active row with text, semantic state, and a uniform outline.
  Announce turn changes without moving focus. Start explicitly and stop at the first
  turn when moving backwards. Allow named moves within ties without changing scores.
- Wrap names and stack controls at 320 px. Participant search jumps to a named row
  without filtering or reordering the queue. Keep search text local and use shared
  fields, role filters, and accessible dialogs for finding and previewing characters.
- Distinguish missing stats from zero. Use explicit save and cancel for detailed edits.
  Confirm named removals and clear actions with initial focus on Cancel, then offer
  undo and return focus to a nearby row or the add form.
- Keep save failures and competing tab changes visible. Offer retry, current-memory
  download, and original download as applicable. Require explicit confirmation before
  replacing unreadable or conflicting data. Scoped restores on Data backup preview the
  file, round, turn, and count before replacing initiative data only.

### Character sheets

- The character list keeps search text local. Role filter, sort order, and page may use
  URL state. Search localized class and species names with Polish normalization, show
  the result count and range, and use fifty cards per page. Card actions for duplicate,
  export, and delete stay visible. Deleting a character asks for confirmation with initial
  focus on Cancel and offers undo.
- Choosing a character file only validates it and opens a preview. Show the filename,
  date, names, and counts. Import duplicates as copies unless the user explicitly selects
  replacement. Apply a panel layout from a file only after opting in. Full Fumble backups
  can restore characters without touching other data.
- Synchronize class, species, and background data only after those choices or the level
  change. A manually edited synchronized value stays manual until its named restore
  action. Synchronized features and spells are read-only, collapsible, and can be copied
  as personal entries. Opening a sheet never writes unchanged data.
- Keep a sticky status bar with armor class, hit points, initiative, speed, inspiration,
  and the roll mode. Rolls from the bar, panels, and the Rolls tab use the shared roll
  dock and history with the character name in the label.
- Hit point changes accept positive whole amounts only. Show current, maximum, and
  temporary values as text and a labelled meter. Show death saves at zero hit points.
  Rests summarize their effects before confirmation and announce the result.
- Number fields keep the typed draft, commit only valid whole numbers within their
  documented range, describe errors with the field, and restore the saved value on blur.
- Sheet panels have a layout menu with named moves between positions and columns.
  Pointer dragging is an addition, not the only way to reorder. On narrow screens
  panels collapse individually, keep their own order, and start with hit points and combat.
- Sheet tabs use the tablist pattern with arrow, Home, and End keys. The selected tab
  belongs in the URL. Removing a row is immediate, names the item, and offers undo.
- Compendium pickers are comboboxes with arrow selection, Enter, Escape, source labels,
  a visible empty state, and an announced addition. Entry selection dialogs search both
  names with Polish normalization and offer clearing the selection.
- Report failed writes, unreadable storage, and changes from another tab persistently.
  Offer retry, current-data download, original download, reload, and explicit replacement.
  Character PDF export embeds a font that covers Polish characters.

### Action menus

- Use `ActionMenu` for a short list of related commands behind one named button. It
  exposes `aria-expanded`, moves focus to the first item, supports arrow, Home, End, and
  Escape keys, closes on outside clicks and after a choice, and returns focus to its
  button. Items use the shared button styles and never hide the only way to an action.

### Home page

- The home page is a dashboard: title, a named search button that opens the shared search
  palette, Continue, then the navigation sections. Opening it never writes stored data.
- Continue lists at most six links read from local data: up to three recently edited
  characters, the latest reading position, the session the journal will open, an
  initiative queue with participants, and an encounter draft with creatures. Omit a
  kind whose data is missing or unreadable; its own page reports storage problems.
  Without any data show Start here with three link actions. Keep private names out
  of URLs and static HTML.
- Navigation cards use `nav-card`, an extension of `catalog-card`: icon, wrapping name,
  and from the large breakpoint the description from the dictionaries. Below 380 px
  use one column of 56 px rows; from 380 px use two columns, then three.
  Cards share the arcane hover outline on every side.
- Navigation section accents (arcane, cyan, violet, ember, and neutral ink) color only
  section headings and card or menu icons, through `navAccentText`. They never carry
  state. The selected menu row uses the arcane surface, weight, and `aria-current`.
- The search palette lists tools and pages first, matched by localized name, English
  name, and description with Polish normalization. It is a combobox: focus stays in the
  field, arrow keys move the highlighted option, Enter opens it, and a polite status
  announces the result count.
- The mobile header holds the menu button, the logo as a home link, and a search button.
  The menu lists Home and Compendium before the sections; Compendium is current on its hub
  and on categories that have no menu entry of their own.
- After navigation announce the page title politely. Move focus to the main content when
  the section changes or when focus was lost, and leave it alone when the page manages it.
- A page that fails to load or render shows the route error page inside the application
  shell: one title, a short message, Reload, Home, and Download data backup. Reload once
  automatically after a failed lazy chunk. The application error screen offers the same
  reload and backup actions.
- The skip link uses `skip-link`: fixed above the layout, moved into view on focus,
  and never part of the page flow.

### Reminder dock

- A reminder is a small non-modal dock in the place and style of the roll result dock:
  a named region with a heading, one sentence, one link action, and a compact dismiss
  action. It never takes focus, blocks controls, or opens a dialog, and it yields to
  the roll result dock when both would show.
- The backup reminder appears only on the home page, when local user data exists and
  no full backup was downloaded in this browser during the last 30 days. Without a
  recorded backup it waits until the oldest character or session is 30 days old.
  Dismissing postpones it for 30 days. A full export on Data backup records the date. The reminder
  state is included in backups and failures to store it are ignored.

## Color roles

| Token         | Role                                      |
| ------------- | ----------------------------------------- |
| `ink-950`     | Page and field background                 |
| `ink-900`     | Panels and cards                          |
| `ink-800`     | Hover surfaces and separators             |
| `ink-700`     | Panel borders                             |
| `ink-600`     | Default field and control borders         |
| `ink-50`      | Primary text                              |
| `ink-300/400` | Secondary text                            |
| `arcane-*`    | Primary actions, selection, links, focus  |
| `ember-*`     | D&D accent and exceptional content labels |
| `cyan-300`    | Rules section accent in navigation only   |
| `violet-300`  | DM section accent in navigation only      |
| `red-*`       | Destructive actions and errors only       |

Do not use ember as an alternative primary action color. Do not use red for a decorative
accent.

## Adding a new feature

Before opening a pull request:

1. Start with the page layout, shared panels, and shared controls.
2. Add every UI string to English and Polish dictionaries.
3. Test normal, hover, keyboard focus, disabled, loading, error, empty, and populated
   states.
4. Test at desktop width, 320 px width, and 200 percent browser zoom.
5. Confirm that search, filters, sorting, and reset follow the rules above.
6. Confirm that icon-only actions have accessible names.
7. Run all repository quality gates and Chromium Playwright tests after behavior or layout
   changes.

If a design requires a new visual pattern, first check whether an existing shared
component can support it with a small reusable extension. Document any new recurring
pattern in this file.

## Design tokens and page anatomy

Read this document before every frontend change. The values in `src/index.css`, the
helpers in `src/features/ui/styles.ts`, and the components in
`src/features/ui/primitives.tsx` implement these rules. Change those shared definitions
before changing a recurring pattern at individual call sites.

- Use the system sans-serif stack for both body and display text. Do not name a font
  that the application does not deliver. Reserve monospace for expressions and code.
- Use `page-shell` for normal pages, `page-shell page-shell-wide` for editors, and
  `page-shell page-shell-reading` for documents. They share 16 px mobile gutters,
  24 px desktop gutters, and 32 px vertical padding. Their maximum widths are 72,
  80, and 48 rem. A split browser is a distinct layout with the same inner gutters.
- Use `page-title` for the one visible h1: 30 px, weight 700, line height 1.2.
  Detail titles use `detail-title`: 24 px. Keep the title present on mobile.
- Use `section-title` for article sections: 20 px, weight 700. Use `panel-title`
  for tool panels: 14 px, weight 700, uppercase, ember. Nested article headings
  descend through 20, 18, and 16 px without skipping semantic levels.
- Body text is 16 px with 1.75 line height when reading. Interface text is 14 px.
  Supporting labels and badges are at least 12 px. Do not shrink long labels to fit.
- Use `page-description`, `field-label`, `badge`, `back-link`, `catalog-toolbar`,
  `catalog-card`, `empty-state`, and `notice` for their named recurring roles.
- Neutral text shades are ink-50/100 for titles, ink-200/300 for body text, and
  ink-400/500 for supporting text. Every referenced token must exist in the theme.
- Fields have ink-600 borders so the input boundary remains visible on dark surfaces.
  Panel boundaries use ink-700; decorative separators use ink-800.
- Selected rows use an arcane-950 surface and semibold text, without an edge accent,
  so supporting text and badges keep their contrast. Active chips use arcane-700 with white text.
- Standard fields and buttons are 40 px high. Compact toolbar controls are 32 px.
  Primary large controls are 48 px. Use the component's size prop; do not append
  conflicting height, padding, font-size, or radius classes.
- Pointer-coarse controls have a 44 px minimum target. Dense spatial map cells and
  links inside sentences are exceptions; provide equivalent named toolbar controls.
- Checkbox labels supply the target area. Skill proficiency cycles remain round and
  use an explicit symbol as well as color. Numeric values use tabular numerals.
- Clickable cards share a border/background hover without translation or decorative
  shadow. Raised shadows are reserved for dialogs, popovers, and drag previews.

## Content, navigation, and states

- The footer has project links, discovery links, and legal/help links. Use one short
  project description and retain the version from package.json and the current year.
  Standalone footer and document action links have 44 px touch targets and visible focus.
- Keep the footer outside the main landmark, with both inside the application scroll
  container. Preserve full-height tools and reset that container on page navigation.
- Public legal documents, the site map, and release history render complete HTML before
  JavaScript, using the same components, labels, and links as the application.
- Legal documents use explicit named references rather than raw HTML from translations.
  Each document owns its revision date, rendered with time and dateTime. Only content
  changes advance the date. Distinguish public GitHub reports from private security reports
  and state when signing in is required.
- The human-readable site map links every Compendium category to its complete catalog.
  Static reading links use the published HTML catalogs; interactive links open catalog view.
- Release history is generated from CHANGELOG.md. Version links open the matching release
  within Fumble. Keep the repository history available as a secondary external link.

- Put page identity before tools. Use a stable title row when a browser selects an
  entry. On narrow screens collapse category navigation instead of stacking all facets.
- The Compendium list toolbar keeps Filters, the sort field, direction, and random entry
  on one row at every width; the sort field shrinks before anything wraps.
- Keep search, facets, result count, and reset together in `catalog-toolbar`.
  Show selected facets without requiring another toggle. Put category-specific facets
  before publication sources. Reset facets without deleting the search query.
- Original names always use `OriginalName`. Place content badges in the detail header.
- Tables use `data-table`: 14 px text, 8 px cell padding, ink-700 header boundary,
  ink-800 row boundaries, subtle alternating backgrounds, and top-aligned cells.
  Set header scope and put wide tables in a keyboard-accessible horizontal scroll area.
- Quotations use `quote-block`: an ink-900 surface with a uniform ink-700 border on every
  side, 8 px radius, and italic text. Do not mark quotations with an edge strip.
- Use the same `reading-content` typography for legal text, wiki, books, and rendered
  entries. Statblocks may keep their six-column ability layout and compact metadata.
- Illustrations follow the detail title. Failed artwork must not reserve an empty
  block. Images need dimensions or aspect ratio when known and descriptive alt text
  unless decorative. Image zoom must also be available from a keyboard.
- Dialogs use `dialog-overlay` and `dialog-panel`, a named heading, an accessible
  close action, focus containment, Escape, and focus restoration. Keep only the panel
  body scrollable. All standard close icons use the same shared compact icon button.
- Empty, loading, success, and error states need visible text. Use `empty-state` for
  empty collections and `notice` with its tone variant for status feedback. Reserve
  layout space for status when changes would otherwise move the form.
- Prefer one latest-roll presentation and one history-row presentation across the
  sheet, roller, and dock. Keep the full expression and accessible outcome available.
- Published static catalogs share page typography, primary navigation, legal navigation,
  and attribution. Reading fallbacks use the shared document typography while the
  application initializes. Keep real href links, canonical and hreflang metadata,
  private-route noindex, and meaningful content without JavaScript.
- Search engines may index tools, public pages, Fumble's own content, the campaign wiki,
  and Compendium entries flagged as SRD 5.2, including the twelve SRD subclasses. Books,
  their chapters, and every entry outside the SRD stay readable but are `noindex` and
  absent from the sitemap, in the static HTML and after the application starts.

## Motion and accessibility verification

- Use 150 ms for color and opacity transitions, 200 ms for transforms and drag previews,
  and 200 ms for a short popover entrance. Do not add page entrance animations.
- Disable transitions, entrance animations, and smooth scrolling for reduced motion.
- Use a single 2 px arcane-300 keyboard outline with a 2 px offset. Search fields may
  put this on their container, but the focused input must never become unidentifiable.
- Check normal text contrast at 4.5:1 and large text at 3:1. Check meaningful control
  boundaries at 3:1. Selected rows need a shape, weight, icon, or semantic state beyond color.
- Verify 320 px reflow, a representative phone, desktop, 200 percent zoom, keyboard
  navigation, focus restoration, and reduced motion. Automated checks do not by
  themselves establish complete WCAG compliance.
- Add a regression check for a new interaction or a repaired failure path. Run the
  complete repository CI equivalent before shipping, including merged coverage.
- Maintain the audit-to-change mapping in `docs/UI_AUDIT_2026-11-07.md` while applying
  the November 2026 audit. Do not mark an item complete without implementation evidence.

References: [WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html),
[text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), and
[Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

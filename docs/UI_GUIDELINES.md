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

### Panels and cards

Use `panelClass()` for standard panels and cards. The default is an `ink-900` surface with
an `ink-700` border and a 12 px radius. Add padding and layout classes at the call site.

Clickable cards should change the border and background on hover. The entire intended card
area should activate the action. If a card contains secondary actions, those actions must
remain keyboard-visible and must not trigger the card action.

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
- Selected rows use an arcane-950 surface and an arcane-300 edge so supporting text
  and badges keep their contrast. Active chips use arcane-700 with white text.
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

- Put page identity before tools. Use a stable title row when a browser selects an
  entry. On narrow screens collapse category navigation instead of stacking all facets.
- Keep search, facets, result count, and reset together in `catalog-toolbar`.
  Show selected facets without requiring another toggle. Put category-specific facets
  before publication sources. Reset facets without deleting the search query.
- Original names always use `OriginalName`. Place content badges in the detail header.
- Tables use `data-table`: 14 px text, 8 px cell padding, ink-700 header boundary,
  ink-800 row boundaries, subtle alternating backgrounds, and top-aligned cells.
  Set header scope and put wide tables in a keyboard-accessible horizontal scroll area.
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

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

Fields use a 40 px default height, an `ink-950` background, an `ink-700` border, and an
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
an `ink-800` border and a 12 px radius. Add padding and layout classes at the call site.

Clickable cards should change the border and background on hover. The entire intended card
area should activate the action. If a card contains secondary actions, those actions must
remain keyboard-visible and must not trigger the card action.

## Layout rules

- Standard content pages use `mx-auto`, a page-specific maximum width, `px-4 sm:px-6`,
  and `py-8`.
- Page titles use `font-display text-3xl font-bold text-ink-50`.
- Place a short subtitle below the title with `mt-1 text-sm text-ink-300`.
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
| `ink-700`     | Default control and strong panel borders  |
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

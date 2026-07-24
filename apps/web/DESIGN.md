---
name: Plataforma de Aprendizaje Colaborativo
description: A quiet, precise study room for running semester-long collaborative activities — trustworthy enough to grade through, warm only when something is genuinely earned.
colors:
  primary: 'oklch(0.38 0.08 246)'
  primary-hover: 'oklch(0.30 0.07 246)'
  primary-subtle: 'oklch(0.93 0.02 246)'
  primary-border: 'oklch(0.76 0.05 246)'
  accent: 'oklch(0.55 0.16 50)'
  accent-subtle: 'oklch(0.94 0.03 50)'
  accent-ink: 'oklch(0.34 0.08 50)'
  success: 'oklch(0.50 0.14 145)'
  success-subtle: 'oklch(0.95 0.03 145)'
  success-ink: 'oklch(0.32 0.09 145)'
  danger: 'oklch(0.52 0.19 25)'
  danger-hover: 'oklch(0.44 0.19 25)'
  danger-subtle: 'oklch(0.95 0.035 25)'
  danger-ink: 'oklch(0.36 0.14 25)'
  warning: 'oklch(0.53 0.14 90)'
  warning-subtle: 'oklch(0.95 0.03 90)'
  warning-ink: 'oklch(0.38 0.10 90)'
  bg: 'oklch(1 0 0)'
  surface: 'oklch(0.97 0.004 246)'
  surface-hover: 'oklch(0.91 0.004 246)'
  border: 'oklch(0.91 0.004 246)'
  border-strong: 'oklch(0.85 0.005 246)'
  text: 'oklch(0.22 0.006 246)'
  text-muted: 'oklch(0.46 0.008 246)'
  text-on-accent: 'oklch(1 0 0)'
typography:
  headline:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: '1.875rem'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 'normal'
  body:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
  label:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: 'normal'
  caption:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: 'normal'
rounded:
  sm: '0.25rem'
  md: '0.5rem'
  lg: '0.75rem'
  full: '9999px'
spacing:
  1: '0.25rem'
  2: '0.5rem'
  3: '0.75rem'
  4: '1rem'
  5: '1.25rem'
  6: '1.5rem'
  8: '2rem'
  10: '2.5rem'
  12: '3rem'
  16: '4rem'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.text-on-accent}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
  button-secondary:
    backgroundColor: '{colors.bg}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
  button-danger:
    backgroundColor: '{colors.danger}'
    textColor: '{colors.text-on-accent}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
  card:
    backgroundColor: '{colors.bg}'
    rounded: '{rounded.lg}'
    padding: '24px'
  input:
    backgroundColor: '{colors.bg}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    padding: '8px 12px'
  badge-accent:
    backgroundColor: '{colors.accent-subtle}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.full}'
    padding: '4px 12px'
---

# Design System: Plataforma de Aprendizaje Colaborativo

## 1. Overview

**Creative North Star: "The Study Room"**

A calm, focused workspace an organizer trusts for real evaluation — grading, peer review, team configuration — without a trace of institutional stiffness. The room itself is quiet: pure white, precise graphite ink, restraint as a default posture. On its shelf sits one considered object: a bottle of amber glass. It doesn't announce itself, but when a badge is earned or an activity closes, that bottle catches the light. Everywhere else, the interface stays deliberately quiet so that moment means something.

This system draws its density from **Linear** — typographic restraint, a near-monochrome surface, color reserved for status and priority — for the dense, control-heavy views (permission tables, participant lists, activity configuration). It draws its breathing room from **Notion** — a calm, content-first canvas with generous whitespace — for forms and text-heavy screens. **Khan Academy** is the reference for individual progress and tracking views (bitácora, seguimiento): neutral, uncluttered, focused on the content rather than the chrome. **Google Classroom** informs how activities group and navigate, not its softer, more playful palette.

The system explicitly rejects: generic corporate SaaS (blue-gradient dashboards, hero-metric cards, icon-grid feature lists), Duolingo-style consumer gamification (mascots, confetti, loud reward loops), and stock photography of people anywhere in the interface — abstract shapes, icons, or simple illustration carry visual interest instead. One documented exception exists for the public home page hero; see §6.

**Key Characteristics:**

- Near-monochrome graphite base; a single warm color exists and is reserved for genuine recognition.
- Roles are contextual, not chrome: organizer / co-organizer / participant status reads from layout and labeling, never from a decorative badge-of-office.
- Flat by default; elevation is reserved for things that are temporarily floating above the page, not resting on it.
- Soft-edged and calm as the default component register; density and precision are a deliberate mode switch for configuration-heavy surfaces, not the baseline.

## 2. Colors: The Apothecary Palette

Two brand colors, deliberately far apart in role: **Study Ink** runs the interface day to day; **Apothecary Amber** appears only when something has genuinely been earned.

### Primary

- **Study Ink** (`oklch(0.38 0.08 246)` / `#17466a`): the only color driving everyday interaction — primary buttons, links, active states, the focus ring. A deep, quiet blue with a whisper of graphite in it; reads as considered rather than corporate. `primary-hover` (`oklch(0.30 0.07 246)` / `#07304e`) deepens it further on press/hover. `primary-subtle` (`oklch(0.93 0.02 246)` / `#ddeaf5`) and `primary-border` (`oklch(0.76 0.05 246)` / `#98b5d0`) carry selected-row and active-filter states in dense tables.

### Accent (Recognition only)

- **Apothecary Amber** (`oklch(0.55 0.16 50)` / `#b74d00`): reserved exclusively for the moment a badge is awarded and for an activity's closing/archived state banner. `accent-subtle` (`oklch(0.94 0.03 50)` / `#fde6da`) with `accent-ink` (`oklch(0.34 0.08 50)` / `#58290a`) text is the resting-state chip for a badge already earned, shown on a profile or activity history — still warm, but quiet enough to sit in a list without shouting.

### Status

- **Confirmed Green** (`oklch(0.50 0.14 145)` / `#1e7729`, subtle `#e3f4e2`, ink `#0b3e12`): success confirmations, completed states.
- **Flag Red** (`oklch(0.52 0.19 25)` / `#be222a`, hover `#a2000f`, subtle `#ffe6e3`, ink `#760711`): destructive actions, validation errors, overdue states.
- **Caution Gold** (`oklch(0.53 0.14 90)` / `#8b6600`, subtle `#f6eed8`, ink `#573e00`): pending/at-risk states — deliberately a duller, more olive gold than Apothecary Amber so the two are never confused at a glance.

### Neutral

- **Paper** (`oklch(1 0 0)` / `#ffffff`): base background. Pure white, no warmth mixed in — the room's walls, not the object on the shelf.
- **Shelf** (`oklch(0.97 0.004 246)` / `#f3f5f8`): surface/card background one step off Paper, `surface-hover` (`oklch(0.91 0.004 246)` / `#dfe1e4`) for hover states.
- **Hairline** (`oklch(0.91 0.004 246)` / `#dfe1e4`) and **Hairline Strong** (`oklch(0.85 0.005 246)` / `#cbced1`): borders and dividers — thin, quiet, structural rather than decorative.
- **Graphite** (`oklch(0.22 0.006 246)` / `#181b1d`): primary text, 17.3:1 on Paper.
- **Soft Graphite** (`oklch(0.46 0.008 246)` / `#54595c`): secondary/muted text, still 7.1:1 on Paper — deliberately darker than a typical "muted gray" so it stays legible for real body copy, not just decoration.

### Named Rules

**The One-Bottle Rule.** Apothecary Amber appears in exactly two contexts: a badge being awarded, and an activity's closed/archived state. It never appears on a primary button, a nav item, or any default interactive control. If amber shows up anywhere else, that's a bug in the design, not a stylistic choice.

**The No-Muddy-Fill Rule.** Any saturated color used as a filled background (button, solid badge, status pill) pairs with white text, never dark text — even where WCAG technically allows dark. Dark text only sits on the `-subtle` (pale) tints or on Paper/Shelf neutrals.

## 3. Typography

**Body & UI Font:** `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` — no display font. A single system stack for everything, same posture as Notion's own UI type: it disappears into the content instead of performing "brand."

**Character:** Restrained and functional. Weight and size carry hierarchy; the system never reaches for a second typeface to signal importance.

### Hierarchy

- **Headline** (600, 1.875rem / 30px, line-height 1.25): page and section titles (`<h1>`). Reserve 2.25rem (`--font-size-4xl`) for the rare case a screen needs a heavier top-level title than 1.875rem provides — don't introduce a separate display face to get there.
- **Body** (400, 1rem / 16px, line-height 1.5): paragraph text, form values. Cap prose blocks at 65–75ch even inside a generous Notion-style canvas.
- **Label** (500, 0.875rem / 14px, line-height 1.25): form labels, button text, table headers.
- **Caption** (500, 0.75rem / 12px, line-height 1.25): badge text, timestamps, secondary metadata — the smallest text in the system, so it never carries the sole source of critical information (pair with an icon or position, not color alone).

### Named Rules

**The One-Face Rule.** Every weight of hierarchy in this system comes from size and weight on a single sans stack. Introducing a second typeface — a serif for "warmth," a mono for "technical feel" — breaks the Study Room's quiet, considered posture and is not permitted without revisiting this document first.

## 4. Elevation

Flat by default, in the spirit of both Linear and Notion: surfaces at rest — cards, panels, table rows — carry at most a barely-perceptible ambient shadow that reads as a boundary cue, not a lift. Shadow strength scales only with genuine z-axis state: something temporarily floating above the page (a dropdown, a popover, a modal) gets a real, visible shadow; nothing that's just "resting" on the page ever does.

### Shadow Vocabulary

- **Ambient** (`box-shadow: 0 1px 2px oklch(0.22 0.006 246 / 0.06)`): resting Cards only. Barely there — a hairline of depth, not a lift.
- **Raised** (`box-shadow: 0 4px 12px oklch(0.22 0.006 246 / 0.10)`): dropdown menus, popovers, inline pickers — content that floats above the page but stays anchored to a trigger.
- **Overlay** (`box-shadow: 0 12px 32px oklch(0.22 0.006 246 / 0.14)`): modals and dialogs — content that suspends the rest of the page.

All three shadows are tinted with Graphite (`oklch(0.22 0.006 246)`) at low alpha rather than pure black, so depth reads as part of the same quiet, cool-neutral system instead of a generic drop-shadow.

### Named Rules

**The Resting-Flat Rule.** If an element isn't floating above other content right now, it doesn't get more than the Ambient shadow. Raised and Overlay are earned by actual stacking, not by a component's perceived importance.

## 5. Components

Soft-edged and calm is the default register — generous internal padding, comfortably rounded corners, unhurried transitions. Dense, control-heavy surfaces (permission tables, participant lists, activity configuration grids) are the deliberate exception: tighter spacing and sharper precision, closer to Linear, because that's where an organizer needs control more than they need comfort.

### Buttons

- **Shape:** `rounded-md` (8px) — soft enough to feel calm, not sharp enough to feel clinical.
- **Primary:** Study Ink fill, white text, `8px 16px` padding. Used once per view as the clear default action.
- **Secondary:** Paper background, Graphite text, Hairline Strong border — same resting-surface pattern as Cards/Inputs, so it stays legible regardless of what page tone sits behind it. For the paired "Cancelar"-style action, never competing visually with Primary. (Changed from Shelf to Paper after Shelf became indistinguishable once a screen's own background is also Shelf — see `PantallaInicio.tsx`.)
- **Danger:** Flag Red fill, white text — reserved for destructive, hard-to-reverse actions (removing a participant, deleting a report), never for routine negative actions like "Cancelar."
- **Hover / Focus:** background shifts to the `-hover` step over 0.15s ease; `:focus-visible` gets a 2px Study Ink outline, 2px offset — never removed, never replaced with a subtler box-shadow-only treatment.

### Cards / Containers

- **Corner Style:** `rounded-lg` (12px).
- **Background:** Paper, with a 1px Hairline border and the Ambient shadow (see Elevation).
- **Internal Padding:** `24px` (`--space-6`).
- **Use:** a Card groups one coherent unit — one activity summary, one team, one form — never nested inside another Card.

### Inputs / Fields

- **Style:** Paper background, 1px Hairline Strong border, `rounded-md` (8px), `8px 12px` padding.
- **Focus:** border replaced by a 2px Study Ink outline, 1px offset — same focus language as buttons, so keyboard navigation feels like one system.
- **Error:** border becomes Flag Red; the error message below renders in Flag Red at Caption size, always paired with the field label so color is never the only signal.
- **Placeholder:** must hit the same 4.5:1 floor as real input text — never lighter "for elegance."

### Badges

- **Shape:** `rounded-full` (pill), `4px 12px` padding, Caption typography.
- **Status variants** (success / danger / warning): `-subtle` background with matching `-ink` text — quiet, informational, sit inline in tables and lists without competing for attention.
- **Accent variant (recognition only):** Apothecary Amber `-subtle` background with `accent-ink` text. This is the _only_ place in the system Apothecary Amber appears at rest (a badge already earned, shown on a profile). The moment of _awarding_ a badge may use the solid Apothecary Amber fill with white text as a one-time celebratory treatment (see Do's and Don'ts) — the pill above is its permanent, quiet resting state afterward.

### Navigation (not yet built — guidance for when it is)

Should follow the Linear reference for the organizer-facing shell (activity configuration, participant management): compact, label-forward, Study Ink for the active item via `primary-subtle` background rather than a bold color block. Avoid a colored sidebar or top bar — navigation chrome stays Paper/Shelf so it never competes with Apothecary Amber's rarity.

## 6. Do's and Don'ts

### Do:

- **Do** keep Apothecary Amber to exactly two moments: a badge being awarded, and an activity's closed/archived state (The One-Bottle Rule).
- **Do** use white text on any saturated fill (Study Ink, Flag Red, Confirmed Green, Caution Gold, solid Apothecary Amber) — never dark text on a saturated background (The No-Muddy-Fill Rule).
- **Do** keep secondary text at Soft Graphite (`#54595c`) or darker; it's already tuned to 7.1:1 on Paper, don't lighten it further "for elegance."
- **Do** reserve Raised/Overlay shadows for content that's actually floating above the page — dropdowns, popovers, modals (The Resting-Flat Rule).
- **Do** switch dense, control-heavy surfaces (permission tables, participant lists, activity configuration) to tighter, Linear-style spacing; keep forms and text-heavy screens on the calmer, Notion-style default.
- **Do** represent role (organizador / co-organizador / participante) through layout, labeling, and available actions — not through a decorative badge or color-coded chrome.

### Don't:

- **Don't** use Apothecary Amber on a primary button, nav item, or any default interactive control — that breaks the entire "earned, not decorated" premise of the recognition system.
- **Don't** reach for a blue-gradient hero, a hero-metric stat card, or an icon-grid feature list — this is not a marketing surface, and those are the generic-SaaS patterns PRODUCT.md explicitly rejects.
- **Don't** introduce mascots, confetti bursts, or loud Duolingo-style reward animations when a badge is awarded — the celebratory moment is the solid Apothecary Amber fill and nothing louder.
- **Don't** use stock photography of people (students, teachers, meeting rooms) anywhere in the UI — use abstract shapes, icons, or simple illustration instead. **Scoped exception:** the public home page hero (`PantallaInicio.tsx`) uses one licensed Magnific illustration (pch.vector) of people collaborating with puzzle pieces, chosen after comparing it against a custom abstract illustration and several other stock options. It carries a required visible attribution credit in the page footer per its license — the exact wording Magnific requires is still unconfirmed, see the `TODO` in `PantallaInicio.tsx`. This exception is scoped to that one screen only — don't extend it to any other surface without revisiting this rule.
- **Don't** add a second typeface for "warmth" or "technical feel" (The One-Face Rule) — hierarchy comes from size and weight on the single system sans stack.
- **Don't** put a shadow on a resting card heavier than Ambient, and never on a table row, list item, or form section at rest.
- **Don't** apply `border-left`/`border-right` as a colored accent stripe on cards, list items, or callouts — use a full border, a subtle background tint, or a leading icon instead.

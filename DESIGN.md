# Numelix design system

## Surface and context

An Android student uses a phone beside their notes in a bright classroom. Neutral surfaces carry everything that is read for length, so equations and step tables stay the most legible thing on screen. Violet carries action and state; blue accents the live value. A dark appearance remains available for dim rooms.

This replaces the CalcNoir monochrome identity, which itself replaced a pink/teal palette. Colour is now part of the brand, but the earlier rule still holds: **no semantic meaning depends on hue**. Notices keep explicit Error/Warning labels so meaning never rests on hue alone. The single exception is destructive action: delete carries a red, because that convention is older and stronger than this palette.

## Palette

The brand is four colours — ink #141414, paper #F4F4F4, violet #983FFF, blue #45C4FC — applied 60 / 30 / 10.

- **60 neutral.** Backgrounds, cards, body copy, tables.
- **30 violet.** Primary buttons, the tab bar, active and selected state.
- **10 blue.** Accents only: focus, the plotted curve, the selected step.

The two brand hexes are used literally where they are legible and tuned where they are not. **#45C4FC scores 1.99:1 on white**, which fails for the graph strokes and legend text it drives, so light mode uses **#0A6E9E** (5.6:1). **#983FFF scores 3.94:1 on #141414**, so dark mode uses **#B47CFF** (6.4:1). Both variants stay in their hue family; the logomark keeps the untouched brand gradient in both themes.

Light: background #FFFFFF, surface #FFFFFF, secondary surface #F4F4F4, ink #141414, secondary text #5C5C5C, border #E4E4E4, input border #8A8A8A, primary #983FFF with #FFFFFF text, deep violet #57129E, accent #0A6E9E. Dark: background #141414, surface #1C1C1C, secondary surface #221A2E, ink #F4F4F4, secondary text #B4B4B4, border #3A3A3A, input border #8A8A8A, primary #B47CFF with #141414 text, light violet #C9A3FF, accent #45C4FC.

## Typography and spacing

Three families, three jobs. A reader should be able to tell what kind of thing they are looking at from the letterforms alone, before reading a word.

| Family | Job | Where |
| --- | --- | --- |
| **Poppins** | brand voice | logotype, screen titles, header bar |
| **Inter** | interface voice | sections, buttons, body, labels, hints |
| **STIX Two Text** | mathematics voice | formulas and expressions you read |
| **JetBrains Mono** | data voice | the answer, numbers, step values, table cells |

**Poppins SemiBold is reserved for the logotype and is used nowhere else.** That reservation is the whole hierarchy: it keeps the wordmark the single heaviest thing on any screen, which in turn lets a screen title sit directly beneath it without competing. Every other Poppins use is Medium.

Formulas are set in STIX Two Text italic, the textbook convention for symbols. Computer Modern itself is not distributable from a web font service; STIX is drawn for scientific publishing and carries the same register. There is no LaTeX parser here, so digits take the italic too — acceptable because these formulas are nearly all symbolic. Anything still being typed stays mono, because character-by-character editing needs fixed widths.

Mono is not decoration. Every digit is the same width, so step tables keep their columns and an iterating value does not reflow as it converges — the thing this app asks of type more than anything else. It covers input too: an equation is set in the same face in the field, the step list and the result, so what you typed and what you read back are the same shape.

The ramp is display 34/40, title 26/32, value 24/32, section 18/24, body / action / numeric 16/24, label / numericSmall 14/20, caption 12/18. The single documented exception is the step table cell at 11 px, which keeps the dense column width. Mono styles also carry `tabular` as a fallback guarantee, so digits still line up if a face fails to load.

Spacing follows 4/8/12/16/24/32; content edges align at 20 dp. Buttons and fields have a 48 dp minimum height and no ornamental shadows. Every surface and control shares a 12 dp corner, pills excepted, so a field never reads tighter than the card beside it. Reading content is bounded on tablets.

All three families live in `src/shared/theme/typography.ts` as tokens, not as literals in screens. Android and iOS resolve a bundled face by file name (`Poppins-Medium`), the browser preview picks the weight numerically; `brandFace()` handles that split, so never pair a custom `fontFamily` with a `fontWeight` in a screen's StyleSheet.

## Surfaces on the mesh

Every screen sits on one lavender mesh drawn behind the whole navigator, so the header, the page and the area around the tab bar share a single continuous gradient. Nothing in the chrome paints its own opaque background.

Three rules keep that readable, and they apply everywhere:

- **Inputs own their surface.** A field is a bordered box on the mesh. It never sits inside a second white panel — stacking the two is what made some editors look boxed in and others bare.
- **Readouts get a card.** Anything you read rather than type — the answer figure, grouped values, step tables — sits in a `Section` card so it keeps full contrast against the gradient.
- **Lists stay transparent.** Rows with dividers read fine directly on the mesh and would fragment the page if each became a card.

## Navigation and hierarchy

Main destinations: Home, Solve, Learn and Notebook. Settings is secondary: it is reached from the header shortcut that every primary screen carries, in the same place on each, and lives on the stack rather than in the tab bar. Home is a dashboard, not a second copy of the other tabs: brand, one next action, what you last worked on, counted progress, and a door into each of the other three. It lists no methods — that is Solve's job.

Two things the home design deliberately does not do. It shows **no lesson progress**, because the app persists none; the "pick up where you left off" card reads the most recently touched notebook entry, which is real, and falls back to the guided first solve when the notebook is empty. And it has **no profile or account control**, because there are no accounts — the header shortcut opens Settings instead.

Solve groups its contents the way a student thinks about them — Root Finding and Interpolation — and carries a search field so nobody has to know which family a method belongs to. There is deliberately no general calculator: each method already owns the editor its inputs need, and a second surface that only evaluated expressions would have duplicated that without adding a capability. Each method row opens its dedicated problem screen. Calculate opens a separate result screen. Steps, graph, table and comparison are secondary destinations with visible Back navigation. Result answer/status is the first content; input screens contain no recorded process. Advanced settings and example selection are collapsed. Use the native navigation stack for Android Back and retained previous-screen state.

## Notebook

Rows show a title, method and concise problem preview. Search and a Pinned filter live here. A page contains its note and problem, with clear Edit and Calculate actions; Pin/Unpin remains visible on both rows and open pages. Notes/tags are optional, with duplication/deletion under More. Delete requires confirmation. Save/update shows pending and failure states, and never claims success before persistence.

## Brand assets and motion

The Numelix logomark and logotype ship as react-native-svg components (`src/shared/assets/Logomark.tsx`, `Wordmark.tsx`), not raster files, so they stay sharp at every density and need no per-dpi export. The logomark keeps its violet-to-blue gradient unchanged in both themes; the logotype is drawn as outlines and takes the theme ink, so it does not depend on a bundled font being present.

The logotype is **Bold**, and it is the heaviest thing on any screen — that is what the Poppins SemiBold/Bold reservation is for. Because outlines carry no weight axis, `Wordmark` synthesises it: `bold` strokes each glyph in its own fill colour, growing every stem by about 19%, while `semibold` is the brand outline exactly as drawn. Synthesising beats setting the logo in live Poppins, because a logo must never change shape just because a font failed to load.

Lockup proportions follow the brand's horizontal file: the mark is 0.39× the wordmark's width, and the two sit about a sixth of a mark-width apart (48 / 124 / 8 dp at full size). Keep that ratio when resizing; widening the gap is what makes the lockup read as two unrelated objects.

The six method marks are SVG components (`src/shared/assets/MethodMark.tsx`) sharing one 48 viewBox, one stroke weight and one dot radius, so they read as a family. They sit in a `primarySoft` tile and draw in `primary`; the selected row in the picker inverts to a filled `primary` tile. The generated PNGs they replace could not be tinted — their black background was opaque, not transparent — which is why they punched holes in the dark surface. The blue accent is held back for the "Current" chip, which is the only 10% moment on this screen.

Keep animation purposeful and native. The app contains no decorative hero animation, imagery or website-specific Taste effects. Respect reduced-motion settings.

## Guidance applied

Taste's consistency, plain copy, equal edges and real-product principles; Impeccable's product register, purposeful disclosure, familiar controls and contrast guidance. Website-only hero/effect/dealer requirements do not fit a native numerical tool.

## Navigation and motion

The bottom bar is violet in light mode and a violet-tinted dark surface in dark mode — this is where most of the 30% lands. A 40dp contrasting circle floats above a true transparent SVG cutout. Cubic shoulders widen during travel; one short clock morphs the outline and lifts the circle, then settles both at measured tab centers. No background-colored cover is used. The icon changes only when travel finishes; stale interrupted callbacks are ignored. Touch areas include the raised region and retain tab labels. At very large text scales, visible labels shorten to Solve/Notes/Learn/Setup without capping body text scaling.

Native stack task transitions distinguish forward/back and result entry. Tab content uses a short shift; guide stages use a small slide/fade; the sun/moon switch uses a native spring. System reduced motion disables movement. The guide's fixed action row keeps Back/Next-or-Calculate/Skip available while its content scrolls. Six generated method marks share the same 48dp square treatment; text supplies method identity.

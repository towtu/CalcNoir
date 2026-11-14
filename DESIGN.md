# CalcNoir design system

## Surface and context

An Android student uses a phone beside their notes in a bright classroom. White is the default reading surface, black carries primary actions; a monochrome dark appearance remains available for dim rooms. This replaces the former pink/teal palette at the user's explicit request.

## Palette

Light: background #FFFFFF, surface #FFFFFF, secondary surface #F5F5F5, ink #111111, secondary text #595959, decorative border #D1D1D1, input border #888888, primary #111111 with #FFFFFF text. Dark: background #101010, surface #181818, secondary surface #242424, ink #FAFAFA, secondary text #B8B8B8, decorative border #555555, input border #888888, primary #FAFAFA with #111111 text. Notices use neutral surfaces plus explicit Error/Warning labels. No semantic meaning depends on hue.

## Typography and spacing

Use Android's native sans family. Titles 26/32, section titles 18/24, body 16/24, labels 14/20, supporting text at least 12/18. Values may use tabular digits. Spacing follows 4/8/12/16/24/32; content edges align at 20 dp. Buttons and fields have a 48 dp minimum height, 8 dp corners and no ornamental shadows. Reading content is bounded on tablets.

## Navigation and hierarchy

Main destinations: Methods, Notebook, Learn and Settings. Each method row opens its dedicated problem screen. Calculate opens a separate result screen. Steps, graph, table and comparison are secondary destinations with visible Back navigation. Result answer/status is the first content; input screens contain no recorded process. Advanced settings and example selection are collapsed. Use the native navigation stack for Android Back and retained previous-screen state.

## Notebook

Rows show a title, method and concise problem preview. Search and a Pinned filter live here. A page contains its note and problem, with clear Edit and Calculate actions; Pin/Unpin remains visible on both rows and open pages. Notes/tags are optional, with duplication/deletion under More. Delete requires confirmation. Save/update shows pending and failure states, and never claims success before persistence.

## Brand assets and motion

Use a monochrome CalcNoir wordmark and a generated monochrome approximation mark; remove the colored Almost Exact mark from active app surfaces. Keep animation purposeful and native. The app contains no decorative hero animation, imagery or website-specific Taste effects. Respect reduced-motion settings.

## Guidance applied

Taste's consistency, plain copy, equal edges and real-product principles; Impeccable's product register, purposeful disclosure, familiar controls and contrast guidance. Website-only hero/effect/dealer requirements do not fit a native numerical tool.

## Navigation and motion

The bottom bar is black in light mode and gray in dark mode. A 40dp contrasting circle floats above a true transparent SVG cutout. Cubic shoulders widen during travel; one short clock morphs the outline and lifts the circle, then settles both at measured tab centers. No background-colored cover is used. The icon changes only when travel finishes; stale interrupted callbacks are ignored. Touch areas include the raised region and retain tab labels. At very large text scales, visible labels shorten to Solve/Notes/Learn/Setup without capping body text scaling.

Native stack task transitions distinguish forward/back and result entry. Tab content uses a short shift; guide stages use a small slide/fade; the sun/moon switch uses a native spring. System reduced motion disables movement. The guide's fixed action row keeps Back/Next-or-Calculate/Skip available while its content scrolls. Six generated method marks share the same 48dp square treatment; text supplies method identity.

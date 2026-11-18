# Superseded method artwork

The six CalcNoir-era method marks lived here as PNGs. **They have been
deleted** — `src/shared/assets/MethodMark.tsx` replaced them during the
Numelix rebrand, nothing imported them afterwards, and they carried about
2.4 MB of raster. This file is what remains of them: the geometry that the
SVG marks were drawn from.

They were generated as white monoline marks on an *opaque* black square, which
is why they could not be carried over: an opaque background cannot be tinted,
so on the Numelix dark surface they read as holes punched in the page rather
than as part of it. The SVG replacements take the theme colour, stay sharp at
every density, and remove roughly 2.4 MB of raster from the bundle.

The geometry descriptions below were the source for the SVG marks and are kept
for reference. The files themselves can be deleted once that is confirmed.

- bisection: an interval with two end stops, a dot at its midpoint, and a
  divider through the midpoint. Dividing an interval in half.
- newton: one rising curve and a straight tangent touching it at a single dot.
- secant: one rising curve and a straight secant crossing it at two dots.
- fixed-point: a nearly complete circular arrow with one central dot.
- newton-divided: a difference table — three dots, then two, then one, with
  diagonal connectors between consecutive rows.
- lagrange: a shallow S-curve passing through four dots.

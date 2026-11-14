# Liquid navbar correction

The user's reference requires a genuinely curved, changing bar silhouette and a floating selected circle. The prior implementation placed a background-colored 56dp view over a rectangular bar; that was a painted approximation and did not satisfy the request.

Replace the rectangle/cover with one closed SVG path whose top edge includes three cubic curves forming the notch shoulders and bowl. The notch has no fill: it reveals whatever lies beneath the bar. Keep the selected circle independently raised, 40dp, with a small depth shadow and no covering plate. During a short transition, the notch widens and the circle lifts, then both settle. Preserve late icon replacement, interruptibility, tab semantics, light black/dark gray colors and reduced motion. No extra dependency.

One Animated clock drives the SVG path coordinates and circle together without React rendering every frame. RN's transform-only native driver cannot interpolate path `d`, so this short shape animation explicitly uses the JS driver; other page/theme animations keep their existing drivers. Verify actual SVG geometry and interruption snapshots, a checkerboard transparency render, native motion including rapid taps, reduced motion behavior, light/dark and narrow/large-text/tablet layouts. Rebuild APK/AAB through existing guards; never clear data or weaken limits.

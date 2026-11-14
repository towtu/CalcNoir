# Liquid navbar correction — 2026-11-14

The earlier navbar used a background-colored round view to cover a rectangular bar. That did not match the user's liquid-navigation reference. This follow-up supersedes the earlier claim that its notch was a genuinely changing outline.

The bar now renders one closed SVG silhouette with cubic shoulders and a transparent notch. An independent 40dp circle has a small elevation shadow, with no white cover plate. During the 320ms transition the notch widens and the circle lifts before settling. The icon still changes on arrival, and interrupted animations resume from the current curve rather than jumping back. Colors, tab labels, press targets and system reduced motion remain supported.

One short Animated clock updates the SVG path and circle together, avoiding per-frame React rendering. SVG path coordinates are outside [React Native's native transform driver's supported properties](https://reactnative.dev/docs/animations), so this particular morph uses the JS driver. Existing page/theme animations retain their drivers. No animation package or other dependency was added.

## Verification

The new regression failed on the old painted-cover implementation. Fresh `npm run check` passes strict TypeScript, zero-warning ESLint and **362 tests in 21 suites**. Added checks cover a genuine path, no cover background, bounded geometry, mid-transition deformation and exact interrupted curve snapshots; existing delayed-icon/reduced-motion cases remain green.

A checkerboard render of the actual generated path shows the background through the notch throughout travel. Native Android screenshots and recording verify the same curve and floating circle. API 35 checks pass for rapid tab reversals, light/dark appearance, 375/768/1440dp and 320dp/200% text. The current app process has no runtime warnings/errors. Static icons fade according to the circle’s distance, avoiding a duplicate icon under the departing circle. The four-ABI APK/AAB rebuild passed in 45 seconds; bundled runtime, database-provider and matching-signature checks pass. Both the direct APK and AAB-derived universal APK installed and passed offline four-tab navigation and Lagrange calculation (2.25), plus rapid navigation in the packaged build. The final process warning/error log is empty. The owned test emulator was closed after verification; the pre-existing development Metro server was retained. Evidence is under ignored `artifacts/liquid-navbar/`.

This is a focused UI/motion change. No database, parser, permission or external integration change. The prior dependency disposition (nine low tooling advisories) remains applicable. Physical-phone frame-rate and TalkBack speech verification remain outside the emulator checks.


| Current package | Bytes | SHA-256 |
| --- | ---: | --- |
| calcnoir-preview.apk | 80209008 | `90be9f176559a6d1b5e647ae4de9d90ef354463d5e9df71c473dfbdf8846152c` |
| calcnoir-preview.aab | 56761197 | `a1b285f0ca6130f4c19304f5c1049bcafcd92fcfb5c562b7044d76cc46db3250` |

[Native appearance](../screenshots/liquid-navbar-methods.png) · [Transparent notch proof](../screenshots/liquid-navbar-transparency.png) · [Motion frames](../screenshots/liquid-navbar-motion-frames.png).

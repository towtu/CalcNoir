# Guided first solve — 2026-11-14

User explicitly requests a registration-like, step-by-step Getting Started, with a method choice followed by value entry and continued interaction. This supersedes the static three-item guide. Keep the established first-launch preference and Settings replay.

Use three focused stages, sharing the real method list, problem editor, validation and calculator: (1) choose one of six methods and press Next, (2) edit a prefilled working example and press Calculate, (3) see the actual result/status, then open the normal result workspace for steps, graph and saving. A visible progress label, Back and Skip remain available; invalid input stays on the form with a useful error. Going Back preserves the draft. No account or extra personal data is collected.

Implementation: extract reusable MethodChoices from MethodsScreen; replace GettingStartedScreen's static list with bounded local stage/draft/result state; wire completion to Result and skip to Methods on initial startup and replay. No new dependency. Existing user data and completion flag stay unchanged. Verify all six choices, invalid input, back/draft retention, skip/replay, completion result identity, narrow/large text and actual Android behavior.

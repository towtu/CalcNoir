# Dependency disposition — 2026-11-13

`npm audit` after the scoped update: **9 low, 0 moderate, 0 high, 0 critical**. `npm audit --omit=dev` still reports **4 low**, because the CLI is reachable through npm peer metadata; that audit is not clean. JSON evidence is retained in ignored `artifacts/qa/dependency-audit-after.json` and `dependency-audit-production.json`.

## Fixed

The [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) identifies versions 7 through 11.0.0 and a fix in 11.0.1. This checkout's affected copy was 10.2.6 under `@typescript-eslint/typescript-estree@8.72.2`; other tooling uses unaffected 3.1.5.

The override is scoped to that parent and pins 11.0.1. It crosses the parent's declared major-10 range, so it is an explicit compatibility exception. The current call site uses `minimatch(filePath, pattern, {dot:true})`; lint, strict TypeScript and all application tests pass after the update. Remove this override when TypeScript ESLint supports a patched version upstream. No runtime application dependency was added.

## Deferred with bounds

The [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) affects 4.2.0–4.3.1 and lists no patched release. The nine findings are this one low-severity advisory plus dependent CLI/Jest packages. The source app does not import it; the preview bundle's source map is also checked for deepmerge/minimatch modules. User equations and saved problems do not pass through these build-time configuration merge paths.

Keep project and test configuration trusted. Do not run arbitrary third-party repository configuration as a workaround. Retain the current compatible toolchain rather than applying npm's proposed breaking CLI/Jest changes. Review **2026-11-27**, or earlier when a patched compatible toolchain appears. Production publication should re-audit against that day's advisories.

Reproduce with `npm ci`, `npm run check`, `npm audit --json`, and `npm audit --omit=dev --json`. To roll back this particular override, remove only the `@typescript-eslint/typescript-estree` override in package.json and regenerate its lockfile; doing so restores the moderate advisory.

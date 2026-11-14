# QA and security audit — 2026-11-13

Scope: the offline native Android app in `Numerical/calcnoir`. Test the improved checkout and its packages; preserve the original Calculix source, other device data, and all resource guards. Live AI/backend, accounts, uploads and payments do not exist in this milestone.

## Cases

| ID | Area | Checks |
| --- | --- | --- |
| ALG-01 | Root methods | All presets, editable equalities/functions, independent known roots, endpoint roots, invalid brackets/guesses, exhaustion and stagnation |
| ALG-02 | Interpolation | Known polynomials, exact nodes, unsorted/negative/fractional points, targets inside/outside range, duplicate/nearby/huge coordinates, conditioning |
| ALG-03 | Numerical honesty | Rootless equations, scale factors, cancellation, overflow/underflow/saturation, finite outputs, matching step/table/plot geometry |
| SEC-01 | Expression boundary | Reject assignments, properties/accessors, matrices, arbitrary functions, unsupported symbols, very long/complex inputs; bounded work |
| SEC-02 | Persistence | Missing/malformed/oversized/unknown-version data, invalid records, duplicates, 40-entry cap, read/write failure, concurrent saves/removes, preservation |
| SEC-03 | Android package | IDs, variants, permissions, exported components, backup, cleartext, debug flags, bundled runtime, signatures and secrets scan with redacted results |
| SEC-04 | Dependencies | Fresh full/omit-dev audits; primary-source advisory review; reachable paths and compatible fixes; document unavoidable residuals with review date |
| UI-01 | Solver state | Editing, presets/method switches, pending/double submission, invalid drafts, stale actions, back/unmount, displayed precision, save/share feedback |
| UI-02 | Other flows | Same-problem comparison and failures, notebook reopen/remove, theme hydration/persistence, practice answer/hint/next and feedback reset |
| NATIVE-01 | Device behavior | Production-style preview offline, invalid expression and domain failures, six methods, graph/table linkage, share sheet, modal/back, persistence/restart |
| NATIVE-02 | Accessibility/layout | Labels/selected/disabled states, keyboard and large font, narrow phone/tablet/landscape, contrast, dark theme, no clipped core actions |
| BUILD-01 | Safeguards and handoff | Typecheck/lint/application and safeguard tests, guarded rebuild after fixes, APK/AAB integrity/signatures/checksums, regression evidence |

Findings and dispositions go in `bugs.md`; completion evidence and honest limitations go in `report.md`. Automated math/security/UI investigations use separate scopes; native interaction and dependency mutations remain centralized. No unrestricted stress tests, host memory exhaustion, external messaging, or production publishing.

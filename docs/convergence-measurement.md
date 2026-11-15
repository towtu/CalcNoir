# Convergence measurement

`Calculation` records how an iterative method approached its answer, not only
the answer. Screens read these fields; the core never re-runs an algorithm to
produce them.

| Field | Meaning |
| --- | --- |
| `errors` | `|x(n) − x(n−1)|` per accepted iteration, oldest first |
| `residuals` | `|f(x(n))|` per accepted iteration, index-aligned with `errors` |
| `observedOrder` | measured order of convergence `p`, or null |
| `errorConstant` | measured asymptotic constant `C`, or null |
| `evaluationsPerIteration` | cost charged by the iteration formula |
| `diagnosis` | the specific numerical cause a run stopped |

An iterative method satisfies `e(n+1) ≈ C · e(n)^p` near the root, so two
consecutive error ratios expose `p`. `estimateOrder` computes that quotient for
every usable triple and reports the median of the three most recent, because a
single triple is fragile: early iterations are pre-asymptotic and some methods
oscillate.

Retained estimates are not recorded. When Newton or secant accepts the current
value instead of stepping, the predicted step was never taken, so recording it
would describe an iteration that did not happen.

## Measured results

From the app's own starter problems at the default tolerance `1e-6`
(`__tests__/convergenceReport.test.ts` prints this table):

| Problem | Method | Iterations | Evaluations | Measured `p` | Theory |
| --- | --- | --- | --- | --- | --- |
| √2 | bisection | 20 | 23 | **1.0000** | 1 |
| √2 | newton | 4 | 9 | **1.9995** | 2 |
| √2 | secant | 5 | 7 | 1.8722 | 1.618 |
| √2 | fixed-point | 3 | 13 | **1.9995** | see below |
| cos x − x | bisection | 20 | 23 | **1.0000** | 1 |
| cos x − x | newton | 4 | 9 | **2.0440** | 2 |
| cos x − x | secant | 5 | 7 | 1.4693 | 1.618 |
| cos x − x | fixed-point | 33 | 133 | **1.0000** | 1 |
| x³ − x − 2 | bisection | 21 | 25 | **1.0000** | 1 |
| x³ − x − 2 | newton | 3 | 7 | — | 2 |
| x³ − x − 2 | secant | 5 | 7 | 3.0863 | 1.618 |
| x³ − x − 2 | fixed-point | 6 | 25 | **1.0000** | 1 |

Bisection measures exactly `p = 1.0000` with `C = 5.00e-1`, which is the
halving constant recovered from data. Newton measures ≈ 2.

The √2 fixed-point result is not an error. That preset uses
`g(x) = (x + 2/x)/2`, which is Newton's iteration for `x² − 2` rewritten as a
mapping, so quadratic convergence is the correct measurement. On the other two
problems the same method measures linear, as expected.

## Known limitations

**Secant is not measured reliably.** Theory gives `p = φ ≈ 1.618`; the table
shows 1.4693, 1.8722 and 3.0863. Two causes, both real:

1. The secant method obeys a two-term recurrence, `e(n+1) ≈ C · e(n) · e(n−1)`.
   Its order is the limit of a ratio that alternates above and below `φ`, so
   consecutive three-point estimates straddle rather than settle.
2. At tolerance `1e-6` these problems converge in 3–5 iterations. That is too
   few terms in the asymptotic regime, and `|x(n) − x(n−1)|` is only a proxy
   for the true error `|x(n) − x*|`.

**Fast convergence can yield no measurement.** Newton on `x³ − x − 2` converges
in 3 iterations, leaving fewer than three recorded errors, so `observedOrder`
is null. A null is reported rather than a guess.

**Tightening the tolerance does not fix this by itself.** Step differences
stall at machine precision, and those final values are noise. Measured with
true error against a reference root instead, Newton gives 1.9839 then 1.9998,
and secant at tolerance `1e-14` gives 1.3331 then 1.7503 — still straddling
`φ`, but bounded.

The intended fix is a high-precision reference root, so error is measured as
`|x(n) − x*|` rather than as a step difference. Until that exists, treat
`observedOrder` as indicative for secant and dependable for bisection, Newton
and fixed-point.

# Ratings card template — `<dev>-ratings-card-<date>.md`

One page. Comparable across audits over time. Audience: the manager (you) — a quick scorecard you can scan in 30 seconds and quote in a meeting.

---

```markdown
# <dev_display_name> — Ratings Card

**Date:** <YYYY-MM-DD>
**Window audited:** <since-date> → <today>
**Repos:** <repo-1, repo-2, ...>
**Total findings:** <N> CRITICAL, <N> HIGH, <N> MED, <N> LOW
**Hypothesis tested:** <hypothesis or "none"> — **<SUPPORTED / CONTRADICTED / MIXED / N/A>**

---

## Scorecard

| # | Axis | Score | Evidence (file:line / commit) |
|---|---|---|---|
| 1 | Convention adherence | X.X / 5 | <e.g. `convention.mdc §3.2 violated at bookings.ts:185 (a7c35ea7)`> |
| 2 | Architecture & system thinking | X.X / 5 | <e.g. `payment state machine warranty-payment-service.ts:85 — strong; vs 1237-line route file roommates/[id]/route.ts — weak`> |
| 3 | Correctness & edge-case handling | X.X / 5 | <e.g. `referrals.ts:78 empty-array guard bug — CRITICAL`> |
| 4 | Security awareness | X.X / 5 | <e.g. `school-partnership.ts:14 open relay — CRITICAL`> |
| 5 | Concurrency & atomicity | X.X / 5 | <e.g. `exit-window.ts:240 stale-read race on order amount`> |
| 6 | Type discipline | X.X / 5 | <e.g. `~25× (supabase as any) in faculty-bulletins/`> |
| 7 | Self-review discipline | X.X / 5 | <e.g. `9 'build errors resolved' commits across repos; debug console.log surviving 3 months at referrals.ts:93`> |
| 8 | Delivery speed | X.X / 5 | <e.g. `roommates v2 + faculty bulletins + schools partnership in 90 days; substantial scope`> |
| 9 | Commit & branch hygiene | X.X / 5 | <e.g. `8 duplicate-named pairs in motornomic; commit-msg typos`> |
| 10 | Growth signal | X.X / 5 | <e.g. `Logger adopted in new code, not propagated to old; prior CRITICAL unfixed 3 months later`> |
| | **Overall** | **X.X / 5** | |

---

## Verdict

**<one of: Ready for autonomous senior work / Ready with code review on critical paths / Needs structured corrective plan / Fit conversation>**

<2-sentence rationale, including any axis-below-2 flags even when overall is high>

---

## Top 3 strengths (real, specific)

1. **<Strength title>** — <file:line> (<commit SHA>). <One-sentence why this matters>.
2. **<Strength title>** — <file:line> (<commit SHA>). <One-sentence why this matters>.
3. **<Strength title>** — <file:line> (<commit SHA>). <One-sentence why this matters>.

## Top 3 weaknesses (live in production right now)

1. **<Weakness title>** — <file:line> (<commit SHA>). <One-sentence "why it matters">.
2. **<Weakness title>** — <file:line> (<commit SHA>). <One-sentence "why it matters">.
3. **<Weakness title>** — <file:line> (<commit SHA>). <One-sentence "why it matters">.

---

## Compared to prior audit (if applicable)

<Two-line diff: which axes moved up, which moved down, which prior CRITICAL/HIGH issues were fixed vs. unfixed>

---

## One-line summary

<One sentence the manager can quote in standup or back-channel: "<dev> is competent on architecture (4) but discipline gap on self-review (1.5) — capable, not consistent." or similar>
```

---

## Notes for the synthesizer

- Round all scores to 0.1.
- Every score row MUST have an evidence citation. If you can't cite, you can't score.
- The "Top 3 weaknesses" list is what the meeting opens with. Pick the most defensible CRITICALs, with the freshest evidence.
- The "Top 3 strengths" list is what makes the report credible. Don't pad with motherhood. If only 1–2 real strengths, list 1–2 and say so.
- The "Compared to prior audit" section is the most valuable line on the page when a prior audit exists. Manager time is precious; this saves it.
- The "One-line summary" is for back-channel sharing — a Slack DM, a hallway conversation, the opening line of a Linear ticket. Make it sharp.

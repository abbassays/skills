# Full audit template — `<dev>-full-audit-<date>.md`

Long-form reference doc. Audience: anyone who needs to verify or quote an agenda claim. Length: 10–30 pages depending on repo count + finding density.

This doc is the **backstop** for every claim in the meeting agenda — every CRITICAL/HIGH should be quotable from here with a file:line + commit SHA.

---

```markdown
# <dev_display_name> — Code Quality Audit (<window>, <date>)

**Date:** <YYYY-MM-DD>
**Window:** <since-date> → <today>
**Reviewer:** Independent <tone> re-review across <N> production repos
**Author identities tracked:** <list of `Name <email>`>
**Companion docs:**
- [<dev>-meeting-agenda-<date>.md](<path>) — talking points
- [<dev>-ratings-card-<date>.md](<path>) — one-page scorecard

---

## Scope reviewed

| Repo | Branch | Commits | Files touched | LOC (+/−) |
|---|---|---|---|---|
| <repo-1> | <branch-1> | <N> | <N> | +<N> / −<N> |
| <repo-2> | ... | ... | ... | ... |
| ... | | | | |

---

## Severity counts (cross-repo)

| Repo | CRITICAL | HIGH | MED | LOW |
|---|---|---|---|---|
| <repo-1> | <N> | <N> | <N> | <N> |
| <repo-2> | <N> | <N> | <N> | <N> |
| ... | | | | |
| **Total** | **<N>** | **<N>** | **<N>** | **<N>** |

<N> distinct findings. The CRITICAL/HIGH bucket (<N> items) drives the meeting agenda.

---

## Verdict on the central hypothesis

**"<hypothesis>" — <SUPPORTED / CONTRADICTED / MIXED> across all <N> repos by independent audits.**

<Triangulation paragraph: each independent audit arrived at this verdict via different evidence. Triangulation matters: this is not a one-repo or one-sprint anomaly.>

<The pattern in one sentence:> <e.g. "ship fast → break build / leave validation commented / leave debug logs / ship XSS or race → patch days or weeks later → move on. The cumulative tech debt is now visible in (a) bugs that have been live in production for months despite prior reviews, and (b) 1k+ line route files and components that can't be reviewed.">

**Capability vs discipline read:** <e.g. "Capability is not the problem. When the dev slows down, they hit a senior bar (see Strengths). The pattern is therefore a discipline gap, not a knowledge gap. That's good news because discipline gaps close in weeks, not quarters.">

---

## Cross-cutting patterns

### Pattern 1 — <name>

| Repo | Evidence | Severity |
|---|---|---|
| <repo-1> | <file:line + 1-line description> | CRITICAL |
| <repo-2> | <file:line + 1-line description> | HIGH |
| ... | | |

Common root cause: <one paragraph synthesizing why this pattern recurs>.

### Pattern 2 — <name>

(Repeat for each cross-cutting pattern identified in Phase 4 step 2.)

---

## Aggregate ratings

| # | Axis | Score | Cross-repo evidence summary |
|---|---|---|---|
| 1 | Convention adherence | <X.X> / 5 | <one-line> |
| 2 | Architecture & system thinking | <X.X> / 5 | <one-line> |
| 3 | Correctness & edge-case handling | <X.X> / 5 | <one-line> |
| 4 | Security awareness | <X.X> / 5 | <one-line> |
| 5 | Concurrency & atomicity | <X.X> / 5 | <one-line> |
| 6 | Type discipline | <X.X> / 5 | <one-line> |
| 7 | Self-review discipline | <X.X> / 5 | <one-line> |
| 8 | Delivery speed | <X.X> / 5 | <one-line> |
| 9 | Commit & branch hygiene | <X.X> / 5 | <one-line> |
| 10 | Growth signal | <X.X> / 5 | <one-line> |
| | **Overall** | **<X.X> / 5** | |

**Verdict:** <one of: Ready for autonomous senior work / Ready with code review on critical paths / Needs structured corrective plan / Fit conversation>

<Axis-below-2 flags if any: e.g. "Despite overall 3.8, axis 7 (self-review) at 1.5 means: paired review on critical paths until axis 7 ≥ 3 sustained for 2 sprints.">

---

## What they get right (real, specific)

These are not padding. Each is a concrete piece of code the dev wrote that hits a senior bar.

### Architecture / system thinking
- **<Strength>** at <file:line> (<commit>). <Why this is senior-level>.
- ...

### Engineering hygiene (when applied)
- **<Strength>** at <file:line> (<commit>). <Why this is senior-level>.
- ...

### Specific cleverness
- **<Strength>** at <file:line> (<commit>). <Why this is senior-level>.
- ...

### Read this as
<One-paragraph synthesis: "Dev is structurally capable of senior work. They're not consistent about it. The 1:1 should land on consistency, not capability.">

---

## systemdesign.io topics ranked by leverage

| Rank | Topic | Maps to findings | Architectural challenge |
|---|---|---|---|
| 1 | <topic> | <list> | <specific assignment> |
| 2 | <topic> | <list> | <specific assignment> |
| 3 | <topic> | <list> | <specific assignment> |

---

## Decision-frame recommendation

(If Phase 1 Q3.3 captured a downstream decision)

**On the <decision> question:** <explicit recommendation with reasoning>

---

# Per-repo full reports

Sections below are the full audit reports produced by independent reviewers. Reproduced verbatim so every claim above is auditable line by line.

---

## Repo 1 — <repo_name> (`<branch>`)

### Commit pattern
<from per-repo report>

### Areas owned
<from per-repo report>

### Rules artifacts
| File | Mandates |
|---|---|
| ... | ... |

### Status of issues from prior review
(only include if a prior audit was provided)
<verbatim from per-repo report>

### CRITICAL findings
<verbatim — each finding with full title, file:line, commit SHA, rule violated, severity rationale, "why it matters">

### HIGH findings
<verbatim>

### MED findings (summary)
<one-line per finding with file:line + severity rationale>

### LOW findings (summary)
<one-line per finding>

### Strengths
<verbatim from per-repo report>

### Verdict on hypothesis
<verbatim>

---

## Repo 2 — <repo_name> (`<branch>`)

(Repeat structure)

---

## Repo 3 — <repo_name> (`<branch>`)

(Repeat structure)

---

## Evidence files (kept for reference)

The full per-repo audit reports (verbose) are also at:

- `<output-folder>/<dev>-audit-<repo-1>-<date>.md`
- `<output-folder>/<dev>-audit-<repo-2>-<date>.md`
- ...

These were originally written by the per-repo subagents to `/tmp/`; they've been copied here for permanence.
```

---

## Notes for the synthesizer

- The audit doc is the **reference layer**. Every claim in the meeting agenda must be quotable from this doc with a file:line + commit SHA. If you can't trace a claim back to specific evidence in this doc, the claim doesn't belong in the agenda.
- MED and LOW findings stay collapsed to one-liners in the per-repo sections — readers can find more detail in the verbatim per-repo reports if needed. CRITICAL and HIGH findings should be reproduced verbatim with full evidence.
- The cross-cutting patterns section is the most valuable analysis. Don't skimp on it.
- The capability-vs-discipline paragraph in the verdict is the most important sentence in the entire doc — it sets the tone for the entire response (corrective plan vs. fit conversation).

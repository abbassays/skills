# Phase 1 — Pre-flight question bank

The skill MUST gather these answers via `AskUserQuestion` **before** running any tool that touches the repos. Today's reference run skipped some of these and had to backfill mid-audit; don't repeat that.

Group the questions into **2–4 AskUserQuestion calls** (the tool caps at 4 questions per call). Suggested batching below.

---

## Batch 1 — Scope

Ask these first; they determine the rest of the run.

### Q1.1 — Which developer?

```
question: "Whose work are we auditing? (Display name as it appears in git commits.)"
header:   "Developer"
multiSelect: false
options:
  - label: "<dev name 1 inferred from cwd or recent context>"
    description: "<context — e.g. 'mentioned in your prior audit at internal-HR/.../<X>'>"
  - label: "Custom name"
    description: "Type a different name."
```

If the user has multiple known team members, generate options dynamically from `git log --format='%aN' | sort -u | uniq -c | sort -rn` in any nearby repo. Otherwise leave it as Custom.

### Q1.2 — Which repos and branches?

```
question: "Which repos under /Users/muhammadaliabbas/dev/ should we audit, and what's the canonical branch for each?"
header:   "Repos"
multiSelect: true
```

Populate options from `ls /Users/muhammadaliabbas/dev/` filtered to git repos (`find /Users/muhammadaliabbas/dev/ -maxdepth 2 -name .git -type d`). Default branch per repo: NEVER assume `main`. Run `git -C <repo> branch --show-current` and `git -C <repo> branch -a | head -10` and present results. Confirm with the user — Motornomic uses `mnr-production-ready`, Unibid uses `dev`, etc.

### Q1.3 — Time window?

```
question: "How far back should we audit?"
header:   "Time window"
multiSelect: false
options:
  - label: "Last 3 months (Recommended)"
    description: "Captures recent sprint cadence. Default for active devs."
  - label: "Last 1 month"
    description: "Tight focus — for quick check-ins or post-incident reviews."
  - label: "Last 6 months"
    description: "Mid-term — for promotion / performance-cycle decisions."
  - label: "Since prior audit"
    description: "Diff vs. an earlier audit you'll provide. Tells you whether they grew."
```

If "Since prior audit" is selected, follow up with a path to the prior audit doc (Q3.1 below).

---

## Batch 2 — Focus

### Q2.1 — Which axes to focus on?

```
question: "Which axes of quality should the audit emphasize?"
header:   "Audit axes"
multiSelect: true
options:
  - label: "Rule & convention violations"
    description: "Compliance with .cursor/rules/, CLAUDE.md, ESLint, naming, file structure."
  - label: "Architecture & system thinking"
    description: "Decomposition, server/client boundaries, schema design, abstractions."
  - label: "Correctness bugs & security"
    description: "Disabled checks, missing error handling, RLS/auth gaps, validation, XSS/SQLi/SSRF."
  - label: "Sloppy / unreviewed commits"
    description: "Build-error churn, debug logs surviving, commented-out validation, retrofit commits."
```

(`AskUserQuestion` caps at 4 options; if you also want type-discipline / performance / test-coverage / commit-hygiene as picks, run a follow-up with the remaining options.)

### Q2.2 — Tone of the report?

```
question: "What tone should the report take?"
header:   "Tone"
multiSelect: false
options:
  - label: "Strict-but-fair (Recommended)"
    description: "Strict reviewer; calls out strengths to keep the report credible. Best for confrontational 1:1 prep."
  - label: "Strict & adversarial"
    description: "Hostile-senior mode. No benefit-of-the-doubt. Risk: looks like a hit-piece if the work is actually decent."
  - label: "Balanced"
    description: "Both strengths and weaknesses noted equally. Good for non-confrontational growth conversations."
  - label: "Investigation-mode (verify hypothesis)"
    description: "Neutral; explicitly testing a named hypothesis with yes/no verdict. Use when you want to know IF the problem is real."
```

### Q2.3 — Output format?

```
question: "What deliverables do you want?"
header:   "Output"
multiSelect: false
options:
  - label: "Agenda + full audit + ratings card (Recommended)"
    description: "Three docs: meeting-ready talking points, full per-repo evidence, one-page scorecard."
  - label: "Just ratings card"
    description: "One page, comparable across audits over time. Good for quarterly check-ins."
  - label: "Just full audit"
    description: "Long-form reference doc only. Skip if you don't have a meeting planned."
  - label: "Just meeting agenda"
    description: "Talking points only, fed by the per-repo audits but not bundled. Quickest read."
```

---

## Batch 3 — Hypotheses & priors

### Q3.1 — Hypothesis to verify? (optional)

```
question: "Is there a specific hypothesis you want the audit to verify?"
header:   "Hypothesis"
multiSelect: false
options:
  - label: "No specific hypothesis — broad audit"
    description: "Open-ended. The audit will surface whatever's most concerning."
  - label: "Pushes without reviewing"
    description: "Looks for: build-error commits, retrofit commits, debug logs surviving merge, commented-out validation, duplicate/inverse commit pairs."
  - label: "Slows down on architectural work"
    description: "Looks for: 1k+ line files, prop drilling, leaky abstractions, missing service-layer separation, premature abstractions."
  - label: "Custom hypothesis"
    description: "You'll describe it in free text. The audit will design specific signals to test it."
```

### Q3.2 — Prior audits or external reports?

```
question: "Are there prior audits, performance reports, or third-party complaints we should feed to the agents?"
header:   "Priors"
multiSelect: false
options:
  - label: "Yes — I'll provide path(s)"
    description: "Will be read by per-repo agents; they'll verify whether prior CRITICAL/HIGH issues were actually fixed, and avoid re-litigating settled ground."
  - label: "No prior audits"
    description: "Cold-start audit. Agents will baseline from scratch."
```

If yes, follow up with a free-text "What's the path?" question, accept absolute paths.

### Q3.3 — Downstream decision frame? (optional but high-leverage)

```
question: "Is this audit feeding a specific decision? (If yes, the synthesis will land an explicit recommendation on it.)"
header:   "Decision frame"
multiSelect: false
options:
  - label: "1:1 performance conversation"
    description: "Agenda + corrective plan are the headline outputs."
  - label: "Client / interview pipeline placement"
    description: "'Is this dev ready to put on X's interview pipeline?' will get an explicit yes/no/conditional."
  - label: "Promotion / rate-increase decision"
    description: "Ratings card with comparison to a prior audit (if provided) becomes the headline."
  - label: "Contract continuation / let-go decision"
    description: "Synthesis will lay out the case for/against retention with severity-weighted evidence."
```

---

## Batch 4 — Customization & output

### Q4.1 — Customize rating axes?

```
question: "The default ratings card has 10 axes (conventions, architecture, correctness, security, concurrency, types, self-review, speed, hygiene, growth). Want to customize?"
header:   "Rating axes"
multiSelect: false
options:
  - label: "Use the default 10 (Recommended)"
    description: "Standard axes, comparable across devs and over time."
  - label: "Customize — add/remove axes"
    description: "Useful for domain-specific evals — e.g. 'API design' for backend devs, 'UX/visual fidelity' for frontend devs."
```

If customize → follow-up free-text "Which axes to add or remove?".

### Q4.2 — Output location?

```
question: "Where should the deliverables be written?"
header:   "Output path"
multiSelect: false
options:
  - label: "Current working directory (if it's an HR/planning workspace)"
    description: "Recommended when cwd is something like internal-HR/<dev>/."
  - label: "/tmp/<dev>-audit-<date>/"
    description: "Scratch — delete after the meeting. Won't survive reboot."
  - label: "Custom path"
    description: "Specify exactly where."
```

---

## After Phase 1

Echo back a summary of decisions before starting Phase 2:

> "Auditing **<dev>** across **<repos>** on branches **<branches>** for the last **<window>**. Focus: **<axes>**. Tone: **<tone>**. Output: **<format>** at **<path>**. Hypothesis: **<hypothesis>**. Decision frame: **<decision>**. Prior audits: **<priors>**.
>
> Proceeding to Phase 2: identity confirmation + rules-artifact discovery."

Then run Phase 2.

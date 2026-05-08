# Phase 4 — Cross-repo synthesis (orchestrator)

After Phase 3 returns (one report per repo, sometimes multiple per repo for large codebases), the orchestrator synthesizes findings into cross-cutting patterns and produces the aggregate ratings card.

This is **the orchestrator's job, not a subagent's**. Subagents see only their own repo; only the orchestrator sees the full picture.

---

## Inputs

- Per-repo reports at `/tmp/<dev-slug>-audit-<repo-slug>.md` (one or more per repo)
- Phase 1 decisions (tone, hypothesis, decision frame, output format, output path)
- Phase 2 sanity-check data (commit counts, LOC, identities)
- Optional: prior audit at `<<PRIOR_AUDIT_PATH>>`

## Outputs

- `<dev-slug>-ratings-card-<date>.md` (1 page)
- `<dev-slug>-meeting-agenda-<date>.md` (talking points)
- `<dev-slug>-full-audit-<date>.md` (long-form)
- Per-repo verbatim reports copied from `/tmp` to the output folder for permanence

---

## Synthesis steps

### Step 1 — Severity counts table

For each repo, count CRITICAL / HIGH / MED / LOW findings. Build a table:

| Repo | CRITICAL | HIGH | MED | LOW |
|---|---|---|---|---|
| Repo A | n | n | n | n |
| Repo B | n | n | n | n |
| **Total** | **n** | **n** | **n** | **n** |

The CRITICAL/HIGH bucket drives the meeting agenda. The MED/LOW bucket goes in the audit doc reference appendix.

### Step 2 — Cross-cutting patterns (THE most important step)

Read all per-repo reports. Look for findings that **repeat across repos**. Patterns are stronger evidence than single findings — they prove it's not a one-time mistake.

For each pattern you identify:
- Name it (e.g. "validation at trust boundaries weak", "concurrency blind spot")
- List the specific findings supporting it (one row per repo)
- Give the cross-cutting "why this matters" — why is this pattern especially bad?

Common patterns to look for (adjust to what your audits surface):

1. **Validation at trust boundaries weak** — `JSON.parse as ...` on webhooks, `c: any` on public endpoints, schemas accepting `Infinity`, missing server-side re-validation on server actions, `.eq()` without `.single()`.
2. **Concurrency / atomicity blind spot** — in-memory dedupe Maps for serverless webhooks, hand-rolled `.delete()` rollback chains, TOCTOU on publish/state-change endpoints, read-modify-write at app layer on financial values.
3. **Service-role / RLS-bypass discipline failure** — admin client used for writes that RLS would have allowed, public reads of PII via service-role.
4. **Disabled validation forgotten in main** — commented-out checks that survive into production code for weeks/months.
5. **Type-system bypass instead of root-cause fix** — `as any` carpet-bombs, `(supabase as any)` for un-regenerated types, returning insert payloads typed as success rows.
6. **Single files / commits too large to review** — 1k+ line files, 2k+ LOC single commits with no PR.
7. **Same files refactored 3+ times within weeks** — diagnostic, check-in, middleware, etc. with "X correctly used" retrofit commits.
8. **Build / lint / type discipline missing** — multiple "build errors resolved" commits per sprint, 78-file lint sweeps proving local linting wasn't running.
9. **Commit hygiene as a tell** — duplicate-named pairs, inverse commits, typos in commit messages.

If a pattern shows up in **all repos**, that's the most damning evidence — it proves it's systemic, not project-specific.

### Step 3 — Verdict on hypothesis (triangulation)

If Phase 1 named a hypothesis, the synthesizer must declare a verdict:

- **SUPPORTED** by all repos independently → write "**Confirmed.** All N independent audits arrived at this verdict." This triangulation is the strongest evidence you can produce.
- **SUPPORTED** by some repos but not others → write "**Mixed.** Supported in repo X, contradicted in repo Y. Hypothesis is project-specific or context-specific. <Specific reason>."
- **CONTRADICTED** by all repos → write "**Refuted.** No repo's evidence supports it. The original concern was not borne out."

Always cite specific findings under the verdict — not just the verdict word.

### Step 4 — Strengths roll-up

Read each per-repo report's Strengths section. Dedupe. Roll up into a cross-repo strengths list under three categories:

1. **Architecture / system thinking** (patterns, decompositions)
2. **Engineering hygiene when applied** (Logger usage, schema reuse, transaction discipline)
3. **Specific cleverness** (HMAC token, state machine, ledger pattern)

If a strength shows up in multiple repos, it's a real capability — call it out as such.

If the dev's "ceiling" (best work) is significantly higher than their "floor" (worst work), that's the **capability vs. discipline** distinction. Make this finding explicit:

> "Capability isn't the problem. When the dev slows down, they hit a senior bar (see Strengths). The pattern of <X, Y, Z bad behaviors> is therefore a discipline gap, not a knowledge gap. That's good news because discipline gaps close in weeks, not quarters."

### Step 5 — Aggregate ratings

Per-repo agents produced per-repo ratings cards in Phase 3. Aggregate:

- For each axis: mean of per-repo scores (round to 0.1)
- Overall: mean of all axes
- Determine verdict bucket per the rubric thresholds
- Flag any axis below 2 even when overall is high

Build the ratings card per [`output-templates/ratings-card.md`](output-templates/ratings-card.md). Every score MUST cite at least one piece of evidence from the per-repo reports.

### Step 6 — systemdesign.io topics, ranked by leverage

Each per-repo agent recommended 2–3 systemdesign.io topics. Dedupe and rank by:

1. **Number of findings the topic addresses** (more = higher rank)
2. **Severity of those findings** (CRITICAL > HIGH > MED)
3. **Cross-repo coverage** (topic that addresses gaps in 3 repos > topic that addresses 1 repo)

Build a ranked list:

| Rank | Topic | Maps to findings |
|---|---|---|
| 1 | Idempotency & concurrency in OLTP | Vestify C4, C5; Motornomic C1; Unibid H2 |
| 2 | Validation at trust boundaries | Motornomic C2, C3; Unibid C2, C3, C4; Vestify C3, M7 |
| 3 | RLS + service-role discipline | Unibid C1; Vestify H3; Motornomic H3 |

For each topic, also write an **architectural challenge** to assign him on systemdesign.io — tied to a specific bug in his code so he can't dismiss it as academic. Examples:

- *"Design the order matching engine for a secondary market. Handle partial fills, concurrent buyers, idempotent retries. Sketch schema, atomic update statements, and failure model."* (Topic 1, tied to Vestify C4)
- *"Design the public ingest endpoint for X bookings. JSON or multipart, validate at the edge, write to canonical jobs table, rate-limit, survive 100× burst."* (Topic 2, tied to Motornomic C3)

### Step 7 — Decision-frame recommendation (if Phase 1 captured one)

If the user said this audit is feeding a downstream decision (Q3.3), end the synthesis with an **explicit recommendation** on it. Don't leave it implicit.

Examples:

- **Client / interview pipeline placement:** "**Recommend NOT presenting <dev> for <client>'s interview pipeline this week.** <Specific finding> is too risky for <client's> stated requirement of <quote>. Use the 4-week corrective window as the gate; revisit by <date>."
- **Promotion decision:** "**Recommend deferring promotion until <axis>≥ 3 sustained for 2 sprints.** Current overall <score> with axis <X> at <Y> doesn't meet the senior bar. Path back: <three concrete behaviors>."
- **Contract continuation:** "**Recommend continuation with conditions.** Conditions: <list>. Re-evaluate at <date>."
- **1:1 prep:** "**Lead the 1:1 with <headline finding>.** Don't soften it. Wait for response before moving to <secondary points>."

This is the single highest-leverage paragraph in the synthesis. Make it count.

---

## Final output assembly

Use the templates:

- [`output-templates/ratings-card.md`](output-templates/ratings-card.md)
- [`output-templates/meeting-agenda.md`](output-templates/meeting-agenda.md)
- [`output-templates/full-audit.md`](output-templates/full-audit.md)

Populate each from the synthesis steps above. Save to the user's chosen output path (Phase 1 Q4.2). Copy the per-repo `/tmp` reports to the same folder for permanence.

Update any project-level file registry if the output folder is in a planning workspace (e.g. update `.cursor/rules/file-registry.mdc` if it exists in the output folder's parent).

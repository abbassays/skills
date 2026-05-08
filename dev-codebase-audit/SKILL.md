---
name: dev-codebase-audit
description: Multi-repo, evidence-grounded audit of a single developer's recent work — produces a meeting-ready agenda, a full per-repo audit, and a multi-axis ratings card (conventions, architecture, correctness, security, concurrency, delivery speed, self-review discipline, type discipline, commit hygiene, growth signal). Spawns parallel per-repo subagents and synthesizes their findings into cross-cutting patterns and systemdesign.io recommendations. TRIGGER when the user wants to evaluate a specific developer's quality, prepare for a performance 1:1, decide whether to present a developer to a client/interview pipeline, validate a hypothesis like "X pushes without reviewing", or compare a developer's profile against an earlier audit.
---

# dev-codebase-audit

Audit one developer's recent work across one or more repos and produce three deliverables: a **ratings card**, a **meeting agenda**, and a **full per-repo audit**. Designed for the moment when a manager needs honest, evidence-grounded answers to questions like *"is this person ready to put on a client's interview pipeline?"*, *"are they actually pushing without reviewing the way the team-lead claims?"*, *"have they grown since the last audit?"*.

The skill spawns parallel subagents (one per repo, sometimes multiple per repo) so a 3-repo / 200-commit audit takes one chat turn instead of an afternoon.

---

## When to use

TRIGGER when the user:
- Wants to evaluate a developer's quality (current state OR before a high-stakes decision).
- Is preparing for a performance 1:1 and needs concrete file-level / commit-level evidence to anchor the conversation.
- Is deciding whether to present a developer to an external client / interview pipeline / project staffing.
- Asks to validate a hypothesis ("does X push without reviewing?", "is Y still hitting the bar?", "did Z fix the issues from the last audit?").
- Wants to compare a developer's current profile against an earlier audit.

Do NOT use for: PR-level reviews (use `automated-pr-review`), single-issue debugging, or whole-team audits (this skill is per-developer; run it three times if you need three people).

---

## Phases — execute in order

### Phase 1 — Pre-flight context (mandatory, blocking)

**Do not run any tool that touches the repos until Phase 1 is complete.** Use `AskUserQuestion` to gather everything before any git/find calls.

The full question bank lives in [`references/pre-flight-questions.md`](references/pre-flight-questions.md). Minimum required answers:

1. **Which developer.** Display name (e.g. "Muneeb Ahmad"). The skill will run an identity-discovery step in Phase 2.
2. **Which repos and branches.** Default search root: `/Users/muhammadaliabbas/dev/`. Walk the user through `ls /Users/muhammadaliabbas/dev/` if they want help picking. Get the canonical branch per repo (don't assume `main` — Motornomic uses `mnr-production-ready`, Unibid uses `dev`, etc. — always ask).
3. **Time window.** Default 3 months. Offer 1m / 3m / 6m / since-last-audit / all-time.
4. **Audit axes.** Multi-select: rule/convention violations · architecture & system thinking · correctness & security · sloppy/unreviewed commits · type discipline · performance · test coverage · commit hygiene.
5. **Tone.** Strict & adversarial / Strict-but-fair (acknowledge strengths) / Balanced / Investigation-mode.
6. **Output format.** Default: agenda + full audit + ratings card.
7. **Hypothesis to verify (optional).** "Pushes without reviewing" / "slows down on architectural work" / [custom].
8. **Prior audits.** Paths to earlier audit docs (so agents can verify whether previously-flagged issues were actually fixed).
9. **External overseer reports.** Anyone else who's complained about this dev — feed those reports as context.
10. **Output location.** Default `cwd` if it looks like an HR/planning workspace; otherwise `/tmp/<dev>-audit-<date>/`.

If the user named a hypothesis or a downstream decision (e.g. "ready for Jasur's interview?"), record it — Phase 4 must land an explicit recommendation on that decision.

### Phase 2 — Identity confirmation + rules-artifact discovery (orchestrator)

For each repo selected in Phase 1, the orchestrator runs two single-call commands:

```bash
# Confirm git identities matching the developer's display name
git -C <repo> log --format='%aN <%aE>' --author='<DisplayName>' | sort -u

# Locate rules artifacts the audit agents will read in full
find <repo> -maxdepth 4 \
  \( -name 'CLAUDE.md' -o -name 'AGENTS.md' -o -name '.cursorrules' \
     -o -name '*.mdc' -o -name 'eslint.config.*' -o -name '.eslintrc*' \
     -o -name 'tsconfig.json' -o -name '.prettierrc*' -o -name 'CONTRIBUTING.md' \) \
  -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/.git/*'
```

Critical: use a **single** `--author='<DisplayName>'` flag. Multiple `--author=` flags can interact AND-vs-OR depending on git version and silently return zero matches. If you suspect this happens, double-check by running `git log --format='%aN' | sort -u` (no author filter) and grepping the output yourself.

After both commands per repo, also do a quick sanity check on commit volume:
```bash
git -C <repo> log --author='<DisplayName>' --since='<window-start>' --no-merges --oneline <branch> | wc -l
```

If the count is >200, plan to split that repo across multiple subagents in Phase 3 (one per audit axis or one per feature area).

Surface results in a one-line note per repo: *"Motornomic: 109 commits, identities matched [meemalif, muahmad.bscs21seecs], rules at .claude/CLAUDE.md + .cursor/rules/{conventions,graphify}.mdc + .claude/skills/{zod,react-hook-form}/AGENTS.md."*

### Phase 3 — Per-repo audit subagents (parallel)

Spawn one `general-purpose` subagent per repo. Use a **single chat message with multiple Agent tool calls** so they run in parallel.

For very large repos (>200 commits in window OR >100k LOC churn) split into multiple agents — typically:
- one for **security & correctness** (CRITICAL/HIGH bugs, RLS, validation, secrets)
- one for **architecture & convention compliance** (decomposition, type discipline, rule violations)
- one for **process & ratings** (commit hygiene, retrofit patterns, build-error churn, ratings card)

Each agent reads from [`references/per-repo-agent-prompt.md`](references/per-repo-agent-prompt.md) — fill in the placeholders (repo path, branch, dev name, time window, rules paths, axes, hypothesis, tone) and pass.

Each agent writes its full report to `/tmp/<dev>-audit-<repo>.md` and returns ONLY a 250-word executive summary plus the file path. Don't ask agents to paste the full report into the reply — context bloat for the orchestrator.

### Phase 4 — Synthesis (orchestrator)

After all per-repo agents return, read the full reports from `/tmp` and produce:

- **Cross-cutting patterns** (e.g. "validation at boundaries weak across all 3 repos" / "concurrency blind spot"). Patterns are stronger evidence than single findings — call them out explicitly.
- **Severity counts table** (CRITICAL / HIGH / MED / LOW per repo + total).
- **Verdict on the hypothesis**, triangulated across repos. Independent agents arriving at the same verdict = stronger evidence; say so.
- **Strengths roll-up** (deduped). These are NOT padding — they're the calibration that makes the report believable.
- **`systemdesign.io` topic recommendations** ranked by leverage on actual gaps. Map each topic to specific findings (e.g. "Topic 1: concurrency & idempotency in OLTP — maps to Vestify C4 + Motornomic C1 + Unibid H2").
- **Aggregate ratings** (Phase 5).

The synthesis prompt template lives in [`references/synthesis-prompt.md`](references/synthesis-prompt.md).

If Phase 1 captured a downstream decision (e.g. "is this dev ready for Jasur's pipeline?"), the synthesis MUST land an explicit recommendation on that decision — don't leave it implicit.

### Phase 5 — Ratings card

Per-repo agents produce per-repo ratings during Phase 3. Phase 5 aggregates them into one cross-repo ratings card.

Default rating axes (full rubric in [`references/rating-rubric.md`](references/rating-rubric.md)):

1. Convention adherence
2. Architecture & system thinking
3. Correctness & edge-case handling
4. Security awareness
5. Concurrency & atomicity
6. Type discipline
7. Self-review discipline
8. Delivery speed
9. Commit & branch hygiene
10. Growth signal

Each axis: 1–5 scale with concrete behavioral anchors per level. Every score MUST cite at least one piece of evidence (file:line or commit SHA). Naked numbers are forbidden — they make the card un-defendable in a 1:1.

Aggregate verdict thresholds (suggested, customizable in Phase 1):
- 4.0+ overall, no axis below 3 → "ready for autonomous senior work / external client placement"
- 3.0–4.0 overall, no axis below 2 → "ready with code review on critical paths"
- 2.0–3.0 overall → "needs structured corrective plan"
- below 2.0 → "fit conversation"

### Phase 6 — Output deliverables

Three docs (templates in `references/output-templates/`):

| File | Length | Audience | Purpose |
|---|---|---|---|
| `<dev>-ratings-card.md` | 1 page | Manager (you) | Quick comparable scorecard for before/after audits |
| `<dev>-meeting-agenda.md` | 2–4 pages | Manager (you) | Talking points for the 1:1 — opening framing, evidence per repo, anticipated pushback + responses, asks/corrective plan, systemdesign.io plan |
| `<dev>-full-audit.md` | 10–30 pages | Reference | Cross-cutting synthesis + condensed per-repo evidence; backstop for any meeting claim |

Plus the per-repo verbatim reports from Phase 3 should be copied from `/tmp` into the output folder for permanence (`/tmp` doesn't survive reboot).

---

## Cross-cutting principles

Read these. They're the difference between a credible audit and a hit-piece.

- **Strict-but-fair tone is the default.** Padding with weak hits destroys credibility ("if these are your worst, the worst isn't bad"); ignoring strengths makes the report ammunition rather than feedback. Phase 1 lets the user override but defaults here.
- **Every finding must cite file:line or commit SHA.** The manager will quote these in the meeting. Vague claims are worse than no claims.
- **Verify prior-audit findings.** If the user provides a prior audit, agents must check whether the issues flagged there were actually fixed in current main/dev. Unfixed CRITICALs from prior audits are headline material — see today's Vestify case study.
- **Capability vs discipline distinction.** Look for "competent when slow / sloppy when fast" (most common in mid-level devs) vs "knowledge gap" (which requires training, not process). The corrective plan differs sharply between these two reads.
- **Decision-frame awareness.** When the user is auditing in service of a downstream decision, land an explicit recommendation on that decision. Don't leave it for the user to derive.
- **Author-filter pitfall.** Use `--author='<DisplayName>'` (single flag), not multiple `--author=` flags. The latter can return zero matches silently.
- **Single-pass `git log -p`** with file exclusions, not per-commit `git show` loops. Per-commit loops are 100× slower for no quality gain — battle-tested.
- **File exclusions for diff dumps:** `pnpm-lock.yaml`, `*-lock.json`, `*.lock`, `*/migrations/*`, `*.svg`, `*.png`, `*.jpg`, `*.ico`, `*.woff*`, `public/**`. These bloat the diff 5–20× without adding audit value.

---

## Subagent permissions

This skill assumes the orchestrating user's `~/.claude/settings.json` includes the targeted read-only Bash patterns added by the audit-skill setup:

```jsonc
"Bash(git -C * log *)", "Bash(git -C * show *)", "Bash(git -C * diff *)",
"Bash(git -C * rev-parse *)", "Bash(git -C * ls-files *)", "Bash(git -C * branch *)",
"Bash(find /Users/muhammadaliabbas/dev:*)", "Bash(find /tmp:*)",
"Bash(grep -r:*)", "Bash(rg:*)", "Bash(mkdir -p /tmp/*)"
```

These let subagents call `git log` / `git show` / `find` directly without the orchestrator having to pre-dump every commit. Without these, subagents get hard `Permission denied` with no UI to escalate.

If you're running this skill on a user whose settings don't have these patterns, you have two options:
1. **Add them** to `~/.claude/settings.json`'s `permissions.allow` array (preferred — one-time fix).
2. **Pre-dump fallback** — orchestrator runs the git work itself and writes per-repo dumps to `/tmp/<dev>-audit/<repo>/{commits-summary.txt, all-diffs.patch}`, then passes file paths to the subagents instead of letting them call git directly. The per-repo agent prompt template has placeholder sections for this fallback mode.

---

## Output naming convention

All outputs land in the user-chosen folder (default `cwd` if HR/planning workspace, else `/tmp/<dev>-audit-<date>/`):

- `<dev>-ratings-card-<YYYY-MM-DD>.md`
- `<dev>-meeting-agenda-<YYYY-MM-DD>.md`
- `<dev>-full-audit-<YYYY-MM-DD>.md`
- `<dev>-audit-<repo>-<YYYY-MM-DD>.md` (per-repo verbatim reports)

This naming makes side-by-side audits comparable (same dev, different dates show progression).

---

## Reference index

| File | Purpose |
|---|---|
| [`references/pre-flight-questions.md`](references/pre-flight-questions.md) | The full Phase 1 question bank with default offerings |
| [`references/per-repo-agent-prompt.md`](references/per-repo-agent-prompt.md) | Template for the per-repo audit subagent (fill in placeholders) |
| [`references/rating-rubric.md`](references/rating-rubric.md) | All 10 axes with 1–5 behavioral anchors and evidence requirements |
| [`references/synthesis-prompt.md`](references/synthesis-prompt.md) | Cross-repo synthesis instructions for the orchestrator (Phase 4) |
| [`references/output-templates/meeting-agenda.md`](references/output-templates/meeting-agenda.md) | Meeting-agenda doc template |
| [`references/output-templates/full-audit.md`](references/output-templates/full-audit.md) | Full-audit doc template |
| [`references/output-templates/ratings-card.md`](references/output-templates/ratings-card.md) | Ratings-card template |

# Per-repo audit subagent prompt template

This is the template for the prompt the orchestrator passes to each `general-purpose` subagent in Phase 3. Fill in the `<<placeholders>>` from Phase 1 + Phase 2 outputs, then ship.

For very large repos (>200 commits or >100k LOC), spawn 2–3 agents in parallel against the same repo with different `<<axes>>` (one per axis cluster) and merge their reports in Phase 4. The orchestrator decides; subagents don't need to know about siblings.

---

## Template

```
You are auditing <<DEV_DISPLAY_NAME>>'s code quality on the <<REPO_NAME>> repo as preparation for a <<DECISION_FRAME>>. <<TONE_DIRECTIVE>>

## Setup
- Repo path: `<<REPO_PATH>>` (branch `<<BRANCH>>` is checked out)
- Author display name: `<<DEV_DISPLAY_NAME>>`. Author identities matched in this repo: <<IDENTITIES>>
- Time window: commits since `<<SINCE_DATE>>` (today is `<<TODAY>>`)
- Scope: <<COMMIT_COUNT>> commits in window, ~<<FILES_TOUCHED>> files touched, +<<LOC_ADDED>> / -<<LOC_DELETED>> lines

You can run Bash directly. The orchestrator's permission setup allows:
- `git -C <<REPO_PATH>>` for log/show/diff/rev-parse/ls-files/branch/blame/cat-file
- `find <<REPO_PATH>>` for locating files
- `grep -r` and `rg` for content search

If a Bash command is denied, fall back to Read/Grep/Glob and continue. Never attempt write operations on the repo.

## Audit axes — focus only on these

<<AXES_LIST>>

(See [`/Users/muhammadaliabbas/.claude/skills/dev-codebase-audit/references/rating-rubric.md`](/Users/muhammadaliabbas/.claude/skills/dev-codebase-audit/references/rating-rubric.md) for axis definitions if needed.)

## Rules artifacts to read in full FIRST

<<RULES_PATHS>>

These are the project's coding standards. You must read them before judging compliance — citing the specific clause violated next to each finding is what makes the report credible. Skipping this step makes findings vague and easy to dismiss.

## Method

1. **Read all rules artifacts in full.** No skimming.

2. **Establish the lay of the land.** Run:
   ```bash
   git -C <<REPO_PATH>> log --author='<<DEV_DISPLAY_NAME>>' --since='<<SINCE_DATE>>' --no-merges --pretty=format:'%h | %ad | %s' --date=short <<BRANCH>>
   ```
   Read end-to-end. Note: bursty cadence (5+ commits/day), duplicate-named commits, "build errors resolved" / "fix: type errors" / "feat: X *correctly* used" patterns — those are anti-patterns to investigate, not noise.

3. **Get per-commit file stats** in one call:
   ```bash
   git -C <<REPO_PATH>> log --author='<<DEV_DISPLAY_NAME>>' --since='<<SINCE_DATE>>' --no-merges --shortstat --pretty=format:'COMMIT %h %ad %s' --date=short <<BRANCH>>
   ```
   Identify the most-impactful commits (largest LOC after excluding lockfiles/migrations).

4. **Pull all diffs in ONE call** (single-pass `git log -p`, NOT a per-commit `git show` loop — the loop is 100× slower):
   ```bash
   git -C <<REPO_PATH>> log --author='<<DEV_DISPLAY_NAME>>' --since='<<SINCE_DATE>>' --no-merges -p --no-color --reverse <<BRANCH>> -- \
     ':(exclude)*pnpm-lock.yaml' \
     ':(exclude)*package-lock.json' \
     ':(exclude)*yarn.lock' \
     ':(exclude)*.lock' \
     ':(exclude)supabase/migrations/*' \
     ':(exclude)**/migrations/*' \
     ':(exclude)*.svg' \
     ':(exclude)*.png' \
     ':(exclude)*.jpg' \
     ':(exclude)*.jpeg' \
     ':(exclude)*.ico' \
     ':(exclude)*.woff*' \
     ':(exclude)public/**' \
     > /tmp/<<DEV_SLUG>>-<<REPO_SLUG>>.patch
   ```
   Use Read with offsets + Grep on this file. Don't read it top-to-bottom — it's likely 1.5MB+ for 100+ commits. Grep for red-flag patterns first to navigate to interesting sections:
   - `console.log`, `console.error` (debug logs surviving)
   - `// TODO`, `// FIXME`, `// HACK`
   - `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `as any`, `as unknown`
   - `dangerouslySetInnerHTML` (XSS risk)
   - `process.env\.` (raw env access)
   - `^\s*//.*(check|validate|guard|auth)` (commented-out validation)
   - `JSON\.parse` (untyped boundary parsing)
   - `\.eq\(` without `\.single\(\)` or `\.maybeSingle\(\)` (Supabase empty-array footgun)

5. **For 3–6 most consequential feature areas**, Read the FINAL state of the changed files at `<<REPO_PATH>>/<file>`. Cross-check against the diff to see what the dev actually authored vs. inherited. A diff snippet alone is often ambiguous — final state resolves it.

6. **Detect the "pushes without reviewing" pattern** (or whatever <<HYPOTHESIS>> requires):
   - Introduce-then-immediately-revert (`git log --shortstat` showing inverse line counts on the same files within days)
   - Commit subjects like "fix: build errors resolved" / "fix: type errors" / "feat: X **correctly** used" clustered near features
   - Copy-paste duplication across files in the same PR (same blocks present in multiple files)
   - Broken types/eslint at commit boundaries (eslint-disable / @ts-ignore added then removed)
   - Duplicate commit messages within hours (cherry-pick / rebase mess)
   - Typos in commit messages ("fgix", "fx", "udpated" — signal that pre-push self-review isn't happening)

7. **Verify prior-audit findings** (if `<<PRIOR_AUDIT_PATH>>` is set):
   - Read the prior audit at `<<PRIOR_AUDIT_PATH>>`.
   - For each prior CRITICAL / HIGH finding, check whether it's still present in current `<<BRANCH>>`. Use Read on the cited file:line.
   - Unfixed CRITICALs from prior audits are **headline material** — call them out at the top of your report.

## Output structure

Write your full report to: `/tmp/<<DEV_SLUG>>-audit-<<REPO_SLUG>>.md`

Structure:

```markdown
# <<REPO_NAME>> — <<DEV_DISPLAY_NAME>> Audit (since <<SINCE_DATE>>, branch: <<BRANCH>>)

## Commit summary
Total commits, LOC, areas touched, SHA range, calendar pattern (bursty / steady), notable commit-message patterns.

## Rules artifacts found
List each rules file you read with a 1-line summary of what it mandates.

## Status of issues from prior review
(only include this section if <<PRIOR_AUDIT_PATH>> was provided)
For each prior CRITICAL / HIGH: file:line check against current main. Fixed? Still open? Still open with regression?

## CRITICAL findings
## HIGH findings
## MED findings
## LOW findings

(Each finding has: title, file:line link, commit SHA, rule violated (if any), severity rationale, "why it matters in production")

## Strengths
3–5 specific examples with file:line and commit SHAs. Be concrete. These are NOT padding — they're calibration. If the work is genuinely bad and you can't find 3 strengths, find 1–2 and say so.

## Verdict on <<HYPOTHESIS>> hypothesis
SUPPORTED / CONTRADICTED / MIXED, with evidence-grounded reasoning. Explicitly cite which signals supported and which contradicted.

## Per-axis ratings (1–5)
Rate each of the requested axes (<<AXES_LIST>>) on a 1–5 scale per the rubric at `/Users/muhammadaliabbas/.claude/skills/dev-codebase-audit/references/rating-rubric.md`. Every score MUST cite at least one piece of evidence (file:line or commit SHA). Naked numbers are forbidden.

## Recommended systemdesign.io topics
2–3 specific topics (e.g. "rate limiting & idempotency", "consistency models for distributed counters") tied to actual gaps you found. Explain the link to specific findings above.
```

When done, return ONLY a 250-word executive summary plus the `/tmp/...` file path. Do NOT paste the full report into your reply — context bloat for the orchestrator. The orchestrator will Read your file directly.

## Tone & integrity (always)

- <<TONE_DIRECTIVE_FULL>>
- Strengths must be specific and real. Don't write motherhood statements.
- If the work is genuinely good, say so plainly. Truth beats ammunition.
- Cite file paths with line numbers and commit SHAs for every finding. The manager will quote these in the meeting; vague claims are worse than no claims.
- Do not pad with weak hits. Minor stays minor. The cumulative case must come from real evidence, not finding-count inflation.
```

---

## Placeholder reference

| Placeholder | Where it comes from |
|---|---|
| `<<DEV_DISPLAY_NAME>>` | Phase 1 Q1.1 |
| `<<REPO_NAME>>` | Phase 1 Q1.2 (one per agent) |
| `<<REPO_PATH>>` | `/Users/muhammadaliabbas/dev/<repo>` |
| `<<REPO_SLUG>>` | kebab-case lowercase repo name |
| `<<BRANCH>>` | Phase 1 Q1.2 |
| `<<DEV_SLUG>>` | kebab-case lowercase dev name |
| `<<DECISION_FRAME>>` | Phase 1 Q3.3 (e.g. "1:1 performance meeting", "client interview pipeline placement decision") |
| `<<TONE_DIRECTIVE>>` | Phase 1 Q2.2 short form (e.g. "Strict-but-fair senior-reviewer tone — strengths must be acknowledged so feedback is credible.") |
| `<<TONE_DIRECTIVE_FULL>>` | Phase 1 Q2.2 long form (e.g. "Strict but fair. No padding. Strengths must be specific.") |
| `<<IDENTITIES>>` | Phase 2 output (list of `Name <email>` matches) |
| `<<SINCE_DATE>>` | Phase 1 Q1.3 → ISO date |
| `<<TODAY>>` | Today's ISO date |
| `<<COMMIT_COUNT>>`, `<<FILES_TOUCHED>>`, `<<LOC_ADDED>>`, `<<LOC_DELETED>>` | Phase 2 sanity-check output |
| `<<AXES_LIST>>` | Phase 1 Q2.1 (newline-separated bullets) |
| `<<RULES_PATHS>>` | Phase 2 `find` output (full absolute paths, one per bullet) |
| `<<HYPOTHESIS>>` | Phase 1 Q3.1 short form (e.g. "pushes without reviewing", "slows down on architectural work"). Set to `(none)` if no hypothesis. |
| `<<PRIOR_AUDIT_PATH>>` | Phase 1 Q3.2 (absolute path) or omit the section entirely if not provided |

---
name: ship-it
description: "Portable, any-codebase end-to-end delivery workflow — takes any task to a merge-ready PR. Use for any task that ends in a PR: features, bug fixes, refactors, chores, hotfixes, or executing a plan file. Trigger phrases: 'implement', 'build', 'ship', 'ship it', 'fix', 'patch', 'address bug', 'refactor', 'add', 'change', 'open a PR for', 'execute the plan', 'follow the plan in <path>'. At kickoff it auto-detects whether the repo has (1) a code-review system and (2) a rulebook / coding standards, loudly flags either if missing, and offers to bootstrap one. Has ZERO hardcoded repo paths, commands, or MCP slugs — everything repo-specific is detected or asked."
user-invocable: true
---

# Ship It — Portable End-to-End Delivery Workflow

This skill encodes the full lifecycle for shipping any task in **any** codebase (feature, bug
fix, refactor, chore, hotfix, or plan execution), from kickoff through PR merge-readiness.

It is the generic descendant of repo-specific delivery skills. Where those hardcoded a single
repo's Linear slug, review workflow, rulebook path, and toolchain, **this skill detects all of
that at runtime** and adapts. Nothing here assumes pnpm, Supabase, Next.js, a particular CI
workflow, or a particular directory layout.

Follow every phase in order. Never skip a phase. A phase that doesn't apply to this repo is
**explicitly skipped with a one-line note**, never silently dropped.

---

## The two questions this skill answers for itself

At kickoff (Phase 0), before any code is written, the skill probes the repository to answer two
questions on its own — and **loudly flags** either one that comes back "no":

1. **Does a code-review system already exist for this codebase?**
2. **Does a rulebook / coding-standards document already exist for this codebase?**

These two answers reshape the rest of the run (which review mechanism Phase 6 uses, what the review
checks against). Getting them wrong silently is the failure this skill exists to prevent — so when
either is missing, the skill says so in plain language and offers to bootstrap it before continuing.

---

## Phase 0 — Kickoff & repo reconnaissance (before writing a single line of code)

### 0a. Detect the ticket tracker (Linear) — then ask one question

This skill uses **Linear** as the tracker, but the Linear MCP server slug differs per repo
(`mcp__recash-linear__…`, `mcp__seomaven-linear__…`, `mcp__claude_ai_Linear__…`, etc.). **Do not
hardcode a slug.** Detect the connected Linear MCP server by looking for an available tool whose
name matches `mcp__*linear*__save_issue` / `mcp__*linear*__get_issue` (or the `claude_ai_Linear`
variants `list_issues` / `save_issue` / `get_issue`). Use whichever is connected.

- **If a Linear MCP is connected**, ask the human **one** question (not a paragraph):

  > "Should I create a Linear ticket for this, or does one already exist? If it exists, share the ID."

  - **If creating: delegate to the `create-linear-ticket` skill.** Do NOT hand-roll a bare
    `…save_issue` call here — that's how tickets end up in Backlog with no status, no cycle, no
    owner, and no estimate. `create-linear-ticket` picks the cycle by measuring current-cycle load,
    sets a real status (Up Next / Todo, never Backlog), asks for the hourly estimate, and confirms
    the whole ticket with the human before creating it. Branch name derives from the resulting ticket
    ID: `claude/<key-nnn>-<short-slug>`.
  - **If it exists:** fetch it via the detected `…get_issue` tool before proceeding — the
    acceptance criteria are the definition of done. Branch name: `claude/<key-nnn>-<short-slug>`.
  - **If skipping:** branch name is `claude/<short-slug>` (kebab-case, ≤ 5 words).

- **If no Linear MCP is connected**, flag it once — *"No Linear MCP detected; proceeding without a
  ticket. Branch will be `claude/<short-slug>`."* — and continue. Never block delivery on a missing
  tracker.

### 0b. Confirm the base branch

Detect the repo's default branch instead of assuming `main`:

```bash
git remote show origin 2>/dev/null | sed -n 's/.*HEAD branch: //p'   # e.g. main or master
# fallback:
git symbolic-ref --quiet refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'
```

Use the detected default as the base. The human must explicitly say otherwise to deviate.

**Never** branch off another feature/fix branch unless instructed — branching off the wrong base is
the most common cause of PRs that show hundreds of unrelated commits.

```bash
git fetch origin <base>
git checkout -b <branch-name> origin/<base>
```

For large tasks, a worktree is preferred:
```bash
git fetch origin <base>
git worktree add .claude/worktrees/<slug> -b <branch-name> origin/<base>
cd .claude/worktrees/<slug>
```

### 0c. Detect the review system — and flag if absent

Scan for an existing automated PR-review system. Positive signals (any one counts):

- A GitHub Actions workflow that runs a review bot — grep `.github/workflows/*.{yml,yaml}` for
  `claude`, `claude-code-action`, `anthropics/claude`, `review`, `/claude-review`, `/final-review`.
- A review prompt/rulebook the bot reads — `.github/prompts/claude-review.md` or similar.
- Another PR-review bot — `.coderabbit.yaml`, `.github/coderabbit*`, Danger (`Dangerfile`),
  reviewdog configs, etc.

Record the result as one of:
- **`claude-bot`** — a Claude-style bot driven by PR comments (`/claude-review`, `/final-review`).
  The Phase 6 post-PR loop is available.
- **`other-bot`** — a non-Claude reviewer (CodeRabbit, Danger…). It will review the PR on its own;
  the skill will not try to drive it via comments.
- **`none`** — no automated review system found.

> **If `none`: FLAG IT.** Tell the human in plain language:
> *"⚠ No code-review system detected in this repo (no review workflow / bot / review prompt). No
> automated bot will review the PR. I'll run the review on the PR with an independent reviewer
> subagent instead (Phase 6, Path C). Want me to also bootstrap a real review system for this repo? (Phase 0e)"*

### 0d. Detect the rulebook — and flag if absent

Scan for an existing rulebook / coding-standards source. Positive signals (collect all that exist):

- `CLAUDE.md` / `AGENTS.md` (root or nested)
- `.cursor/rules/*.mdc` or `.cursorrules`
- `.github/prompts/*.md`
- `CONTRIBUTING.md`, `docs/**` coding-standards / architecture / business-logic chapters
- `.windsurfrules`, `.github/copilot-instructions.md`
- Weak-but-useful signals: `.editorconfig`, ESLint/Prettier/Biome/Ruff configs, `tsconfig` strictness

Record the rulebook as the **ordered list of files** the review (Phase 6) will load as its source of
truth (strongest first: explicit agent/cursor rules > CONTRIBUTING/docs > linters/configs).

> **If no real rulebook exists** (only weak linter signals, or nothing at all): **FLAG IT.**
> *"⚠ No rulebook / coding-standards doc detected (no CLAUDE.md, .cursor/rules, CONTRIBUTING.md,
> etc.). The PR review (Phase 6) will fall back to a generic built-in checklist (the appendix), which
> is weaker than repo-tailored rules. Want me to bootstrap a tailored rulebook for this repo? (Phase 0e)"*

### 0e. Offer to bootstrap a missing review system / rulebook

If Phase 0c or 0d flagged a gap, **offer** to bootstrap it. Bootstrapping is not dropping a generic
template — it is a small tailored sub-flow. **Get explicit approval before writing any file**, and
write all artifacts into the **target repo**, never into this skill.

The bootstrap sub-flow:

1. **Understand the codebase.** Detect stack, frameworks, package manager, entry points, and the
   directories that carry the most risk (auth, payments/money, DB migrations, background jobs,
   external API calls, anything touching secrets or tenant boundaries). Read enough real code to
   describe the conventions already in use (error handling, data fetching, typing discipline, naming).
2. **Interview the human.** Use the **interview-me** skill (or a short batched `AskUserQuestion`
   round if it's unavailable) to pin down what a reviewer must *always* check for this project:
   the always-blocker invariants, off-limits paths, severity definitions, the verification commands,
   and any domain rules an outsider wouldn't infer from the code.
3. **Generate tailored artifacts** in the target repo (propose exact paths, then write on approval):
   - **Rulebook** — a `CLAUDE.md` (or `.cursor/rules/` set, matching whatever the repo already
     leans toward) capturing the conventions from step 1 + the invariants from step 2, including an
     **Always-BLOCKER** list and a **risk-tier paths** list specific to this codebase.
   - **Review ruleset** — a concise checklist the PR review (the bot or the Phase 6 reviewer subagent)
     consumes (can live inside the rulebook or as `docs/REVIEW.md`).
   - **Optional CI upgrade** — *offer* (don't impose) to scaffold a `/claude-review`-style GitHub
     Action workflow + prompt file. Call out that it needs API-key secrets and finishing setup the
     human does manually. Only scaffold this if they say yes.
4. **Commit** the bootstrapped review system as its own conventional commit
   (`chore(review): bootstrap review rulebook`) so it's a clean, reviewable addition.

After bootstrapping, treat the new files as the detected review system / rulebook for the rest of
the run. If the human declines bootstrapping, proceed with the generic fallback and keep the flag
visible in the final summary.

### 0f. Detect the toolchain (typecheck / lint / test)

Auto-detect the verification commands so Phase 4 (sanity) and Phase 6 (the review loop) can run them. Look, in order, at:

- `package.json` `scripts` (`typecheck`, `tsc`, `lint`, `test`, `build`) + the lockfile to pick the
  package manager (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` → npm, `bun.lockb` → bun)
- `Makefile` / `Justfile` targets (`make lint`, `make test`…)
- Python: `pyproject.toml` / `tox.ini` / `noxfile.py` (`ruff`, `mypy`, `pytest`)
- Go: `go vet`, `go test ./...`; Rust: `cargo check`, `cargo clippy`, `cargo test`; etc.

Record concrete commands for **typecheck**, **lint**, and **test** (any may be "none found"). **If
you can't confidently determine a command, ask the human once** at kickoff:
*"I couldn't find a typecheck/lint/test command — what should I run, or should I skip it?"* Never
invent a command and run it blind.

---

## Phase 1 — Plan workstreams (parse a plan if one was given)

**If the task came with a plan file** (path supplied, or a plan handed to you in chat): read it
end-to-end with no `limit`. Scope to the named workstream if there are several; ask which if it's
ambiguous. Extract every plan point as a discrete **TodoWrite** item with: point ID, file(s) it
touches, the one-line change, and a verification criterion. The TodoWrite list is your contract —
Phase 3 will audit it.

**If there's no plan** (ad-hoc task): derive the workstreams yourself from the task and a quick read
of the affected code, and capture them as TodoWrite items the same way.

Either way, **divide the work into independent workstreams**. Rule: if two files don't import each
other, they're probably parallelisable. Good examples:
- DB / data-layer helpers ← independent of UI
- Background job / worker ← independent of config
- Frontend components ← independent of API route
- Schema / type changes ← independent of consumer components
- Bug reproduction + fix ← fix is independent of its test

Spawn **one `general-purpose` sub-agent per independent workstream in a single tool call** so they
run concurrently. Each sub-agent gets: (1) its slice of the task + TODOs, (2) the target file paths,
(3) the worktree/branch to work in, (4) the instruction *"commit your work with conventional-commits
messages by area when done; do not push."*

Wait for all sub-agents before Phase 2. **Sequential work** (B depends on A's output) stays
sequential: A as one sub-agent → wait → B as the next. Do not force parallelism on dependent steps.

---

## Phase 2 — Implementation & commit discipline

Work through TODOs in order (respect plan-declared dependencies). For each: mark `in_progress`
(only one at a time), read the file before editing, make the change (prefer Edit over Write for
existing files), verify it landed (re-read or `grep`), mark `completed`. **Blocked is valid;
silently skipping is not** — mark a TODO `blocked` with a reason and surface it in the final summary.

**Off-limits paths** — never edit these without explicit user approval mid-task. Default set, refined
by whatever the detected rulebook declares:
`**/migrations/**`, `*.lock` / lockfiles, `.env*`, CI config under `.github/workflows/**`, build
config (`next.config.*`, `vite.config.*`, etc.), and `.claude/skills/**`. If a task requires editing
one of these, stop, surface the path, and ask.

**Commit cadence — one logically separate area per commit (mandatory).** Split by **area of code**,
not by line count. One commit = one coherent area a reviewer would read as a single change.
Typically **4–10 commits** for a non-trivial task, not 1–2.

Commit message format (conventional commits):
```
<type>(<scope>): <subject>

- bullet describing a non-obvious detail
- another bullet if needed

Closes <KEY-NNN>   ← only on the LAST commit if a ticket exists

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
Types: `feat` / `fix` / `docs` / `refactor` / `chore` / `test`.

**Anti-patterns:** one 800-line "implement everything" commit → SPLIT. `wip` / `checkpoint` /
`more changes` subjects → use real conventional-commit subjects per area. Squashing everything → SPLIT.
Never squash; the reviewer reads commits top-to-bottom.

---

## Phase 3 — Coverage check

Before claiming done, audit that every plan point / TODO actually landed in the diff.

1. `git diff <base> --stat`.
2. For each `completed` TODO: confirm the change is present — `git diff <base> -- <file>` and grep
   for the key symbols (existing-file edits), or `git ls-files <file>` with non-trivial content
   (new files). For schema/type generation, confirm any generated output is committed too.
3. If a `completed` TODO doesn't appear in the diff: **revert it to `in_progress` and loop back to
   Phase 2.** No phantom completions.
4. Build a coverage matrix:
   ```
   B1 — feature-x implementation   ✓ (diff in src/.../feature-x.ts)
   B2 — schema types added         ✓ (diff in src/schemas/feature-x.ts)
   B3 — component renderer         ⚠ blocked: depends on B2 migration not yet applied
   ```
5. Proceed only when every TODO is `completed` (with diff evidence) or `blocked` (with a reason).

For ad-hoc tasks with no plan, the "matrix" is just the task's acceptance criteria checked against
the diff — same discipline, lighter form.

---

## Phase 4 — Pre-PR sanity check (verification only — NOT code review)

There is **no pre-PR self-review.** Code review happens on the PR, after it's open, in Phase 6 —
that review IS the review. Before opening the PR you only confirm it isn't broken:

- **Run the detected verification commands** (Phase 0f): typecheck must be clean; run lint/test if
  present. Fix every error before continuing.

Do **not** review the code here. Opening the PR (Phase 5) is what kicks off the review, and Phase 6
drives it to a clean verdict.

---

## Phase 5 — Push & open the PR

After Phase 4's verification passes. There is **no pre-PR code-review gate** — opening the PR is
what kicks off the review (Phase 6).

1. **Sanity check:** typecheck clean; lint clean (if present); `git status --porcelain` empty;
   `git log <base>..HEAD --oneline` has ≥ 1 commit. If any fails, STOP and surface it.
2. **Push:** `git push -u origin "$(git rev-parse --abbrev-ref HEAD)"`. Never `--force` automatically.
3. **Open the PR** with the platform CLI (`gh pr create` on GitHub; adapt for GitLab/others if that's
   what the repo uses). Title is conventional-commits. Body includes: ≤ 5-bullet summary, the coverage
   matrix, **actual** verification output (not a placeholder), the Linear link if a ticket exists, and
   a one-line risk note. If a PR already exists for the branch, surface it with `gh pr view` instead of
   creating a duplicate.

Include in the PR body any **flags raised in Phase 0** that the human declined to fix — e.g. *"Note:
this repo has no automated review system; reviewed by an independent reviewer subagent on the PR."*

---

## Phase 6 — Post-PR review loop (this IS the review — run it to completion, do NOT stop after one round)

This loop **replaces the old pre-PR self-review.** The review now happens on the open PR, and
**driving it to a clean verdict is your job, not the human's.** Each round's findings live on the PR
as comments; you read them, fix every one, push, and re-review.

### ⛔ Loop invariant — the #1 thing this skill gets wrong

The failure to prevent: the agent runs one review, then sits back and hands the result to the human.
**That is a bug, not a checkpoint.** Once the PR is open you own the loop end to end:

> review → read findings → fix EVERY finding → push → re-review → … → `0 BLOCKER · 0 MAJOR · 0 MINOR` → final review (Phase 7) → notify the human.

You do not stop, summarize, or ask the human anything between rounds. The ONLY early-exit reasons: a
`git push` fails or needs force (never force automatically), a fix is genuinely ambiguous and
unresolvable from the repo + rulebook, or many rounds pass with no progress. In every other case,
**ending your turn after triggering a review without an in-flight watch (or the next review pass
already running) is the defect.**

### Pick the path from Phase 0c, then loop until clean

**Path A — `claude-bot` (a `/claude-review`-style Claude bot exists):**
1. Capture the baseline run id; let the PR-open auto-run trigger the review, or post `/claude-review`
   once if it doesn't auto-run. **Don't double-trigger** — if opening the PR already auto-runs the
   review, do NOT also comment (it cancels and restarts the run, wasting credits).
   ```bash
   BEFORE=$(gh run list --workflow=<review-workflow>.yml --limit=1 --json databaseId -q '.[0].databaseId // 0')
   ```
2. **Wait by background watch, never blind polling.** Run this as a background Bash task
   (`run_in_background: true`); when it exits the harness re-wakes you. Set ONE `ScheduleWakeup`
   (~1200 s) as a dead-man's-switch only.
   ```bash
   WF=<review-workflow>.yml; RID=""
   for i in $(seq 1 24); do
     RID=$(gh run list --workflow="$WF" --limit=1 --json databaseId -q '.[0].databaseId')
     [ -n "$RID" ] && [ "$RID" != "<BEFORE>" ] && break
     sleep 5
   done
   if [ -z "$RID" ] || [ "$RID" = "<BEFORE>" ]; then echo "NO_NEW_RUN"; exit 1; fi
   echo "watching review run $RID"; gh run watch "$RID" --exit-status
   ```
3. On wake, read the verdict from the bot's PR comment (parse the machine-readable block / verdict
   line — don't eyeball prose). Count blocker/major/minor.
4. **If `0 BLOCKER · 0 MAJOR · 0 MINOR`** → Phase 7. Otherwise fix EVERY finding (read the cited
   `file:line`, fetch the rule, fix, re-run typecheck), commit `fix(<scope>): address round-N review
   findings`, then capture a fresh `BEFORE`, `git push`, post `/claude-review`, and **re-arm the
   background watch in the same turn.** Loop to step 3.

**Path B — `other-bot` (a non-Claude reviewer like CodeRabbit):** it reviews on its own on push.
After each push, watch for its review comments, read them, fix every actionable finding, push, and
let it re-review. Loop until it raises nothing actionable, then Phase 7. Same invariant — don't stop
after one round.

**Path C — `none` (no review bot):** the review still happens on the PR, run by a subagent. Loop:
1. Spawn a fresh `general-purpose` sub-agent as an **independent, adversarial reviewer.** Give it
   `git diff <base>`, the rulebook file paths (or the generic checklist in the appendix), and ask for
   findings as `[SEVERITY] file:line — description — fix`.
2. **Post its findings as a PR comment** (`gh pr comment <pr> --body "…"`) so the review trail lives
   on the PR, exactly like a bot would.
3. **If `0 BLOCKER · 0 MAJOR · 0 MINOR`** → Phase 7. Otherwise fix every finding, commit
   `fix(<scope>): address round-N review findings`, push, and **spawn the reviewer subagent again** on
   the new diff. Loop until a round comes back clean.

**NITs are a judgment call** (all paths): small/focused PR with only NITs → proceed; large or
risk-tier PR → fix NITs too and re-review. Ask the human only about NITs — never as a way to pause the
blocker/major/minor loop.

---

## Phase 7 — Final review / handoff

If the repo has a Claude bot with a `/final-review` (or equivalent) gate, post it the moment Phase 6
reaches `0 BLOCKER · 0 MAJOR · 0 MINOR`, watch for it, and confirm it posted. If there's no such gate,
this phase is the handoff itself.

Then notify the human with exactly this structure:

---
**PR #NNN is ready to merge.**

- **Branch:** `claude/<id>-<slug>`
- **PR:** <URL>
- **Linear:** <KEY-NNN> (if applicable)
- **Review:** <bot rounds: N | independent reviewer subagent on the PR | none — flagged>
- **Final review:** <posted ✅ | n/a — no review system in this repo>

<If a review system / rulebook was missing and not bootstrapped, restate the flag here.>

Do not merge until you have read the review.

---

**Never merge the PR yourself**, even if the human says nothing. The human merges. Never
`git push --force` automatically. Never create a duplicate PR.

---

## Quick-reference checklist

```
[ ] Phase 0a — Linear MCP detected (slug, not hardcoded); ticket confirmed/created/skipped
[ ] Phase 0b — Base branch detected & confirmed
[ ] Phase 0c — Review system detected → claude-bot | other-bot | none  (FLAGGED if none)
[ ] Phase 0d — Rulebook detected → file list | none  (FLAGGED if none)
[ ] Phase 0e — Offered to bootstrap any gap; tailored artifacts written to TARGET repo on approval
[ ] Phase 0f — Toolchain (typecheck/lint/test) detected; asked if unsure
[ ] Phase 1  — Workstreams identified (plan parsed if supplied); parallel sub-agents spawned
[ ] Phase 2  — Granular commits by area; conventional-commits; off-limits paths respected
[ ] Phase 3  — Coverage check: every TODO has diff evidence or a blocked reason
[ ] Phase 4  — Verification clean (typecheck/lint) — sanity only, NO pre-PR code review
[ ] Phase 5  — Sanity-checked, pushed, PR opened; Phase-0 flags noted in PR body
[ ] Phase 6  — Review driven to clean WITHOUT stopping after one round (bot / other-bot / reviewer subagent per Phase 0c); findings on the PR; background watch after every trigger; looped to 0 BLOCKER · 0 MAJOR · 0 MINOR
[ ] Phase 7  — Final review/handoff; human notified; PR NOT merged by Claude
```

---

## What this skill does NOT do

- Does NOT hardcode any repo path, command, framework, or MCP slug — all detected or asked.
- Does NOT silently assume a review system or rulebook exists — it detects, flags, and offers to bootstrap.
- Does NOT merge PRs, `--force` push, amend commits, or open duplicate PRs.
- Does NOT skip Phase 3 (coverage), Phase 6 (post-PR review loop), or the final-review/handoff gate.
- Does NOT do a pre-PR self-review — code review happens on the open PR (Phase 6).
- Does NOT stop after one review round to hand back to the human — it drives Phase 6 to a clean verdict autonomously (the loop invariant).
- Does NOT block delivery when a tracker / review bot / rulebook is missing — it degrades gracefully and flags.
- Does NOT write bootstrapped review-system files without explicit approval, and writes them into the
  TARGET repo, never into this skill.

---

## Why this skill exists

The repo-specific delivery skills it descends from worked well but were unportable: each baked in one
repo's Linear slug, review workflow, rulebook layout, and toolchain. Dropped into a different
codebase they'd reference files that don't exist and commands that don't run. ship-it keeps the
proven discipline — granular commits, coverage check, a post-PR review-and-fix loop driven to a clean
verdict (never stopping after one round), a final gate, and "the human merges" — but earns
portability by **detecting the repo's review system and rulebook instead of assuming them, and saying
so out loud when they're not there.**

---

## Appendix — generic review checklist (fallback when there's no rulebook)

When Phase 0d found no rulebook (and none was bootstrapped), the reviewer — the Path C subagent, or
you when judging a bot's findings — reviews against this deliberately stack-agnostic checklist. A
repo-tailored rulebook is always better; this is the floor, not the ceiling.

- **Secrets & safety** — no hardcoded secrets/API keys; no server-only credential used client-side;
  no unsanitised HTML injection sink.
- **Auth & boundaries** — every new endpoint / server action / handler authenticates the caller,
  checks authorization, scopes to the right tenant/owner, and validates its inputs.
- **Data integrity** — money/quantities use exact types (no float drift); multi-step writes that must
  not partially apply are transactional/idempotent; concurrent writers are guarded.
- **Type discipline** — no new `any` / `@ts-ignore` / unchecked cast without a `// reason:`; prefer
  `unknown` at external-data boundaries (and the equivalent in other languages).
- **Error handling** — failures are handled, not swallowed; retryable vs fatal are distinguished; no
  empty catch blocks.
- **Queries & performance** — no unbounded queries (paginate/limit); no N+1 in hot paths; no obvious
  accidental O(n²).
- **Consistency** — follows existing patterns in the file/module (naming, structure, the repo's
  UI/styling primitives) rather than introducing a one-off style.
- **Docs sync** — if the change adds/removes/renames something the repo documents, update that doc in
  the same PR.

**Risk-tier enumeration** — for any changed file under a risk-tier path (from the rulebook, or by the
generic heuristic: auth, money/payments, migrations, background jobs, webhooks, external API calls),
answer explicitly: auth? authorization? tenant scope? inputs validated? And for state-mutating
writes: what does it write? multi-step? transactional? idempotent? concurrency guard? failure mode if
step N fails?

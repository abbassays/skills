---
name: automated-pr-review
description: Set up a Claude-powered PR review system for any codebase — covers creating
  product knowledge docs, coding-standards rules, and the three-job GitHub Actions workflow
  (automated review, pre-merge PM report, on-demand agent). TRIGGER when: user wants to
  add AI-assisted code review to a repo, wants to set up /claude-review or /final-review
  commands on PRs, or wants to build a PR bot that understands their specific codebase.
---

# Claude-Powered PR Review System

A three-job GitHub Actions workflow that gives every PR a project-aware code review,
a pre-merge readiness report, and an on-demand agent — all driven by `anthropics/claude-code-action`.

The system is only as good as the context it loads. The workflow file is 20% of the work.
The other 80% is the product knowledge and coding-standards documents that the reviewer
reads before flagging anything.

---

## How this works (high level)

```
PR opened
   │
   ▼
Job 1: review
  Claude reads CLAUDE.md + rule files + relevant business-logic docs
  → posts one comment per finding (file:line, severity, rule, fix)
  → posts a sticky summary (verdict + counts + what's good)

/claude-review            → re-triggers Job 1 (with optional extra instructions)
/final-review             → triggers Job 2 (pre-merge PM report)
/claude <prompt>          → triggers Job 3 (on-demand agent — reads or writes code)
```

---

## Phase 1 — Inventory the codebase

Before writing any docs, take inventory. Run these across the repo:

```bash
# All routes / modules / pages (adapt path to your framework)
find . -type d -name "app" -o -name "pages" -o -name "routes" | head -5
# then list what's inside

# Background jobs
find . -name "*.ts" | xargs grep -l "trigger\|cron\|queue\|worker\|job" 2>/dev/null | head -20

# External API clients / integrations
find . -path "*/lib/*" -name "*.ts" | head -30

# Database migrations
find . -path "*/migrations/*" -name "*.sql" | wc -l

# Auth entry points
grep -r "getUser\|verifyToken\|requireAuth\|auth.check" --include="*.ts" -l | head -10
```

Record the answers to these questions:

1. **What does the app do?** One paragraph, including the tech stack.
2. **Who are the user roles?** List every role and what it can do.
3. **What are the happy paths?** The 3–5 flows that must never break (usually: sign up,
   core purchase/create action, background job that processes money/state).
4. **What are the off-limits paths?** Files that must not be edited without explicit approval:
   schema migrations, framework config (`next.config.*`, `vite.config.*`), env files,
   lock files, CI pipelines. These become BLOCKER rules in the workflow.
5. **What are the domain-specific invariants?** The things that would be catastrophic to
   get wrong. Examples across real projects:
   - Float arithmetic on money (must use integer cents/pence)
   - German §14 UStG: invoice numbering must be unique and gap-free
   - Atomic DB function for lease finalize — must never be bypassed
   - Campus-scoping on every query in a multi-tenant app
   - Metered API guards (DataForSEO, OpenAI, Stripe) — removed guards have direct $ cost
   These become the project-specific BLOCKER rules in the review prompt.

---

## Phase 2 — Create the product knowledge document(s)

The reviewer reads these in STEP 3 before flagging anything. Without them it can only
check TypeScript style, which adds minimal value.

### Pick a documentation pattern

**Pattern A — Overview + per-feature/domain chapter book**
Use when the product has clear, independent features or when a diff in one area rarely
touches another.

```
docs/BUSINESS_LOGIC.md          # master overview (always loaded)
docs/business-logic/
  01-data-model.md              # schema, tables, RLS rules
  02-<feature-a>.md
  03-<feature-b>.md
  ...
  KNOWN-ISSUES.md               # intentionally deferred tech debt
```

Each chapter follows a standard template:
- **TL;DR** — one paragraph, what it is, any metered-API cost implications
- **Why this exists (user job)** — what the user is trying to accomplish
- **Surfaces / routes** — each page or endpoint and what it does
- **Data model** — key tables, columns, RLS rules
- **Background jobs** — any async workers, idempotency requirements
- **Billing / quota gates** — which plan features or credits are consumed
- **Cross-feature contracts** — what this area receives from and sends to others
- **Known edge cases** — null states, concurrent writes, retry behaviour
- **Open questions** — items you're not certain about

The master `BUSINESS_LOGIC.md` must include:
- TL;DR + tech stack
- Glossary (canonical names for concepts)
- User personas / roles
- Core product surfaces
- Billing / agency / multi-tenant wiring
- Cross-feature happy path (end-to-end)
- Background jobs and integrations overview
- Repo orientation (key directories)
- Gotchas (§10): things that will trip up a new engineer or AI reviewer
- Open questions (§11): unresolved design decisions
- Path quick map (§12): `<path glob>` → `<what it does in product terms>`

*Used by: keywords-digger (15 chapters by feature), recash-monorepo (9 chapters by domain
— pricing, VAT, shipping, order flow, jobs, integrations, DB layer)*

---

**Pattern B — Single handbook in Part/Section format**
Use when flows are deeply intertwined, the team is small, or you want one document that's
easy to `Cmd-F` through.

```
docs/product-handbook.md
  Part I   — Overview & tech stack
  Part II  — User roles
  Part III — Pipelines (one §N per major flow)
  Part IV  — Conventions & gotchas
  Part V   — Admin backlog (known manual workarounds to migrate)
```

*Used by: unibid-nextjs (housing marketplace with 6 user roles)*

---

**Either way, every doc set must contain:**

| Required content | Why the reviewer needs it |
|---|---|
| App description + tech stack | Product context before reading any code |
| User roles + permissions | Enables "is this correctly role-gated?" check |
| Happy paths end-to-end | Baseline for "does this PR break the flow?" |
| Domain-specific invariants | Becomes the project-specific BLOCKER list |
| Gotchas / known surprises | Prevents false positives on intentional quirks |
| Off-limits paths + why | Becomes a BLOCKER rule for unauthorized edits |
| Path map (`<glob>` → product meaning) | Powers the STEP 3 routing table |
| Deferred tech-debt list | Reviewer must NOT block PRs for acknowledged issues |

---

## Phase 3 — Define coding rules

The reviewer loads these before flagging style violations. Rules must be in files it can
read — not in its training or memory.

### Two valid patterns

**Flat files** (simpler, fewer files):
```
.cursor/rules/coding-standards.mdc
.cursor/rules/backend-architecture.mdc
.cursor/rules/frontend.mdc
.cursor/rules/data-layer.mdc
.cursor/rules/file-structure.mdc
```

**Subdirectory layout** (better for large teams with many conventions):
```
.cursor/rules/core/01-workspace-scope.mdc
.cursor/rules/code-rules/01-typescript.mdc
.cursor/rules/data-backend/01-env-and-config.mdc
.cursor/rules/data-backend/02-query-patterns.mdc
.cursor/rules/frontend/01-ui-system.mdc
.cursor/rules/business-rules/01-domain-logic.mdc
```

Each `.mdc` file needs Cursor frontmatter if you use Cursor IDE:
```markdown
---
alwaysApply: true
---
# Title
...content...
```

If you don't use Cursor, embed everything directly in `CLAUDE.md`. The reviewer will read
it as part of STEP 3's "always load" list.

### Topics to cover (regardless of file count)

The rule files don't need to be exhaustive — just cover what your team actually disagrees
about or has gotten wrong before:

- **TypeScript strictness**: no `any`, `unknown` at external boundaries, discriminated
  unions over `optional?: X` everywhere
- **Async patterns**: no `await` inside `for`/`forEach` loops — use `Promise.all` (or
  `Promise.allSettled` when partial failure is acceptable); document which to use when
- **Loading states**: `isLoading`/`isPending` always surfaced in UI; never render data
  without a loading indicator; errors always surfaced to the user
- **Data fetching**: query keys from a centralised factory (no inline arrays); mutations
  invalidate the right keys; no `useEffect` for data that React Query / RSC can handle
- **File placement**: where types, schemas, hooks, server actions belong; what can live
  co-located vs what must be in a shared module
- **UI component usage**: what design-system components exist and when to use them vs
  rolling your own; styling approach (Tailwind-only, CSS modules, etc.)
- **Authentication**: every server action/API route has an auth check before doing anything;
  role-based access checks happen server-side
- **Database access**: no raw SQL in client components; when to use service-role client;
  RLS rules and when they apply

---

## Phase 4 — Identify project-specific BLOCKER rules

Generic checks (no hardcoded secrets, no `dangerouslySetInnerHTML`, auth gates on every
route) are the same for every project. The reviewer knows them by default.

The value comes from encoding **your** domain invariants. Every codebase has a small set of
rules that, if violated, cause serious production incidents. Find those and make them BLOCKERs.

Examples across real projects:

| Codebase type | Domain-specific BLOCKER |
|---|---|
| Any app with money | Float arithmetic on money — must use integer cents/pence |
| German e-commerce | Invoice `MAX+1` without `SELECT FOR UPDATE` + `UNIQUE` (§14 UStG) |
| Housing marketplace | Lease finalize outside the single atomic DB function |
| Multi-tenant SaaS | Any query missing campus/org/tenant scope |
| SaaS with metered APIs | Removed loop guard on any metered call (DataForSEO, OpenAI, etc.) |
| Marketplace with vouchers | Balance debit without `SELECT FOR UPDATE` (double-spend) |
| Multi-role app | New admin capability not routed through the admin dashboard |

Also consider a **risk-tier safety table** for financial/marketplace apps. When a PR touches
high-stakes paths (order controllers, webhook handlers, voucher redemption), the reviewer
enumerates every modified server action and answers a set of mandatory questions:

- Does it have `auth.getUser()` + role check + tenant scope?
- Are inputs zod-validated?
- Is it wrapped in a DB transaction for multi-step writes?
- Is it idempotent under retries? (Stripe and most queue systems are at-least-once.)

This prevents a large diff from hiding a single unguarded endpoint.

---

## Phase 5 — Build the path-to-domain routing table

This table is embedded in the STEP 3 section of the review prompt. For every file path
the diff touches, the reviewer looks up the table and knows which docs to read before
flagging findings.

### Three table styles (pick what fits your stack)

**Framework-specific paths** (when your codebase has a predictable directory structure):
```
| Diff touches…                          | Read |
|---|---|
| src/app/(dashboard)/checkout/**        | docs/business-logic/05-checkout.md |
| src/trigger/generate-invoice.ts        | docs/business-logic/06-invoicing.md |
| supabase/migrations/**                 | docs/business-logic/01-data-model.md |
```

**Service/module paths** (backend monolith, layered architecture, monorepo packages):
```
| Diff touches…                            | Read |
|---|---|
| services/order/**, actions/order/**      | docs/business-logic/03-order-flow.md |
| lib/vat/**, services/vat/**              | docs/business-logic/04-vat.md        |
| apps/payments/**, lib/stripe/**          | docs/business-logic/07-billing.md    |
```

**Domain glob patterns** (when the domain signal is in the filename, not the directory):
```
| Diff touches…                            | Domain to scrutinise |
|---|---|
| **/bid*, **/lease*, **/property*         | Bidding & lease pipeline (Part III §10) |
| **/notification*, **/email*, **/sms*     | Notification system (Part III §17)      |
| **/stripe*, **/webhook*, **/subscription*| Payments & subscriptions               |
```

Combine styles freely. The goal: for any changed file in a PR, the reviewer can find the
right row, load the right doc, and apply the right domain context.

---

## Phase 6 — Write the GitHub Actions workflow

### Secrets to add to the repository

| Secret | Required | Source |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Yes | console.anthropic.com → Claude Code → OAuth tokens |
| `LINEAR_API_KEY` | No | Linear workspace settings → API keys |

If using Jira or another tracker, replace the Linear MCP block with the appropriate MCP server.

### Base workflow structure

`.github/workflows/claude-code-review.yml`:

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, ready_for_review]
  issue_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write
  issues: write
  id-token: write

# Prevent the bot's own heartbeat comment from cancelling an active run.
concurrency:
  group: >-
    ${{
      (github.event_name == 'pull_request' && format('claude-review-{0}', github.event.pull_request.number))
      || (github.event_name == 'issue_comment'
          && github.event.comment.user.type != 'Bot'
          && contains(github.event.comment.body, '/claude-review')
          && format('claude-review-{0}', github.event.issue.number))
      || (github.event_name == 'issue_comment'
          && github.event.comment.user.type != 'Bot'
          && contains(github.event.comment.body, '/final-review')
          && format('final-review-{0}', github.event.issue.number))
      || (github.event_name == 'issue_comment'
          && github.event.comment.user.type != 'Bot'
          && contains(github.event.comment.body, '/claude ')
          && !contains(github.event.comment.body, '/claude-review')
          && format('claude-agent-{0}', github.event.issue.number))
      || format('claude-review-noop-{0}', github.run_id)
    }}
  cancel-in-progress: true

jobs:
  review: ...         # Job 1
  final-review: ...   # Job 2
  claude-agent: ...   # Job 3
```

---

### Job 1 — `review` (automated code review)

**Trigger condition:**
```yaml
if: |
  (
    github.event_name == 'pull_request' &&
    github.event.pull_request.draft == false &&
    !contains(github.event.pull_request.title, 'WIP') &&
    !contains(github.event.pull_request.title, 'wip') &&
    !contains(github.event.pull_request.title, 'Draft') &&
    !contains(github.event.pull_request.title, 'DO NOT MERGE')
  )
  ||
  (
    github.event_name == 'issue_comment' &&
    github.event.issue.pull_request != null &&
    github.event.comment.user.type != 'Bot' &&
    contains(github.event.comment.body, '/claude-review')
  )
```

**Steps:**
```yaml
steps:
  - name: Resolve PR head SHA and extract custom prompt (comment trigger only)
    id: pr_head
    if: github.event_name == 'issue_comment'
    env:
      GH_TOKEN: ${{ github.token }}
      COMMENT_BODY: ${{ github.event.comment.body }}
    run: |
      sha=$(gh pr view ${{ github.event.issue.number }} \
        --repo ${{ github.repository }} --json headRefOid -q .headRefOid)
      echo "sha=$sha" >> "$GITHUB_OUTPUT"
      custom=$(echo "$COMMENT_BODY" | sed 's|/claude-review||' | xargs)
      echo "custom_prompt=$custom" >> "$GITHUB_OUTPUT"

  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
      ref: ${{ steps.pr_head.outputs.sha || github.sha }}

  # Install deps so Claude can run typecheck/lint.
  # Adapt to your package manager:
  #   pnpm: use pnpm/action-setup@v4 first
  #   npm: run: npm ci
  #   yarn: run: yarn install --frozen-lockfile
  #   bun: run: bun install --frozen-lockfile
  - uses: pnpm/action-setup@v4        # remove if not using pnpm
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: pnpm                     # or 'npm', 'yarn'
  - run: pnpm install --frozen-lockfile

  - uses: anthropics/claude-code-action@v1
    with:
      claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
      allowed_bots: 'claude'          # remove if not using the Claude GitHub App
      track_progress: 'true'
      show_full_output: 'true'
      include_fix_links: true
      mcp_config: |
        {
          "mcpServers": {
            "linear": {
              "command": "npx",
              "args": ["-y", "mcp-linear@latest"],
              "env": {
                "LINEAR_API_KEY": "${{ secrets.LINEAR_API_KEY }}"
              }
            }
          }
        }
      claude_args: |
        --max-turns 50
        --model claude-sonnet-4-6
      prompt: |
        [REVIEW PROMPT — see template below]
```

**Review prompt template** (fill in the `[CUSTOMIZE]` sections):

```
Review this PR for the [CUSTOMIZE: app name] codebase:
[CUSTOMIZE: tech stack — e.g. "Next.js 15 + TypeScript + Supabase + Trigger.dev + Stripe"]

---

STEP 1 — heartbeat:
Before any file reads or analysis, post a single PR comment with exactly:
"🔍 Reviewing the diff…"

---

STEP 2 — abort gate:
If the PR title contains "WIP", "wip", "Draft", or "DO NOT MERGE", post:
"Skipping review: PR marked as work-in-progress."
and stop. Do not analyze the diff.

Otherwise proceed with STEP 3.

---

STEP 2.5 — ticket context:
Scan the PR title and body for a ticket ID matching `KEY-\d+` or `[A-Z]+-\d+`.
If found, call the Linear MCP `get_issue` tool to fetch title, description, and
acceptance criteria. Use this to flag if the implementation diverges from the ticket's
intent or leaves acceptance criteria unaddressed. Skip silently if no ID is found.

---

STEP 3 — load context:

Read these files before reviewing. They are the source of truth — do not invent
rules not codified there.

**Always load:**
- `CLAUDE.md`
[CUSTOMIZE: list your rule files, e.g.:]
- `.cursor/rules/coding-standards.mdc`
- `.cursor/rules/backend-architecture.mdc`
- `.cursor/rules/frontend.mdc`
- `.cursor/rules/data-layer.mdc`
- `docs/BUSINESS_LOGIC.md`   (or equivalent master overview doc)

**Load the matching chapter if the diff touches these paths:**

[CUSTOMIZE: your path-to-chapter routing table, e.g.:]

| Diff touches… | Read |
|---|---|
| src/app/(dashboard)/checkout/**, src/actions/checkout/** | docs/business-logic/05-checkout.md |
| src/trigger/**, trigger.config.ts | docs/business-logic/06-background-jobs.md |
| supabase/migrations/** | docs/business-logic/01-data-model.md |

---

STEP 4 — full review:

Walk the diff and flag only substantive violations. Post one PR comment per issue
with file:line, the specific rule broken (cite the file), and a concrete fix.

**Severity tiers — prefix every finding with one of:**
- `[BLOCKER]` — must be fixed before merge
- `[MAJOR]` — significant correctness, security, or business-logic issue
- `[MINOR]` — conventions violation
- `[NIT]` — style preference, minor naming, optional

**Always [BLOCKER] regardless of rule wording:**
- Secrets or API keys hardcoded in source
- Service-role / admin DB client used client-side
- `dangerouslySetInnerHTML` without sanitization
- New server action or API route without auth check
- Writes to off-limits paths without explicit approval:
  [CUSTOMIZE: list your off-limits paths]
[CUSTOMIZE: add your domain-specific BLOCKERs, e.g.:]
- Float arithmetic on money values (must use integer cents)
- [your invariant here]

**Checklist — apply only if the diff touches the relevant area:**

*Scope discipline*
- Diff matches ticket scope — no drive-by refactors or unrelated formatting

*Type safety*
- No new `any`, `as any`, or `@ts-ignore` without a `// reason:` comment
- `unknown` over `any` for external boundaries

*Routing & paths*
- Shared routes use constants from the path config — no ad-hoc string literals

*Data fetching*
- Query keys from a central factory — no inline arrays
- Mutations invalidate the right queries
- No `useEffect` for data React Query / RSC can handle

*Authentication & authorization*
- Every new server action / API route has an auth check
- Role-based access enforced server-side

*Database*
- No raw SQL in client components
- RLS-bypass paths are server-only and clearly marked
- Types regenerated if schema changed

*Security*
- No secrets in code
- No XSS
- No new auth-unprotected endpoints

*Edge cases*
- Null/undefined values, empty collections, expired sessions, concurrent writes,
  background-job retries

*Performance*
- No N+1 patterns (no DB calls inside .map())
- No unbounded response payloads where pagination should apply
- No `await` inside `for`/`forEach` loops — use `Promise.all`
Label [MAJOR] if likely to cause latency at current traffic, [MINOR] if future risk.

If a violation merely matches surrounding legacy code this PR isn't claiming to fix,
label it "[MAJOR — legacy, not introduced by this PR]" and do NOT block on it.

Skip entirely: generated type files, lock files, formatting nits not in the rule files.

---

STEP 5 — final summary:

Post a single summary comment with:
- Verdict: APPROVE / APPROVE WITH NITS / REQUEST CHANGES / BLOCK
- Finding counts (e.g. "1 BLOCKER, 2 MAJOR, 0 MINOR, 1 NIT")
- 1–3 things the PR does well
- Out-of-scope observations worth a follow-up ticket (file paths only, no fix suggestions)

If the PR is clean: "✅ No substantive issues found." plus a one-line "Things that are good".
Always post at least the heartbeat (STEP 1) and a final summary.

${{ steps.pr_head.outputs.custom_prompt && format('---

ADDITIONAL INSTRUCTIONS FROM REVIEWER:
{0}

Apply these on top of the standard review above. If they conflict with a
blocker rule, the blocker rule wins.', steps.pr_head.outputs.custom_prompt) || '' }}
```

---

### Job 2 — `final-review` (pre-merge PM report)

Triggered by `/final-review` comment on a PR.

**Steps:** same checkout + dep install as Job 1 (no `allowed_bots`).

**Prompt template** (always produce all sections; write "N/A — [reason]" if not applicable):

```
STEP 1 — heartbeat: post "📋 Preparing the final review report…"

STEP 2 — gather context:
Run: gh pr view <NUMBER> --json title,body,files,additions,deletions,baseRefName,headRefName
Run: gh pr diff <NUMBER>
Read: CLAUDE.md, relevant docs

Branch status: gh pr view <NUMBER> --json mergeStateStatus --jq .mergeStateStatus
→ if BEHIND or DIRTY: post ⚠️ "Branch is out of date or has conflicts." and note in header.

STEP 3 — write the report as a single PR comment:

### 1. Summary of changes
3–5 bullets. Assume reader hasn't read the code.

### 2. Feature behaviour shifts
Old → new behaviour, which role(s) affected, whether existing data is affected.

### 3. Edge cases
For each changed flow: what edge cases exist and are they handled? Flag with ⚠️.

### 3b. Performance considerations
Read prior review comments. For each unaddressed [MAJOR] performance concern:
🚫 Unresolved: [description + file:line]
For unaddressed [MINOR]: ⚠️ Follow-up: [description]

### 4. UI expectations by role
[CUSTOMIZE: list your user roles and what they'll see differently]

### 5. Database migrations
List every migration file, whether to run before or after code deploy, and any
destructive operations (DROP, DELETE, NOT NULL on populated table).

### 6. Data cleaning
BEFORE MERGE: [what + exact query] — consequence if skipped: [what breaks]
AFTER MERGE: [what + query] — run within [timeframe]

### 7. Backfill / audit queries
List any SQL scripts in the PR, what they do, when to run.

### 8. Rollback plan
Can the migration be reversed? Can code be reverted with git revert + re-deploy?
Data dependencies that make rollback destructive?

### 9. Deployment order
1. Add new env vars to [CUSTOMIZE: your hosting platform] if any
2. Run migrations — before or after code deploy?
3. Deploy code
4. Re-deploy background job workers if any job changed
5. Run post-deploy queries
6. Verify: [CUSTOMIZE: what to check — Sentry error rate, job dashboard, DB query]

[CUSTOMIZE: add domain-specific sections, e.g.:]
### X. Notification fan-out impact
### X. Stripe/subscription side-effects

End with verdict: ✅ Ready to merge / ⚠️ Merge with caution [reason] / 🚫 Do not merge [reason]
```

---

### Job 3 — `claude-agent` (on-demand `/claude <prompt>`)

Triggered by `/claude <anything>` comment (excluding `/claude-review`).

**Requires `contents: write` permission** (unlike the read-only review jobs).

**Key design decision — commit behavior:**

*Auto-commit on write requests* (keywords-digger / recash pattern):
```
If user asks to fix/change/write → make the change, run typecheck+lint, commit, push, post summary.
```

*Require explicit commit authorization* (unibid pattern — safer for cautious teams):
```
If user asks to fix/change/write → make the change, leave uncommitted, post summary of touched files
and ask them to reply "/claude go ahead and commit" if they want the commit.
```

Choose based on your team's risk tolerance. The unibid pattern catches unintended pushes;
the auto-commit pattern is faster for trusted contributors.

**Prompt template:**

```
You are responding to a `/claude <prompt>` comment on PR #<NUMBER> in [CUSTOMIZE: app name].
The currently checked-out branch IS the PR branch (`<BRANCH>`).
[If auto-commit:] Any code changes you commit must be pushed to THIS branch — never to main.
[If explicit-commit:] Only commit and push if the user's message explicitly uses words like
"commit", "push", "apply and commit". Otherwise make changes but leave them uncommitted.

## User's request
<PROMPT>

## Decide response style

Read-only / question / plan → post a PR comment. No file changes, no commits.
Write / fix / change → make changes, run typecheck and lint, [commit / leave uncommitted per policy].
Ambiguous → prefer read-only. Post a plan and ask for confirmation.

## Hard rules — non-negotiable

1. NEVER push to main. You are on <BRANCH>.
2. Off-limits paths require explicit human approval in a PR comment before editing:
   [CUSTOMIZE: same list as in the review job]
3. Always read CLAUDE.md and matching rule files before making code changes.
4. Never use --no-verify on commits or --force on push without explicit user instruction.
5. If typecheck or lint fails after your changes, fix the issue before committing.
6. Always end with at least one PR comment, even for read-only invocations.

## Output
Be concise — file paths, commit SHA, and a 1–2 line summary beat a wall of text.
```

---

## Phase 7 — Optional enhancements

Add these as the project's needs grow:

**Sticky summary comments** — instead of posting a new summary on every re-review, find
and edit the existing one. Keeps PR threads clean. (keywords-digger pattern):
```bash
gh pr view $PR_NUMBER --json comments \
  --jq '.comments[] | select(.body | contains("<!-- review:sticky -->")) | .databaseId'
# if found: gh pr comment $PR --edit $ID --body-file /tmp/summary.md
# if not:   gh pr comment $PR --body-file /tmp/summary.md
```
Include `<!-- review:sticky -->` marker at the top of every summary.

**Finding IDs** — `<!-- finding-id:N -->` as the very first line of each issue comment.
Enables a `/claude-fix items:1,3` workflow where Claude addresses specific findings by ID.

**Pre-review typecheck** — run `pnpm typecheck` (or equivalent) as a CI step before
the Claude action. Claude can then see if the build is broken before reviewing.

**Doc-sync gate** — a dedicated `[BLOCKER — DOC GATE]` severity tier for PRs that change
behavior without updating the matching docs chapter. Enforces "new behavior ships with docs."

**Risk-tier safety tables** — for financial/marketplace apps with high-stakes write paths.
When the diff touches specified path globs (order controllers, webhook handlers, payment
flows), the reviewer must produce a table enumerating every modified server action/handler
and answering: auth?, role check?, tenant scope?, input validation?, transaction wrapping?,
idempotency mechanism?

---

## Phase 8 — Verification checklist

After wiring everything up, verify each job works:

- [ ] Open a test PR → heartbeat `"🔍 Reviewing the diff…"` appears immediately
- [ ] Reviewer posts finding comments with file:line and severity prefixes
- [ ] Reviewer posts a summary comment with verdict and counts
- [ ] Post `/claude-review extra focus on auth` → re-review triggers with custom instructions
- [ ] Post `/final-review` → pre-merge report appears with all sections
- [ ] Post `/claude what does file X do?` → read-only answer posted, no commits made
- [ ] Post `/claude fix the typo on line N` → write behavior per your commit policy
- [ ] Post `/claude edit supabase/migrations/x.sql` → blocked as off-limits
- [ ] Open a PR with "WIP" in the title → review is skipped

Sanity-check the prompt:
- [ ] Path routing table covers all major areas of the codebase
- [ ] BLOCKER rules include project-specific domain invariants (not just generic style)
- [ ] Final-review deployment steps match how you actually deploy
- [ ] Agent off-limits list is identical to the review off-limits list
- [ ] Docs chapters are up to date (open questions resolved, paths accurate)

---

## Common pitfalls

**The review only catches TypeScript style, not business bugs.**
This means Phase 2 docs and Phase 4 domain BLOCKERs aren't done yet. The generic checklist
adds minimal value on its own — the domain-specific BLOCKER list is where ROI comes from.

**The path routing table has gaps.**
The reviewer defaults to no domain context for unmatched paths. Audit by diffing a few recent
PRs against the table and adding missing rows.

**The agent commits to the wrong branch.**
The `ref:` checkout uses the PR branch name from `gh pr view`. Ensure the agent prompt
repeats "NEVER push to main" and checks the branch before pushing.

**Re-reviews duplicate findings from the previous run.**
Add sticky comment logic (Phase 7) so summaries are edited rather than re-posted, and add
a note in the prompt to skip findings already addressed in later commits.

**The review times out on large diffs.**
Add a PR size escape hatch: if diff exceeds N lines, post a warning and review only the
highest-risk files (those matching the off-limits or risk-tier path globs).

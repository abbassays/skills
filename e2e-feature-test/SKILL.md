---
name: e2e-feature-test
description: >-
  Prove a feature actually works by driving it end-to-end in a real browser via the chrome-devtools
  MCP — log in as the project's test account (TESTING_EMAIL/TESTING_PASSWORD from .env.local),
  click through the feature's flows, fail on console errors and failed network requests, verify DB
  side-effects when a database MCP is connected, and produce evidence (screenshots + step-by-step
  report; posted to the PR when one exists). Use when the user says "test this e2e", "test the
  feature end to end", "verify it in the browser", "drive the UI and check it works", "QA this
  feature", or when a delivery pipeline (execute-plan / ship-it) wants a functional gate before
  opening the PR. Also use for debugging existing/production issues in the browser ("reproduce this
  in the app") — in that mode the user supplies the flow. Typecheck and lint prove the code
  compiles; THIS skill proves the feature works. Not for writing Playwright or unit test files — it
  is agent-driven browser testing, not test-suite authoring. Works in any web project: everything
  repo-specific (dev command, port, login route, database) is detected at runtime.
---

# E2E Feature Test — drive the real app, prove it works

Typecheck, lint, and code review all pass PRs whose features are broken in the browser. This skill closes that gap: the agent logs into the running app as the test account, performs the feature's flows like a user would, watches the console/network/database while doing it, and produces evidence. A feature is "verified" only when it has been *observed working*, not when its code looks right.

Nothing repo-specific is hardcoded here — detect it all at runtime (Phase 0). If the current project has its own conventions (a CLAUDE.md naming the dev command, a known login route), those win over the detection heuristics.

## Modes

- **Fresh-build mode** (the agent built the feature in this session, or a plan/ticket is in context): derive the test flows yourself from the ticket's acceptance criteria / the plan / the diff. Print the derived test plan before executing — when invoked by a pipeline skill (execute-plan/ship-it) don't pause for approval, just print and run; when invoked manually, give the user a beat to adjust.
- **Cold mode** (invoked on an existing feature or a production bug with no build context): do NOT guess the flows. Ask the user what to drive: "What flow should I test, starting from which page, and what does success look like?"

## Phase 0 — Detect the project, resolve target and credentials

1. **Credentials**: read `TESTING_EMAIL` and `TESTING_PASSWORD` from the project's `.env.local` (fall back to `.env` if there is no `.env.local`). If either is missing, STOP and tell the user this project has no test account configured — never substitute another account or invent credentials. Never print the password in reports, PR comments, or commit messages (the tool-call transcript is unavoidable; the deliverables must stay clean).
2. **Target URL**:
   - Default: **local dev**.
   - If the user's invocation includes a URL, test that URL instead and skip server management. Never guess a staging/production URL.
3. **Dev command + port**: read `package.json` scripts for the dev command and the package manager (lockfile: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` → npm; other stacks: look for the project's documented run command). Pick the e2e port as (project's default port + 210, e.g. 3000 → 3210) so the user's own dev session is never clobbered.
4. **Login route**: find it in the codebase — grep the app's routes for the auth page (`login`, `signin`, `auth`) rather than assuming a path. Confirm it serves a 200 before relying on it.
5. **Database access**: check whether a database MCP is connected for this project (Supabase MCP, or similar). If yes, DB side-effect checks are in scope; resolve the project/database id from the MCP's own listing, never from memory. If no database access exists, DB checks are skipped and the report must say so — silence would overstate the verification.
6. **PR context**: `gh pr view --json number,url 2>/dev/null` on the current branch. A PR existing changes the evidence output (see Phase 5).
7. **Outbound-action inventory**: before driving anything, list the flow steps that leave the system — sending email, publishing to external platforms, payments, posting to third-party APIs. These are the ask-first boundaries for Phase 3.

### Local dev server — reuse if running, else start

1. Check what's listening on the project's default port and the e2e port (`lsof -iTCP:<port> -sTCP:LISTEN -n -P`). If a server is up, confirm it's serving THIS branch's code (check the process's cwd via `lsof -p <pid>`). A server running a different worktree or an old branch is worse than no server.
2. If nothing suitable is running, start the detected dev command on the e2e port in the background, logging to a gitignored scratch location, then poll until an actual page returns 200 (dev servers often answer the port before pages compile — poll the login route, not `/`).
3. If the server won't come up, read the log tail and surface the error — don't fall back to a different target silently.

## Phase 1 — Login

1. `new_page` → `navigate_page` to the detected login route.
2. `take_snapshot`, fill the email + password fields (`fill_form`), submit.
3. Verify login landed: `wait_for` an element/text that only exists authenticated (the app shell/nav). If the browser was already authenticated as the test user, skip ahead; if authenticated as a DIFFERENT user, log out first — evidence from the wrong account is worthless.
4. Login failure = hard stop. Report what the page showed; do not retry with invented credentials.

## Phase 2 — Derive and print the test plan

For fresh-build mode, derive flows from (in priority order): the ticket's numbered specs and edge cases → the plan file → the diff. Each flow is:

```
FLOW <n>: <name>
  Pre-state:  <what must be true before — and how you'll arrange it>
  Steps:      <numbered UI actions>
  Expected:   <what the user should see>
  DB checks:  <table + condition to verify via the database MCP, or "none" / "no DB access">
  Boundary:   <outbound action this flow approaches, or "none">
```

Cover the happy path of every user-visible spec, plus the edge cases the ticket calls out (empty states, NULL guards, error paths that are cheap to trigger). Don't pad with flows the feature doesn't touch.

## Phase 3 — Execute flows

For each flow, per step:

1. `take_snapshot` first, act second. Element uids come from the **latest** snapshot — a uid from a stale snapshot after a re-render is the most common source of phantom failures. Re-snapshot after anything that mutates the DOM.
2. Act (`click`, `fill`, `hover`, `navigate_page`), then verify the expected state with `wait_for` (text/element) rather than a blind sleep.
3. Screenshot the moments that prove something: the state BEFORE the key action, the state AFTER, and any final confirmation (toast, badge, new row). Save via `take_screenshot` to a gitignored scratch dir, e.g. `<scratch>/e2e/<slug>/<nn>-<step>.png`. Not every click needs a screenshot — every *claim in the report* needs one.

**After each flow — the three monitors:**

- **Console**: `list_console_message` — any `error`-level message that appeared during the flow fails it (pre-existing noise from before your flows started doesn't count; note it separately).
- **Network**: `list_network_requests` — any 4xx/5xx on the app's own calls (same-origin API/server-action requests) during the flow fails it. Third-party noise doesn't count.
- **Database** (when a DB MCP is connected): verify the expected rows exist/changed, scoped to the test account's user id (look it up once by TESTING_EMAIL, reuse it). UI success with a missing DB side-effect is a FAIL — that's exactly the class of bug this skill exists to catch.

**Outbound boundaries**: when a flow reaches an inventoried outbound action, verify everything up to the final trigger (the compose state, the payload preview, the button being enabled), take the screenshot, then STOP and ask the user whether to fire it. Never cross the boundary on your own judgment — not even on "it's just a test site".

**Mobile**: if the feature has a mobile-specific surface (sheets, drawers, responsive filters), rerun the affected flow once at `resize_page` 390×844. Desktop-only features skip this.

## Phase 4 — On failure: diagnose, fix, retest

1. Capture the evidence bundle first: screenshot of the broken state, the console errors, the failing network request (`get_network_request` for its body), and the relevant DB state. Diagnosis without captured evidence gets lost on retry.
2. Attribute it: is the failure caused by this branch's changes (diff scope) or pre-existing? Reproduce on the base branch's behavior mentally or via code reading if ambiguous.
3. **Branch-caused** → fix it (systematic-debugging applies: read the error, trace the actual cause, don't pattern-match), commit the fix as its own `fix(<scope>): <what>` commit, and **rerun the failed flow from its pre-state** — not just the failing step; the fix may have shifted earlier behavior.
4. **Pre-existing / not attributable** → do NOT fix it silently mid-run. Record it in the report as `PRE-EXISTING` with evidence and move on.
5. Loop until every flow is green or explicitly blocked. A flow that can't pass gets `BLOCKED: <reason>` in the report — never silently dropped.

## Phase 5 — Evidence and report

**Report structure (always):**

```
E2E test: <feature> — <target: local:<port> | url>
Account: TESTING_EMAIL (redacted)

FLOW 1: <name> — ✅ PASS
  steps: 5/5 · console: clean · network: clean · DB: <check> ✓
  evidence: 01-before.png, 02-after-save.png
FLOW 2: <name> — ✅ PASS (after fix <hash>)
FLOW 3: <name> — ⛔ BLOCKED at outbound boundary (<action>) — awaiting go-ahead
  verified up to: <last verified state> ✓

DB verification: <ran | skipped (no DB MCP connected)>
Fixes made during testing: <hash> <subject> | none
Pre-existing issues noticed (not fixed): <list or none>
Rows created by this run: <table: ids / names>
```

**If a PR exists**: copy the screenshots into `.github/e2e-evidence/pr-<number>/` on the PR branch, commit them (`test(<scope>): add e2e evidence for PR #<n>` — this is the one place binary evidence in the diff is intended), push, and post the report as a PR comment with links to the committed files (on private repos GitHub may render them as links rather than inline images — links are fine, they're one click). **If no PR**: report in chat; screenshots stay in the scratch dir with paths listed.

**Cleanup — ask, don't assume**: list the rows the run created (from the "Rows created" section) and ask the user whether to delete them. If yes, delete via the database MCP scoped to those exact ids — never a broad `DELETE ... WHERE user_id = <test user>`.

## What this skill does NOT do

- Does NOT write Playwright/Cypress/unit test files — it drives the browser itself.
- Does NOT test with any account other than TESTING_EMAIL, and does NOT print the password anywhere user-visible.
- Does NOT fire outbound actions (email, external publishes, payments) without an explicit per-run go-ahead.
- Does NOT guess flows in cold mode, and does NOT guess staging/production URLs.
- Does NOT delete test data without asking, and never deletes beyond the ids it created.
- Does NOT paper over pre-existing failures by fixing them silently — they get reported.
- Does NOT declare a flow passed while its console/network/DB monitor failed, and does NOT claim DB verification it skipped.

## Quick-reference checklist

```
[ ] Phase 0 — creds read (never echoed); dev command/port/login route DETECTED not assumed; DB MCP presence checked; PR context checked; outbound inventory listed
[ ] Server — reused only if serving THIS branch; else started on the dedicated e2e port and polled ready
[ ] Phase 1 — logged in as TESTING_EMAIL, verified authenticated state
[ ] Phase 2 — test plan derived (fresh-build) or asked (cold), printed before running
[ ] Phase 3 — snapshot-before-act; console+network+DB monitored per flow; boundaries stopped at
[ ] Phase 4 — failures attributed; branch-caused fixed + flow rerun from pre-state; pre-existing recorded
[ ] Phase 5 — report delivered (PR comment + committed evidence when PR exists); DB-skip disclosed if applicable; cleanup offered
```

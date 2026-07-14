---
name: deploy-and-merge
description: "Ship a PR to production in the right order for a Next.js + Supabase + Trigger.dev + Vercel stack: apply the Supabase migrations, redeploy Trigger.dev tasks, THEN merge the PR into main. Use when the user says 'merge this to prod', 'ship this PR', 'deploy and merge', 'merge PR #N to production', or asks to release a PR. Migrations and trigger deploys only run if that PR actually touches them. Schema goes live before the merge because Vercel auto-deploys on merge and the code needs the schema to already be there. Vercel/preview checks are NEVER treated as blockers. On any failure it stops and reports loudly, and never auto-rolls-back a production migration. Also has an opt-in 'sync' step that fast-forwards local main WITHOUT checking it out, so a branch you or another agent is working on is undisturbed."
user-invocable: true
---

# Deploy and Merge — ship a PR to production, in the correct order

Production ordering for this stack is not optional and it is not obvious:

**Migrations → Trigger deploy → Merge.**

The moment you merge into `main`, Vercel deploys the new code. If the schema isn't already live, the
new code hits a database that doesn't have the columns it expects. So the schema lands *first*, even
though that means touching production for a PR that hasn't merged yet. Everything below exists to
make that safe.

---

## Step 0 — Preflight (before touching anything in production)

1. **Identify the PR.** Use the PR for the current branch, or the number the user gave. If neither is
   clear, ask. `gh pr view` / `gh pr status`.

2. **Verify it can actually land.** Refuse to touch production for a PR that can't merge — that's how
   you end up with prod schema ahead of deployed code.
   - **Mergeable**: no conflicts with `main`.
   - **Required status checks green.**
   - An approving review is **not** required.

3. **⚠ Vercel is NEVER a blocker.** Ignore every Vercel / preview / deployment check, whether it's
   red, pending, or missing entirely. In some repos Vercel is preview-only; in others the author
   isn't in the Vercel org and deploys go through the override redeploy script. A failing Vercel
   check tells you nothing about whether this PR is safe to ship. **Filter deployment-type checks out
   of the "is it green?" question entirely.**

If preflight fails, stop and say exactly why. Do not proceed to migrations.

---

## Step 1 — Work out what actually applies to THIS PR

Read the PR's changed files (`gh pr diff --name-only`) and decide which steps run:

| Step | Runs if the PR touches |
|---|---|
| **Migrations** | `supabase/migrations/**` (any path — monorepos nest it) |
| **Trigger deploy** | `**/trigger/**`, `trigger.config.*` |

**Skip loudly, never silently.** Say *"No migrations in this PR, skipping step 2"* so the user knows
the step was considered and didn't apply. A silent skip is indistinguishable from a bug.

---

## Step 2 — Apply the Supabase migrations (only if the PR has them)

Migrations on production are **irreversible against live data**. Treat every one as such.

### Resolve the production project (and cache it)

1. **Check the cache first:** `.claude/deploy-target.json` in the repo. If it has a
   `supabase.project_ref` + `supabase.project_name`, use it — don't re-derive it every ship.
2. **If there's no cache**, detect the project ref from the repo: `supabase/config.toml`,
   `.env` / `.env.production` (`SUPABASE_PROJECT_REF`, or the ref inside `NEXT_PUBLIC_SUPABASE_URL`
   — `https://<ref>.supabase.co`).
3. **Resolve the ref to its real name** via the Supabase MCP (`list_projects` / `get_project`), so the
   confirmation shows a human name, not just an opaque ref.
4. **Write the cache** after the user confirms it the first time:
   ```json
   { "supabase": { "project_ref": "abcdefgh", "project_name": "Recash Production" } }
   ```
   Re-confirm only if the file is missing or the detected ref no longer matches the cached one.

### Confirm, then apply

**Show the exact SQL and the exact target, then wait.** Never apply silently.

```
Applying migrations to: Recash Production (abcdefgh)   ← PRODUCTION

supabase/migrations/20260715120000_add_processed_events.sql
  create table processed_events (
    event_id text primary key,
    processed_at timestamptz not null default now()
  );

Apply this to production? (yes / no)
```

On explicit confirmation, apply via the Supabase MCP (`apply_migration`). If it fails: **stop.** Do
not deploy trigger, do not merge. Report what failed.

---

## Step 3 — Redeploy Trigger.dev (only if the PR touches it)

Do not assume cloud. This stack runs **both** Trigger.dev cloud and a self-hosted instance.

1. **Read `trigger.config.*`.** A self-hosted setup declares its own API URL / registry
   (`apiUrl` pointing at your own instance rather than `api.trigger.dev`). Cloud has no such override.
2. **Deploy to production** with the command that matches:
   - **Cloud:** `npx trigger.dev@latest deploy` (production environment)
   - **Self-hosted:** the same deploy command, pointed at the self-hosted instance per its config
     (API URL + registry as configured in the repo).
3. If you cannot confidently tell which it is, **ask** rather than guessing — a deploy to the wrong
   instance is a real outage.

If the deploy fails: **stop. Do not merge.** The schema is already live at this point; say so
explicitly in the failure report.

---

## Step 4 — Merge the PR

Only after the applicable steps above succeeded.

- **Merge commit** (not squash) — preserve the branch's history in `main`.
- **Delete the source branch** after the merge.

```bash
gh pr merge <number> --merge --delete-branch
```

Report the merge, and note that Vercel will now deploy `main` on its own.

---

## Step 5 — Sync (ONLY when the user explicitly asks)

**This step does not run by default.** It runs only when the user says "sync", "pull main",
"update main locally", or similar.

The point: get local `main` up to date **without checking it out**, because the user (or another
agent) may be mid-work on a completely different branch, and yanking the working tree out from under
them is unacceptable.

```bash
git fetch origin main:main
```

That fast-forwards the local `main` ref while leaving your current branch, working tree, and staged
changes completely untouched.

- **If `main` happens to be the currently checked-out branch**, `git fetch origin main:main` will
  refuse. In that case just do a plain `git pull --ff-only` instead.
- **If the fast-forward is rejected** (local `main` has diverged), do NOT force it. Report it and let
  the user decide.
- **Never touch the current branch.** No rebase, no merge, no stash, no checkout. Sync means sync
  `main`, nothing else.

---

## Failure handling — stop, report loudly, never roll back

If any step fails, **halt immediately.** Do not attempt the next step.

**Never auto-roll-back a production migration.** Down-migrations against live data usually can't be
undone cleanly, and a botched rollback is worse than a known-inconsistent state.

Report precisely what did and didn't land, so the user knows exactly where production stands:

```
⚠ STOPPED — trigger deploy failed.

Landed:
  ✅ Migrations applied to Recash Production (abcdefgh)

Did NOT land:
  ❌ Trigger.dev deploy — failed: <error>
  ⏭  Merge — not attempted

Production right now: schema is updated, app code is NOT (PR unmerged), trigger tasks are on the old
version. Nothing was rolled back. Your call on how to proceed.
```

---

## Checklist

```
[ ] PR identified; mergeable; required checks green
[ ] Vercel / preview / deployment checks IGNORED (never a blocker)
[ ] Determined which steps apply from the PR's changed files; skipped steps announced out loud
[ ] Migrations: prod project resolved (cached in .claude/deploy-target.json), SQL + target shown,
    explicitly confirmed, applied via Supabase MCP
[ ] Trigger: cloud vs self-hosted detected from trigger.config.*, deployed to production
[ ] Merged with a merge commit; source branch deleted
[ ] Sync: ONLY if explicitly asked — git fetch origin main:main, current branch untouched
[ ] Any failure: stopped immediately, reported what landed vs didn't, no auto-rollback
```

---

## What this skill does NOT do

- Does not create the PR or run its CI (that's `ship-it`).
- Does not treat Vercel as a gate, ever.
- Does not roll back a production migration.
- Does not rebase, merge, stash, or check out anything on your current branch.
- Does not sync unless explicitly asked.
- Does not apply migrations to a project it hasn't shown you and had you confirm.

---
name: setup-vercel-redeploy
description: "Scaffold an on-demand Vercel redeploy trigger for a GitHub repo — a GitHub Actions workflow + a `redeploy` script that forces a Vercel build past the free/Hobby plan's author restriction by pushing one tiny dummy commit authored as Claude. Works for single-project repos AND monorepos with multiple Vercel projects (one per-app Root Directory trigger file, committed together). TRIGGER when the user asks to 'set up a redeploy script', 'add a vercel deploy trigger', 'force a vercel redeploy from CI/GitHub', 'redeploy like the hotel-booking-system repo', wire `pnpm redeploy` / `npm run redeploy`, or make pushes by non-connected authors deploy on Vercel's free plan."
user-invocable: true
---

# Set up a Vercel redeploy trigger

Scaffolds a GitHub Actions workflow + a `scripts/redeploy.sh` helper that lets you
(re)deploy a Vercel project on demand or on every push — even when the pushing
author isn't the account Vercel is connected to.

## The problem this solves

On the Vercel **free / Hobby plan**, a project only builds commits whose author
is the personal account connected to the project. So pushes by teammates, bots,
or CI (any non-connected author) silently **don't deploy**.

The fix: a workflow asks Vercel who the connected owner is (`GET /v2/user` with a
token), and if `HEAD`'s author isn't that owner — and isn't already Claude — it
adds **one tiny commit authored as `Claude <noreply@anthropic.com>`** rewriting a
single-line trigger file. Vercel does **not** block Claude-authored commits, so
that nudge gets the deployment through. A commit already by Claude is left alone,
which also prevents an infinite trigger loop.

## When to use

- Setting up redeploy on a Vercel-hosted GitHub repo (single app or monorepo)
- "Set it up like the hotel-booking-system repo" / `pnpm redeploy`
- Pushes by non-connected authors aren't deploying on the free plan

## When NOT to use

- Pro/Enterprise teams **without** the author restriction AND you only want a
  plain rebuild → just use `vercel --prod` / a Deploy Hook URL; you don't need
  the dummy-commit dance. (This skill is still fine, just heavier than needed.)
- A non-Git / non-GitHub deploy source.

## Files this scaffolds

```
<repo>/
├── .github/workflows/
│   ├── vercel-deploy-trigger.yml            # the caller (single OR monorepo variant)
│   └── vercel-deploy-trigger.reusable.yml   # shared engine (identical for both)
└── scripts/
    └── redeploy.sh                          # on-demand dispatcher (gh workflow run)
```

Templates live next to this skill in `templates/`. The reusable engine is the
same for both layouts; only the caller differs.

## Setup steps

Follow in order. Each step is concrete; don't skip.

### 1. Detect the repo layout — single project vs monorepo

A repo is **monorepo** for this skill's purposes if **more than one Vercel
project** deploys from it, each with its own **Root Directory** (e.g. `apps/web`,
`apps/admin`). Otherwise it's **single**.

Signals to check:
- `apps/` or `packages/` dirs, a `pnpm-workspace.yaml`, `turbo.json`, or an `nx`/
  `lerna` config → likely monorepo. Confirm with the user which sub-dirs map to
  Vercel projects (Vercel dashboard → each project → Settings → **Root Directory**).
- A single `package.json`/`next.config.*` at the repo root → single project.

If unsure, **ask the user**: "Is this one Vercel project at the repo root, or
several projects each rooted in a sub-directory?"

### 2. Copy the engine + the right caller

Always copy the engine, then exactly one caller (renamed to
`vercel-deploy-trigger.yml`):

- `templates/vercel-deploy-trigger.reusable.yml` → `.github/workflows/` (verbatim)
- **Single:** `templates/vercel-deploy-trigger.single.yml` → `.github/workflows/vercel-deploy-trigger.yml`
- **Monorepo:** `templates/vercel-deploy-trigger.monorepo.yml` → `.github/workflows/vercel-deploy-trigger.yml`

Then copy `templates/redeploy.sh` → `scripts/redeploy.sh` and `chmod +x` it.

### 3. (Monorepo only) Fill in the APPS list

Edit the `APPS:` block in the monorepo caller — one Vercel Root Directory per
line, matching the dashboard exactly:

```yaml
APPS: |
  apps/web
  apps/admin
  apps/docs
```

The per-app trigger file is `<app-dir>/.vercel-deploy-trigger` — it lands INSIDE
the app's Root Directory, which is what makes Vercel rebuild that specific
project (Vercel skips builds when nothing under the Root Directory changed). On
push, only apps whose dir changed are nudged; all targeted apps share ONE commit.

### 4. Wire up the package.json script (if the repo has one)

Add to `scripts` (detect the package manager from the lockfile —
`pnpm-lock.yaml`→pnpm, `package-lock.json`→npm, `yarn.lock`→yarn):

```json
"redeploy": "bash scripts/redeploy.sh"
```

No `package.json`? Skip this — users just run `bash scripts/redeploy.sh` directly.

### 5. Set the Vercel token (the one piece of required config)

The workflow needs a repo secret named exactly **`VERCEL_TOKEN`**.

**Where to get the token:** https://vercel.com/account/tokens → **Create Token**.
Scope it to the **team/account that owns the connected Vercel project** (the
workflow calls `GET /v2/user` with it to learn whose commits Vercel builds). Copy
it immediately — Vercel shows it once. Pick an expiration or "No Expiration".

> Monorepo caveat: if different apps are connected to **different** Vercel
> accounts, one token can only verify one owner. Use the account that owns the
> apps you actually push for; or split into per-account tokens (advanced — would
> need a per-app secret and a tweak to the reusable workflow's verify step).

**Set it on the repo:**
```bash
gh secret set VERCEL_TOKEN --repo <owner>/<repo>
# or: GitHub → Settings → Secrets and variables → Actions → New repository secret
```

Resolve `<owner>/<repo>` from the `origin` remote. **Renamed repo gotcha:** if the
remote still uses an old name, GitHub redirects it — `gh` follows the redirect, so
it still works, but confirm the canonical name with
`gh repo view <owner>/<oldname> --json name` and consider
`git remote set-url origin <new-url>` to stop the confusion.

### 6. Commit, push, verify

The workflow only becomes dispatchable once it exists on the **default branch** of
the remote (`gh workflow run` can't find a workflow that isn't pushed yet).

```bash
git add .github/workflows scripts/redeploy.sh package.json
git commit -m "ci: add Vercel redeploy trigger"
git push
```
> Do not commit/push on the user's behalf unless they've asked — surface these
> commands and let them run, or get explicit approval first.

Then smoke-test:
```bash
bash scripts/redeploy.sh                 # or: pnpm redeploy
# monorepo single app:
bash scripts/redeploy.sh --app apps/web
```
Watch it with the `gh run watch …` line the script prints.

## Usage (what to tell the user)

```bash
pnpm redeploy                         # current branch (all changed apps in a monorepo)
pnpm redeploy -- main                 # a specific branch
pnpm redeploy -- --app apps/web       # one monorepo app
pnpm redeploy -- --app apps/web main  # one app + a branch
```
(`npm run redeploy --` / `yarn redeploy` work the same; or call `bash
scripts/redeploy.sh …` directly.)

It also fires automatically on every push — the dummy commit is only added when
the latest author isn't the connected owner, so owner/Claude pushes are untouched.

## Customization & troubleshooting

- **Trigger file name:** default `.vercel-deploy-trigger`. Change the
  `trigger-files` default (single) or the `printf '%s/.vercel-deploy-trigger'`
  suffix (monorepo) if you want a different name.
- **"Could not resolve the owner email from Vercel":** `VERCEL_TOKEN` is missing,
  expired, or scoped to the wrong account. Re-create and re-set it.
- **Build still skipped on a monorepo:** the trigger file isn't under that
  project's Root Directory — confirm the `APPS` entry matches the dashboard's Root
  Directory exactly.
- **Loop / repeated deploy commits:** shouldn't happen — the `decide` step no-ops
  when HEAD is already Claude, and the caller's `if:` skips `[skip-deploy-trigger]`
  commits. If you see a loop, check you didn't change the commit author/message.
- **Owner's own pushes:** intentionally do nothing extra (Vercel already builds
  them); the workflow run just no-ops.

#!/usr/bin/env bash
# Trigger a Vercel (re)deploy on demand via the GitHub Actions deploy-trigger
# workflow.
#
# Usage:
#   scripts/redeploy.sh                       # current branch (all apps in a monorepo)
#   scripts/redeploy.sh main                  # a specific branch
#   scripts/redeploy.sh --app apps/web        # one monorepo app, current branch
#   scripts/redeploy.sh --app apps/web main   # one app + a specific branch
#   pnpm redeploy                             # via package.json
#   pnpm redeploy -- --app apps/web main      # pass args through the package manager
#
# Requirements:
#   - GitHub CLI (`gh`) authenticated with access to this repo.
#   - Repo secret VERCEL_TOKEN set (Settings -> Secrets and variables -> Actions).
set -euo pipefail

app=""
ref=""
while [ $# -gt 0 ]; do
  case "$1" in
    --app)   app="${2:-}"; shift 2 ;;
    --app=*) app="${1#--app=}"; shift ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) ref="$1"; shift ;;
  esac
done
ref="${ref:-$(git rev-parse --abbrev-ref HEAD)}"
workflow="vercel-deploy-trigger.yml"

# Resolve the GitHub repo from the `origin` remote and pass it explicitly to
# every gh call (avoids "No default remote repository has been set"). gh follows
# GitHub's redirect if the repo was renamed, so a stale remote name still works.
origin_url="$(git remote get-url origin 2>/dev/null || true)"
repo="$(printf '%s' "$origin_url" | sed -E 's#^git@github\.com:##; s#^https://github\.com/##; s#\.git$##')"
if [ -z "$repo" ]; then
  echo "redeploy: could not determine the GitHub repo from the 'origin' remote." >&2
  exit 1
fi

args=(--repo "$repo" --ref "$ref" -f "ref=$ref")
[ -n "$app" ] && args+=(-f "app=$app")

echo "Dispatching $workflow on $repo for branch: $ref${app:+ (app: $app)}"
gh workflow run "$workflow" "${args[@]}"

# Give GitHub a moment to register the run, then surface it.
sleep 3
gh run list --repo "$repo" --workflow="$workflow" --limit 1
echo
echo "Follow it with:"
echo "  gh run watch --repo $repo \$(gh run list --repo $repo --workflow=$workflow --limit 1 --json databaseId -q '.[0].databaseId')"

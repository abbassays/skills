---
name: codebase-audit
description: "Deep, evidence-grounded health audit of a Next.js + Supabase project (single app or monorepo). Produces (1) a prioritized remediation backlog bucketed by urgency (fix now / 2 weeks / 1 month / continuous) and (2) a forward-looking engineering-standards + migration-playbook section so new work stops re-introducing the same problems. Fans out one sub-agent per audit axis, each grounded in real file:line evidence and — where connected — live MCP data (Supabase advisors, an error tracker, a product-analytics/Web-Vitals source, the host platform, a background-job runner), then synthesizes a single report. Everything repo-specific (app root, stack, MCP slugs, rulebook, prod DB project) is DETECTED at runtime, nothing hardcoded. TRIGGER on: 'audit the codebase', 'code-quality audit', 'tech-debt review', 'why is the app slow', 'where are our architecture problems', 'health check the repo'. Report-first by default — filing tickets is a separate, explicit follow-up step."
user-invocable: true
---

# Codebase Audit — Next.js + Supabase

A repeatable, evidence-grounded audit that turns "the codebase has lots of problems" into a
**prioritized, costed backlog** plus **forward guardrails**. It targets Next.js apps backed by
Supabase — a single app at the repo root or one (or more) apps inside a monorepo.

The audit is **diagnostic, not corrective** — it does not refactor code. It produces a report.
Fixing happens later, ticket by ticket (e.g. via `ship-it`).

**Nothing about a specific repo is baked in.** The app root, the exact stack, which observability
MCPs are connected, the rulebook, and the production database are all **detected in Phase 0**. Any
integration beyond Next.js + Supabase (an ORM, a background-job runner, a payment provider, an error
tracker, a product-analytics tool, the host platform) is **optional**: its axis runs only if that
tool is actually present, and says so plainly when it isn't.

---

## Operating principles (read first)

1. **No claim without evidence.** Every finding cites `file:line`, a real count (a `grep -c` / `rg`
   over the tree), or a live data point from a connected MCP. "Business logic is mixed into actions"
   is not a finding; "`src/actions/x.ts:40-220` runs pricing math, 3 DB writes, and an external API
   call inline with no service layer" is.
2. **Diagnose with real telemetry, not intuition** — when it's available. If an error tracker /
   analytics / host-platform MCP is connected, the error-handling and performance axes MUST query it
   for what is *actually* breaking and slow in production. If none is connected, do the static
   analysis and **say in the report that the telemetry half couldn't run**, rather than guessing.
3. **Severity is measured by blast radius, not aesthetics.** A missing RLS policy on a sensitive
   table outranks 400 files with inconsistent import order. Rank by user/revenue/security impact
   first, tidiness last.
4. **Measure drift from standards that already exist.** If the repo has a rulebook (CLAUDE.md /
   AGENTS.md / `.cursor/rules` / CONTRIBUTING / `docs/`), audit *compliance with it* — cite the rule
   and measure how many files violate it. Don't invent a standard the repo already documents. If
   there's no rulebook, the guardrails section proposes one.
5. **Every problem ships with a forward fix.** A finding with no "how do we stop this recurring"
   answer is half a finding. The guardrails section is a first-class deliverable, not an appendix.
6. **Read-only.** Run SELECT / advisor / log queries freely. Never write to a DB, never edit product
   code, never open a PR, never file a ticket during the audit itself.

---

## Phase 0 — Detect the project (do this before anything else)

Everything downstream depends on this. Capture and reuse it as the shared baseline.

1. **App root(s).** Find where the Next.js app lives: the dir containing `next.config.*` + an `app/`
   or `pages/` dir. Could be the repo root (single app) or `apps/<name>` / `packages/<name>` in a
   monorepo (`pnpm-workspace.yaml`, `turbo.json`, `nx.json`). If there are several apps, ask which to
   audit (or audit each).
2. **Stack fingerprint.** From `package.json` + config files, detect what's actually in use:
   - ORM / DB access: Drizzle, Prisma, raw Supabase JS (`.from()`), RPCs — which and how much.
   - Background jobs: Trigger.dev (`trigger.config.*`), Inngest, cron, queue workers — or none.
   - Payments: Stripe, Paddle, etc. — or none (decides whether the money-correctness axis runs).
   - Validation: Zod / Valibot / none.
   - Observability SDKs: Sentry, PostHog, OpenTelemetry — or none.
   - Host: Vercel, Railway, self-hosted, Docker.
3. **Connected MCPs.** Look at the available tools for `mcp__*supabase*`, `mcp__*sentry*` (or another
   error tracker), `mcp__*posthog*` (or analytics), `mcp__*vercel*` (or host), `mcp__*trigger*`.
   **Detect the slugs, never hardcode them.** Record which axes have live data and which are
   static-only.
4. **Production Supabase project.** Resolve the prod project ref from the repo
   (`supabase/config.toml`, `.env*` — the ref inside `NEXT_PUBLIC_SUPABASE_URL`) and confirm its real
   name via the Supabase MCP (`list_projects`). Advisors and `list_tables` must run against **prod**,
   not a local/dev branch. If dev and prod both exist, confirm which is which before querying.
5. **Rulebook inventory.** Collect every standards source: `CLAUDE.md` / `AGENTS.md`, `.cursor/rules/*`,
   `.cursorrules`, `CONTRIBUTING.md`, `docs/**`. This is what axes measure drift against.
6. **Baseline counts.** Compute the real numbers this repo will be judged on (don't assume any):
   total TS/TSX files + LOC in the app, count of `'use server'` files, `.from()` / ORM / `.rpc()`
   call sites, test files, migrations, `any`/`as any`/`@ts-ignore` occurrences, route count.

Write this up as a short **shared baseline** — every axis agent gets it so they share one ground
truth, and the report's appendix records it.

---

## Deliverable

One markdown report at `docs/reports/codebase-audit-<YYYY-MM-DD>.md` (create `docs/reports/` if it
doesn't exist; fall back to the repo root if `docs/` is off-limits). Exact structure:

1. **Executive summary** — ~10-line health verdict, the 5 things that matter most, the single
   highest-leverage change.
2. **Scorecard** — each axis rated `🔴 critical / 🟠 weak / 🟡 fair / 🟢 healthy` with a one-line
   justification and the hard number behind it.
3. **Per-axis findings** — for each axis: what's wrong, evidence (`file:line` / counts / MCP data),
   why it bites, and the recommended direction.
4. **Prioritized backlog** — a single table, every finding as a row, bucketed (see rubric) with an
   effort estimate and a one-line acceptance criterion.
5. **Forward guardrails** — the "one way to do X" decisions + the incremental migration playbook
   (strangler-fig) so speed and quality stop being a trade-off.
6. **Appendix** — the Phase 0 baseline, raw counts, query outputs, and the MCP evidence used, so
   findings are auditable.

Do **not** create tickets in this pass. Filing the backlog into a tracker is a separate step the user
triggers after reviewing priorities.

---

## Orchestration

Run as a **parallel fan-out → synthesis** workflow:

- **Phase 1 — Recon (1 agent, fast):** Phase 0 above — the structural baseline, shared by all axes.
- **Phase 2 — Axis fan-out (one agent per applicable axis, concurrent):** each returns a **structured
  findings object** (schema below), not prose — its output is data for the synthesizer. Skip axes
  whose tool/stack isn't present, and note the skip.
- **Phase 3 — Synthesis (1 agent):** dedupe cross-cutting themes (one root cause across axes), apply
  the priority rubric, write the report, draft the guardrails.

Preferred: the `Workflow` tool with the script in this skill's `scripts/audit-workflow.mjs`, passing
the Phase 0 detection results as `args` (repo root, app dir, report path, baseline, detected MCP
slugs, which axes apply). Fallback: spawn the axis agents via the `Agent` tool (subagent_type
`Explore` for read-only static axes, `general-purpose` for axes needing MCP calls) in a single
message so they run concurrently, then synthesize inline.

### Per-axis structured output schema

```jsonc
{
  "axis": "data-access",
  "verdict": "critical | weak | fair | healthy",
  "headline": "one sentence",
  "findings": [
    {
      "title": "short",
      "evidence": ["src/actions/x.ts:40-90", "grep: 310 files call .from()", "supabase advisor: rls_disabled on payments"],
      "impact": "security | correctness | performance | maintainability | dx",
      "blastRadius": "how many files / users / % of traffic / money exposed",
      "severity": "P0 | P1 | P2 | P3",   // axis agent proposes; synthesizer arbitrates
      "effort": "S | M | L | XL",
      "recommendation": "the direction, not a full design",
      "forwardFix": "the rule/check/pattern that stops this recurring"
    }
  ]
}
```

---

## The audit axes

Run each **applicable** axis. Each lists its scope and the evidence it must gather. Axis agents spend
their budget gathering *evidence*, not theorizing. An axis whose stack/tool isn't present returns a
one-line "not applicable — <tool> not in use" instead of being forced.

### 1. Backend architecture & separation of concerns
Where does business logic actually live? Map the call graph: `app/` route → server actions
(`'use server'`) → services / controllers / features → background tasks. Which layers are real,
which are bypassed? Find fat server actions doing multi-write / external-call / domain math inline
with no service boundary (quantify: how many exceed ~150 lines, make >1 external call, or write >1
table — cite the worst 3-5). Find the same rule implemented twice (once in an action, once in a job).
Propose the target layering.

### 2. Data-access consistency
Whatever access styles exist (ORM vs Supabase JS `.from()` vs `.rpc()`), quantify each and map
*where* it's used (hot reads? writes? admin?). If the rulebook defines a sanctioned entrypoint,
measure drift from it. Find one table queried several different ways; find N+1 patterns and unbounded
`select('*')` on large tables. Check server vs browser Supabase client usage — a **service-role key
reachable from client/browser code is P0**; search for it explicitly. Recommend one canonical pattern
per use-case + a deprecation path.

### 3. Database security: RLS, auth checks, advisors — highest stakes, run carefully
If a Supabase MCP is connected: pull **advisors** (`get_advisors`, both `security` and `performance`)
and `list_tables` against the **prod** project resolved in Phase 0. Every security advisor is a
candidate P0/P1 — cite the advisor + affected object. Which tables have RLS on vs off? Cross-reference
sensitivity (anything holding money, PII, or auth data must have RLS). A sensitive table with RLS off
is P0. Audit auth-check consistency in server actions: do they all verify caller identity / role /
ownership before mutating, or do some trust the client? Cite unguarded mutations. Flag missing indexes
on FKs / hot filter columns (hand to the perf axis). If no Supabase MCP: do the static half (RLS in
migrations, auth checks in code) and note the advisor data is missing.

### 4. Domain model & code organization
Find features fragmented across many locations (`components/`, `features/`, `actions/`, `app/…`) and
propose a colocated structure. Resolve near-duplicate dirs (`schema/` vs `schemas/`, etc.). Dead code:
exports with zero importers, unreachable routes, orphaned components — flag every artifact (per no-dead-code
discipline), not a sample. Import-boundary violations: a feature reaching into another feature's
internals, an app importing a package's deep path.

### 5. Type safety & validation
Count `any`, `as any`, `@ts-ignore` / `@ts-expect-error`, non-null `!` assertions; locate the worst
offenders. Is `tsconfig` actually strict (`strict`, `noUncheckedIndexedAccess`)? Validation at
boundaries: do server actions + `app/api` routes parse input (Zod/Valibot) before use, or trust raw
payloads? Unvalidated mutation entrypoints are both correctness AND security — cite `file:line`.
Confirm DB types are generated (not hand-maintained) and in sync.

### 6. Testing & CI
Map the test files against critical paths. Which high-stakes flows (auth, checkout/payments if
present, the core domain write paths) have ZERO tests? That gap is the real risk, not the raw
percentage. Cross-reference any `docs/incidents` for past breakages a test would have caught. Inspect
`.github/workflows/` (or other CI): what gates a merge — typecheck/lint only, or anything that catches
a logic regression? Recommend a minimal critical-path test harness (the ~10 tests covering the worst
risk), not 80% coverage.

### 7. Error handling & observability
If an error-tracker MCP (Sentry or similar) is connected: top unresolved issues by event volume +
users over ~14d — triaged? alerting? cite issue keys + counts. If an analytics MCP (PostHog or
similar) is connected: query `$exception` / error events. Code audit (always): swallowed errors
(`catch {}` with no rethrow/report), `console.error` instead of a real capture call, actions that
return `{ error }` silently — count them. **Core question: is there an alerting path** (error tracker →
Slack/PagerDuty)? If the team learns of breakage from users, that gap alone is P0/P1. If no
observability MCP is connected, do the code audit and state the telemetry gap.

### 8. Frontend & routing performance
If an analytics MCP with Web Vitals is connected: pull LCP / INP / TTFB, segmented by country if a
geographic slowness claim exists — confirm or deny it with data. If a host-platform MCP (Vercel or
similar) is connected: function durations + deployment region vs the Supabase region (a region
mismatch is a prime suspect). Static analysis (always): RSC vs client-component split, data-fetching
waterfalls (sequential awaits in layouts/pages), missing `Suspense`/streaming, unbounded first-paint
queries, missing caching (`revalidate` / React `cache()`), heavy client bundles, `middleware.ts` cost
on every request. Output the 3-5 changes with the biggest user-perceived-latency payoff, each tied to
a metric.

### 9. Background jobs — only if a job runner is in use
If the app has Trigger.dev / Inngest / queue workers / cron: audit each task for idempotency, retry
safety, and cross-tenant safety (a list/filter that can act on *other* users' data is the pattern to
hunt). If the runner has an MCP, pull recent failed/stuck runs as evidence. Find business logic
duplicated between a task and a server action (ties to axis 1). If there's no job runner, mark N/A.

### 10. Rulebook & documentation coherence
Inventory the rulebook found in Phase 0. Find contradictions and duplication (the same rule stated
differently in two places). Diagnose why rules get missed in review: too long / too many / not
machine-checkable / not loaded in the reviewer's context? Which prose rules could become lint/CI
checks instead of relying on memory? Recommend a single source-of-truth structure. If there's no
rulebook at all, that's the finding — the guardrails section will propose one.

### 11. Dependency, build & monorepo health
Build config (`turbo.json` / `nx.json` / `pnpm-workspace.yaml` if a monorepo): effective caches, clean
package boundaries, circular deps. Build time feeds the "slow" DX/CI perception. Scan `package.json`
files for outdated / duplicate / known-vuln deps; note Next / Supabase / payment-SDK version currency.
Cite specific versions.

### 12. High-stakes domain correctness (spot-check, not a full re-derivation)
A targeted correctness pass on the app's riskiest logic. **If it handles money/payments**: pricing,
tax/VAT, commission, refund/payout flows — cross-check against any `docs/business-logic` and hunt
rounding / currency / negative-or-zero / double-charge / double-refund bugs. **Otherwise**: the most
critical domain write paths (whatever a bug there would cost users or data). Any discrepancy between
documented and implemented behavior is ≥P1 — cite the doc and the `file:line`.

---

## Priority rubric

Assign every finding exactly one bucket, driven by **impact severity**, then sequenced by effort.

| Bucket | Label | Criteria |
|---|---|---|
| **P0** | **Fix now (this week)** | Active security hole (missing RLS / auth bypass / key leak on sensitive data), money-flow correctness bug, data-loss risk, or a prod error hitting users with **no alerting**. Every day of delay has real user/revenue/legal cost. |
| **P1** | **Fix within 2 weeks** | Observability/alerting gaps, the worst data-access inconsistencies on hot paths, high-impact performance fixes with measured user impact, unvalidated mutation entrypoints. Hurts now but not bleeding. |
| **P2** | **Fix within 1 month** | Separation-of-concerns refactor of core domains, the critical-path test harness, feature consolidation, rulebook consolidation. Structural health; schedule as focused projects. |
| **P3** | **Continuous / opportunistic** | Broad pattern migrations, type-strictness ratchet, dead-code sweeps, import-boundary cleanup. Done incrementally alongside features via the strangler playbook — never a big-bang. |

Each backlog row: `ID · title · bucket · axis · impact · effort(S/M/L/XL) · evidence · acceptance criterion`.

---

## Forward guardrails (the "stop the bleeding" deliverable)

Concrete, not platitudes:

1. **The canonical decisions — "one way to do X":**
   - DB access: the single sanctioned pattern per use-case (read / write / admin / RPC) and what gets
     deprecated. Tie to the repo's existing rule if one exists.
   - Where business logic lives: the target layering (route → thin action → service/use-case →
     repository), one paragraph per layer's responsibility.
   - Error contract: how every server action / job reports failure, and the mandatory capture +
     alert path.
   - Validation contract: schema validation at every external boundary, no exceptions.
2. **The strangler-fig migration playbook** — improve without halting feature work: new code MUST
   follow the standard (enforced in review + lint); touched code gets migrated opportunistically; a
   lint/CI check prevents *new* violations so the count only goes down.
3. **Making the rulebook enforceable** — which prose rules become automated checks, and the
   single-source-of-truth doc structure so reviewers stop missing rules.
4. **A definition-of-done checklist** for new features that bakes the above in.

---

## Running it

1. Do Phase 0 detection and write the shared baseline.
2. Launch the fan-out. Preferred: `Workflow` with `scripts/audit-workflow.mjs`, passing the Phase 0
   results as `args`. Fallback: spawn the applicable axis agents concurrently via `Agent` (one
   message, multiple calls) — static axes as `Explore`, MCP-dependent axes as `general-purpose`.
3. Synthesize into the report at `docs/reports/codebase-audit-<date>.md`.
4. Present the executive summary + scorecard + top P0/P1 rows in chat; link the full report.
5. STOP. Do not file tickets — wait for the user to approve priorities, then a separate pass creates
   them.

## Guardrails for the audit itself

- Do not refactor, edit product code, or open PRs during the audit. Report only.
- Do not invent findings to fill an axis — "this axis is healthy" is a valid, valuable result, and so
  is "not applicable, <tool> not in use".
- Do not let the performance or error axes hand-wave. If the MCP data isn't reachable, say so
  explicitly in the report rather than guessing.
- Keep findings de-duplicated: one root cause that surfaces in 4 axes is ONE backlog item with
  cross-references, not four.

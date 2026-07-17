export const meta = {
  name: 'codebase-audit',
  description: 'Deep evidence-grounded audit of a Next.js + Supabase project: parallel axis auditors -> synthesis report with a bucketed remediation backlog and forward guardrails.',
  phases: [
    { title: 'Axis fan-out', detail: 'concurrent axis auditors, each evidence-grounded' },
    { title: 'Synthesis', detail: 'dedupe, prioritize, write report' },
  ],
}

// All project-specific context comes from Phase 0 detection (done in the SKILL) and is passed in via args.
// Nothing about any particular repo is hardcoded here.
const REPO = args?.repoRoot || '.'
const APP = args?.appDir || REPO           // the Next.js app dir (repo root for a single app)
const REPO_NAME = args?.repoName || 'this project'
const REPORT_PATH = args?.reportPath || (REPO + '/docs/reports/codebase-audit.md')
const BASELINE = args?.baseline || '(No baseline was provided. Each axis must first gather its own counts with grep/rg/Read before making claims.)'
// A short human string telling agents which observability MCPs are connected and their slugs,
// e.g. "Supabase: mcp__acme-supabase__*; Error tracker: mcp__acme-sentry__*; Analytics: none; Host: none; Jobs: none".
const MCP = args?.mcpHint || 'Discover connected MCPs yourself via ToolSearch (look for *supabase*, *sentry*, *posthog*, *vercel*, *trigger*). Use whatever is connected; if a tool is absent, do the static half and say so.'

const PREAMBLE = `You are ONE axis auditor in a deep, evidence-grounded codebase audit of ${REPO_NAME} at ${REPO}.
It is a Next.js + Supabase project (app dir: ${APP}). Any other integration (ORM, background jobs, payments, error tracker, analytics, host platform) is OPTIONAL — verify it exists before auditing it.

SHARED BASELINE (from Phase 0 recon — refresh any number you actually depend on, don't trust it blindly):
${BASELINE}

CONNECTED MCPs / DATA SOURCES:
${MCP}

HARD RULES:
1. NO CLAIM WITHOUT EVIDENCE. Cite file:line, an exact count from grep/rg, or a live MCP data point. Run real commands (Bash grep/rg, Read) — the baseline is a starting map, verify and go deeper.
2. "healthy" is a valid verdict, and "not applicable — <tool> not in use" is valid for an integration axis. Do NOT invent findings to fill the axis. 3 sharp evidenced findings beat 12 vague ones.
3. Severity rubric (propose per finding; synthesizer arbitrates):
   - P0 = active security hole (missing RLS / auth bypass / service-role key leak on sensitive data), money/domain correctness bug, data-loss risk, OR a prod error hitting users with no alerting.
   - P1 = fix <=2 weeks: observability/alerting gaps, worst data-access inconsistencies on hot paths, high-impact perf fixes with measured user impact, unvalidated mutation entrypoints.
   - P2 = fix <=1 month: separation-of-concerns refactor of core domains, critical-path test harness, feature consolidation, rulebook consolidation.
   - P3 = continuous/opportunistic: broad pattern migrations, type-strictness ratchet, dead-code sweeps, import-boundary cleanup.
4. Every finding MUST include a forwardFix: the concrete rule / lint check / pattern that stops it recurring.
5. If the repo has a rulebook (CLAUDE.md / AGENTS.md / .cursor/rules / CONTRIBUTING / docs), measure DRIFT from it and cite the rule — don't reinvent a standard the repo already documents.
6. Read-only. Do not edit code, do not write files, do not open PRs.
Your output is structured data for a synthesizer, not a human essay. Be concrete and terse in each field.`

const AXES = [
  {
    key: 'backend-architecture',
    label: 'axis:backend-architecture',
    spec: `AXIS 1 — Backend architecture & separation of concerns.
Map where business logic actually lives: route (app/) -> server action ('use server') -> service / controller / feature -> background task. Which layers are real, which are bypassed?
- Find fat server actions doing domain math / multi-table writes / external API calls inline with no service boundary. Quantify: how many exceed ~150 lines, make >1 external call, or write >1 table? Cite the worst 3-5 with file:line ranges.
- Find the SAME business rule implemented twice (e.g. once in a server action, once in a background task). Cite both sites.
- Verdict: is there a coherent backend layer, or is logic scattered? Propose the target layering in recommendation/forwardFix.`,
  },
  {
    key: 'data-access',
    label: 'axis:data-access',
    spec: `AXIS 2 — Data-access consistency (ORM vs Supabase JS .from() vs .rpc()).
If the rulebook defines a sanctioned DB entrypoint, read it first and measure drift.
- Quantify each access style's call-site count and map WHERE each is used (hot reads? writes? admin?). Is there any rule to when each is chosen, or is it random?
- Find one table queried 3+ different ways (cite sites). Find N+1 patterns and unbounded select('*') on large tables.
- Check server vs browser Supabase client usage. A service-role key reachable from client/browser code is P0 — search for it explicitly.
- Recommend ONE canonical access pattern per use-case + the deprecation path for the rest.`,
  },
  {
    key: 'db-security',
    label: 'axis:db-security',
    spec: `AXIS 3 — Database security: RLS, auth checks, advisors. HIGHEST STAKES. Uses the Supabase MCP if connected.
- If a Supabase MCP is connected (find its slug via ToolSearch), call get_advisors (type 'security' AND 'performance') and list_tables on the PROD project (resolved in Phase 0 — confirm you are hitting prod, not a dev branch). Every security advisor is a candidate P0/P1 — cite the advisor + affected object.
- From list_tables: which tables have RLS enabled vs disabled? Cross-reference sensitivity (anything holding money, PII, or auth data must have RLS). A sensitive table with RLS OFF is P0.
- Audit auth-check consistency in server actions: do they verify caller identity/role/ownership before mutating, or trust the client? Cite mutations with no ownership/role check.
- Flag missing indexes on FKs / hot filter columns (from the performance advisor) — hand to the perf axis too.
- If NO Supabase MCP: do the static half (RLS in migrations, auth checks in code) and note the advisor data is missing.`,
  },
  {
    key: 'code-organization',
    label: 'axis:code-organization',
    spec: `AXIS 4 — Domain model & code organization.
If the rulebook has a folder/import-boundary rule, read it first.
- Find features fragmented across many locations (components/, features/, actions/, app/...) — map the real cohesion and propose a colocated structure.
- Resolve near-duplicate dirs (e.g. schema/ vs schemas/) — which is canonical, find duplication/overlap.
- Dead code: exports with zero importers, orphaned components/routes. Flag every artifact, not a sample.
- Import-boundary violations: a feature importing another feature's internals, an app importing a package's deep path. Cite the worst offenders.`,
  },
  {
    key: 'type-safety',
    label: 'axis:type-safety',
    spec: `AXIS 5 — Type safety & validation.
- Count (exact) occurrences of: any, "as any", "@ts-ignore"/"@ts-expect-error", non-null "!" assertions in the app's src. Locate the worst-offending files. Is tsconfig actually strict (strict, noUncheckedIndexedAccess)?
- Validation at boundaries: do server actions + app/api routes parse input (Zod/Valibot) before use, or trust raw payloads? Find unvalidated mutation entrypoints (correctness AND security) — cite file:line.
- Confirm DB types are generated (not hand-maintained) and in sync with the schema.`,
  },
  {
    key: 'testing-ci',
    label: 'axis:testing-ci',
    spec: `AXIS 6 — Testing & CI.
- Map the test files. Which HIGH-STAKES flows have ZERO tests (auth, checkout/payments if present, core domain write paths)? That gap is the real risk, not the raw percentage. Cross-reference any docs/incidents for past breakages a test would have caught.
- Inspect CI (.github/workflows/ or other): what gates a merge today (typecheck/lint only? any test run? any logic-regression guard?). Is a test runner even wired?
- Recommend a minimal "critical-path test harness" (~10 tests covering the worst-risk flows) as the foundational P2 — not 80% coverage.`,
  },
  {
    key: 'error-observability',
    label: 'axis:error-observability',
    spec: `AXIS 7 — Error handling & observability. Uses error-tracker / analytics MCPs if connected.
- If an error-tracker MCP (Sentry or similar) is connected (find slug via ToolSearch): top UNRESOLVED issues by event volume + users over ~14d. Are they triaged/assigned? Cite issue keys + counts.
- If an analytics MCP (PostHog or similar) is connected: query $exception / error events over ~14d.
- Code audit (ALWAYS): count swallowed errors (catch blocks with no rethrow/capture), console.error instead of a real capture call, server actions returning { error } silently. Cite file:line for the worst.
- CORE QUESTION: is there a real ALERTING path (error tracker -> Slack/PagerDuty)? If the team learns of breakage from users, the alerting gap alone is P0/P1. State it plainly.
- If NO observability MCP is connected: do the code audit and state the telemetry half could not run.`,
  },
  {
    key: 'frontend-performance',
    label: 'axis:frontend-performance',
    spec: `AXIS 8 — Frontend & routing performance. Uses analytics / host MCPs if connected.
- If an analytics MCP with Web Vitals is connected: pull LCP / INP / TTFB, segmented by country if there is a geographic-slowness claim to confirm or DENY with data.
- If a host-platform MCP (Vercel or similar) is connected: function durations + deployment region vs the Supabase region (a region mismatch is a prime suspect).
- Static analysis (ALWAYS): RSC vs client-component split, data-fetching waterfalls (sequential awaits in layouts/pages), missing Suspense/streaming, unbounded first-paint queries, missing caching (revalidate / React cache()), heavy client bundles, middleware.ts cost on EVERY request.
- Output the 3-5 changes with the biggest user-perceived-latency payoff, each tied to a metric.`,
  },
  {
    key: 'background-jobs',
    label: 'axis:background-jobs',
    spec: `AXIS 9 — Background jobs. ONLY if the app uses a job runner (Trigger.dev / Inngest / queue workers / cron) — otherwise return verdict healthy with headline "N/A: no background-job runner in use".
- Audit each task for idempotency, retry safety, and cross-tenant safety (a list/filter that can act on OTHER users' data is the pattern to hunt). Cite any task that acts on runs/records without a tight ownership filter.
- If the runner has an MCP, pull recent failed/stuck/cancelled runs as evidence.
- Find business logic duplicated between a task and a server action (ties to axis 1).`,
  },
  {
    key: 'rulebook-coherence',
    label: 'axis:rulebook-coherence',
    spec: `AXIS 10 — Rulebook & documentation coherence.
- Inventory the rulebook (CLAUDE.md / AGENTS.md / .cursor/rules / CONTRIBUTING / docs). Find CONTRADICTIONS and duplication (same rule stated differently in two places) — cite both. If there is NO rulebook, that is the finding.
- Diagnose why rules get missed in review: too long / too many / not machine-checkable / not loaded in the reviewer's context? Read the PR-review setup (if any) for what rules it actually ingests.
- Recommend (a) a single source-of-truth structure and (b) which prose rules should become lint/CI checks instead of relying on reviewer memory.`,
  },
  {
    key: 'build-deps',
    label: 'axis:build-deps',
    spec: `AXIS 11 — Dependency, build & monorepo health.
- If a monorepo, read turbo.json / nx.json / pnpm-workspace.yaml: effective caches? clean package boundaries? circular deps? Build time feeds the "slow" DX/CI perception.
- Scan package.json files for outdated/duplicate/known-vuln deps. Note Next / Supabase / payment-SDK version currency. Cite specific versions.`,
  },
  {
    key: 'domain-correctness',
    label: 'axis:domain-correctness',
    spec: `AXIS 12 — High-stakes domain correctness (spot-check, NOT a full re-derivation).
Targeted correctness pass on the app's riskiest logic.
- IF the app handles money/payments: pricing, tax/VAT, commission, refund/payout flows. Hunt rounding / currency / negative-or-zero / double-charge / double-refund bugs. Cross-check against any docs/business-logic.
- OTHERWISE: the most critical domain write paths (whatever a bug there would cost users or data).
- Any discrepancy between DOCUMENTED behavior and IMPLEMENTED code is >=P1 — cite the doc and the code file:line. Surface latent bugs that "feel fine" but are untested.`,
  },
]

const AXIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['axis', 'verdict', 'headline', 'findings'],
  properties: {
    axis: { type: 'string' },
    verdict: { type: 'string', enum: ['critical', 'weak', 'fair', 'healthy'] },
    headline: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'evidence', 'impact', 'blastRadius', 'severity', 'effort', 'recommendation', 'forwardFix'],
        properties: {
          title: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
          impact: { type: 'string', enum: ['security', 'correctness', 'performance', 'maintainability', 'dx'] },
          blastRadius: { type: 'string' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          effort: { type: 'string', enum: ['S', 'M', 'L', 'XL'] },
          recommendation: { type: 'string' },
          forwardFix: { type: 'string' },
        },
      },
    },
  },
}

const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reportPath', 'execSummary', 'scorecard', 'topBacklog', 'counts'],
  properties: {
    reportPath: { type: 'string' },
    execSummary: { type: 'string' },
    scorecard: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['axis', 'rating', 'note'],
        properties: { axis: { type: 'string' }, rating: { type: 'string' }, note: { type: 'string' } },
      },
    },
    topBacklog: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'bucket', 'axis', 'effort'],
        properties: { id: { type: 'string' }, title: { type: 'string' }, bucket: { type: 'string' }, axis: { type: 'string' }, effort: { type: 'string' } },
      },
    },
    counts: {
      type: 'object',
      additionalProperties: false,
      required: ['P0', 'P1', 'P2', 'P3'],
      properties: { P0: { type: 'number' }, P1: { type: 'number' }, P2: { type: 'number' }, P3: { type: 'number' } },
    },
  },
}

phase('Axis fan-out')
log(`Launching ${AXES.length} axis auditors over ${REPO_NAME} (${APP})`)

const findings = await parallel(
  AXES.map((a) => () =>
    agent(`${PREAMBLE}\n\n=== ${a.spec}`, {
      label: a.label,
      phase: 'Axis fan-out',
      agentType: 'general-purpose',
      schema: AXIS_SCHEMA,
    }),
  ),
)

const ok = findings.filter(Boolean)
log(`${ok.length}/${AXES.length} axes returned. Synthesizing...`)

phase('Synthesis')

const synthPrompt = `You are the SYNTHESIS stage of a deep codebase audit of ${REPO_NAME} (${REPO}).
You are given the structured findings from ${ok.length} axis auditors below as JSON.

YOUR JOB:
1. DEDUPE: one root cause that surfaces across multiple axes becomes ONE backlog item with cross-references — not N copies (e.g. business logic in actions shows up in axes 1, 2, 5, 12).
2. ARBITRATE severity per the rubric (P0 fix-now / P1 <=2wk / P2 <=1mo / P3 continuous). Be honest — not everything is P0. Reserve P0 for active security holes, money/domain correctness bugs, data-loss, or unalerted prod errors.
3. WRITE the full report to ${REPORT_PATH} using the Write tool (create the docs/reports/ dir if needed), with EXACTLY this structure:
   # Codebase Audit — ${REPO_NAME}
   ## 1. Executive summary  (<=12 lines: health verdict, the 5 things that matter most, the single highest-leverage change)
   ## 2. Scorecard  (table: Axis | Rating [🔴 critical/🟠 weak/🟡 fair/🟢 healthy] | The number behind it | One-line justification)
   ## 3. Findings by axis  (for each axis that ran: ### heading, verdict, then each finding as: **title** — evidence (file:line/counts/MCP), impact, blast radius, recommendation, forwardFix. Note axes marked N/A.)
   ## 4. Prioritized backlog  (ONE table, every finding as a row: ID | Title | Bucket | Axis | Impact | Effort | Evidence | Acceptance criterion. Group/sort by bucket P0->P3. Stable IDs like AUD-001.)
   ## 5. Forward guardrails  (concrete, not platitudes: (a) the "one way to do X" canonical decisions — DB access pattern, business-logic layering route->thin action->service/use-case->repository, error contract w/ mandatory capture+alert, validation-at-every-boundary; (b) the strangler-fig migration playbook — new code follows the standard, touched code gets migrated, a lint/CI check prevents NEW violations so counts only go down; (c) making the rulebook enforceable — which prose rules become automated checks + single-source-of-truth structure; (d) a definition-of-done checklist for new features)
   ## 6. Appendix  (the Phase 0 baseline, raw counts, key MCP query outputs, evidence used)
4. After writing the file, return the structured summary (reportPath, execSummary, scorecard, topBacklog = the P0+P1 rows, counts per bucket).

Be rigorous and faithful to the evidence. If an axis reported it could not reach an MCP server, say so in the report rather than papering over it. Do not soften P0s.

=== AXIS FINDINGS (JSON) ===
${JSON.stringify(ok)}`

const summary = await agent(synthPrompt, {
  label: 'synthesis',
  phase: 'Synthesis',
  agentType: 'general-purpose',
  schema: SYNTH_SCHEMA,
})

return { axesReturned: ok.length, axesTotal: AXES.length, summary, findings: ok }

# Rating rubric — 10 axes, 1–5 scale, evidence-required

Each axis is rated **1 (poor) → 5 (excellent)** with concrete behavioral anchors per level. Every score MUST cite at least one piece of evidence (file:line or commit SHA). **Naked numbers are forbidden** — they make the card un-defendable in a 1:1.

The rubric is per-repo (Phase 3 produces one card per repo). Phase 5 aggregates into a cross-repo card by averaging numerically and rolling up evidence citations.

---

## Axis 1 — Convention adherence

How tightly the dev follows project rules: `.cursor/rules/*.mdc`, `CLAUDE.md`, ESLint, naming, file structure.

- **5 — Exemplary:** Reads rules artifacts before contributing; never violates explicit clauses; flags rule contradictions to maintainers; new code matches conventions in old code.
- **4 — Solid:** Follows rules in 95%+ of new code; rare violations are honest mistakes corrected on review.
- **3 — Acceptable:** Mostly follows rules but has blind spots — e.g. always misses the layering rule, or always uses snake_case where camelCase is mandated. Patches when caught.
- **2 — Spotty:** Violates explicit rules in multiple files per sprint. Patches retroactively after CI / reviewer flags. "Didn't know that was a rule" is a frequent excuse despite the rule being in `.cursor/rules/`.
- **1 — Disregards rules:** Visibly violates rules even after being told. Edits the rules file to soften constraints rather than fixing the code.

**Evidence to cite:** specific rule clause violated (e.g. "conventions.mdc §3.2") + file:line in dev's code.

---

## Axis 2 — Architecture & system thinking

Decomposition, server/client boundaries, schema design, abstraction quality, layering.

- **5 — Senior:** Picks non-obvious correct architectures (event-sourced ledgers over mutating columns, state machines over flag soup). Decomposes proactively; abstractions are minimal but right. Discusses trade-offs in commit messages.
- **4 — Strong:** Solid decomposition, occasional opportunities missed but no anti-patterns. Recognizes when a 1k-line file should be split.
- **3 — Adequate:** Code works; structure is acceptable but not thoughtful. Some prop-drilling, some leaky abstractions, but not pathological.
- **2 — Weak:** 1k+ line single files, repeated logic across files, abstractions that hurt more than help, server-only utils imported into client components, no separation between transport and business logic.
- **1 — Pathological:** Same flow rewritten 3+ times within weeks. Files grow unboundedly. Cross-cutting concerns (auth, validation, logging) inconsistently applied across handlers.

**Evidence to cite:** specific file:line showing the structural choice (good or bad) + commit SHA.

---

## Axis 3 — Correctness & edge-case handling

Disabled checks, missing error handling, off-by-ones, broken transactions, race awareness in single-threaded reasoning.

- **5 — Defensive:** Anticipates failure modes; transactions roll back cleanly; edge cases caught at the schema level; happy + sad paths both manually verified before merge.
- **4 — Solid:** Most error paths handled; rare misses caught quickly.
- **3 — Adequate:** Happy path works; sad paths sometimes overlooked (returns empty result on error, swallows exceptions, etc.) but no business-logic bugs.
- **2 — Concerning:** Disabled validation that he forgets to re-enable. Empty-result guards bypass on truthy `[]`. Off-by-ones in money/business logic. Comments-out checks "to unblock testing" then forgets.
- **1 — Hazardous:** Critical bugs from prior reviews remain unfixed for months. Validation is commented out in production code. Money / state-machine bugs survive into main.

**Evidence to cite:** specific bug with file:line + commit SHA + severity (CRITICAL/HIGH/MED).

---

## Axis 4 — Security awareness

RLS / auth discipline, input validation at trust boundaries, secret handling, XSS / SQLi / SSRF awareness, content sanitization.

- **5 — Senior:** Validates at every system boundary; uses the most-scoped client (session > admin) by default; sanitizes all untrusted HTML; rotates secrets correctly; reads the security implications of every dependency he adds.
- **4 — Strong:** Boundary validation present; admin-vs-session client distinction respected; occasional opportunities missed but no security bugs shipped.
- **3 — Adequate:** Validates most inputs but has blind spots. Uses admin client when session would have worked but no PII leak. Sanitizes most untrusted content.
- **2 — Naive:** Service-role client used everywhere; XSS via unsanitized user-authored content; secrets in URL query strings; `JSON.parse` typecast as the validated shape; unvalidated server actions accepting user input.
- **1 — Liability:** Public endpoints with no validation. Open relays. RLS-bypassing reads of PII. `dangerouslySetInnerHTML` on user content with no sanitizer for days. Reuses one secret across security domains.

**Evidence to cite:** specific vulnerability with file:line + which security primitive was misused.

---

## Axis 5 — Concurrency & atomicity

Locks, idempotency, transactions, read-modify-write awareness, race-condition reasoning.

- **5 — Senior:** Every multi-step write is in a transaction or atomic. Idempotency keys backed by unique constraints. `SELECT ... FOR UPDATE` / atomic conditional updates where ordering matters. Webhook idempotency persists across replicas.
- **4 — Strong:** Most critical paths are transactional. Recognizes TOCTOU windows. May miss some optimistic-concurrency opportunities.
- **3 — Adequate:** Sequential thinking but not aware of concurrency. Single-user test cases pass; multi-user races aren't considered. No ACTIVE concurrency bugs but the code wouldn't survive scale.
- **2 — Concerning:** Hand-rolled `.delete()` rollback chains as "transactions"; in-memory dedupe Maps for serverless webhook idempotency; read-modify-write at app layer on financial values.
- **1 — Hazardous:** Order-book race conditions allowing double-spend; vault balance updates from stale reads; bulletin publish that double-notifies on simultaneous clicks; webhook handlers that retry-process the same event.

**Evidence to cite:** specific race window with file:line + the absent primitive (lock / atomic update / idempotency key).

---

## Axis 6 — Type discipline

`as any`, `@ts-ignore`, generic over-use, branded types, refusing to fix type errors at the source.

- **5 — Strict:** Zero `as any`, zero `@ts-ignore` in dev's diffs. Branded types for primary keys. Discriminated unions for state. Type errors fixed at source, not silenced.
- **4 — Strong:** Rare typed-escape; always justified with a comment.
- **3 — Adequate:** A handful of `as any` per sprint, usually around third-party libs without good types. Doesn't propagate.
- **2 — Lax:** `(supabase as any)` carpet-bombed across multiple files. `@ts-ignore` on un-regenerated types instead of regenerating. Multiple `as any` enum casts on public-facing endpoints.
- **1 — Disregards types:** Dozens of `as any` per sprint. Cast-then-pray. Returns insert payloads typed as success rows. `c: any` on Hono / Next handlers.

**Evidence to cite:** count of `as any` / `@ts-ignore` in diff window + worst-offender file:line.

---

## Axis 7 — Self-review discipline

Whether the dev reads their own diff, runs the build, manually tests happy + sad paths, before pushing. THIS IS THE AXIS THAT MOST OFTEN PRODUCES THE HEADLINE FINDING.

- **5 — Disciplined:** No "build errors resolved" commits. No debug logs survive into merged code. No commented-out validation in critical paths. Commit messages are typo-free, atomic, and conventional. PRs always under 500 LOC.
- **4 — Solid:** Rare build-fix-after, no PR over 1k LOC, eslint runs locally, types clean before push.
- **3 — Adequate:** Occasional build errors land on dev/main and get fixed within a day. Few `console.log`s survive. Pre-push self-review happens but not religiously.
- **2 — Concerning:** Multiple "build errors resolved" commits per sprint. Debug `console.log`s in critical paths. "fix: X correctly used" retrofit commits arriving days after original ship. Single commits >2k LOC.
- **1 — Sloppy:** >10% of commits chase build errors. Debug logs survive into production. Commented-out validation lives for weeks. Commit messages have typos. Duplicate-named commits within hours (cherry-pick mess). Same files refactored 3+ times within 2 weeks.

**Evidence to cite:** count of "build errors resolved" commits + count of surviving `console.log`s + count of "X correctly used" retrofits + worst commit-message typos.

---

## Axis 8 — Delivery speed

LOC + features per week, calibrated against complexity. **NOT** raw line count — a 200-line clean refactor can be more valuable than a 2000-line cut-and-paste.

- **5 — Exceptional:** Ships substantial features ahead of estimate; quality holds; estimates calibrate over time.
- **4 — Strong:** Hits estimates consistently; quality holds.
- **3 — Adequate:** Hits estimates with some variance; minor quality tradeoffs to make deadlines.
- **2 — Slow OR fast-but-sloppy:** Either delivers way slower than estimates suggest, OR delivers fast at the cost of quality (Axes 3, 5, 7 suffer).
- **1 — Misaligned:** Way slower than estimate AND quality is poor; or way faster than estimate but with cascading bugs that consume more team time than they saved.

**Evidence to cite:** approximate features-shipped count + LOC-per-week + complexity weighting argument.

**Common rating shape:** mid-level devs who score 5 on speed often score 2 on Axis 7 (self-review). The ratings card surfaces this trade-off directly.

---

## Axis 9 — Commit & branch hygiene

Atomic commits, message quality, branch discipline.

- **5 — Disciplined:** One commit = one logical change. Messages follow Conventional Commits. No duplicate-named commits. No inverse commits (X added then X removed within days). PR descriptions are full.
- **4 — Solid:** Mostly atomic; rare exceptions; messages clear.
- **3 — Adequate:** Some multi-purpose commits; messages mostly clear; few duplicate-name issues.
- **2 — Spotty:** Multiple duplicate-named commit pairs per sprint. Messages with typos. Single commits over 1k LOC mixing unrelated changes.
- **1 — Chaotic:** Duplicate / inverse / typo'd commits routine. 2k+ LOC single commits with no PR. "feat: X" / "feat: X" within hours. "fgix:", "fx:" message typos.

**Evidence to cite:** specific commit pairs (SHAs), commit-message typo examples, PR-LOC max.

---

## Axis 10 — Growth signal

Does new code pick up project conventions while older files he revisits get neglected? Does he iterate on feedback or repeat the same mistakes across audits?

- **5 — Compounding growth:** Conventions adopted in new code AND backported to old code he touches. Prior-audit findings always fixed within a sprint. Coaching scales — feedback applied universally.
- **4 — Healthy growth:** New code follows conventions; old code is left alone (acceptable trade-off). Prior-audit findings fixed within 4–6 weeks.
- **3 — Stalled:** Plateau. Mid-level work; doesn't regress but doesn't improve either. Some prior-audit findings fixed, some not.
- **2 — Selective growth:** Adopts conventions only when forced. New code is OK; older code he revisits is neglected. Prior-audit findings unfixed beyond their next sprint.
- **1 — Stagnant or regressing:** Same anti-patterns repeated across consecutive audits. Prior-audit CRITICALs unfixed for months. New conventions ignored even after explicit coaching.

**Evidence to cite:** prior-audit fix-rate (if prior audit available); contrast between newest commits and oldest commits in window for the same code areas.

---

## Aggregation

Cross-repo aggregate rating per axis = mean of per-repo scores (rounded to 0.1).

Overall score = mean of all axis scores.

Verdict thresholds (default — customizable via Phase 1):
- **4.0+** overall, **no axis below 3** → "Ready for autonomous senior work / external client placement"
- **3.0–4.0** overall, **no axis below 2** → "Ready with code review on critical paths"
- **2.0–3.0** overall → "Needs structured corrective plan"
- **Below 2.0** → "Fit conversation"

If any axis is **below 2** even when overall is high, flag that axis explicitly in the ratings card — e.g. *"Overall 3.8 (Ready with review). However: Axis 7 = 1.5 (sloppy). Recommend pre-push checklist + paired review on critical paths until Axis 7 ≥ 3."*

This is exactly the read on the reference Muneeb audit: high on architecture (4) and growth signal in NEW code (4), low on self-review (1.5) → corrective plan focused on the discipline gap rather than capability training.

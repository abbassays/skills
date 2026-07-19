---
name: dev-manager
description: Orchestrate several independent pieces of work inside ONE code repo, in parallel, without the agents colliding. Clusters the requested work by real code dependency (shared files, migrations, types, API contracts), isolates each independent stream in its own git worktree and branch, fans them out to subagents at the same time, then opens one PR per stream. Confirms per stream whether it needs full review iterations and an e2e run, and afterwards verifies the agents actually ran them by checking the artifacts rather than trusting their reports. USE THIS SKILL when the user wants multiple things built at once in a repo, for example "build these 3 features in parallel", "work on 4 feature sets at once", "fan these out", "parallelize this work", "split this into streams", "knock out these tickets in parallel", "run these in worktrees". Portable across any language or stack, nothing repo-specific is hardcoded. NOT for a single task (use the repo's own delivery skill) and NOT for business or day orchestration (that is brain-manager).
---

# /dev-manager — parallel streams in one repo, without collisions

Several agents editing one working tree stomp each other. **Isolation is the whole reason this skill exists**, everything else is sequencing discipline around it.

## 1. Orient — detect, never hardcode

Read the repo before planning:

- **Rulebook**: `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/` / `CONTRIBUTING.md`. Its conventions bind every stream.
- **The repo's own delivery skill** (`/ship-it`, `/execute-plan`, `/get-shit-done`, etc.). If one exists, **each stream uses it**. Do not reinvent the repo's pipeline.
- **Commands**: package manager, test, lint, typecheck, build. Note them; you'll gate on them.
- **Worktree state**: `git worktree list` and the current branch. Some repos already run worktrees; reuse the existing convention rather than inventing a parallel one.
- **Gate skills available**: a review skill (`/code-review`, `/smithy:review`, `/automated-pr-review`) and an end-to-end one (`/e2e-feature-test`, `/verify`). Note which exist, you'll offer them per stream. If neither exists, say so rather than promising a gate you can't run.

If the repo has no tests or no rulebook, say so plainly. Never imply a gate ran that doesn't exist.

## 2. Cluster by CODE dependency — the load-bearing step

**Independent** = can be built without seeing another stream's output.

**Coupled** = must be sequenced, or merged into one stream. Treat as coupled if two pieces share any of:

- the same files or modules
- a **DB migration or schema change**
- shared **types, API contract, or generated client**
- shared config, env vars, or a feature flag
- one's output is the other's input

Test: if two streams would edit the same file, or both need the same migration, they are coupled. **When unsure, treat as coupled.** Under-parallelizing costs an hour. Two agents racing the same migration costs a day and a corrupted branch.

## 3. Interview — ask wherever you're unsure, always with a recommendation

**Ask liberally, including on small things.** In parallel work a wrong assumption doesn't cost a sentence, it costs a whole agent run in an isolated worktree that then gets thrown away. If anything shapes what actually gets built and you are not sure, ask.

**But never ask a blank question.** Every question carries **your recommendation and the reason**, so answering it is one word. You are a senior engineer proposing a call, not a junior asking to be told what to do.

- ❌ "How should the export work?"
- ✅ "I'd do CSV only, the report endpoint already returns CSV and PDF needs a new dep. Ok, or do you want both?"

Batch them 2-4 at a time. If the code already answers it, read the code instead of asking.

## 4. Show ONE plan. Wait for "go"

State per stream: **name · scope · branch and worktree · which delivery skill · prototype? · review? · e2e? · what it depends on**.

**UI streams prototype first.** If a stream touches UI (component or page files), run **`/ui-prototype-first`** for it and get the prototype approved **before** that agent writes any component code. Unlike review and e2e, which gate the output, this gates the *input*, so it belongs here at plan time. A rejected prototype costs a browser refresh; a rejected implementation costs the whole stream.

**Ask the two gates per stream, never blanket-apply.** For each stream, propose whether it needs (a) **full review iterations** and (b) an **e2e run**, each with a one-line reason (has a UI surface, touches money, ships a migration, pure internal refactor). The user confirms or flips each one. A pure refactor may want review but no e2e; a checkout change wants both. **Record the answer per stream, it becomes that agent's contract and what you verify against later.**

Then:

- what runs **in parallel**
- what is **sequenced** behind what, and why
- what you are deliberately **not** parallelizing (the coupled set), and why
- anything **blocked** on a credential, decision, or missing spec

Never auto-fire. Parallel work touches many branches at once and wrong clustering is expensive.

## 5. On "go" — isolate, then fan out AT THE SAME TIME

1. **One worktree + one branch per independent stream.** Either the Agent tool's `isolation: "worktree"`, or explicitly:
   ```bash
   git worktree add ../<repo>-<stream> -b <branch>
   ```
   Follow the repo's existing worktree convention if it has one.
2. **Launch every independent stream together**, in a single batch. Do NOT finish stream 1 end-to-end and then start stream 2 — that's the failure mode this skill exists to prevent.
3. **Sequenced streams wait** for their dependency's PR to land, then start from that branch.

## 6. Brief each agent with COMPLETE context — sources, not summaries

A subagent starts blank. **Whatever you leave out, it invents.** The most common orchestration failure is handing over *your summary* of the truth instead of *the truth itself*, because a summary reads like ground truth and the agent stops looking.

**Hand over pointers to real sources, not your paraphrase of them.** Name the files. If you do summarize, label it a summary and still give the path.

Fill every field below. **A blank field is a gap the agent will fill by guessing.**

```
GOAL          what to build, in one or two sentences
WHY           the product or business reason. you know it, the agent doesn't.
              without it, the agent makes locally sensible, globally wrong calls.
WORKTREE      absolute path + its branch + the base branch. stay inside it.
RULEBOOK      path to the CLAUDE.md / AGENTS.md / .cursor/rules that binds this repo
READ FIRST    the exact files, tests and docs to read before writing anything.
              mandatory, not "if useful".
DECIDED       decisions already settled in planning that must NOT be re-litigated
              (e.g. "CSV only, PDF was considered and dropped")
DO NOT TOUCH  files and modules owned by other streams, plus any shared migration
CONTRACTS     shared types or API shapes another stream owns, and their agreed shape
GATES         prototype? review? e2e?  (whatever was confirmed for this stream)
DELIVERY      the repo's own skill to use (/ship-it, /execute-plan, ...)
DONE MEANS    PR open, gates run with evidence linked, checks green.
              not "code written".
```

**On the gates field**, spell out what each actually requires:

- **Review** — run the review skill, fix what it raises, **re-run, and keep going until it comes back clean**. One pass is not "iterations."
- **E2E** — drive the feature end to end and produce **evidence**: screenshots, a step log, console and network errors, DB side-effects where relevant, posted to the PR.

The agent reports which gates it ran and where the evidence lives. It does not get to silently decide a gate wasn't needed.

### The no-fabrication protocol — put this in every brief

- Never invent an API, signature, schema field, config key, or env var.
- If it can't be determined from the code, **read wider, then come back with a question**. A plausible guess is worse than a blocked stream.
- **Never try to ask the user directly.** A subagent has no live terminal, so any interactive picker (`/interview-me`, AskUserQuestion, any prompt-for-input) **hangs the stream forever** and a text reply cannot unblock it, because the picker is waiting on keystrokes that will never come. **Return the question as plain text in your final output and stop.** Escalating is the orchestrator's job, not yours.
- Flag every assumption inline in the PR description, not buried in a commit message.
- PRs only. Never merge.

### When an agent comes back with a question — escalate it as a HARD STOP

An agent that hits a genuine unknown **stops its stream and returns the question as text**. It does not proceed on a guess and flag it afterwards, because by then the code is already built around the wrong assumption.

**Only you can ask the user.** You hold the live session; the agents don't. An agent that tries to open a picker just hangs. So the escalation is always: agent returns text → you decide whether you can answer it → if not, you put it to the user.

When that comes back to you:

1. **Answer it yourself only if you genuinely know** — it's in the plan, the rulebook, or already recorded in that stream's `DECIDED`. Unblock immediately; don't bother the user with something already settled.
2. **Otherwise escalate to the user as a hard stop.** That stream does not continue until it's answered. **Never guess on the agent's behalf**, and never tell it to "proceed with the most reasonable interpretation." That is the failure this whole skill exists to prevent.
3. **Batch and recommend.** Raise blocked questions the way plan mode does: the question, one line on why it blocks, and **your recommendation with the reason**, so the answer is one word.
4. **The other streams keep running.** A hard stop parks its own stream, not the whole run. Say clearly which stream is parked and on what.

Once answered, write the answer into that stream's `DECIDED` field and resume it, so it can't be re-litigated later.

## 7. Integrate

- As each stream lands, run the repo's own checks (test, lint, typecheck) in that worktree.
- **One PR per stream.** Never merge; a human merges.
- Report merge order for the coupled set, and any cross-stream conflict you can already see.

## 8. Verify the agents actually did it — do NOT trust their reports

**Agents routinely claim a gate they skipped or half-ran.** If you assigned review or e2e to a stream, you re-confirm it yourself before that stream counts as done. Check the artifact, never the claim.

| The agent claims | What you actually check |
|---|---|
| Review iterations ran | the PR carries review comments (`gh pr view <n> --comments`), **and** commits exist after them (the fixes), **and** a final clean verdict. Comments with no follow-up commit means it ran once and stopped, that is not iterations. |
| E2E ran | the **evidence** exists: screenshots and a step log on the PR, console and network errors reported, DB side-effects checked where relevant. Prose like "I tested it, works" is not evidence. |
| Checks pass | re-run test, lint and typecheck yourself in that worktree. Cheap and definitive. |
| Built UI matches the approved prototype | render the built UI and compare it against the approved prototype. Drift from what was signed off is a real failure, not a nitpick. |

Reconcile **delivered vs scoped**, per stream, against the contract you recorded in step 4. If a gate is missing, shallow, or the evidence isn't there, the stream is **not done**: send it back naming the specific gap, or run the gate yourself. Never report a stream green on an agent's word.

Only once a stream passes verification, clean up its worktree: `git worktree remove <path>`.

## Rules

- **PRs only. Never merge.**
- **One stream per worktree.** Never two agents in one working tree.
- **Never parallelize a shared migration or schema change.** Sequence it, always.
- Never bundle unrelated streams into one agent to "save time" — that's how context gets mixed and quality drops.
- If a gate (test, lint, typecheck) doesn't exist or didn't pass, say so. Never report green on something you didn't run.
- **Never trust a subagent's summary.** A stream is done when *you* have seen the artifact, not when the agent says it's done. This is the single most common way parallel runs silently degrade.
- **Never quietly drop a gate** the user confirmed for a stream. If it can't run, say why; don't substitute a weaker check and call it done.
- **Never brief an agent to run an interactive skill.** `/interview-me` and anything else that opens a picker only works in the live session, which is yours. Agents return questions as text; you ask.
- Report as each stream lands. Relay any single clarification an agent surfaces; don't answer coupled design questions on the user's behalf.

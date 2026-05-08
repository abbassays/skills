# Meeting agenda template — `<dev>-meeting-agenda-<date>.md`

Talking points only. Audience: the manager (you), preparing for a 1:1 with the dev. Length: 2–4 pages. Should be readable in 5 minutes the morning of the meeting.

The agenda is **not** for the dev's eyes. It includes anticipated pushback + responses.

---

```markdown
# <dev_display_name> — Code Quality Meeting Agenda

**Date prepared:** <YYYY-MM-DD>
**Meeting purpose:** <e.g. "Confront a quality pattern (pushes-without-review) before <decision>; agree on a 4-6 week corrective plan."> Take this directly from Phase 1 Q3.3.
**Source of evidence:** Independent <tone> re-review of <dev>'s last <window> across <repos>. Full audit at [<full-audit-doc>](./<full-audit-filename>).

---

## Headline (open the meeting with this)

> "<one-line headline; the most defensible single piece of evidence>"

This is the cleanest single piece of evidence. Lead with it. Don't soften it. Wait for response before moving on.

(Examples that worked:
- *"Three months ago I flagged a critical bug at X:93. Today the line is still commented out. That's the conversation I want to have."*
- *"Across these three repos there are 9 'build errors resolved' commits. CI is your linter. Let's start there."*)

---

## Goals for this meeting

1. <Establish the pattern is real and not isolated mistakes — back with cross-repo evidence>
2. <Get them to own it as a discipline gap they can close>
3. <Land the corrective plan: pre-push checklist, paired review, systemdesign.io modules>
4. <Decide: <internal-decision-from-Phase-1-Q3.3>> (internal, not part of dev's agenda)

---

## Section 1 — Strengths to acknowledge first (real, specific)

Open with these so the rest doesn't feel like an ambush. Each one is concrete, file/commit cited.

- **<Strength title>** — <file:line> (<commit SHA>). <One-sentence why this is senior-level work>.
- **<Strength title>** — <file:line> (<commit SHA>). <One-sentence why this is senior-level work>.
- **<Strength title>** — <file:line> (<commit SHA>). <One-sentence why this is senior-level work>.

**Frame:** *"When you slow down, you hit a senior bar. The work I'm about to walk through shows you choosing not to slow down — and that's the gap."*

---

## Section 2 — The pattern (cross-repo evidence)

This is the central thesis. Present as a single block — don't get drawn into defending any one item until they've seen all of them.

### <Repo 1> (<window>, <N> commits)
- <Specific finding> — <file:line> (<commit SHA>)
- <Specific finding> — <file:line> (<commit SHA>)
- <Pattern observation> — e.g. "8 duplicate-named commit pairs"

### <Repo 2> (<window>, <N> commits)
- <Specific finding> — <file:line> (<commit SHA>)
- ...

### <Repo 3> (...)
- ...

**Land:** *"These aren't isolated bugs. They're <N> different repos, <N> different feature areas, same shape: <one-sentence pattern description>. That's the pattern."*

---

## Section 3 — The critical bugs that are live in production right now

Don't go line-by-line. Use as "what's at stake" leverage. If they push back on the pattern, point to these specific live bugs.

### <Repo 1>
1. **<Bug>** — <file:line>. <One-sentence stake>.
2. **<Bug>** — <file:line>. <One-sentence stake>.

### <Repo 2>
...

(For financial-product repos, label these CRITICAL by default and lead with them.)

---

## Section 4 — The discipline gap, made concrete

If they say "I'll be more careful," counter with these — the literal pre-push checklist items they're missing:

1. **Read your own diff.** A single read-through would catch <specific recent debug log / commented-out validation>.
2. **Run `pnpm build` locally.** <N> "build errors resolved" commits across the repos means CI is your linter.
3. **Run `eslint --fix` locally.** The <X> sweep proves it's not happening.
4. **One happy path + one sad path manually.** <N> minutes of clicking would have caught <specific finding>.
5. **Re-read commits before push.** Typos like <"fgix:", "fx:", etc.> indicate zero re-read.
6. **PR-before-merge for anything > 200 LOC.** <N> single commits over <X> LOC. No human reviewer reads that.

---

## Section 5 — The asks (corrective plan)

Frame as **conditions for continued autonomy**, not punishment.

### Effective immediately
1. <e.g. "No direct merges to `<critical-branch>` on <financial-repo>. PR-only with <reviewer>.">
2. <e.g. "Pre-push checklist taped to monitor. Self-attest in every PR.">
3. <e.g. "Pre-commit hook: husky + lint-staged + typecheck. No more 'build errors resolved' possible.">
4. <e.g. "Fix the live CRITICAL bugs this week — pair with me on the hardest one.">

### Within 4 weeks
5. <Three systemdesign.io modules — see Section 6.> Block one half-day per week.
6. <Specific refactors that need to happen, not be patched.>

### After 4–6 weeks of green flags
7. **Re-evaluate.** Either pattern is gone and full autonomy returns, or the conversation moves from "fix this" to "fit." Be explicit about the consequence now so they don't think this is one-time scolding.

---

## Section 6 — systemdesign.io topic plan

Three topics, ranked by leverage. Each tied to specific bugs in their code.

### Topic 1 — <topic name> (highest priority)
**Maps to:** <specific findings across repos>
**Sub-topics they need:** <list>
**Architectural challenge to assign:** *"<specific challenge tied to a real bug in their code>"*

### Topic 2 — <topic name>
**Maps to:** <findings>
**Sub-topics:** <list>
**Architectural challenge:** *"<challenge>"*

### Topic 3 — <topic name>
**Maps to:** <findings>
**Sub-topics:** <list>
**Architectural challenge:** *"<challenge>"*

---

## Section 7 — Anticipated pushback + responses

### "<reviewer/peer> is exaggerating / being unfair."
Reply: *"I didn't ask <reviewer>. I read your last <window> of diffs across <N> repos myself. The same pattern shows up in all <N>. That's not a one-person opinion."*

### "This is just the cost of shipping fast."
Reply: *"<repo> is <type>. <Specific live bug> has been bypassable for <duration>. That's not the cost of shipping fast — that's a liability. We're not optimizing for line count."*

### "Reviews would slow me down."
Reply: *"You spent <N> commits across these repos chasing build errors after pushes. You spent another bunch on '<retrofit commit>' weeks after the original feature. Reviews don't slow you down. They replace the time you're already spending fixing stuff post-push."*

### "I didn't know that was a rule."
Reply: *"It's in `<rules-file>` <clause>. The rule files are in the repo. <Optional pointed observation, e.g. 'You amended `conventions.mdc` yourself in commit X — which means you've read it.'>"*

### "I'll be more careful."
Reply: *"We've had this conversation. The corrective plan in Section 5 isn't 'be careful' — it's specific structural changes that make 'careful' the default. We'll revisit in <window>."*

### "Am I getting fired?"
Reply (only if asked): *"No. You're on a structured <window> plan. If the pattern reverses, you're back on full autonomy. If it doesn't, we'll have a different conversation then. I want to be straightforward with you about the stakes — not ambush you with them later."*

(Add other anticipated pushbacks specific to this dev / situation. Pre-loaded counters are the difference between a controlled conversation and a defensive spiral.)

---

## Internal note (not for the meeting)

<If Phase 1 Q3.3 named a downstream decision — e.g. "client interview pipeline placement" — write the explicit recommendation here. Examples:>

- **On the <decision> question:** <recommendation> — e.g. *"The <repo> findings make presenting <dev> to <client> this <date> too risky. <Client> explicitly said <quote>. <Dev>'s <skill> is fine; their <gap> isn't yet at the bar. Recommend deferring to <date>."*
- **Buy time with <stakeholder> via:** <specific tactic>
- **Useful signal for <other-decision>:** <implication>
```

---

## Notes for the synthesizer

- Talking points only. No narrative paragraphs longer than 2 sentences.
- Pre-load anticipated pushback. The manager will ad-lib in the moment, but they need ready answers in their head before the meeting starts.
- The "Headline" must be the **single most defensible** piece of evidence. If multiple candidates, pick the one that's:
  - Time-leveraged (e.g. "still unfixed 3 months later")
  - Self-documenting (e.g. survives a screenshot)
  - Not arguable (e.g. file is currently in production with the bug)
- Section 7 (anticipated pushback) is the most valuable section. Pre-loading the responses doubles the meeting's effectiveness.
- Internal note section: separate from the dev-facing flow. Use for stakeholder coordination, downstream-decision recommendations, secondary signals.

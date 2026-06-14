---
name: vibe-estimate
description: Produce a precise hourly estimate for a coding task, calibrated to Ali's AI-augmented / vibe-coding workflow (scope → hand to AI → review & iterate). Outputs a tight `Elapsed · Your billable` hour range plus the 2–4 dependencies that move it — no planning essay. Use this WHENEVER Ali asks how long something will take, how many hours, what to quote a client, "time to build X", an ETA, "can we ship this by…", or is sizing a ticket / feature / tweak before committing — even if he never says the word "estimate". Do NOT use for calendar dates, team-capacity scheduling, or story points.
---

# Vibe Estimate

Estimate how long a coding task takes **the way Ali actually ships it**: he scopes the work, hands it to AI to build, then reviews and iterates. Traditional man-hour estimates assume a human types every line — they're wrong for this workflow, usually by a lot. This skill estimates against the real process instead.

The output is deliberately small. The point is a number Ali can act on in five seconds, not a document.

## The output contract

Always end with exactly this shape — one headline line, then 2–4 lever bullets. Nothing else.

```
Elapsed: X–Yh · Your billable: A–Bh
- <lever>: pushes toward the <high/low> end because …
- <lever>: …
```

- **Elapsed** = wall-clock working hours to *done*, including the time the AI spends generating while Ali is hands-off.
- **Your billable** = Ali's active input time only: scoping + review/iteration. This is what he'd actually bill a client.
- The gap between them is the model grinding on its own. On simple tasks that gap is most of the time; on complex ones it shrinks.

If the task is genuinely multi-part (several independent features), give one line per part plus a total — still no prose.

## The mental model: three phases

Every estimate is built from the same three phases. Use them as the reasoning scaffold even though the headline only shows the totals.

| Phase | What happens | Billable? |
|---|---|---|
| **1. Scope** | Ali writes a careful spec / ticket | Yes — his time |
| **2. AI build** | AI does the first pass with full review+iteration tooling | Mostly **not** — elapsed wall-time, Ali is hands-off |
| **3. Review + iterate** | Ali reviews, then 2–3 rounds of input to correct course | Yes — his time |

**Why the billable fraction moves:** a mechanical tweak is almost all Phase 2 (the AI grinding) — Ali's input is tiny, so billable is a small slice of elapsed. A complex or novel task is dominated by Phases 1 and 3 (his scoping and judgment) — so billable is most of the elapsed. Let this guide the split for anything between the anchors below.

## Calibration: Linear first, else the default anchors

**If a Linear workspace is connected** (Linear MCP tools available), prefer real data: search Ali's recent / assigned tickets for ones similar to the task, read their **estimates**, and anchor to those. Real history beats a generic model. (Use the estimates as written — don't go digging through actuals or cycle-time.)

**Otherwise, use these default anchors** from Ali's real workflow:

| Task type | Elapsed | Your billable | Shape |
|---|---|---|---|
| **Tweak** (one well-set-up prompt) | 1–2h | ~0.25h | ~15 min input; rest is generation |
| **Feature** (complete, end-to-end) | 5–6h | 3–4h | ~1–2h scope + ~2–3h AI build + 2–3 review iterations |
| **Novel / architecture-heavy** | scale up from feature | scale up | more scope, more iterations, AI helps less |

Interpolate between anchors. A small feature sits between tweak and feature; a gnarly integration sits at or past the feature line. Don't force false precision — round to sensible half-hours.

## The three levers that move the range

The range isn't decoration — it's driven by exactly these three things. Name the ones that actually apply in the bullets (skip those that don't):

1. **Task nature** — boilerplate / CRUD / a known pattern → AI flies, lean to the low end. Novel logic, tricky state, real algorithmic work → AI struggles, lean high.
2. **External unknowns** — undocumented APIs, third-party integrations, systems Ali doesn't control. Each one widens the range upward because discovery is unpredictable.
3. **Requirement ambiguity** — a sharp spec needs fewer review iterations (low end); a vague "make it nice" needs more rounds (high end). Ambiguity is the main thing that adds iteration cycles.

If two or three levers all point high, say so — that's the signal to quote the top of the range or wider.

## Input handling

- **Task already defined** → estimate directly.
- **Task is fuzzy** → scope it first: break it into the actual pieces of work in a sentence or two, *then* estimate. A vague ask hides the iteration rounds that blow up the range, so a quick decompose makes the number honest. Keep the scoping visible but brief.

## Framing for the audience

One engine, three framings — the numbers don't change, the wrapper does:

- **Personal gut-check** → just the contract line, maybe one lever. Fastest.
- **Internal planning** → the full contract with all relevant levers.
- **Client quote** → same numbers, but lead with **billable** hours (that's what they pay for) and present elapsed as "delivered in" context. Don't expose the iteration mechanics.

If it's unclear which audience, default to internal planning and ask only if it matters.

## Examples

**Example 1 — defined feature**

Input: "How long to build the corp-travel phase-1 booking flow — search, select, confirm, save to DB?"

```
Elapsed: 5–7h · Your billable: 3–4h
- Task nature: standard CRUD + a form flow → AI handles most of it, keeps it near the low end
- External unknowns: if the booking API is undocumented, push toward 7h
- Ambiguity: "confirm" step underspecified → budget for 1 extra review iteration
```

**Example 2 — tweak**

Input: "Just need to change the date format on the invoice PDF to DD/MM/YYYY."

```
Elapsed: 1–1.5h · Your billable: ~0.25h
- Task nature: one-line formatting change → single prompt, almost all of it is generation time
```

**Example 3 — fuzzy ask (scope first)**

Input: "Roughly how long to add 'team workspaces' to the app?"

```
Scope: this is really three pieces — data model for teams, invite/membership flow, and
permission checks on existing routes. Estimating as a small feature each.

Elapsed: 14–20h · Your billable: 9–12h
- Task nature: permission checks touch existing code → novel-ish, lean high
- External unknowns: none obvious — no third-party deps
- Ambiguity: "workspaces" scope is loose → expect 3+ review iterations across the three pieces
```

## Keep it low-bloat

This skill's whole value is a fast, credible number. Resist the urge to pad. No risk registers, no Gantt-style breakdowns, no restating the task back, no hedging paragraphs. If you're writing more than the contract line plus a few bullets (or a one-line scope for fuzzy asks), you've over-delivered the wrong thing. A tight range Ali trusts beats a thorough essay he won't read.

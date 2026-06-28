---
name: build-from-prototype
description: "Convert an APPROVED static HTML prototype (from ui-prototype-first, at /tmp/<slug>-prototype.html) into real React/Next.js UI that visually MATCHES it, treating the prototype as a hard guard. Use after the user approves a prototype and says 'build it', 'convert the prototype', 'now make it real', 'implement the prototype', 'build the UI from the prototype'. Reuse-first: reuse/refactor existing project components before composing shadcn primitives; create new components only as a last resort. Runs a visual verify loop — render the UI, screenshot it next to the prototype, list discrepancies, fix, repeat (cap 3-4 rounds) — so the result doesn't drift from the approved design. Stack-aware (React, Next.js, shadcn/ui, Tailwind); detects everything at runtime."
user-invocable: true
---

# Build From Prototype — turn the approved prototype into matching React/shadcn UI

This skill runs **after `ui-prototype-first`**. The user has already approved a static HTML
prototype at `/tmp/<slug>-prototype.html`. Your job: build the real React/Next.js UI so that it
**matches that prototype**, and prove it matches by looking at both.

The failure this skill exists to kill: the agent treats the prototype as a vague suggestion,
re-interprets the design, reinvents components, and ships a UI that drifts from what the user
signed off on. Two rules prevent that: **the prototype is a hard guard**, and **you verify
visually before declaring done**.

---

## Two non-negotiable principles

### 1. The prototype is a HARD GUARD, not a loose reference
The approved prototype is the visual contract. Every section, spacing relationship, hierarchy,
and color in the final UI must trace back to it. You do not redesign, "improve," or simplify it
during conversion. If something in the prototype seems wrong, stop and ask — don't silently change it.

### 2. Reuse first. Create new only as a last resort.
Using shadcn primitives is **not** a hard requirement, and spinning up brand-new components is the
**last** thing you do. Component sourcing, in strict priority order:

1. **Reuse** — an existing project component already does the job → use it as-is.
2. **Refactor / extend** — an existing component almost fits → add a prop or variant so it fits, rather than duplicating it.
3. **Compose** — nothing existing fits → compose from the project's shadcn/ui primitives + Tailwind.
4. **Create new** — only when 1–3 genuinely can't cover it. When you do, say so explicitly in the summary and keep it consistent with the project's component conventions.

Refactor-and-reuse is the goal. A pull request full of net-new one-off components is a failure mode,
even if it looks right.

---

## Inputs

- **The prototype.** Default to `/tmp/<slug>-prototype.html` matching the plan/topic. If the slug
  is ambiguous, pick the most recently modified `/tmp/*-prototype.html` and confirm with the user
  in one line. If no prototype exists, stop — this skill runs *after* `ui-prototype-first`.
- **The target location.** Where the UI should live (the page/component the plan names). Ask once if unclear.

---

## Phase 1 — Inventory before you write anything

Do not start coding from the prototype cold. First build a picture of what already exists, so reuse
is even possible.

1. **Read the prototype end-to-end.** Identify each distinct UI region, the components it implies
   (buttons, cards, tabs, dialogs, tables, badges, inputs…), the layout/spacing, and the tokens it
   uses (its `:root` should already mirror the project theme if it came from the updated
   `ui-prototype-first`).
2. **Inventory existing components.** Glob the project's component dirs (`components/`,
   `components/ui/`, feature folders). For each prototype region, find the closest existing
   component — project-specific composite components first, then shadcn primitives. Write down the
   mapping: *prototype region → existing component to reuse / extend, or "compose", or "new (why)"*.
3. **Read the theme.** `globals.css` (the `:root` / `.dark` CSS vars) and `tailwind.config.*`. The
   final UI uses these real tokens — never hardcoded hex/px that bypass the design system.

Output of Phase 1 is a short **component-sourcing plan** (the mapping above). Skim it for new
components: if you're proposing several, look harder for reuse first.

---

## Phase 2 — Translate the prototype into components

Build the UI from the sourcing plan. Discipline:

- **Faithful layout, stock shadcn defaults.** Match the prototype's spacing, hierarchy, sizing, and
  color intent closely. Use stock shadcn/component defaults rather than fighting them — this is
  faithful-but-not-pixel. When the prototype and a default differ trivially, the default wins; when
  they differ meaningfully, the prototype wins (it's the guard).
- **Real tokens only.** Use the project's theme tokens / Tailwind classes (`bg-background`,
  `text-muted-foreground`, `rounded-lg` via `--radius`, etc.). No raw hex or magic px that dodge the
  design system.
- **Reuse per the Phase 1 plan.** Prefer extending an existing component (a new variant/prop) over a
  parallel copy. Keep new files to the genuine last-resort cases.
- **Mock data for now.** Wire props/types but stub data — real data wiring is out of scope here
  (that's the delivery step / ship-it). Stub handlers; don't fake backend.

---

## Phase 3 — Visual verify loop (the core fix)

Do not declare done from reading your own code. Render it and compare to the prototype.

1. **Mount it.** Prefer the **real page/route** if it's easy to reach (route exists, no auth wall,
   data mockable). Otherwise create a **throwaway preview route** (e.g. `app/_preview/<slug>/page.tsx`)
   that renders the component with mock data. Remember to delete the throwaway route in Phase 4.
2. **Run the dev server** (detect the command: `pnpm dev` / `npm run dev` / `yarn dev`; background it)
   and get the local URL.
3. **Screenshot both, same viewport.** With the chrome-devtools MCP: open the rendered route and
   screenshot it; open the prototype (`file:///tmp/<slug>-prototype.html`) and screenshot it at the
   **same width** (do a desktop width and a mobile width if the prototype is responsive).
4. **Compare by visual judgment.** Put the two screenshots side by side and list **concrete**
   discrepancies: spacing off, wrong hierarchy, wrong/missing component, color mismatch, wrong
   sizing, missing section, alignment. (No automated pixel-diff — real shadcn defaults won't be
   pixel-identical and that's fine.)
5. **Fix the discrepancies**, re-render, re-screenshot, re-compare.
6. **Loop, capped at 3–4 rounds.** Stop when there are no meaningful discrepancies left. If some
   remain at the cap, **surface them in a list** rather than grinding forever — tell the user what
   still differs and why (e.g. "the prototype uses a custom 2px ring shadcn's Input doesn't expose
   without an override — want me to override or accept the default?").

Show the user the final side-by-side (rendered vs prototype) so they can confirm the match.

---

## Phase 4 — Clean up & summarize

- **Delete the throwaway preview route** and any mock-only fixtures created solely for screenshotting.
  (Don't delete a real page you rendered.)
- **Summarize**: which existing components you reused, which you extended (and the prop/variant added),
  what you composed from primitives, and any **new** components you had to create with the reason.
  Plus the verify result: rounds run, and any remaining discrepancies you surfaced.
- Hand off. This skill produces matching UI with stubbed data; wiring real data + opening the PR is
  the delivery step (e.g. `ship-it`).

---

## Out of scope

- Does NOT wire real backend/data (mock for the preview; real wiring is the delivery step).
- Does NOT open a PR or merge (that's `ship-it`).
- Does NOT redesign or "improve" the approved prototype — it matches it.
- Does NOT default to creating new components — reuse/refactor first, new is last resort.

---

## Checklist before declaring done

```
[ ] Located the approved /tmp/<slug>-prototype.html and read it fully
[ ] Phase 1 component-sourcing plan written; reuse/refactor maximized, new components justified
[ ] Real project theme tokens used (no raw hex/px bypassing the design system)
[ ] Faithful layout with stock shadcn defaults; prototype wins on meaningful differences
[ ] Rendered the UI (real route if easy, else throwaway preview route with mock data)
[ ] Screenshotted rendered UI AND prototype at matching viewport(s) via chrome-devtools
[ ] Listed concrete discrepancies and fixed them; looped (cap 3-4), surfaced any remainder
[ ] Threw away the temp preview route + mock-only fixtures
[ ] Summary lists reused / extended / composed / new (with reasons) + verify result
```

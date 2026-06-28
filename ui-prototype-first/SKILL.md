---
name: ui-prototype-first
description: >-
  Build a standalone static HTML prototype showing exactly what the UI will look like — BEFORE writing any React/TSX code. Trigger proactively whenever an `execute-plan` flow loads a plan that touches .tsx files inside `src/components/`, `src/app/`, or `src/pages/`, or whenever the user proposes a visual UI change against an existing file or component. HARD-BLOCK any Edit/Write to .tsx files in the plan's scope until the user verbally approves the prototype ("looks good" / "approved" / "ship it" / "lgtm" or similar). Outputs a self-contained .html file at `/tmp/<slug>-prototype.html` with BEFORE/AFTER callouts on modified sections (REMOVED red, CHANGED amber, ADDED green), mobile-responsive, shadcn-approximate aesthetic. Do NOT skip this skill just because the plan also has logic / API / DB changes — if ANY TSX file in the plan's scope is going to be edited, the prototype runs first. The point is to catch UI design problems before the model writes a thousand lines of component code that then has to be thrown away or reworked.
---

# UI Prototype First

A visual sign-off gate. Plans that touch UI code do not get to skip straight to TSX edits — the user sees an HTML mockup first, says "looks good," and only then does any React component get touched.

## Why this skill exists

Writing 200–800 lines of TSX based on a written plan, then discovering the visual hierarchy is wrong, the spacing reads cramped, or the wrong section got the emphasis, is the most expensive failure mode of UI implementation. Words in a plan do not communicate visual weight, density, or vibe — even when the plan is detailed. A 15-minute HTML prototype catches the disagreement before any component code is touched.

This skill exists because the cost of "wrote it, didn't like it, rewrite" is enormous compared to "drew it in HTML, didn't like it, adjust the HTML."

## When to trigger

**Trigger when ALL of these are true:**

1. A plan file has been loaded (typically by the `execute-plan` skill, but any flow that hands you a plan from `.claude/plans/` or `~/.claude/plans/` counts), OR the user describes a UI change they want and points at an existing component.
2. The plan or the request touches at least one `.tsx` file inside `src/components/`, `src/app/`, or `src/pages/` — or proposes a new component in those directories.
3. The change is visual in any meaningful way: new component, redesigned panel, new section, removed section, layout shift, callouts, copy + styling combined, new badges or tooltips, schema-driven render changes, etc.

**Do NOT trigger when:**

- The plan only changes server actions, API routes, trigger jobs, schemas, hooks, or anything else without TSX edits in UI directories.
- The TSX edit is mechanical and visually invisible — e.g., renaming a prop, fixing a type import, swapping `useCallback` for `useMemo`, deleting dead code that was never rendered.
- The user is fixing a bug whose fix has no visual consequence (e.g., a missing await, a wrong dependency array, a typo in a key).
- The user already has a prototype in hand and is explicitly asking to skip ahead — they may have invoked this skill in a prior session.

When in doubt, look at the plan's "Files touched" or "Critical files" list and ask: *does this change what the user sees on the screen?* If yes, run the skill. If you're 60/40 unsure, run it — a wasted 15 minutes on a prototype is much cheaper than a wasted hour on the wrong TSX.

## The hard-block rule

Once this skill triggers, the following Edit and Write tool calls are off-limits until the user explicitly approves the prototype:

- Any Edit/Write to a `.tsx` file inside `src/components/`, `src/app/`, or `src/pages/` that is in the plan's scope.
- Any Edit/Write to a `.css` file or styling-adjacent file in the plan's scope.

You are still free to:

- Write the prototype itself to `/tmp/<slug>-prototype.html`.
- Read any file in the repo (to understand the existing component, the schema, the data shape, the host app's tokens).
- Edit the prototype based on user feedback, repeatedly.
- Edit `.md` files, skill files, plan files — anything outside the UI scope.

The hard-block is not enforced by the tooling — it is your discipline as the agent. If the user has not explicitly said "looks good" / "approved" / "ship it" / "lgtm" / "go" / "perfect" / "yes, that's right" or something equivalent, the TSX is off-limits.

## The flow

### 1. Read the plan (or the user's request)

If a plan file path was handed to you, read it end-to-end. Identify:

- Which `.tsx` files will be touched
- What sections / components / panels are being added, removed, or changed
- Whether the change is purely additive (new component, new section) or a modification of existing UI
- Any explicit visual conventions the user has called out (e.g., "match shadcn", "drop the AI Info Page section", "show before/after")

If there is no plan file but the user is describing a visual change in chat, mentally treat the conversation as the plan — extract the same answers.

### 2. Read the existing component (BEFORE state)

For every modification (not pure additions), read the current `.tsx` file(s) so you know what's there today. The prototype's BEFORE side has to be accurate — if you guess what the current UI looks like, you risk drawing a "before" that doesn't match reality, and the user's feedback will be about how your prototype misrepresents the current state instead of about the proposed change.

You don't have to render every detail of the existing component. Capture: section structure, hierarchy, what panels exist, what's visually prominent, what the user is going to recognise as "the way it is now."

### 3. Decide BEFORE/AFTER callouts

For each section your change touches, classify the diff:

- **REMOVED** — the section is being deleted entirely. Show it in the prototype with a red dashed border + light red background tint + a one-sentence "REMOVED — why" label.
- **CHANGED** — the section is being modified (restyled, restructured, copy + behaviour changed). Show the AFTER state with an amber dashed border + light amber background + a one-sentence "CHANGED — what" label.
- **ADDED** — the section is brand new. Show it with a green dashed border + light green background + a one-sentence "ADDED — what" label.
- **UNCHANGED** — the section is in the same plan but visually unaffected. Render it normally with no callout, OR omit it from the prototype entirely if it would clutter the page without adding value.

If the change is purely additive (whole new component, new page, new panel slot), callouts are optional but at minimum mark the new region with an ADDED tag so the user knows what's new.

### 4. Write the prototype to `/tmp/`

Path: `/tmp/<slug>-prototype.html` where `<slug>` is derived from the plan filename (e.g. `key-619-iter-12-followups.md` → `key-619-iter-12-prototype.html`), or from a short kebab-case description if there's no plan (e.g. `pricing-page-redesign-prototype.html`).

Hard requirements for the file:

- **Self-contained.** No build step, no bundler, no React, no npm. Inline `<style>` for CSS, inline `<script>` if any interactivity is needed (rare — visual prototypes are usually static). Google Fonts via `<link rel="stylesheet">` is allowed; nothing else fetched at runtime.
- **Mobile-responsive.** Collapse to a single column below ~700px. The user might open it on their phone.
- **Real semantic HTML.** Use `<table>`, `<h2>`, `<ul>`, `<button>`, `<details>`, `<dl>`, etc. — not a soup of `<div>` and `<span>`. The point is for the user to read the structure as easily as they'd read the real component.
- **No `localStorage`, `sessionStorage`, `IndexedDB`.** State, if any, lives in JS memory.
- **Filename is part of the artifact.** `<slug>-prototype.html` so multiple prototypes don't collide.

### 5. Aesthetic: match the project's REAL theme, not generic AI

The prototype should *look like the real app* — and the cheapest way to make the eventual shadcn conversion match is to build the prototype on the project's **actual** design tokens, not invented ones. Hosts using this skill typically run shadcn/ui + Tailwind.

- **Pull the project's real tokens first.** Before styling, read the project's theme source — `app/globals.css` / `src/app/globals.css` (the shadcn `:root` and `.dark` CSS variables: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--radius`, etc.) and `tailwind.config.*`. Copy those **exact** values into the prototype's `:root` so the prototype and the real UI share one palette, spacing scale, and radius. Only invent a token when the project genuinely lacks one, and label it (e.g. `/* NEW: not in project theme */`) so `build-from-prototype` knows it's new. This shared-token base is what lets the conversion reproduce the look without drift.
- **Type stack** — use the project's font if you can find it (`next/font`, Tailwind `fontFamily`); otherwise `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- **Borders + corners** — use the project's `--radius`; 1px solid borders. No drop shadows on cards unless the host app uses them.
- **Spacing** — match the host app's density (Tailwind spacing scale). Generous, not cramped — 16–24px section spacing, 12–16px inner padding.
- **No purple gradient hero + Inter + three centered feature cards.** That is the visual signature of an AI-generated mockup and the user will read it as "wrong app."
- **Sample data** — use realistic copy from the actual feature (the user's audit IDs, the user's brand names, the user's real domains). Don't lorem-ipsum it — the user is judging both the layout AND the content fit, and lorem-ipsum makes both harder.

### 6. Open it for the user, then wait

Once the file is written, **actually open it** in the user's default browser — don't just print the path and ask them to open it themselves. Run:

```bash
open /tmp/<slug>-prototype.html
```

On macOS this launches the prototype in the default browser immediately. (On Linux the equivalent is `xdg-open`; on Windows/WSL, `start`. Use `open` by default since the host is macOS.)

Then surface the path so the user can re-open it later, and ask for sign-off:

```
Prototype: /tmp/<slug>-prototype.html  (opened in your browser)

Confirm the visual direction before I touch any TSX.
Say "looks good" / "approved" / "ship it" / "lgtm" to unblock, or tell me what to change.
```

Whenever you write an updated version of the prototype during iteration (step 7), run `open` on it again so the user sees the latest without having to refresh manually.

Then stop. Do not call any Edit/Write on a `.tsx` file. Do not preemptively start drafting the component code "while waiting." Wait for the user's response.

### 7. Iterate or unblock

The user replies one of three ways:

- **Approval** ("looks good", "ship it", "approved", "lgtm", "go", "perfect", "that's right", "yes", or any clear affirmation): the hard-block lifts. Hand control back to the caller (typically `execute-plan` continuing into Phase 2) and proceed with the TSX work.
- **Specific changes** ("make the cards smaller", "drop the photo count tile", "use the violet accent instead of indigo"): apply the changes to the prototype, write the updated file, and re-ask. The block stays in place until you get an unambiguous approval.
- **Reject the whole direction** ("this isn't what I want, let's go back to the drawing board"): the plan itself needs rework. Stop, surface the disagreement, and ask whether to revise the plan before continuing with the prototype.

Ambiguous replies ("hmm", "interesting", "I guess that works") are NOT approval. Ask one clarifying question rather than assuming the block is lifted.

## Output requirements (template-level checklist)

Before declaring the prototype done and pinging the user, run this checklist mentally:

- [ ] File is at `/tmp/<slug>-prototype.html` with a descriptive filename
- [ ] Opens in a browser with zero console errors when self-contained
- [ ] Mobile-responsive (resize the window mentally — does it collapse cleanly below 700px?)
- [ ] Every BEFORE/AFTER callout has a one-sentence explanation, not just a colored border
- [ ] Sample data is realistic (not lorem ipsum, not placeholder names)
- [ ] Aesthetic approximates shadcn / the host app, not generic AI gradients
- [ ] CSS tokens copied from the project's real theme (globals.css / tailwind config) into `:root`; any net-new token labeled
- [ ] Semantic HTML — `<table>`, `<h2>`, etc.
- [ ] No external runtime deps beyond Google Fonts via `<link>`
- [ ] Opened for the user with `open /tmp/<slug>-prototype.html` (not just linked)

## Concrete BEFORE/AFTER CSS

A starter for the callout boxes, drop into the `<style>` block at the top:

```css
:root {
  --diff-removed-fg: #991b1b;
  --diff-removed-bg: #fef2f2;
  --diff-removed-border: #fca5a5;
  --diff-changed-fg: #92400e;
  --diff-changed-bg: #fffbeb;
  --diff-changed-border: #fcd34d;
  --diff-added-fg: #065f46;
  --diff-added-bg: #ecfdf5;
  --diff-added-border: #6ee7b7;
}
.diff-note {
  border: 1px dashed var(--diff-changed-border);
  background: var(--diff-changed-bg);
  color: var(--diff-changed-fg);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin: 0 0 12px;
  line-height: 1.4;
}
.diff-note.removed { border-color: var(--diff-removed-border); background: var(--diff-removed-bg); color: var(--diff-removed-fg); }
.diff-note.added   { border-color: var(--diff-added-border);   background: var(--diff-added-bg);   color: var(--diff-added-fg); }
.diff-note strong { font-weight: 700; }
```

Usage:

```html
<div class="diff-note removed"><strong>REMOVED:</strong> AI Info Page Status section — the LLM disclaimed its own output and the section added no value.</div>

<div class="diff-note"><strong>CHANGED:</strong> Findings Explorer titles now wrap when expanded (previously truncated).</div>

<div class="diff-note added"><strong>NEW:</strong> Local Business Context card at the top of the report — shows GBP claim status + measured gaps.</div>
```

## Example references

Two reference prototypes that successfully used this pattern:

- **iter-11 / KEY-617** — `/tmp/geo-audit-iter11-prototype.html`. Showed shadcn accordion + flat cards + severity tooltips + footnote citations + empty-tier hiding. Approved before any TSX was written; the resulting PR shipped clean visual changes.
- **iter-12 / KEY-619** — `/tmp/geo-audit-iter12-prototype.html`. Showed citations spread across more sections + AI Info Page Status removed (with a REMOVED callout explaining why) + new Local Business Context card. Approved before any TSX was written.

Both prototypes were ~300–500 lines of HTML+CSS, took ~10–15 minutes to draft, and saved several rework cycles on the implementation side.

## Why discipline matters

The skill is worth nothing if you write the prototype and then quietly start drafting component code "in case the user approves." The user's mental model is: *I haven't approved this yet, so nothing irreversible is happening.* If they later see that you've already written half the component, they have to choose between accepting work they didn't sign off on or asking you to throw it away. Both are bad.

Write the prototype. Tell the user. Wait. That's the whole skill.

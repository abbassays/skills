---
name: create-linear-ticket
description: "Create a Linear ticket properly — scheduled into a real cycle with a real status, never dumped into invisible Backlog. Use WHENEVER the user asks to create a Linear ticket/issue: 'create a linear ticket', 'make a ticket for this', 'file an issue', 'add this to Linear', 'create a ticket to fix X', or when another skill (e.g. ship-it) needs a ticket. Detects whichever Linear MCP is connected for that project (no hardcoded slug). Picks the cycle by measuring the current cycle's remaining load, sets status accordingly (Up Next if it lands in the current cycle, Todo if it lands in the next), infers assignee/labels/project/due date/estimate, and sets a billing-month label only in workspaces that have one AND only when the ticket is created as already started/done. Creates the ticket DIRECTLY — no preview, no confirmation gate — then reports the ticket ID, URL, and the fields it set so anything wrong is fixable in one click."
user-invocable: true
---

# Create Linear Ticket — scheduled, owned, estimated. Never a backlog ghost.

Linear's default is a trap: a ticket with a title, no status, no owner, no cycle, no estimate, sitting
in Backlog where nobody will ever see it again. This skill refuses to produce that.

**Every ticket this skill creates lands in a cycle with a real status and an owner.** It creates
directly, without a preview or confirmation step, then reports what it set so anything wrong is a
one-click fix in Linear. It never shrugs and defaults to Backlog.

---

## Step 1 — Find the Linear MCP (never hardcode a slug)

The Linear MCP server slug differs per project (`mcp__recash-linear__…`, `mcp__seomaven-linear__…`,
`mcp__claude_ai_Linear__…`, …). **Detect it.** Look for an available tool matching
`mcp__*linear*__save_issue` / `mcp__*linear*__create_issue` (plus the read tools:
`…list_issues`, `…list_teams`, `…list_cycles`, `…list_issue_labels`, `…list_projects`, `…list_users`,
`…list_issue_statuses`).

**If no Linear MCP is connected**, stop and say so plainly:
> "No Linear MCP is connected for this project, so I can't create the ticket. Connect one and I'll do it."

Do not silently write the ticket somewhere else, and do not pretend to have created it.

### Team
Infer the team from the project/repo context (repo name, the team that owns the other issues you can
see). **If it's ambiguous, ask** — the wrong team means the wrong cycles, labels, and workflow states.

---

## Step 2 — Discover the workspace's actual shape

Never assume field names. Before proposing anything, read the real workspace:

- **Workflow states** (`…list_issue_statuses`) — get this team's actual states. You're looking for the
  non-backlog unstarted ones. Names vary: `Todo`, `Up Next`, `Ready`, `Planned`. Map to what exists.
- **Cycles** (`…list_cycles`) — the current cycle (if one is running) and the next one, with their
  start/end dates.
- **Labels** (`…list_issue_labels`) — including whether a **billing-month** label group exists
  (labels like `June 2026`, `Billing: June`, or a `Billing Month` group).
- **Projects** (`…list_projects`) and **members** (`…list_users`).

---

## Step 3 — Choose the cycle by measuring load (this decides the status)

**The cycle comes first. The status follows from it.**

1. **Measure the current cycle's remaining load.** Pull the unfinished issues in the current cycle
   (not Done/Cancelled) and **sum their estimates (hours)**.
2. **Compare against capacity left**: the working days remaining in the cycle × the hours a day the
   team realistically has. Be honest, not optimistic.
3. **Decide:**

| Situation | Cycle | Status |
|---|---|---|
| Current cycle still has room for this ticket's estimate | **current cycle** | **Up Next** |
| Current cycle is already at/over capacity | **next cycle** | **Todo** |
| No cycle is currently running | **next cycle** | **Todo** |

4. **A due date overrides the load rule.** If the user gives a due date that falls inside a different
   cycle, that cycle wins — and the status follows the same rule (current cycle → Up Next, a later
   cycle → Todo). Say so in the report.

5. **Show your work.** In the post-creation report, state the numbers you used:
   > *Current cycle (Jun 16-30): 34h of unfinished work, ~3 working days left (~18h capacity). Over
   > capacity, so this goes to the next cycle as Todo.*

**Under no circumstances create the ticket in Backlog** or with no status. If you genuinely cannot
determine a cycle, ask — don't fall back to Backlog.

---

## Step 4 — Infer the rest, then propose it

Infer from the conversation and the workspace, and propose (don't interrogate):

- **Title** — `<type>(<scope>): <subject>` (e.g. `fix(checkout): webhook can arrive before the order row`).
  Types: `feat` / `fix` / `refactor` / `chore` / `docs` / `test`.
- **Description** — the intent in a couple of lines, then **acceptance criteria** as a checklist. These
  criteria are the definition of done, so make them checkable.
- **Assignee** — infer from who's doing the work (usually the user). Propose, let them change it.
- **Labels** — infer from the work's nature (`bug`, `frontend`, area labels the workspace already uses).
  Only use labels that actually exist in this workspace.
- **Project** — infer from context if the work clearly belongs to one.
- **Due date** — only if there's a real deadline in the conversation. Don't invent one. Remember it can
  override the cycle (Step 3.4).

---

## Step 5 — Billing month (only sometimes)

**Only in workspaces where a billing-month label exists.** If there's no such label, skip this
entirely and don't mention it.

The rule is about whether the work has actually happened:

- **Creating a normal new ticket** (status Todo / Up Next — i.e. **not started**) → **no billing-month
  label.** The work hasn't happened yet, so it isn't billable to any month. This is the common case.
- **Creating a ticket that's already started or done** (the user is logging work retroactively, and the
  ticket is being created directly as In Progress / Done) → **set the billing month to the current
  month.**

Don't set a billing month "in advance" from the due date or cycle. Billing follows reality, not plans.

---

## Step 6 — Create it directly, then report what was created

**No preview, no confirmation gate. Create the ticket.** Everything above is already decided from the
workspace and the context, so don't stop to ask permission — call the detected `…save_issue` /
`…create_issue` tool and make the ticket.

Only ask a question if something is genuinely **blocking** and can't be inferred (an ambiguous team,
or no cycle determinable at all). A missing optional field is not blocking: create the ticket without
it and say so.

After creating, report the result compactly so it can be corrected in Linear if anything's off:

```
Created ENG-482 — fix(checkout): webhook can arrive before the order row exists
https://linear.app/acme/issue/ENG-482

Status:        Todo
Cycle:         Cycle 24 (Jul 1-15)   ← current cycle over capacity (34h left, ~18h room)
Assignee:      Ali
Estimate:      4h
Labels:        bug, backend
Project:       Checkout revamp
Due date:      —
Billing month: — (not started yet)
```

Lead with the **ticket ID and URL**. The field list underneath is so a wrong assignee, estimate, or
cycle is obvious at a glance and can be fixed in Linear in one click, which is faster than a
confirmation round-trip before every ticket.

---

## Self-check before creating

- [ ] Linear MCP was **detected**, not assumed; team is right
- [ ] Workflow states, cycles, labels, projects were read from the real workspace
- [ ] **Status is never Backlog and never empty**
- [ ] Cycle chosen by measuring current-cycle load (numbers shown), or overridden by a real due date
- [ ] Status matches the cycle: Up Next = current cycle, Todo = next cycle
- [ ] Assignee is set
- [ ] Labels/project only use values that exist in this workspace
- [ ] Billing month set **only** if the label exists AND the ticket is being created as started/done
- [ ] Created directly — no preview gate, and no question asked unless something was genuinely blocking
- [ ] Reported the ticket ID + URL, with the field list underneath so mistakes are fixable at a glance

---

## What this skill does NOT do

- Does not update, move, or re-status existing tickets — creation only.
- Does not stamp a billing month when a ticket later starts or completes (separate concern).
- Does not invent labels, projects, or statuses that don't exist in the workspace.
- Does not create anything in Backlog.
- Does not stop for a preview or confirmation before creating — it creates, then reports.

---
name: tldr
description: "Compress a long message you just sent into a short, structured summary the user can read in ~15 seconds. Use when the user says 'tldr', 'tl;dr', 'summarize that', 'shorter', 'give me the gist', 'too long', 'recap', or otherwise asks for the short version of something already said. By default it summarizes your LAST long message; if the user asks for the whole conversation ('tldr the whole thing', 'recap this session'), summarize the session instead. Always uses the same spine: Bottom line → (middle, adapts to message type) → What you need to do → Watch out. Never re-does the work or adds new information — it only compresses what was already said."
user-invocable: true
---

# TLDR — the short, structured version

The user just got a wall of text. Your job is to make it graspable in about 15 seconds, without
making them hunt for the part that matters to them.

**Golden rule: compress, don't re-derive.** Everything in the TLDR must already be in the message
you're summarizing. Do not run new tools, do not add new findings, do not soften or upgrade the
conclusions. If something was uncertain in the original, it stays uncertain here.

---

## What to summarize

- **Default: your last long message.** That's the normal case — the user read a wall of text and
  wants the short version.
- **If the user points at something specific** ("tldr the one about auth", "tldr what you said about
  the migration"), summarize that message instead.
- **If the user asks for the whole conversation** ("tldr the whole thing", "recap this session",
  "what did we do today"), summarize the session: the outcomes, the decisions made, what's still
  open, and what's on them.

---

## The structure (always this spine)

```
**Bottom line**       ← one or two sentences. the outcome / the answer / the recommendation.
<middle>              ← adapts to the message type (see below)
**What you need to do**  ← the action(s) on the user. or explicitly "nothing".
**Watch out**            ← the risk, caveat, or gotcha. or explicitly "nothing".
```

**The spine never changes.** `Bottom line` opens, `What you need to do` and `Watch out` close.
Only the middle changes.

**Never silently drop the last two sections.** If there is no action on the user, say
`**What you need to do**  Nothing, this is just an FYI.` If there's no risk, say
`**Watch out**  Nothing.` The user should never have to wonder whether the section was omitted
because it was empty or because you forgot.

### The middle, by message type

Pick the one that fits what you actually said. Don't force it.

| The message was… | The middle section is… |
|---|---|
| **A work report** (you did/built/fixed/shipped something) | `**What I did**` — 3-5 bullets, the changes that matter. Skip the mechanical ones. |
| **An explanation** (you explained how something works, or answered a question) | `**Key points**` — 3-5 bullets. Optionally `**Why it matters**` in one line. |
| **Options / a recommendation** (you laid out choices) | `**The options**` (one line each) + `**The trade-off**` — the single thing that actually decides it. Put your pick in the Bottom line. |
| **A diagnosis** (you investigated a bug/problem) | `**What's wrong**` — the cause, in one or two bullets. Not the whole investigation. |

If a message is a mix (common — a work report that ends with a question), use the dominant type for
the middle and let `What you need to do` carry the question.

---

## Writing rules

- **Bottom line answers "so what?"** Not "here is a summary of what I said." State the outcome:
  *"Checkout is rewired so orders can't be lost or oversold, and money is now exact."*
- **Bullets are outcomes, not activities.** "sessions moved from cookies to Redis, so logout is now
  instant" beats "modified the session middleware."
- **Keep real names.** Table names, endpoints, PR numbers, file paths that the user needs to act on
  stay. This is a summary, not an abstraction.
- **3-5 bullets in the middle.** If you need more, you're not compressing.
- **No preamble.** Don't say "Here's the TL;DR:". Just start with **Bottom line**.
- **No new information.** If you realize while summarizing that you missed something important,
  say it as a separate line *after* the TLDR, flagged as new — don't smuggle it in.
- **Length target:** the whole thing should fit on one screen. If the original was 800 words, this
  is ~120.

---

## Example

Source: a long message about rewiring a checkout flow.

**Bottom line**
Checkout is rewired so orders can't be lost or oversold, and money is exact now. Refunds are still on the old path.

**What I did**
- `orders` row is created as `pending` before Stripe is called, so the webhook can't arrive before the order exists
- inventory decrement and the "paid" flip now happen in one transaction, so the last item can't be oversold
- money moved from floats to integer cents, with a migration backfilling old rows
- the webhook is idempotent now, keyed on the Stripe event id in a new `processed_events` table

**What you need to do**
Decide: migrate refunds now, or ship this first.

**Watch out**
- refunds still write float amounts, so the two systems disagree until refunds are migrated
- the migration rewrites the totals column and needs a short maintenance window

---

And the same skill on an **options** message, where the middle changes:

**Bottom line**
Go with Redis sessions.

**The options**
- cookies: simple, no new infra, but you can't force-logout anyone
- Redis: revocable instantly, but adds a prod dependency

**The trade-off**
You need instant logout for the admin kill switch, so Redis wins.

**What you need to do**
Approve the infra spend.

**Watch out**
New prod dependency to monitor.

---

## Self-check

- [ ] Spine intact: Bottom line → middle → What you need to do → Watch out
- [ ] `What you need to do` and `Watch out` are both present, even if the answer is "nothing"
- [ ] Bottom line states the outcome, not "here's a summary"
- [ ] Middle section type matches what the message actually was
- [ ] 3-5 bullets max in the middle; bullets are outcomes, not activities
- [ ] Nothing in the TLDR that wasn't in the original message
- [ ] Fits on one screen, no preamble

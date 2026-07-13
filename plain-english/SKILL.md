---
name: plain-english
description: "Explain how something works in plain English, as data and flow rather than code. Use when the user asks 'how does X work', 'explain this in plain english', 'what's actually happening here', 'walk me through this without the code', 'explain like I'm not reading the code', or asks any technical question they want a real mental model of (a codebase feature, a system, or a general concept like OAuth / queues / vector DBs). Explains via entities and tables, what data moves where, and step-by-step flow — it names real tables, services, and endpoints but NEVER walks through functions or signatures. Assumes a competent engineer who simply hasn't read this code. Stays in chat as text (use diagram-walkthrough instead if the user wants a visual Mermaid HTML file)."
user-invocable: true
---

# Plain English — understand it without reading the code

Give the user a **correct mental model** of how something works, in plain English, built out of
**data and flow** rather than code.

The user is a competent software engineer. They can read code — they just haven't, and they don't
want to. What they want is to genuinely understand the thing: what data exists, where it moves, what
guarantees hold, and where it can bite them. Not a tour of the source files.

---

## The two hard rules

### 1. Data and flow, never functions
Explain in terms of **entities, tables, services, and the path data takes through them**. You may
name real things — `orders`, `processed_events`, the Stripe webhook, the `/checkout` endpoint — that
makes it concrete and lets them connect it to reality.

**Never** explain via functions. No "`createOrder()` calls `validateCart()` which returns…". No
signatures, no call stacks, no file-by-file walkthrough. If your sentence contains a function name,
rewrite it as what the data does.

> ❌ "The `handleWebhook` function checks `isProcessed()` then calls `markPaid()`."
> ✅ "When Stripe calls back, we first check whether we've already seen that event. If it's new, we mark the order paid."

### 2. Ground it in reality before you explain it
**If the question is about this codebase**, read the actual code, schema, and migrations **first**.
The explanation must describe what the code really does, not a plausible-sounding version of it. But
what you read never leaks into the output as function-level detail — you read code, you write data
flow.

If you're unsure about a step after reading, say so plainly ("I couldn't tell whether retries are
capped — worth checking") rather than inventing a confident answer.

**If it's a general technical question** (how does OAuth work, what's a vector DB, why use a queue),
no repo reading needed. Same shape, same plain English.

---

## Calibration: who you're talking to

- **Don't explain fundamentals.** They know what a database, an API, a cache, and a transaction are.
  Explaining those is condescending and wastes the screen.
- **Do explain this system's specifics.** Why the order row is written *before* payment. What
  `processed_events` is actually protecting against. Which guarantee would break if step 4 failed.
- **Simple words, real concepts.** Plain English is about the *wording*, not about dumbing down the
  ideas. "Both happen or neither does" instead of "the operation is atomic" is good. Pretending
  atomicity isn't the point is not.
- **Say why, not just what.** The value is in the reasons: *why* is the order pending first, *why*
  is the decrement in the same transaction. That's what turns description into understanding.

---

## The structure

```
<flow line>              ← only when there's a real data path. skip it for pure concepts.
**What it is**           ← one or two sentences. what job does this do?
**The data**             ← the entities/tables and what each holds. a table is usually clearest.
**The flow, step by step** ← numbered. what happens, in order, in plain English.
**Where the truth lives** ← which store is authoritative for what. who owns the real answer.
**Gotchas**              ← the surprises. what looks like a bug but isn't, and what actually is one.
```

**The flow line** goes first when the thing has an actual path through it — an arrow sketch that
shows the shape before the detail:

```
you → orders(pending) → Stripe → [you pay] → Stripe calls back
   → seen this event before? → yes: stop
                             → no: orders(paid) + inventory−  (one transaction)
```

Skip the flow line when there isn't a flow (a conceptual question, a data-model question, a "why is
it designed this way" question). Don't force an arrow diagram onto something static.

**Drop a section if it's genuinely empty**, but don't drop **Gotchas** unless there truly are none —
the gotchas are usually the most valuable part.

---

## Worked example

Question: *"how does checkout actually work?"*

```
you → orders(pending) → Stripe → [you pay] → Stripe calls back
   → seen this event before? → yes: stop
                             → no: orders(paid) + inventory−  (one transaction)
```

**What it is**
Checkout turns a cart into a paid order without ever losing money or overselling stock.

**The data**

| Thing | What it holds |
|---|---|
| `orders` | one row per checkout attempt; a status (pending → paid) and a total in integer cents |
| `order_items` | the lines in that order, and how much stock each one takes |
| `inventory` | how many of each item are left |
| `processed_events` | every Stripe event id already handled, so none is handled twice |

**The flow, step by step**
1. You hit pay. We immediately write an `orders` row as `pending`. Nothing is charged yet.
2. We ask Stripe to start a payment, tagged with that order's id.
3. You type your card in on Stripe's side. We're not involved.
4. Stripe calls us back saying the payment succeeded. The callback carries the order id and an event id.
5. We check `processed_events`. If we've seen that event id before, we stop. That's what makes a duplicate callback harmless.
6. In one transaction: flip the order to `paid` **and** subtract from `inventory`. Both happen, or neither does.

**Where the truth lives**
Money truth is `orders`, in whole cents, never decimals. Stock truth is `inventory`. Whether the card
actually charged is Stripe's truth — our job is only to reflect it.

**Gotchas**
- The order row exists *before* payment, so `pending` rows that never become `paid` are normal. Those
  are abandoned checkouts, not bugs.
- Refunds don't use this path yet and still write decimal amounts, so refund totals can drift from
  order totals by tiny amounts until that's migrated.

---

## Depth and follow-ups

- **Default depth:** enough to act on and reason about — roughly one to two screens. Not a book.
- If they want more, they'll say "go deeper" — then expand the flow into more steps, or add a second
  layer (error paths, retries, edge cases). Still no functions.
- If they want a **visual**, hand off to `diagram-walkthrough`, which produces a clickable Mermaid
  HTML file. This skill stays in chat.

---

## Self-check before answering

- [ ] For a codebase question: read the real code/schema first; the explanation matches what's actually there
- [ ] Zero function names, signatures, or call-stack walkthroughs in the output
- [ ] Real tables/services/endpoints are named, so it connects to their reality
- [ ] Flow line included when there's an actual data path; skipped when there isn't
- [ ] Explains **why**, not just what
- [ ] No condescending explanations of fundamentals (what a DB/API/transaction is)
- [ ] Gotchas section present and genuinely useful
- [ ] Anything uncertain is flagged as uncertain, not guessed confidently
- [ ] Plain wording, real concepts — simplified language, not simplified ideas

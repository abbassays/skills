---
name: plain-english
description: "Explain something technical the way you'd explain it to a sharp colleague across the desk: as a short story in plain words, with real examples, no tables, no jargon, and no code tour. Use when the user asks 'how does X work', 'explain this in plain english', 'what's actually happening', 'no jargon', 'talk me through it without the code', 'explain it like a human', or when a technical explanation has turned into a wall of jargon and they push back. Also the right skill when explaining your OWN broken work — own the mistake plainly and land the one decision they need to make. Explains via what the data is and where it moves, never via which function calls which. KEEPS IT SHORT — paragraphs are 1-3 sentences, bullets over prose walls, the whole answer fits on one screen (~200-250 words); it only goes longer if asked to 'go deeper'. Assumes a competent engineer who simply hasn't read this code. Stays in chat (use diagram-walkthrough if they want a visual Mermaid file)."
user-invocable: true
---

# Plain English — explain it like a person, not a document

The user is a competent engineer. They can read code. They haven't, and they don't want to. They
want to actually *understand* the thing — and they want it the way a smart friend would explain it,
leaning back in their chair, not the way a spec would.

Most technical explanations fail not because they're wrong but because they're **formatted instead
of spoken**. A table is not an explanation. A section header is not an explanation. A story with a
concrete example is an explanation.

---

## The voice is most of the skill

Write like you're talking. Short paragraphs. Plain words. Real values. Land the "so what."

If someone read your answer out loud and it sounded like a document being recited, you failed.

---

## Keep it SHORT — this is a hard constraint, not a preference

Long paragraphs are worse than tables. A wall of prose is just a wall.

- **Paragraphs are 1-3 sentences. Never more.** If a paragraph hits four, split it or cut it.
- **One idea per paragraph.** Then a line break. White space is doing real work here.
- **The whole answer fits on one screen.** Target ~200-250 words. Hard ceiling ~400, and only if the
  thing genuinely needs it.
- **Fragments are fine.** "That's it. That's the whole thing." Talk, don't compose.
- **Cut any sentence that doesn't change their understanding.** Setup, throat-clearing, restating what
  you just said, and "as mentioned above" all go.
- **Short bullets are allowed and encouraged.** Banning tables does not mean everything becomes prose.
  If you're listing three things, list them — 3-8 words each, not sentences.
- **Skimmable:** they should be able to read only the bold lead-ins and still get it.

**Default to short.** If they want more, they'll say "go deeper" — and that's the only time you expand.

---

## Hard rules

### 1. No tables. Ever.
If you're reaching for a markdown table, you're organizing instead of explaining. Say it in
sentences. (This does **not** mean drop the data — see rule 5. It means *speak* the data instead of
tabulating it.)

**"No tables" does not mean "everything must be prose."** Short bullets are good. A wall of
paragraphs is exactly as unreadable as a table, just slower. When you're listing things, use bullets.

### 2. No formal section headers
Don't write `**The data**` / `**The flow**` / `**Where the truth lives**`. Use conversational bold
lead-ins that read like things a person would actually say:

> **What the check was supposed to do.**
> **Here's the bug.**
> **The fix, in plain terms:**
> **The thing that trips people up:**
> **Where you actually stand:**

The lead-in is a sentence, not a label.

### 3. No jargon
No "idempotent", "atomic", "entity", "invariant", "deterministic". If a term is genuinely
unavoidable, translate it in the same breath: *"both happen or neither does"* beats "atomic". You
are simplifying the **words**, never the **ideas** — the concepts stay exactly as sharp.

### 4. No functions, no code tour
Never "`handleWebhook()` calls `isProcessed()` which returns…". No signatures, no call stacks, no
file-by-file walkthrough. Explain what the **data** does, not what the code does.

### 5. Data and flow, spoken
The substance is still: what exists, where it moves, what's guaranteed. You may name real things —
`orders`, the Stripe callback, the `/checkout` endpoint — that keeps it concrete. You just say it in
prose: *"the moment you hit pay, we save a row that says someone is trying to buy these three things,
and mark it unpaid."*

### 6. Show real values
Abstract description doesn't click. A concrete example does. Put actual strings, actual rows, actual
numbers in a small code block and point at the part that matters:

```
blue widgets austin texas
blue widgets denver colorado
             ^^^^^^ that's the bit that changes. that's the thing we care about.
```

### 7. Ground it before you explain it
If the question is about this codebase, **read the real code and schema first**. The explanation must
describe what's actually there, not a plausible-sounding version. What you read never leaks out as
function-level detail — you read code, you speak data. If you're unsure after reading, say so
("I couldn't tell whether retries are capped, worth checking") rather than inventing confidence.

For general technical questions (OAuth, queues, vector DBs), no repo reading needed. Same voice.

### 8. Don't explain fundamentals
They know what a database, an API, a cache, and a transaction are. Explaining those is condescending.
Explain *this system's* specifics: why the order row is written before the payment, what that dedupe
check is actually protecting against.

---

## The shape (a spine, not a template)

1. **One sentence, up front.** The whole thing, before any detail. Then stop and let it land.
2. **The story.** What it's meant to do → how it actually does it → where the interesting or broken
   part is. Cause and consequence, in order.
3. **A concrete example** that makes it click. Real values.
4. **Name the essence in one line.** The single sentence that, if they remember nothing else, is the
   thing. *"Both problems are the same mistake: I asked a question, got a garbage answer, and trusted it."*
5. **Where that leaves them.** What works, what doesn't, what it means for them.
6. **The one decision**, if there is one. Give a recommendation — especially if they're frustrated.

Not every question needs all six. A "how does OAuth work" question has no decision at the end. Use
what fits; never pad to hit the shape.

---

## When you're explaining your own broken work

This is where most explanations go dishonest. Don't.

- **Own it flatly.** "My guard was wrong. It rejected good work." Not "there appears to be an
  inconsistency in the validation layer."
- **Say what it cost them.** "That's your 5 failed pages." Connect the bug to the damage they saw.
- **Credit their insight when they had one.** "Your point, which is the smart one: it's not even
  about cities."
- **Give them the honest way out.** If ripping it out is the sane move, say so.

---

## Worked example — the target voice

> **One sentence: I built a safety check that's broken, and it's throwing away good work.**
>
> That's it. That's the whole thing.
>
> **What the check was supposed to do.** You complained that the Austin page had content about
> Denver. So I added a guard: before we save the article, make sure it's actually about the right city.
>
> **How the guard figures out "the right city."** It looks at the URL, `blue-widgets-austin-texas`,
> and tries to pull the city out of it. Simple idea.
>
> **Here's the bug.** My code grabs too many words. Instead of pulling out `Austin`, it pulls out
> `Blue Widgets Austin` and decides *that's* the city name.
>
> So the model writes a perfectly good article about Austin. My guard reads it and says: "This says
> Austin. But I expected 'Blue Widgets Austin.' Doesn't match. REJECT."
>
> That's your 5 failed pages. The articles were fine. My guard was wrong. It rejected good work.
>
> **The fix, in plain terms:** stop parsing anything. Just line the sibling pages up next to each
> other and look at what's different:
>
> ```
> blue widgets austin texas
> blue widgets denver colorado
>              ^^^^^^ that's the bit that changes. that's what we care about.
> ```
>
> No rules about cities. No guessing. Whatever changes between siblings is the thing that makes this
> page unique — and if nothing changes, the answer is "nothing", and the guard shuts up instead of
> firing garbage.
>
> **Where you actually stand.** The big refactor works. The two little guards I bolted on top are
> broken, and they're what nuked your test.
>
> **The one decision I need from you.** Rip the guards out for now (back to how it worked before,
> nothing gets rejected, you can test everything else), or fix them properly with the sibling
> comparison, which is about a day. If you're losing patience: rip them out. They were a bonus
> feature and right now they're doing more harm than good.

Notice what's *not* there: no table, no "Overview / Architecture / Data Model" headers, no jargon,
no function names. And notice what is: a thesis, a story, a real example, the mistake named in one
line, and a decision.

---

## Worked example — a plain "how does it work" question

Same voice, no bug, no decision at the end.

> **One sentence: checkout writes the order down before it takes your money, so a payment can never
> arrive for an order that doesn't exist.**
>
> **The order comes first.** The moment you hit pay, we save a row saying "someone is trying to buy
> these three things" and mark it unpaid. Nothing has been charged yet.
>
> **Then Stripe takes over.** We hand Stripe that order's id and get out of the way. You type your
> card in on their page, not ours.
>
> **Then Stripe calls us back** to say the payment went through, and hands us back that order id.
> Before we believe it, we check whether we've already heard about this exact payment. Stripe will
> happily tell us twice, and acting on it twice would take the stock twice.
>
> **The last bit is the important bit.** Marking the order paid and taking the items out of stock
> happen together, as one move. Both, or neither. If we marked it paid but failed to take the stock,
> we'd sell the same last unit to two people.
>
> **The thing that trips people up:** unpaid order rows are normal, not bugs. They're abandoned carts.

---

## Self-check before answering

- [ ] **No paragraph is longer than 3 sentences** — count them
- [ ] **The whole answer fits on one screen** (~200-250 words, hard ceiling ~400)
- [ ] Bullets used where I'm listing things, instead of a prose wall
- [ ] Every sentence earns its place — nothing restates, sets up, or pads
- [ ] Zero markdown tables
- [ ] Zero formal section headers — the lead-ins read like a person talking
- [ ] Zero jargon (or translated in the same breath)
- [ ] Zero function names, signatures, or call stacks
- [ ] Opens with one blunt sentence that is the whole thing
- [ ] There's at least one concrete example with real values
- [ ] The essence is named in a single sentence somewhere
- [ ] For a codebase question: the real code was read first, and uncertainty is flagged, not guessed
- [ ] If it's my own broken work: I owned it plainly and said what it cost them
- [ ] If there's a decision, it's stated clearly with a recommendation
- [ ] Read it back — does it sound like a person talking, or a document being recited?

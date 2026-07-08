---
name: human-email
description: "Draft a client or team EMAIL that reads like a sharp human wrote it, not an AI — professional sentence-case with a real subject, greeting, structure, and sign-off, and completely free of AI fluff and tells. Use whenever the user wants an email written or replied to: 'draft an email to <client/teammate>', 'reply to this email', 'write to <client> about the delay / scope / invoice', 'email the team about…', or pastes an incoming email to answer. Three modes: write from context, reply to a pasted email, or clean a rough draft. Works out of the box with neutral professional defaults, and can read an optional personal voice profile so it sounds like YOU. Prints the finished email as text (bring your own delivery). NOT for short chat/Slack/WhatsApp, and NOT for formal HR documents (warnings, PIPs)."
user-invocable: true
---

# Human Email — emails that don't read as AI-generated

Write a client or team email that reads like a sharp operator wrote it: professional, structured,
and free of the fluff and tells that scream "an assistant generated this." The bar: professional but
not corporate, complete but not padded.

This skill has two layers:

1. **A universal anti-fluff engine** (structure, banned AI-tells, the hard-email playbooks) — always on.
2. **An optional personal voice profile** — so the same engine can sound like *you* instead of a
   generic default. Ships with sensible neutral defaults, so it works with zero setup.

---

## Voice profile (optional, makes it sound like you)

At the start of a draft, check for a voice profile at **`~/.config/human-email/voice.md`**.

- **If it exists**, load it and follow it — it overrides the neutral defaults below.
- **If it doesn't**, use the **neutral defaults** (next section), draft the email, and afterward
  offer **once** to set a profile up: *"Want me to save a voice profile so future emails sound like
  you? Takes ~1 min."* Don't nag on later runs.

### Setting up a profile (the one-time step)

If the user says yes, ask a short batch (name + sign-off are the only ones that really matter; the
rest have defaults), then write `~/.config/human-email/voice.md` from this template:

```markdown
# Human Email — voice profile

- Name (for sign-off): Your Name
- Title / company line: e.g. "Founder, Acme Co." — or leave blank for none
- Default sign-off word: Best,   (Thanks, / Cheers, / Regards, …)
- Casing: sentence-case            (this is standard email; don't change unless you really write differently)
- Tone: neutral                     (warm | neutral | flat)
- Contractions: sparingly           (freely | sparingly | avoid)
- Em-dashes: avoid                   (avoid | allow)  — "avoid" is a strong anti-AI-tell default
- Exclamation marks: minimal         (minimal | never | normal)
- Emojis: never                      (never | rarely)
- Signature block: |
    Best,
    Your Name
    Title, Company            (omit the title/company lines if not applicable)

## Sample sent emails (best calibration — paste 2-3 real ones over time)
<!-- client example:
Subject: ...
Hi ...,
... -->
```

Real pasted samples are the strongest signal — match their rhythm and word choice over the defaults.

### Neutral defaults (used when there's no profile)

- Name/sign-off: `Best,` + `[Your Name]` placeholder (tell the user to fill it, or set a profile).
- Sentence-case, neutral-professional tone, contractions used sparingly, no em-dashes, minimal
  exclamation marks, no emojis.

---

## Three input modes

Detect which applies from context. Same output quality either way.

1. **From context** — write the email from the conversation/situation above. Default mode. If the
   goal isn't clear, ask **one** short question, then write.
2. **Reply to a pasted email** — read the incoming email, lock onto what it needs answered, write the
   reply. Keep the subject as `Re: <original>` unless a new subject is clearer.
3. **Clean a rough draft** — the user pastes their own rough draft to tighten. Preserve their intent
   and facts; fix voice, structure, and fluff. Don't invent new commitments.

---

## Output format

Print the email as a markdown **quote block** (every line prefixed with `> `), no commentary around
it, not a fenced code block:

```
> Subject: <specific, scannable subject>
>
> Hi <name>,
>
> <body — lead with the point, short paragraphs>
>
> Best,
> [Your Name]
```

- **Subject**: concrete and scannable. "Phase 1 timeline, revised delivery date" beats "Update". For
  replies, `Re: <original subject>`.
- **Greeting**: `Hi <name>,` default. `Hi team,` for a group. Match the sender's formality if their
  pasted email is more formal (`Dear <name>,`).
- **Sign-off**: from the profile if set; otherwise `Best,` + `[Your Name]`.

This skill is **print-only** — it does not send or create drafts anywhere. Bring your own delivery
(paste into your mail client, or wire a script yourself).

---

## The voice rules

### Punctuation
- **No em-dashes (—)** by default — one of the loudest AI tells. Use a comma, period, parentheses, or
  split the sentence. (Profile can flip this to "allow.")
- Commas and periods carry the message. Colons before a short list are fine. Semicolons rarely.
- Minimal exclamation marks. Flat and functional beats excited.
- Question marks are good — ask directly.

### Structure & tone
- **Lead with the point.** The ask, the update, or the answer goes in the first line or two. Context
  after, only if needed. Never bury it under a windup.
- **Short paragraphs.** One idea each. For 3+ action items or options, a tight bulleted list beats a
  dense paragraph.
- **Length matches the job.** A one-line answer stays one line (plus greeting/sign-off). A scope or
  status email can run a few short paragraphs. Never pad to look thorough.
- **Sentence-case, proper capitalization.** Proper nouns, product names, and acronyms keep their real
  casing (Vercel, Linear, API, KPI, EOD).
- Contractions and warmth per the profile (default: sparingly, neutral).

---

## Banned AI-tells (never produce these)

The patterns that scream "AI wrote this." Cut on sight:

- **em-dashes** (—) anywhere (unless the profile allows them)
- greeting fluff: "I hope this email finds you well", "hope you're doing well", "trust you're well",
  "thank you for your patience" (as filler)
- filler openers: "I just wanted to", "I wanted to reach out", "just circling back", "just following up to"
- corporate filler: "touch base", "circle back", "moving forward", "going forward", "at the end of the
  day", "as per", "kindly", "please be advised", "at your earliest convenience", "please find attached"
- hedge stacks: "I think maybe we could perhaps", "it might be worth potentially"
- throat-clearing: "it's worth noting that", "needless to say", "as you may know", "I'd like to take a
  moment to"
- LLM tics: "delve", "leverage" (as a verb for "use"), "robust", "seamless", "elevate", "streamline",
  "in today's fast-paced world", "navigate the complexities"
- rhetorical scaffolding: "not only X, but also Y", "it's not just X, it's Y"
- sign-off fluff: "thanks so much in advance", "really appreciate your time", "happy to help!", "feel
  free to reach out", "don't hesitate to"
- enthusiasm inflation: "great question!", "absolutely!", excessive "!"
- emojis of any kind (unless the profile allows them rarely)

---

## Client email playbooks (the hard ones)

The real value is here. Client emails carry commercial stakes — protect the relationship **and** your
position. The common failure mode is over-accommodating: silently absorbing scope, reflexively
discounting, softening a clear ask into vagueness. These guardrails push against that.

| Scenario | Goal | Trap to avoid | The move |
|---|---|---|---|
| **Delay / slipped timeline** | Reset expectations, keep trust | Groveling, over-apologizing, stacking excuses | Own it once, plainly. Give the new date and one-line why. Say what's being done. Move forward. |
| **Scope creep / out-of-scope ask** | Say yes to the relationship, not to free work | Silently absorbing it | Acknowledge the ask. Name it as beyond current scope. Offer a path: change order, next phase, or added cost. Never absorb silently. |
| **Price / cost pushback** | Hold the number | Reflexive discounting | Justify by outcome/value, not hours. If they need a lower price, adjust **scope**, not the rate. Offer a smaller cut, not a cheaper one. |
| **Chasing payment / overdue** | Get paid, stay professional | Awkwardness, softening the ask into vagueness | Factual and unemotional. Name the invoice #, amount, due date. One clear ask and next step. No apology for asking. |
| **Status update** | Show control | Burying the headline in detail | Open with the headline (on track / at risk / done). Then what's done, what's next, any decision you need from them. |
| **Pushback / boundary** | Hold the line, keep the account | Caving, or going cold | Firm and respectful. State the boundary and the reason once. Offer the constructive alternative. |

If a client email is high-stakes (money, a delay, a hard no), add **one line to the user** alongside
the draft flagging the risk you see — but keep it out of the email itself.

---

## Team email notes

Everyday internal email — announcements, directives, expectation-setting, coordination.

- **Lead with the change or the ask.** "Starting Monday, all PRs need a self-review checklist" beats a windup.
- **Be unambiguous about what, who, and by when.** Vague team emails create clarification loops.
- **Crisp, not cold.** Direct is fine; contempt is not.

For **formal HR documents** — warnings, PIPs, behavior contracts, termination notices — this is the
wrong tool. Those need their own careful, compliance-aware process.

---

## Self-check before outputting

- [ ] Loaded the voice profile if one exists; otherwise used neutral defaults
- [ ] Sentence-case with real structure (subject, greeting, body, sign-off)
- [ ] Zero em-dashes (unless the profile allows)
- [ ] Subject is specific and scannable
- [ ] The point is the first thing the reader hits
- [ ] No banned AI-tell phrases (scan the list)
- [ ] No emojis, no greeting/sign-off padding
- [ ] For a hard client email: no groveling, no silent scope absorption, no reflexive discount
- [ ] As short as the job allows
- [ ] Output is just the email as a quote block (`>`), no commentary, not a code block

---

## Examples

(Names below are placeholders — a profile or the user's real name replaces them.)

**Client — slipped timeline**

```
> Subject: Phase 1 booking flow, revised delivery
>
> Hi Alex,
>
> The booking flow is going to land Tuesday, not Friday. The integration with the property API took an extra round to get right, and I'd rather ship it solid than rush a flaky version into your demo.
>
> Everything else for Phase 1 is on track. I'll have a working build in staging Monday so you can look before the handoff.
>
> Best,
> [Your Name]
```

**Client — out-of-scope request**

```
> Subject: Re: Adding the analytics dashboard
>
> Hi Sam,
>
> Happy to build the analytics dashboard. It's outside the Phase 1 scope we agreed, so I'd slot it as a small Phase 2 (roughly a week, I'll send a fixed number tomorrow).
>
> That keeps the current timeline intact and gives the dashboard the room it needs. Want me to spec it out?
>
> Best,
> [Your Name]
```

**Team — directive**

```
> Subject: New: self-review before every PR
>
> Hi team,
>
> Starting Monday, every PR gets a self-review before it comes to me: run it, check the edge cases, leave review comments on your own diff where you made a judgment call.
>
> This is to cut the back-and-forth that's slowing merges down. If anything's unclear about what a good self-review looks like, ask me this week.
>
> [Your Name]
```

---
name: escalate-to-operator
description: Use this INSTEAD of /interview-me whenever you are running unattended — a `claude --bg` background CLI session, or a subagent dispatched via the Agent tool — and you hit a genuine, consequential judgment call you're not confident deciding alone. /interview-me renders an interactive multiple-choice picker that needs a live terminal and real keystrokes; a headless session has no one there to answer it, so it hangs forever ("waiting: input needed") instead of failing loudly. This skill writes the question, the real options, and your recommended default into your own final output and then stops, so whoever dispatched you (a human, or an orchestrating Claude session) sees it the moment your run ends and can resume you with an answer. Same bar as /interview-me: only for calls that would actually change the outcome if guessed wrong (pricing, scope, brand/naming, anything the dispatch explicitly flagged as needing sign-off) — not routine implementation details you can just decide yourself.
---

# Escalate to operator

## Why this exists

An agent was told "use /interview-me if you're unsure" while running as a detached `claude --bg` background session. It correctly hit a real judgment call and tried to ask — but `/interview-me` asks via an interactive picker (AskUserQuestion), which needs a live terminal. Nobody was there. The session sat blocked indefinitely, showing `"status": "waiting", "waitingFor": "input needed"` in `claude agents --json`, invisible to everyone until someone thought to go poll for it. Resuming with a plain text reply didn't even work — the picker only accepts real keystroke input, not a chat message.

The fix isn't to try harder to answer the picker. It's to never open one when no one's watching. Escalate by **finishing your turn with the question written down**, not by waiting for one.

## When to use this vs. deciding yourself

Same threshold as `/interview-me`: escalate only when a wrong guess would waste real work or lock in the wrong outcome — a pricing number, which of several architectures to commit to, a brand/naming choice that ships externally, anything your dispatch instructions explicitly called out as needing sign-off. For everything else — file structure, which library function to call, how to phrase a comment — just decide and keep moving. Escalating too often is as costly as guessing wrong: it defeats the point of dispatching you to work unattended.

## How to escalate

Do not call `/interview-me`, `AskUserQuestion`, or any other tool that opens an interactive prompt. Instead, write a clearly marked block into your **final response** (the text you output right before ending your turn — do not queue more tool calls after it) and then stop:

```
## ESCALATION — needs a decision before I continue

**Question:** <the actual decision, framed as a real question>

**Options:**
1. <option> — <what it trades off>
2. <option> — <what it trades off>

**My recommendation:** <option N>, because <reason>.

**Everything else I did while waiting:** <list any other progress you made on parts of the task that don't depend on this answer — don't sit idle on the whole task just because one piece is blocked>
```

Then end your turn. Don't keep working past this point on anything that depends on the answer — but if there's independent work left in the task that doesn't depend on the escalated decision, do that first and mention it in the block above, rather than escalating at the first sign of uncertainty and stopping dead.

## What happens after you escalate

- **If you're a `claude --bg` session:** ending your turn without a pending tool call leaves the session idle, not stuck — whoever dispatched you (or is periodically checking `claude agents --json`) will see your report the next time they look, or when a wrapping process notices the job going idle. They'll read your escalation block, decide (either themselves or by asking the actual human), and resume you with `claude --resume <your-session-id> --bg "<the answer>"` — a plain text follow-up works fine for this, unlike answering the picker, because it's a normal new conversational turn, not resolving a stuck tool call.
- **If you're an Agent-tool subagent:** your final text return already IS what the orchestrating session reads. Ending your turn with the escalation block means the orchestrator sees it as your result, decides or relays it to the human, and resumes you via `SendMessage` with the answer.

Either way, you don't need to build any of that yourself — just write the block clearly and stop. The mechanism that gets you an answer is the dispatcher's job, not yours.

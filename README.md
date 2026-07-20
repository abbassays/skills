# abbassays / claude-skills

Skills I've built for [Claude Code](https://claude.ai/code). This is my personal skills library — not a template.

If you find something useful, clone the skill directory you want and drop it into your own `~/.claude/skills/` folder.

---

## Skills by category

### Development & delivery

| Skill | Description |
|---|---|
| [ship-it](ship-it/SKILL.md) | Portable, any-codebase end-to-end delivery workflow — takes any task to a merge-ready PR. Auto-detects whether the repo has a code-review system and a rulebook, loudly flags either if missing, and offers to bootstrap one. Zero hardcoded repo paths, commands, or MCP slugs. |
| [dev-manager](dev-manager/SKILL.md) | Runs several features in parallel inside **one** repo without the agents colliding. Clusters the work by real code dependency (shared files, migrations, types, API contracts), isolates each independent stream in its own git worktree and branch, and launches them together instead of one after another. Confirms per stream whether it needs a UI prototype, full review iterations, and an e2e run; briefs each agent with complete context (sources, not summaries) so it can't invent APIs or schemas; escalates an agent's genuine unknowns to you as hard stops; then verifies the gates actually ran by checking the artifacts rather than trusting the agent's report. Delegates the per-stream delivery to the repo's own skill (ship-it, execute-plan, …). |
| [deploy-and-merge](deploy-and-merge/SKILL.md) | Ships a PR to production in the right order for a Next.js + Supabase + Trigger.dev + Vercel stack: Supabase migrations → Trigger.dev redeploy → merge into main (schema must be live before Vercel auto-deploys on merge). Each step runs only if that PR actually touches it. Vercel/preview checks are never blockers. Stops loudly on failure and never auto-rolls-back a prod migration. Opt-in sync step fast-forwards local `main` without checking it out. |
| [create-linear-ticket](create-linear-ticket/SKILL.md) | Creates a Linear ticket that's actually scheduled — **never a Backlog ghost**. Detects the project's Linear MCP, picks the cycle by measuring the current cycle's remaining load (Up Next if it fits this cycle, Todo if it goes to the next), infers assignee/labels/project/due date/estimate, and sets a billing-month label only where one exists and only for work already started. Creates directly (no preview or confirmation gate), then reports the ID, URL, and fields it set. ship-it delegates to it. |
| [automated-pr-review](automated-pr-review/SKILL.md) | Claude-powered PR review system — three-job GitHub Actions workflow (automated review, pre-merge PM report, on-demand agent) with project-aware context via product-knowledge and coding-standards docs. |
| [e2e-feature-test](e2e-feature-test/SKILL.md) | Proves a feature actually works by driving it end-to-end in a real browser (chrome-devtools MCP) — logs in as the project's test account, clicks through the flows, fails on console errors and failed requests, verifies DB side-effects when a database MCP is connected, and posts screenshots + a step-by-step report to the PR. Runtime-detects the dev command, port, login route, and database. |
| [screenshot-to-code](screenshot-to-code/SKILL.md) | Converts UI screenshots into working HTML/CSS/React/Vue — detects design patterns and components and generates responsive layouts. Use when you drop in a screenshot of a site, app, or design and want the code. |
| [ui-prototype-first](ui-prototype-first/SKILL.md) | A visual sign-off gate — builds a self-contained static HTML prototype (with BEFORE/AFTER callouts) and opens it in the browser before any React/TSX is written, hard-blocking component edits until you approve the design. Built on the project's real theme tokens so the conversion matches. |
| [build-from-prototype](build-from-prototype/SKILL.md) | Converts an approved HTML prototype into matching React/Next.js + shadcn UI, treating the prototype as a hard guard. Reuse-first (reuse/refactor existing components before composing primitives; new is last resort) and runs a render → screenshot → compare → fix loop so the UI doesn't drift from the design. |
| [codebase-audit](codebase-audit/SKILL.md) | Deep, evidence-grounded health audit of a Next.js + Supabase project — fans out one sub-agent per axis (architecture, data access, RLS/security, types, tests, error/observability, performance, jobs, deps, domain correctness…), grounded in real file:line evidence and live MCP data where connected, then synthesizes a prioritized, bucketed remediation backlog plus forward guardrails. Everything repo-specific is detected at runtime. Report-first; filing tickets is a separate step. |
| [dev-codebase-audit](dev-codebase-audit/SKILL.md) | Multi-repo, evidence-grounded audit of a single developer's recent work — produces a meeting-ready agenda, a full per-repo audit, and a multi-axis ratings card (10 axes, 1–5 scale, evidence-cited). Spawns parallel per-repo subagents and synthesizes their findings into cross-cutting patterns and systemdesign.io recommendations. |
| [jsdoc-typescript-docs](jsdoc-typescript-docs/SKILL.md) | Documents TypeScript code with JSDoc comments and generates API documentation (TypeDoc-style). Use for "JSDoc", "code documentation", "API docs", or "inline documentation" requests. |
| [vibe-estimate](vibe-estimate/SKILL.md) | Produces a tight hourly estimate for a coding task calibrated to an AI-augmented workflow — outputs an `Elapsed · billable` range plus the 2–4 dependencies that move it, no planning essay. |

### Understanding & visualization

| Skill | Description |
|---|---|
| [plain-english](plain-english/SKILL.md) | Explains something technical the way a sharp colleague would, out loud: one blunt sentence, then a short story with real examples. **No tables, no section headers, no jargon, no code tour** — data and flow, spoken. Reads the real code first so it's grounded, owns its own mistakes plainly, and lands the one decision you need to make. Works for codebase questions and general technical ones (OAuth, queues, vector DBs). |
| [diagram-walkthrough](diagram-walkthrough/skill.md) | Generates a self-contained HTML file with an interactive, clickable Mermaid diagram (flowchart or ER) that explains how a codebase feature, flow, architecture, or schema works — a visual mental model readable in under 2 minutes. |
| [excalidraw-diagram-generator](excalidraw-diagram-generator/SKILL.md) | Generates Excalidraw diagrams from natural-language descriptions — flowcharts, relationship diagrams, mind maps, and system architectures — outputting `.excalidraw` JSON files that open directly in Excalidraw. |

### Integrations & infrastructure

| Skill | Description |
|---|---|
| [create-linear-bot](create-linear-bot/SKILL.md) | Scaffolds a Linear-to-GitHub Actions agent bridge: Linear comments mentioning `@<bot> <verb>` trigger Claude Code Action via a Cloudflare Worker, with centralised identity config and a rename workflow. |
| [claude-gateway](claude-gateway/SKILL.md) | How to call Claude through the self-hosted gateway at `claude.bitsmiths.dev` — an OpenAI-compatible API wrapping a Claude Code OAuth token so internal tools bill against the Claude Max subscription at zero marginal cost. (Internal Bitsmiths infra; API key redacted.) |
| [setup-vercel-redeploy](setup-vercel-redeploy/SKILL.md) | Scaffolds an on-demand Vercel redeploy trigger (GitHub Actions workflow + `redeploy` script) that forces a build past the free/Hobby plan's author restriction via a tiny dummy commit authored as Claude. Supports single-project and multi-project monorepos. |
| [trigger-cloud-to-selfhost](trigger-cloud-to-selfhost/SKILL.md) | Standalone, project-agnostic protocol for migrating a trigger.dev project off the hosted cloud.trigger.dev plan onto a self-hosted instance (Docker Compose on your own VPS) — task image registry, scheduled-task cutover, repointing the codebase, and cancelling the old subscription. |
| [whatsapp-read](whatsapp-read/SKILL.md) | Read your WhatsApp chats from Claude, **read-only and on-demand**: starts the local [whatsapp-mcp](https://github.com/lharries/whatsapp-mcp) Go bridge, waits until messages finish syncing into the local SQLite store, kills the bridge, then answers from the DB — so the WhatsApp connection lives only for seconds per question and nothing can ever send. First run walks through a consent-gated setup that patches the bridge's API to localhost-only (upstream binds all interfaces, unauthenticated) and updates whatsmeow past the "Client outdated (405)" error. Everything stays on your machine. |

### Claude Code & workflow

| Skill | Description |
|---|---|
| [interview-me](interview-me/SKILL.md) | Extracts what you actually want via batched multiple-choice interviewing (2–4 questions per round) until ~95% confident about intent — used before any plan or code when an ask is underspecified. |
| [tldr](tldr/SKILL.md) | Compresses a wall of text into a ~15-second structured summary, on a fixed spine: Bottom line → (middle, adapts to the message type) → What you need to do → Watch out. Summarizes the last message by default, or the whole session on request. Compresses only — never adds new information. |
| [one-liner-reply](one-liner-reply/SKILL.md) | Produces concise, executive-style summaries instead of verbose reasoning — use when you want the key takeaway from a long response. |
| [find-skills](find-skills/SKILL.md) | Helps discover and install agent skills when you ask "how do I do X", "find a skill for X", or want to extend Claude's capabilities. |
| [setup-claude-sounds](setup-claude-sounds/SKILL.md) | Wires custom per-event sound pools to Claude Code lifecycle hooks on macOS — personalised audio for SessionStart, Stop, Notification, and more, with headphone-friendly volume cap. |

### Communication

| Skill | Description |
|---|---|
| [human-email](human-email/SKILL.md) | Drafts client/team emails that read like a sharp human wrote them, not an AI — professional structure, no fluff, and a banned-AI-tells list. Works with neutral defaults out of the box, and reads an optional personal voice profile (`~/.config/human-email/voice.md`) so it sounds like you. Print-only. |

---

## How to use a skill

```bash
# Clone just the skill you want (no need to clone the whole repo)
git clone --depth 1 --filter=blob:none --sparse https://github.com/abbassays/skills
cd skills
git sparse-checkout set <skill-name>

# Move it into your Claude skills directory
cp -r <skill-name> ~/.claude/skills/
```

Or clone the whole repo if you want everything:

```bash
git clone https://github.com/abbassays/skills ~/.claude/skills
```

---

## Structure

```
skills/
├── automated-pr-review/
│   └── SKILL.md
├── build-from-prototype/
│   └── SKILL.md
├── claude-gateway/
│   └── SKILL.md
├── codebase-audit/
│   ├── SKILL.md
│   └── scripts/
├── create-linear-bot/
│   └── SKILL.md
├── create-linear-ticket/
│   └── SKILL.md
├── dev-codebase-audit/
│   ├── SKILL.md
│   └── references/
│       ├── pre-flight-questions.md
│       ├── per-repo-agent-prompt.md
│       ├── rating-rubric.md
│       ├── synthesis-prompt.md
│       └── output-templates/
│           ├── meeting-agenda.md
│           ├── full-audit.md
│           └── ratings-card.md
├── deploy-and-merge/
│   └── SKILL.md
├── diagram-walkthrough/
│   ├── skill.md
│   └── references/
├── e2e-feature-test/
│   └── SKILL.md
├── excalidraw-diagram-generator/
│   ├── SKILL.md
│   ├── references/
│   ├── scripts/
│   └── templates/
├── find-skills/
│   └── SKILL.md
├── human-email/
│   └── SKILL.md
├── interview-me/
│   └── SKILL.md
├── jsdoc-typescript-docs/
│   └── SKILL.md
├── one-liner-reply/
│   └── SKILL.md
├── plain-english/
│   └── SKILL.md
├── screenshot-to-code/
│   └── SKILL.md
├── setup-claude-sounds/
│   └── SKILL.md
├── setup-vercel-redeploy/
│   ├── SKILL.md
│   └── templates/
├── ship-it/
│   └── SKILL.md
├── tldr/
│   └── SKILL.md
├── trigger-cloud-to-selfhost/
│   └── SKILL.md
├── ui-prototype-first/
│   └── SKILL.md
├── vibe-estimate/
│   └── SKILL.md
├── whatsapp-read/
│   ├── SKILL.md
│   └── scripts/
│       └── sync.sh
└── README.md
```

---


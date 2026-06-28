# abbassays / claude-skills

Skills I've built for [Claude Code](https://claude.ai/code). This is my personal skills library — not a template.

If you find something useful, clone the skill directory you want and drop it into your own `~/.claude/skills/` folder.

---

## Skills by category

### Development & delivery

| Skill | Description |
|---|---|
| [ship-it](ship-it/SKILL.md) | Portable, any-codebase end-to-end delivery workflow — takes any task to a merge-ready PR. Auto-detects whether the repo has a code-review system and a rulebook, loudly flags either if missing, and offers to bootstrap one. Zero hardcoded repo paths, commands, or MCP slugs. |
| [automated-pr-review](automated-pr-review/SKILL.md) | Claude-powered PR review system — three-job GitHub Actions workflow (automated review, pre-merge PM report, on-demand agent) with project-aware context via product-knowledge and coding-standards docs. |
| [ui-prototype-first](ui-prototype-first/SKILL.md) | A visual sign-off gate — builds a self-contained static HTML prototype (with BEFORE/AFTER callouts) and opens it in the browser before any React/TSX is written, hard-blocking component edits until you approve the design. |
| [dev-codebase-audit](dev-codebase-audit/SKILL.md) | Multi-repo, evidence-grounded audit of a single developer's recent work — produces a meeting-ready agenda, a full per-repo audit, and a multi-axis ratings card (10 axes, 1–5 scale, evidence-cited). Spawns parallel per-repo subagents and synthesizes their findings into cross-cutting patterns and systemdesign.io recommendations. |
| [jsdoc-typescript-docs](jsdoc-typescript-docs/SKILL.md) | Documents TypeScript code with JSDoc comments and generates API documentation (TypeDoc-style). Use for "JSDoc", "code documentation", "API docs", or "inline documentation" requests. |
| [vibe-estimate](vibe-estimate/SKILL.md) | Produces a tight hourly estimate for a coding task calibrated to an AI-augmented workflow — outputs an `Elapsed · billable` range plus the 2–4 dependencies that move it, no planning essay. |

### Diagrams & visualization

| Skill | Description |
|---|---|
| [diagram-walkthrough](diagram-walkthrough/skill.md) | Generates a self-contained HTML file with an interactive, clickable Mermaid diagram (flowchart or ER) that explains how a codebase feature, flow, architecture, or schema works — a visual mental model readable in under 2 minutes. |
| [excalidraw-diagram-generator](excalidraw-diagram-generator/SKILL.md) | Generates Excalidraw diagrams from natural-language descriptions — flowcharts, relationship diagrams, mind maps, and system architectures — outputting `.excalidraw` JSON files that open directly in Excalidraw. |

### Integrations & infrastructure

| Skill | Description |
|---|---|
| [create-linear-bot](create-linear-bot/SKILL.md) | Scaffolds a Linear-to-GitHub Actions agent bridge: Linear comments mentioning `@<bot> <verb>` trigger Claude Code Action via a Cloudflare Worker, with centralised identity config and a rename workflow. |
| [claude-gateway](claude-gateway/SKILL.md) | How to call Claude through the self-hosted gateway at `claude.bitsmiths.dev` — an OpenAI-compatible API wrapping a Claude Code OAuth token so internal tools bill against the Claude Max subscription at zero marginal cost. (Internal Bitsmiths infra; API key redacted.) |
| [setup-vercel-redeploy](setup-vercel-redeploy/SKILL.md) | Scaffolds an on-demand Vercel redeploy trigger (GitHub Actions workflow + `redeploy` script) that forces a build past the free/Hobby plan's author restriction via a tiny dummy commit authored as Claude. Supports single-project and multi-project monorepos. |
| [trigger-cloud-to-selfhost](trigger-cloud-to-selfhost/SKILL.md) | Standalone, project-agnostic protocol for migrating a trigger.dev project off the hosted cloud.trigger.dev plan onto a self-hosted instance (Docker Compose on your own VPS) — task image registry, scheduled-task cutover, repointing the codebase, and cancelling the old subscription. |

### Claude Code & workflow

| Skill | Description |
|---|---|
| [interview-me](interview-me/SKILL.md) | Extracts what you actually want via batched multiple-choice interviewing (2–4 questions per round) until ~95% confident about intent — used before any plan or code when an ask is underspecified. |
| [find-skills](find-skills/SKILL.md) | Helps discover and install agent skills when you ask "how do I do X", "find a skill for X", or want to extend Claude's capabilities. |
| [setup-claude-sounds](setup-claude-sounds/SKILL.md) | Wires custom per-event sound pools to Claude Code lifecycle hooks on macOS — personalised audio for SessionStart, Stop, Notification, and more, with headphone-friendly volume cap. |

---

## How to use a skill

```bash
# Clone just the skill you want (no need to clone the whole repo)
git clone --depth 1 --filter=blob:none --sparse https://github.com/abbassays/claude-skills
cd claude-skills
git sparse-checkout set <skill-name>

# Move it into your Claude skills directory
cp -r <skill-name> ~/.claude/skills/
```

Or clone the whole repo if you want everything:

```bash
git clone https://github.com/abbassays/claude-skills ~/.claude/skills
```

---

## Structure

```
skills/
├── automated-pr-review/
│   └── SKILL.md
├── claude-gateway/
│   └── SKILL.md
├── create-linear-bot/
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
├── diagram-walkthrough/
│   ├── skill.md
│   └── references/
├── excalidraw-diagram-generator/
│   ├── SKILL.md
│   ├── references/
│   ├── scripts/
│   └── templates/
├── find-skills/
│   └── SKILL.md
├── interview-me/
│   └── SKILL.md
├── jsdoc-typescript-docs/
│   └── SKILL.md
├── setup-claude-sounds/
│   └── SKILL.md
├── setup-vercel-redeploy/
│   ├── SKILL.md
│   └── templates/
├── ship-it/
│   └── SKILL.md
├── trigger-cloud-to-selfhost/
│   └── SKILL.md
├── ui-prototype-first/
│   └── SKILL.md
├── vibe-estimate/
│   └── SKILL.md
└── README.md
```

---


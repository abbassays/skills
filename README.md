# abbassays / claude-skills

Skills I've built for [Claude Code](https://claude.ai/code). This is my personal skills library — not a template.

If you find something useful, clone the skill directory you want and drop it into your own `~/.claude/skills/` folder.

---

## Available skills

| Skill | Description |
|---|---|
| [automated-pr-review](automated-pr-review/SKILL.md) | Claude-powered PR review system — three-job GitHub Actions workflow (automated review, pre-merge PM report, on-demand agent) with project-aware context via product-knowledge and coding-standards docs. |
| [create-linear-bot](create-linear-bot/SKILL.md) | Scaffolds a Linear-to-GitHub Actions agent bridge: Linear comments mentioning `@<bot> <verb>` trigger Claude Code Action via a Cloudflare Worker, with centralised identity config and a rename workflow. |
| [dev-codebase-audit](dev-codebase-audit/SKILL.md) | Multi-repo, evidence-grounded audit of a single developer's recent work — produces a meeting-ready agenda, a full per-repo audit, and a multi-axis ratings card (10 axes, 1–5 scale, evidence-cited). Spawns parallel per-repo subagents and synthesizes their findings into cross-cutting patterns and systemdesign.io recommendations. |
| [diagram-walkthrough](diagram-walkthrough/skill.md) | Generates a self-contained HTML file with an interactive, clickable Mermaid diagram (flowchart or ER) that explains how a codebase feature, flow, architecture, or schema works — a visual mental model readable in under 2 minutes. |
| [excalidraw-diagram-generator](excalidraw-diagram-generator/SKILL.md) | Generates Excalidraw diagrams from natural-language descriptions — flowcharts, relationship diagrams, mind maps, and system architectures — outputting `.excalidraw` JSON files that open directly in Excalidraw. |
| [find-skills](find-skills/SKILL.md) | Helps discover and install agent skills when you ask "how do I do X", "find a skill for X", or want to extend Claude's capabilities. |
| [interview-me](interview-me/SKILL.md) | Extracts what you actually want via batched multiple-choice interviewing (2–4 questions per round) until ~95% confident about intent — used before any plan or code when an ask is underspecified. |
| [setup-claude-sounds](setup-claude-sounds/SKILL.md) | Wires custom per-event sound pools to Claude Code lifecycle hooks on macOS — personalised audio for SessionStart, Stop, Notification, and more, with headphone-friendly volume cap. |
| [ship-it](ship-it/SKILL.md) | Portable, any-codebase end-to-end delivery workflow — takes any task to a merge-ready PR. Auto-detects whether the repo has a code-review system and a rulebook, loudly flags either if missing, and offers to bootstrap one. Zero hardcoded repo paths, commands, or MCP slugs. |
| [ui-prototype-first](ui-prototype-first/SKILL.md) | A visual sign-off gate — builds a self-contained static HTML prototype (with BEFORE/AFTER callouts) and opens it in the browser before any React/TSX is written, hard-blocking component edits until you approve the design. |
| [vibe-estimate](vibe-estimate/SKILL.md) | Produces a tight hourly estimate for a coding task calibrated to an AI-augmented workflow — outputs an `Elapsed · billable` range plus the 2–4 dependencies that move it, no planning essay. |

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
├── setup-claude-sounds/
│   └── SKILL.md
├── ship-it/
│   └── SKILL.md
├── ui-prototype-first/
│   └── SKILL.md
├── vibe-estimate/
│   └── SKILL.md
└── README.md
```

---


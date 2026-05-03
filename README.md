# abbassays / claude-skills

Skills I've built for [Claude Code](https://claude.ai/code). This is my personal skills library — not a template.

If you find something useful, clone the skill directory you want and drop it into your own `~/.claude/skills/` folder.

---

## Available skills

| Skill | Description |
|---|---|
| [automated-pr-review](automated-pr-review/SKILL.md) | Claude-powered PR review system — three-job GitHub Actions workflow (automated review, pre-merge PM report, on-demand agent) with project-aware context via product-knowledge and coding-standards docs. |
| [create-bot](create-bot/SKILL.md) | Scaffolds a Linear-to-GitHub Actions agent bridge: Linear comments mentioning `@<bot> <verb>` trigger Claude Code Action via a Cloudflare Worker, with centralised identity config and a rename workflow. |
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
├── create-bot/
│   └── SKILL.md
├── setup-claude-sounds/
│   └── SKILL.md
└── README.md
```

---


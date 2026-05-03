# Claude Skills Repo

This repo is a personal collection of Claude Code skills. Each skill lives in its own directory with a `SKILL.md` file.

## Structure

```
skills/
├── <skill-name>/
│   └── SKILL.md          # skill definition (name, description, instructions)
├── secret/               # gitignored — private skills, never committed
├── CLAUDE.md             # this file
├── README.md             # public index — always kept in sync
└── .gitignore
```

## README maintenance rule

**Update `README.md` before every commit.** Specifically:

- Added a new skill → add a row to the Skills table in README.md
- Changed a skill's name or description → update its row
- Deleted a skill → remove its row
- Changed the repo structure → update the Structure section

The README is the public face of this repo. Keep it accurate.

## Secret skills

Put private or sensitive skills in `secret/`. That directory is gitignored and will never be committed or pushed.

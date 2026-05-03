---
name: setup-claude-sounds
description: Set up custom sound effects on Claude Code lifecycle events (SessionStart, Stop, Notification, SubagentStop, StopFailure, PermissionRequest, UserPromptSubmit) on macOS. Wires afplay hooks with random per-event sound pools, splits Stop into small/big by turn duration, debounces rapid double-fires, deny-by-default notification filter with logging, headphone-friendly volume cap via settings.json env. Sound suggestions are personalized to the user's tastes via a discovery step before any files are downloaded. TRIGGER when user asks to add custom audio notifications to Claude, replace boring stop/notification sounds, configure Claude Code sound effects, or wire fun audio to Claude events.
---

# Custom Sound Effects for Claude Code

Wire random per-event sound pools to Claude Code's lifecycle hooks on macOS. The mechanics are fixed; the *content* is 100% personalized to whatever the user is into.

## How this works (high level)

7 events → 6 sound pools → `afplay` plays a random pick from the matching pool every time the event fires. The pool contents are filled with the user's own audio files.

```
~/.claude/sounds/
├── _guard.sh                    # always passes through (no env gating)
├── play-random.sh               # generic pool player + per-pool debounce
├── record-turn-start.sh         # UserPromptSubmit: stamp turn-start time
├── stop-router.sh               # Stop: route to stop_small or stop_big
├── notification-filter.sh       # Notification: deny-by-default, logs to /tmp/claude-notif.log
├── session_start/  *.mp3
├── stop_small/     *.mp3        # short turns (<3min)
├── stop_big/       *.mp3        # long turns (≥3min) — full songs OK here
├── notification/   *.mp3        # only "real" attention events
├── subagent_stop/  *.mp3
└── error/          *.mp3
```

## Step 0 — Discover the user's taste FIRST

**CRITICAL: do not write any files, create folders, or touch settings yet.** Start with a conversation. The whole point of this skill is that the sounds are *theirs*, not generic.

Ask the user (verbatim or close to it):

> Before I set this up, what kinds of sounds do you want playing? Tell me what you're into — favorite sports, TV shows or movies, games, memes, music, anything. Be as specific as you want. A few examples:
> - **Sports**: F1, soccer, basketball, NFL, MMA, tennis, wrestling…
> - **TV/movies**: specific shows/franchises (Breaking Bad, Star Wars, anime titles, Spongebob, Family Guy…)
> - **Games**: Mario, Zelda, Valorant, CS, Fortnite, retro arcade…
> - **Memes**: vine compilations, TikTok, classic internet memes, gen-z slang
> - **Music**: specific artists or genres (Drake, ABBA, K-pop, lo-fi, EDM drops…)
> - **Other vibes**: corporate cringe, retro tech, ASMR-clean, satisfying

Wait for their answer. **Don't suggest anything yet.** If they're vague ("just memes"), ask one follow-up to narrow it down. If they list >5 things, that's fine — pick the strongest 3–4 to anchor suggestions around.

## Step 1 — Generate personalized per-pool suggestions

Based ONLY on what they actually listed, propose concrete sounds for each pool. Use your knowledge of the media they named to find the iconic sounds inside that universe.

### Pool design rules (these are hard constraints, not suggestions)

| Pool | Fires | Length sweet spot | Vibe |
|---|---|---|---|
| `session_start` | Once per CLI boot / `/clear` / `/resume` | 1–6s | Boot-up, anthemic, "let's go" |
| `stop_small` | End of every short turn (<3 min) | **≤2s STRICT** | Quick satisfying acks |
| `stop_big` | End of long turns (≥3 min) | 2s to full song | Earned celebrations |
| `notification` | When Claude needs attention | 1–5s, **LOUD** | Attention-grabbers |
| `subagent_stop` | Subagent finishes (multiple per turn) | **≤1s** | Tiny rhythmic ticks |
| `error` | Turn errored out | 1–4s | Sad, dramatic, deflating |

### How to suggest

Build a markdown section per pool with 3–6 specific suggestions drawn from the user's stated interests. Each suggestion: **what it is**, **the source/show/game**, and a **search term** they can paste into myinstants.com.

The point is to do the creative mapping for them. Examples of the kind of mapping you should be doing:

- User says "F1" → session_start gets the 5-red-lights tone, "lights out and away we go"; notification gets team-radio iconic lines ("ring ding ding", "leave me alone I know what I'm doing"); stop_big gets podium music; error gets RIP-Latifi-style commentator memes.
- User says "Breaking Bad" → session_start gets the title-card sting; stop_small gets "yeah Mr. White"; notification gets "say my name" or "I am the one who knocks"; error gets "we're done" or the chime from the deathbed scene.
- User says "Spongebob" → session_start gets "are you ready kids?"; stop_small gets "OK!"; stop_big gets the campfire song; notification gets the foghorn; error gets the sad fail trombone.
- User says "Drake" → stop_small gets "huh?", "yuh"; stop_big gets "started from the bottom" intro; notification gets "OI"; error gets "sometimes shit just don't make sense".
- User says "vine" → stop_small gets vine boom, "what the fuck Richard"; notification gets "AND THEY WERE ROOMMATES"; error gets "we're going to the cracker barrel".
- User says "anime" / specific anime → session_start gets the OP intro hook; notification gets a transformation/attack-name shout; error gets "nani?!"

Be specific. Don't say "a Mario sound" — say "Mario coin (myinstants: 'mario coin')".

### Format the suggestions like this

```markdown
### session_start (boot, 1–6s)
- **<Sound name>** — *<source>* · search: "<myinstants term>"
- **<Sound name>** — *<source>* · search: "<myinstants term>"
- ...

### stop_small (every short turn, ≤2s)
- **<Sound name>** — ...
```

End with a note that they can mix-and-match across categories — these are starting points, not rules.

## Step 2 — Direct user to gather audio

After the suggestions, tell them:

> Go to **myinstants.com** (best for memes/quotes/short clips — every page has a download button). For game/movie soundtracks or longer clips, **101soundboards.com**, **freesound.org**, or **yt-dlp** from YouTube also work.
>
> You don't have to use my exact suggestions — pick whatever fires for you in each category.
>
> Drop everything into `~/Downloads/` then come back and say "ready" or "go".

## Step 3 — When user is ready, list and categorize

List the files with durations:

```bash
cd ~/Downloads && for f in *.mp3 *.wav *.m4a; do
  [ -f "$f" ] || continue
  dur=$(afinfo "$f" 2>/dev/null | awk -F': ' '/estimated duration/ {printf "%.1fs", $2}')
  printf "%-65s  %s\n" "$f" "$dur"
done
```

Build a proposed-categorization table mapping each file → pool, using the length rules. Flag:

- Files >5s being placed in `stop_small`/`subagent_stop`/`notification` (length violation — recommend `stop_big` or skip)
- Files >15s anywhere except `stop_big` (full songs only fit there)
- Files that look personal (dated voice memos like `WhatsApp Audio 2025-...`, `Recording_*.m4a`) — exclude entirely
- Duplicate `(1).mp3` filenames — pick one, mention you skipped the dup

**Show the table to the user and wait for confirmation before moving any files.** Use `cp`, not `mv`, so originals stay safe in Downloads.

## Step 4 — Build the structure and write scripts

```bash
mkdir -p ~/.claude/sounds/{session_start,stop_small,stop_big,notification,subagent_stop,error}
```

Write all five scripts into `~/.claude/sounds/` verbatim, then `chmod +x ~/.claude/sounds/*.sh`.

### `_guard.sh`

```bash
#!/usr/bin/env bash
# Always allow sounds to play — no environment gating.
exit 0
```

> **Note:** If you ever want to suppress sounds when Cursor's background AI agent runs Claude (not in the interactive terminal), replace this script with the process-tree guard described in the Troubleshooting section.

### `play-random.sh`

```bash
#!/usr/bin/env bash
# Picks a random sound from a pool folder and plays it loud via afplay.
# Usage: play-random.sh <pool-folder-name>

cat >/dev/null 2>&1 || true   # drain stdin so callers don't get SIGPIPE
"$HOME/.claude/sounds/_guard.sh" || exit 0

pool="${1:-}"
[ -z "$pool" ] && exit 0
dir="$HOME/.claude/sounds/$pool"
[ -d "$dir" ] || exit 0

files=$(find "$dir" -maxdepth 1 -type f \( -iname '*.mp3' -o -iname '*.wav' -o -iname '*.aiff' -o -iname '*.aif' -o -iname '*.m4a' -o -iname '*.caf' -o -iname '*.flac' \) 2>/dev/null)
[ -z "$files" ] && exit 0

count=$(printf '%s\n' "$files" | wc -l | tr -d ' ')
[ "$count" -eq 0 ] && exit 0

# Debounce: skip if same pool fired within DEBOUNCE seconds. Catches the case
# where the harness fires SessionStart twice (startup + resume) on a single boot,
# and any other rapid-fire double-tap from any hook source.
DEBOUNCE="${CLAUDE_SOUNDS_DEBOUNCE:-3}"
lock="/tmp/claude-sound-last-$pool"
now=$(date +%s)
if [ -f "$lock" ]; then
  last=$(cat "$lock" 2>/dev/null || echo 0)
  if [ -n "$last" ] && [ "$last" -gt 0 ] 2>/dev/null; then
    elapsed=$((now - last))
    [ "$elapsed" -lt "$DEBOUNCE" ] && exit 0
  fi
fi
echo "$now" > "$lock" 2>/dev/null || true

idx=$(( (RANDOM % count) + 1 ))
pick=$(printf '%s\n' "$files" | sed -n "${idx}p")
[ -z "$pick" ] && exit 0

# Volume: CLAUDE_SOUNDS_VOLUME must be set in settings.json's "env" block — hooks
# do NOT inherit ~/.zshrc exports. Default 0.5 = half system volume (headphones).
vol="${CLAUDE_SOUNDS_VOLUME:-0.5}"
afplay -v "$vol" "$pick" >/dev/null 2>&1 &   # async so hook returns fast
disown 2>/dev/null || true
exit 0
```

### `record-turn-start.sh`

```bash
#!/usr/bin/env bash
# UserPromptSubmit hook: stamp turn-start time, keyed by session_id.
"$HOME/.claude/sounds/_guard.sh" || exit 0
input=$(cat 2>/dev/null || true)
sid=$(printf '%s' "$input" | sed -n 's/.*"session_id":"\([^"]*\)".*/\1/p')
[ -z "$sid" ] && sid="default"
date +%s > "/tmp/claude-turn-start-$sid" 2>/dev/null || true
exit 0
```

### `stop-router.sh`

```bash
#!/usr/bin/env bash
# Stop hook: route to stop_small or stop_big by elapsed turn time.
# Default threshold = 180s (3 min). Adjust if user wants a different cutoff.
"$HOME/.claude/sounds/_guard.sh" || exit 0
THRESHOLD=180

input=$(cat 2>/dev/null || true)
sid=$(printf '%s' "$input" | sed -n 's/.*"session_id":"\([^"]*\)".*/\1/p')
[ -z "$sid" ] && sid="default"

ts_file="/tmp/claude-turn-start-$sid"
pool="stop_small"
if [ -f "$ts_file" ]; then
  start=$(cat "$ts_file" 2>/dev/null || echo 0)
  now=$(date +%s)
  if [ -n "$start" ] && [ "$start" -gt 0 ] 2>/dev/null; then
    elapsed=$((now - start))
    [ "$elapsed" -ge "$THRESHOLD" ] && pool="stop_big"
  fi
  rm -f "$ts_file"
fi
echo '' | "$HOME/.claude/sounds/play-random.sh" "$pool"
exit 0
```

### `notification-filter.sh`

Deny-by-default. PermissionRequest already covers permission prompts, so suppressing every Notification message kills the random-during-work pings without losing anything. Each incoming message is logged to `/tmp/claude-notif.log` so you can inspect what fires and selectively whitelist later.

```bash
#!/usr/bin/env bash
# Notification hook: deny-by-default. PermissionRequest covers permission prompts,
# so by default we suppress every Notification — most fire during work as toasts.
# All messages are logged to /tmp/claude-notif.log for inspection.
"$HOME/.claude/sounds/_guard.sh" || exit 0
input=$(cat 2>/dev/null || true)
msg=$(printf '%s' "$input" | sed -n 's/.*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
printf '%s | %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "${msg:-<no message>}" \
  >> /tmp/claude-notif.log 2>/dev/null || true
case "$msg" in
  # Whitelist anything you DO want a sound for, e.g.:
  # *"long-running"*) exec "$HOME/.claude/sounds/play-random.sh" notification ;;
  *) exit 0 ;;
esac
```

## Step 5 — Move audio into pools

Once the user has confirmed the categorization table, `cp` each file into the right pool folder. Don't `mv` — keep originals in Downloads until they've heard everything play correctly.

## Step 6 — Wire hooks in settings.json

**READ FIRST** — preserve existing hooks/settings, never overwrite blindly. Default scope is `~/.claude/settings.json` (global). For project-only setups, use `.claude/settings.local.json` and add it to `.gitignore`.

**IMPORTANT — env propagation**: Hook scripts run as subprocesses spawned by Claude Code, NOT by the user's interactive shell. Exports in `~/.zshrc` / `~/.bash_profile` will NOT be visible to the hooks. Volume (and any other tunable) must live in `settings.json`'s top-level `"env"` block:

```json
{
  "env": {
    "CLAUDE_SOUNDS_VOLUME": "0.5"
  },
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command", "command": "$HOME/.claude/sounds/play-random.sh session_start"}]}],
    "UserPromptSubmit": [{"hooks": [{"type": "command", "command": "$HOME/.claude/sounds/record-turn-start.sh"}]}],
    "Stop": [{"hooks": [{"type": "command", "command": "$HOME/.claude/sounds/stop-router.sh"}]}],
    "Notification": [{"hooks": [{"type": "command", "command": "$HOME/.claude/sounds/notification-filter.sh"}]}],
    "SubagentStop": [{"hooks": [{"type": "command", "command": "$HOME/.claude/sounds/play-random.sh subagent_stop"}]}],
    "StopFailure": [{"hooks": [{"type": "command", "command": "$HOME/.claude/sounds/play-random.sh error"}]}],
    "PermissionRequest": [{"hooks": [{"type": "command", "command": "$HOME/.claude/sounds/play-random.sh notification"}]}]
  }
}
```

## Step 7 — Verify

```bash
# JSON valid + all 7 hooks present
jq -e '.hooks | to_entries | map({event: .key, command: .value[0].hooks[0].command})' ~/.claude/settings.json

# Pool sizes
for d in ~/.claude/sounds/*/; do
  n=$(find "$d" -maxdepth 1 -type f \( -iname '*.mp3' -o -iname '*.wav' -o -iname '*.m4a' \) | wc -l | tr -d ' ')
  printf "  %-15s  %s file(s)\n" "$(basename "$d")" "$n"
done

# Pipe-test: small turn → stop_small
date +%s > /tmp/claude-turn-start-test
echo '{"session_id":"test"}' | bash ~/.claude/sounds/stop-router.sh

# Pipe-test: big turn (300s old) → stop_big
echo $(( $(date +%s) - 300 )) > /tmp/claude-turn-start-test2
echo '{"session_id":"test2"}' | bash ~/.claude/sounds/stop-router.sh

# Pipe-test: notification filter — every message is logged + suppressed (deny-by-default)
echo '{"message":"Claude is waiting for your input"}'         | bash ~/.claude/sounds/notification-filter.sh
echo '{"message":"Claude needs your permission to use Bash"}' | bash ~/.claude/sounds/notification-filter.sh
echo '{"message":"Some other event"}'                         | bash ~/.claude/sounds/notification-filter.sh
tail -3 /tmp/claude-notif.log   # confirm all three were logged
```

Heads-up the user: the settings watcher only picks up changes to settings.json files that already existed at session start. If hooks don't fire on the next turn, they need to open `/hooks` once or restart Claude Code.

## Common variations

- **Volume control**: set `CLAUDE_SOUNDS_VOLUME` in `~/.claude/settings.json`'s `"env"` block. `0.5` = headphone-friendly (default), `1` = system level, `1.5`–`2` = louder for speakers. **Do not** put it in `~/.zshrc` — hooks don't see shell exports.
- **Debounce window**: same pool can't fire twice within 3s by default (prevents SessionStart double-firing). Override via `CLAUDE_SOUNDS_DEBOUNCE` in the same env block.
- **Different small/big threshold**: edit `THRESHOLD=180` in `stop-router.sh` (60/90/300s all reasonable).
- **Sound on every prompt submit**: add a second hook entry on `UserPromptSubmit` calling `play-random.sh prompt_submit`. Both run independently — silent stamping plus sound.
- **SessionEnd outro**: wire `SessionEnd` event to `play-random.sh session_end` and create the pool. Good home for long outro songs.
- **Disable temporarily**: set `"disableAllHooks": true` in settings.json. Re-enable by removing the flag.
- **Project-only sounds**: use `.claude/settings.local.json` instead of global. Add to `.gitignore`.
- **More tiers**: refactor `stop-router.sh` to map elapsed → `stop_tiny` / `stop_small` / `stop_big` / `stop_huge` if user wants 3+ duration buckets.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No sound on Stop | Settings watcher didn't pick up the new hook | Open `/hooks` once or restart |
| Want to silence sounds under Cursor's AI agent | `_guard.sh` currently always plays | Replace `_guard.sh` with the process-tree guard: walk PPID chain; if `*Cursor*` appears before `*pty-host*`, `exit 1` |
| Stop always picks small even on long turns | Timestamp file missing — `record-turn-start.sh` not firing | Confirm `UserPromptSubmit` hook is wired and `/tmp/claude-turn-start-*` files appear after submitting a prompt |
| Sounds too loud / quiet | `CLAUDE_SOUNDS_VOLUME` not set, or set in `~/.zshrc` (hooks don't inherit it) | Set it in `~/.claude/settings.json` under `"env"`. Default is `0.5`. Use `0.3`–`0.4` for headphones, `1`+ for speakers |
| `CLAUDE_SOUNDS_VOLUME` change ignored | Set in shell profile instead of `settings.json` | Hooks run as Claude Code subprocesses and inherit env from `settings.json` only. Move the var to the top-level `"env"` block |
| Notification rings randomly while Claude is working | Some Notification message slipped past the deny-default (shouldn't happen with current script, but for safety) | Tail `/tmp/claude-notif.log` to see exact message text — every fire is logged there |
| SessionStart sound plays twice on a single boot | Harness fires SessionStart for both `startup` and `resume`/`clear` sources | The 3s debounce in `play-random.sh` should swallow this. Bump `CLAUDE_SOUNDS_DEBOUNCE` higher in `settings.json` env if it still leaks |
| afplay can't play OGG | macOS afplay supports mp3/wav/aiff/m4a/caf/flac, not ogg | Convert: `ffmpeg -i input.ogg output.mp3` |
| Empty pool → silent | User picked nothing for that pool | Acceptable for `subagent_stop` (frequent, noisy events). For others, suggest copying a fitting file from another pool |
| Double sound on permission prompt | Notification hook routed straight to `play-random.sh` instead of the filter | Wire `notification-filter.sh` for Notification — current default is deny-all so PermissionRequest is the sole source of permission sounds |

## What NOT to do

- ❌ Skip Step 0 — generic sounds defeat the purpose
- ❌ Wire sound to `PostToolUse` / `PreToolUse` — fires per tool call, dozens of times per turn
- ❌ Put long sounds (>3s) in `stop_small`, `notification`, or `subagent_stop`
- ❌ Move files into pools before showing the categorization table to the user
- ❌ Use `mv` — `cp` only, until user has heard everything play correctly
- ❌ Hardcode `/Users/<name>/...` in scripts — always use `$HOME` so the setup is portable
- ❌ Pad sound suggestions with generic ideas if user gave specific interests — better to ask one follow-up question than to suggest "airhorn" when they said "anime"

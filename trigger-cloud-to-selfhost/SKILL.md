---
name: trigger-cloud-to-selfhost
description: >-
  Standalone, project-agnostic protocol for MIGRATING a trigger.dev project off
  the hosted cloud.trigger.dev plan onto a self-hosted trigger.dev instance you
  run yourself (Docker Compose on your own VPS). USE THIS SKILL whenever someone
  wants to migrate trigger.dev from cloud to self-hosted, stand up a self-hosted
  trigger.dev stack, move a project/tasks off cloud.trigger.dev, repoint a
  codebase at a self-hosted instance, cut over scheduled tasks, push task images
  to a self-hosted registry, or cancel an old cloud trigger.dev subscription.
  Also trigger for phrases like "migrate trigger", "trigger cloud to self
  hosted", "self-host trigger.dev", "move off cloud.trigger.dev", "repoint
  trigger", "trigger.config self hosted", "self-hosted trigger registry", or
  "cancel cloud trigger". This skill is self-contained — it carries the full
  migration context and depends on no repo-specific docs, so it works in any
  codebase.
---

# trigger.dev Cloud → Self-Hosted Migration

A complete, repo-agnostic playbook for moving a trigger.dev project from the
hosted plan at **cloud.trigger.dev** to a **self-hosted** instance you operate
on your own server. Nothing here assumes a particular app, server, or registry —
substitute your own hostnames where placeholders appear.

> **Placeholders used throughout** (replace with your real values):
> `<TRIGGER_HOST>` = your self-hosted webapp URL, e.g. `https://trigger.example.com`
> `<REGISTRY_HOST>` = your self-hosted Docker registry, e.g. `registry.example.com`
> `<PROJECT_REF>` = the `proj_…` ref shown in your self-hosted dashboard
> `<PROFILE>` = a local CLI profile name you pick, e.g. `myproject`
> `<SERVER>` = SSH alias/host of the box running the stack

---

## The one thing to understand first

**trigger.dev does NOT migrate data between instances.** There is no export/import
of run history or schedules from cloud to self-hosted. "Migration" therefore means:

1. Stand up a fresh self-hosted instance.
2. Repoint your codebase at it.
3. Redeploy your task code (rebuilds the image against the new instance).
4. Recreate any schedules.
5. Verify in production, then cancel the cloud subscription.

Run history on cloud is abandoned, not moved. Plan the cut-over so you **never
cancel cloud until the self-hosted side is proven live.**

```
1. Server stack up & healthy → 2. Codebase repointed (behind a switch) & deployed to BOTH
        ↓                               ↓
3. Schedules recreated → 4. Flip the one-line switch to self-hosted → verify in prod
        ↓                               ↓
   (switch back instantly if anything breaks)  → 5. Cancel cloud sub
```

**The safe way to migrate is behind a switch, not a hard swap.** Deploy your task
code to *both* cloud and self-hosted, wire a single env var that decides which
instance your app talks to, flip it, and watch. If self-hosted misbehaves, flip
back in one line — zero redeploy, zero code change. Only cancel cloud once
self-hosted has run clean in production for a while. See
**"The one-line cut-over switch"** below.

---

## Official documentation (verify against these — they change between versions)

- Self-hosting overview: https://trigger.dev/docs/open-source-self-hosting
- Self-hosting with Docker Compose: https://trigger.dev/docs/self-hosting/docker
- Self-hosting env-var reference (webapp): https://trigger.dev/docs/self-hosting/env/webapp
- GitHub source + compose/install scripts: https://github.com/triggerdotdev/trigger.dev (`/hosting/docker`)
- `trigger.config.ts` reference: https://trigger.dev/docs/config/config-file
- CLI `login` (self-hosted via `--api-url`): https://trigger.dev/docs/cli-login-commands
- CLI `deploy` (incl. self-hosted registry `--self-hosted --push`): https://trigger.dev/docs/cli-deploy-commands

> When this skill and the official docs disagree on **behavior or exact compose
> contents**, trust the docs — the self-hosting stack is versioned and evolves.
> This skill is the durable *process*; the docs are the current *implementation detail*.

---

## Prerequisites

- A Linux VPS you control with **Docker Engine + Docker Compose** installed.
- A domain/subdomain for the webapp (`<TRIGGER_HOST>`) and a reverse proxy
  (Nginx, Caddy, Apache, or Traefik) terminating TLS in front of it.
- **Docker Desktop / Docker running on each developer machine** that will deploy —
  the CLI builds task code into a Docker image locally. Verify with `docker info`.
- A container registry for task images. Either:
  - the trigger.dev–managed registry that ships with the self-hosted stack, or
  - your own registry at `<REGISTRY_HOST>` (e.g. a `registry:2` container behind your proxy).

### Server & OS notes (works on Hetzner, DigitalOcean, AWS, AlmaLinux, etc.)

The stack is **distro-agnostic** — it's all Docker. SSH access is standard
(`ssh root@<SERVER_IP>` or a configured `~/.ssh/config` alias). Only the
host-level commands (package manager, firewall) differ by OS. Pick your column:

| Task | Ubuntu/Debian (Hetzner default, DO) | RHEL family (AlmaLinux/Rocky) |
|---|---|---|
| Install Docker | official convenience script: `curl -fsSL https://get.docker.com \| sh` | `dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo && dnf install docker-ce docker-ce-cli containerd.io docker-compose-plugin` |
| Host firewall | `ufw` | `firewalld` |
| Open web ports | `ufw allow 80,443,22/tcp` | `firewall-cmd --add-service={http,https,ssh} --permanent && firewall-cmd --reload` |
| Reverse proxy | Nginx or Caddy (Caddy auto-TLS is easiest) | Apache or Nginx |

**Hetzner-specific gotchas:**
- **Two firewalls.** Hetzner Cloud has a **panel-level Cloud Firewall** (in the
  console, attached to the server) that is *separate* from the host `ufw`/`firewalld`.
  If `<TRIGGER_HOST>` is unreachable but the container is healthy, check the Hetzner
  Cloud Firewall first — ports 80/443 must be allowed there too.
- **Default image is Ubuntu** unless you picked otherwise → use `apt`/`ufw`, not
  `dnf`/`firewalld`. Caddy is the lowest-friction reverse proxy on a fresh Ubuntu box
  (it gets TLS certs automatically, no certbot dance).
- **IPv6.** Hetzner gives every server an IPv6 address; make sure your DNS `AAAA`
  record (if any) and reverse proxy bind both stacks, or just use the IPv4 `A` record.
- Everything else (compose, secrets, deploy, dashboard) is identical to any other host.

---

## Phase 1 — Stand up the self-hosted stack (one-time, on the server)

This is server-mutating work. If your environment has a change-control or
approval process, follow it; propose each install/firewall/service change before
running it on a production box.

### 1.1 Get the stack
Use the official self-hosting assets (the canonical compose file changes per
version — always pull the current one rather than copying a stale snippet):

```bash
# On <SERVER>
git clone https://github.com/triggerdotdev/trigger.dev.git
cd trigger.dev/hosting/docker
# Follow the current README there for the exact compose + .env template.
```

The stack typically includes: **webapp** (dashboard + API), **postgres**,
**redis**, an **electric** sync service, a **supervisor/worker**, and a
**docker-provider** that launches an isolated container per task run.

### 1.2 Generate secrets and write `.env`
```bash
openssl rand -hex 32   # SESSION_SECRET
openssl rand -hex 16   # MAGIC_LINK_SECRET
openssl rand -hex 16   # ENCRYPTION_KEY
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 32   # internal provider/access token
```
Set `LOGIN_ORIGIN` / `APP_ORIGIN` to `<TRIGGER_HOST>`, fill the Postgres/Redis
connection strings, and add SMTP creds (the webapp emails magic-links for login).
Keep `.env` `chmod 600`, owned by root, outside any web root. See the env-var
reference doc for the full list.

### 1.3 Security hardening that actually matters
- **Docker socket = host root.** The docker-provider needs `/var/run/docker.sock`.
  On a shared/production box, never mount it raw into task containers — front it
  with `tecnativa/docker-socket-proxy` exposing only the endpoints the provider
  needs (containers/images/exec). A compromised task otherwise roots the host.
- **Bind every service port to `127.0.0.1`** and let the reverse proxy be the only
  public surface. Postgres should have **no host port** at all.
- **Watch for port collisions** with anything already on the box. If the host
  already runs Redis/Postgres for other apps, map the trigger.dev ones to
  alternate host ports (e.g. Redis `6380:6379`) so you don't corrupt existing data.
- Use a **non-default Docker subnet** if the default `172.17/172.18` ranges clash
  with existing networks.
- **Docker bypasses your host firewall.** Docker writes its own iptables rules and
  can punch container ports past `ufw`/`firewalld`. Two defenses: (a) bind all host
  ports to `127.0.0.1` (above), and (b) add an explicit drop in the `DOCKER-USER`
  chain so nothing inbound reaches a container except established/related traffic:
  ```bash
  iptables -I DOCKER-USER -i <PUBLIC_IFACE> -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  iptables -I DOCKER-USER -i <PUBLIC_IFACE> -j DROP
  ```
- **Cap log growth** with a `/etc/docker/daemon.json` log-rotation policy so task
  logs don't fill the disk:
  ```json
  { "log-driver": "json-file", "log-opts": { "max-size": "50m", "max-file": "3" } }
  ```

### 1.4 Reverse proxy + TLS (WebSockets required)
trigger.dev streams real-time run updates over **WebSocket** — the proxy MUST pass
`Upgrade`/`Connection` headers, not just plain HTTP. Issue a cert (Let's Encrypt
HTTP-01 is simplest), proxy `<TRIGGER_HOST>` → the webapp's loopback port, raise
proxy timeouts (long-running status streams need ≥300s).

### 1.5 Bring it up and verify
```bash
docker compose up -d
docker compose ps                              # all services healthy/running
docker compose logs -f webapp                  # wait for "server started"; confirm migrations ran
curl -I https://<TRIGGER_HOST>/healthcheck     # expect 200 OK
```
**Gate:** do not move on until `/healthcheck` returns 200 and `docker compose ps`
shows everything healthy.

### 1.6 First login
Open `<TRIGGER_HOST>`, sign in via magic-link (confirms SMTP works), create your
**Organization → Project**, and note the **`<PROJECT_REF>`** (`proj_…`).

---

## Phase 2 — Repoint the codebase (one-time, per project)

### 2.1 Point `trigger.config.ts` at the self-hosted project ref
```ts
import { defineConfig } from '@trigger.dev/sdk';

export default defineConfig({
  project: '<PROJECT_REF>',   // from your self-hosted dashboard
  runtime: 'node',
  dirs: ['./src/trigger'],
  // ...retries, machine, maxDuration as before
});
```
In SDK v3/v4 there is **no `triggerUrl` field** — the API URL is selected by the
CLI login profile and the `TRIGGER_API_URL` env var, not in the config file.

### 2.2 Log the CLI in against the self-hosted API
```bash
npx trigger.dev@latest login --api-url https://<TRIGGER_HOST> --profile <PROFILE>
npx trigger.dev@latest whoami --profile <PROFILE>   # must show <TRIGGER_HOST>, not cloud
```
Pass `--profile <PROFILE>` on every subsequent CLI command so you never
accidentally hit cloud.

### 2.3 Log in to the task-image registry (once per machine)
```bash
echo "$REGISTRY_PASSWORD" | docker login <REGISTRY_HOST> -u <REGISTRY_USER> --password-stdin
```
(Skip if you use the registry bundled with the self-hosted stack and the CLI is
already authenticated to it.)

### 2.4 Set environment variables in the right place
This trips everyone up. There are three distinct locations:

| Location | What goes here | Read by |
|---|---|---|
| Self-hosted **dashboard → Environment Variables** | every secret your **tasks** use (API keys, DB URLs, etc.) | the running task containers |
| App runtime env (where your app calls `tasks.trigger()`) | `TRIGGER_SECRET_KEY` (that env's key), `TRIGGER_API_URL=https://<TRIGGER_HOST>` | your application process |
| Local `.env.local` (dev machine) | dev `TRIGGER_SECRET_KEY`, `TRIGGER_API_URL` | local dev + CLI |

**Tasks read their env from the dashboard, NOT from any `.env` file.** A task
missing an API key is fixed in the dashboard. Copy each environment's
`TRIGGER_SECRET_KEY` from: dashboard → project → the dev/preview/prod environment.

---

## Phase 3 — Deploy task code + recreate schedules (one-time cut-over)

### 3.1 Deploy to production
```bash
npx trigger.dev@latest deploy --profile <PROFILE>
# self-hosted-registry variant if your stack requires it:
# npx trigger.dev@latest deploy --self-hosted --push --registry <REGISTRY_HOST> --profile <PROFILE>
```
This builds your tasks into an image, pushes it to the registry, and registers the
deployment. The supervisor pulls that image and runs tasks when triggered.

### 3.2 Recreate schedules
Schedules do **not** transfer from cloud.
- **Declarative** schedules (defined in task code via `schedules.task({ cron })`)
  recreate themselves on deploy — confirm they appear under dashboard → **Schedules**.
- **Imperative** schedules (created through the API/UI on cloud) must be **re-created
  by hand** on the self-hosted dashboard.

### 3.3 Verify a real run end-to-end
Dashboard → **Tasks** → pick a task → **Test** → run a minimal payload → confirm
**Completed**, and that the run's version matches the deployment you just pushed.

---

## Phase 4 — Routine redeploys (ongoing, after migration)

**Pushing code to git does NOT update running tasks.** Every task-code change needs
a redeploy to rebuild the image:

| Action | Command |
|---|---|
| local live-reload | `npx trigger.dev@latest dev --profile <PROFILE>` |
| deploy to preview | `npx trigger.dev@latest deploy --env preview --profile <PROFILE>` |
| deploy to staging | `npx trigger.dev@latest deploy --env staging --profile <PROFILE>` |
| deploy to production | `npx trigger.dev@latest deploy --profile <PROFILE>` |

| What changed | What to do |
|---|---|
| Env var in the **dashboard** | new runs pick it up automatically — no deploy |
| Code in `src/trigger/` | **must** redeploy |
| Env var in your app's runtime env | only affects the app process that calls `tasks.trigger()` — no task-image impact |

---

## The one-line cut-over switch (recommended)

Make instance selection a **single environment variable** so flipping cloud ↔
self-hosted (and rolling back) is one line, no redeploy, no code change.

### Runtime side (your app calling `tasks.trigger()`)

The trigger.dev SDK picks its target from `TRIGGER_API_URL` + `TRIGGER_SECRET_KEY`.
Keep **both** instances' credentials in your environment and let one switch choose:

```ts
// trigger-target.ts — single source of truth for which instance gets traffic
const TARGET = (process.env.TRIGGER_TARGET ?? 'selfhosted') as 'cloud' | 'selfhosted';

export const TRIGGER = {
  cloud: {
    apiUrl: 'https://api.trigger.dev',
    secretKey: process.env.TRIGGER_CLOUD_SECRET_KEY!,
  },
  selfhosted: {
    apiUrl: process.env.TRIGGER_SELFHOSTED_URL!,        // https://<TRIGGER_HOST>
    secretKey: process.env.TRIGGER_SELFHOSTED_SECRET_KEY!,
  },
}[TARGET];
```

Then, at app startup, export the chosen pair as the env vars the SDK reads
(or configure the SDK directly with `TRIGGER.apiUrl` / `TRIGGER.secretKey`):

```ts
process.env.TRIGGER_API_URL = TRIGGER.apiUrl;
process.env.TRIGGER_SECRET_KEY = TRIGGER.secretKey;
```

**Flip traffic with one line** (then restart/redeploy the app):
```bash
TRIGGER_TARGET=selfhosted   # cut over
TRIGGER_TARGET=cloud        # instant rollback
```

If you can't add code, the minimal version is to keep both `TRIGGER_API_URL` and
`TRIGGER_SECRET_KEY` values handy and swap those two env vars together — same effect,
just two lines instead of one. The `TRIGGER_TARGET` indirection exists so the secret
key can never get out of sync with the URL.

### Deploy side (the CLI)

Keep a CLI profile per instance so you can deploy task code to either without
re-logging-in:
```bash
npx trigger.dev@latest login --api-url https://api.trigger.dev        --profile cloud
npx trigger.dev@latest login --api-url https://<TRIGGER_HOST>         --profile selfhosted
# deploy to whichever:
npx trigger.dev@latest deploy --profile selfhosted
npx trigger.dev@latest deploy --profile cloud
```
During cut-over, deploy to **both** so either target is ready the instant you flip.

> The runtime switch routes *new* triggers. In-flight runs finish on whichever
> instance started them. To drain cleanly, flip the switch, then let cloud's queue
> empty before cancelling.

---

## Operations & durability

### Back up the self-hosted database (do this from day one)
Self-hosted means **you** own the data now. Schedule a nightly Postgres dump:
```bash
# crontab -e on <SERVER>
0 3 * * * docker exec <postgres_container> pg_dump -U <PG_USER> <PG_DB> | gzip > /var/backups/triggerdb-$(date +\%Y\%m\%d).sql.gz && find /var/backups -name 'triggerdb-*.sql.gz' -mtime +14 -delete
```
Push the dump offsite (S3/object storage) if you can — a disk failure otherwise
loses all run history again.

### Update the stack
```bash
docker compose pull && docker compose up -d   # recreates only changed containers
```
**Pin image tags in production** (e.g. `…/trigger.dev:v4.x.x`) rather than `:latest`,
so an upstream push can't silently change your running version mid-week.

### Rollback
- **Traffic-level (fastest):** flip `TRIGGER_TARGET` back to `cloud` — see the switch above.
- **Stack-level:** `docker compose down` stops containers but **preserves volumes**
  (data safe). `docker compose down -v` also deletes volumes — **data loss**, only for
  a full teardown.

---

## Phase 5 — Cancel the old cloud subscription (final, irreversible)

Only after Phases 1–4 are verified live in production.

1. Confirm nothing still points at cloud:
   ```bash
   grep -rn "cloud.trigger.dev\|<OLD_CLOUD_PROJECT_REF>" .   # expect only commented-out lines
   ```
2. **Declarative** schedules on cloud have no delete/disable button (they're
   code-controlled) — don't chase them. Cancelling the account stops them.
3. `cloud.trigger.dev` → **Settings → Billing → Cancel plan**. This halts all cloud
   runs and access; the schedules die with the account.

---

## Troubleshooting (the failure modes that actually happen)

| Symptom | Cause | Fix |
|---|---|---|
| Runs show an old deployment version after a push | code pushed to git but not deployed | run the deploy command |
| `cannot connect to Docker daemon` | Docker not running on the dev machine | start Docker, retry |
| `unauthorized: authentication required` on push | not logged into the registry | `docker login <REGISTRY_HOST>` |
| Runs stuck in queue, no runners start | stopped task containers occupying runner slot names | `ssh <SERVER> "docker container prune -f"` (stopped only — safe) |
| Task fails with `fetch failed` / network errors | containers can't reach the internet — NAT/masquerade rules missing (common after a firewall reload wipes Docker's iptables) | check `iptables -t nat -L POSTROUTING -n`; if empty, `systemctl restart docker` to rebuild its rules. On firewalld hosts also re-add masquerade: `firewall-cmd --zone=docker --add-masquerade --permanent && firewall-cmd --reload`. On ufw hosts ensure `DEFAULT_FORWARD_POLICY="ACCEPT"` in `/etc/default/ufw` |
| `<TRIGGER_HOST>` unreachable but container is healthy | cloud-provider panel firewall (e.g. Hetzner Cloud Firewall) blocking 80/443 | allow 80/443 in the provider's firewall, separate from the host firewall |
| Login emails never arrive | SMTP misconfigured in `.env` | fix SMTP creds, `docker compose restart webapp` |
| Real-time run updates don't stream in the dashboard | reverse proxy not passing WebSocket upgrades | add `Upgrade`/`Connection` proxy rules, reload proxy |
| Webapp unhealthy / not accepting runs | webapp or supervisor needs a restart | `docker compose logs --tail=50 webapp`; `docker compose restart webapp supervisor` |
| Existing app's Redis/Postgres data corrupts after install | trigger.dev's Redis/Postgres collided on a shared host port | remap trigger.dev services to alternate host ports; never share a data port |

---

## Pre-cancel checklist (copy into your migration ticket)

- [ ] Self-hosted `/healthcheck` returns 200 over HTTPS
- [ ] `docker compose ps` all healthy
- [ ] CLI `whoami --profile <PROFILE>` shows `<TRIGGER_HOST>` (not cloud)
- [ ] All task env vars present in the self-hosted dashboard
- [ ] Production deploy succeeded; a test run completed on the new version
- [ ] All schedules recreated and firing on self-hosted
- [ ] `TRIGGER_TARGET` (the one-line switch) flipped to `selfhosted` and stable in prod
- [ ] Switched-back rollback path tested at least once (flip to `cloud`, confirm, flip back)
- [ ] Nightly DB backup cron in place and one dump verified
- [ ] Self-hosted has run clean in production long enough to trust it
- [ ] `grep` confirms no hardcoded references to cloud remain (env switch only)
- [ ] Only then: cancel the cloud subscription

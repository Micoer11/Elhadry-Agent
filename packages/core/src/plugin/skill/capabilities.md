# Elhadry Agent capabilities

Use this guide when the user asks you to extend the agent or to run work at a
specific time. Skills, MCP servers, and schedules are built into the app: use
the `elhadry` tools instead of telling the user to edit configuration by hand.
Read the matching section below before acting, then do the work yourself.

Every tool named here is available both directly (`elhadry_<tool>`) and through
Code Mode (`tools.elhadry.<tool>(...)`). Inputs are the same on both paths.

## Skills

A skill is a `SKILL.md` file with a name, a description, and Markdown
instructions. The description is what the model sees, so it must say what the
skill does **and when to use it**. Skills can sit next to scripts, references,
and templates; paths inside the skill are relative to the folder containing
`SKILL.md`.

### Add a skill

Call `elhadry_skill_add` (Code Mode: `tools.elhadry.skill_add`) with:

| Field | Required | Meaning |
| --- | --- | --- |
| `name` | Yes | Human-readable display name. |
| `description` | Yes | What the skill does and when to use it. |
| `content` | Yes | Markdown instructions, rules, examples, and workflow. |
| `id` | No | Folder name and skill ID. Defaults to a slug of `name`. |
| `autoinvoke` | No | Default `true`. Set `false` only when the user wants the skill loadable by ID but not advertised to the model. |
| `overwrite` | No | Default `false`. Pass `true` only when the user explicitly asked to replace an existing skill. |

The tool writes
`<global-config>/skills/<id>/SKILL.md` (normally
`~/.config/elhadry/skills/<id>/SKILL.md`) with this frontmatter:

```markdown
---
name: "Deploy"
description: "Use when deploying this project"
metadata:
  elhadry/autoinvoke: true
---

Instructions…
```

It becomes available on the next skill reload (the app watches the skills
directory), so do not ask the user to restart. Call `elhadry_skill_list` first
when you are unsure whether the ID is taken. There is no skill removal tool:
delete the folder only when the user explicitly asks.

### Global, project, and compatibility paths

| Scope | Path |
| --- | --- |
| Global | `~/.config/elhadry/skills/<id>/SKILL.md` |
| Global compatibility | `~/.claude/skills`, `~/.agents/skills` |
| Project | `.elhadry/skills/<id>/SKILL.md` |
| Project compatibility | `.claude/skills`, `.agents/skills` |

`skill_add` always writes the global scope. When the user wants a skill for one
project only, create `.elhadry/skills/<id>/SKILL.md` with the write tool instead.
Project discovery walks from the current directory up to the project root, and
each directory containing `SKILL.md` is one skill. Hidden folders and
`node_modules` are skipped.

### Supporting files

Put scripts, references, and templates beside `SKILL.md`:

```text
.elhadry/skills/deploy/
├── SKILL.md
├── scripts/release.sh
└── references/policy.md
```

Create those files with the write tool. Reference them by relative path in
`SKILL.md`, and mention when to read or run each one. `name` in frontmatter is
only a display label; the folder name is the skill ID.

### Writing a good skill

- Say when to use it in `description`, and repeat the trigger at the top of the
  body.
- Give an ordered workflow, exact commands and paths, and the expected result.
- Include the project's real conventions and the checks that must pass.
- Keep secrets and user-specific data out of the skill.
- Use an Arabic `description` when the user works in Arabic so the model
  matches their wording.

## MCP servers

An MCP server adds tools, prompts, resources, and instructions to the agent.
Add or remove servers with the `elhadry` MCP tools; do not insert JSON into the
configuration unless the user asks for a manual edit.

### Add a server

Call `elhadry_mcp_add` (Code Mode: `tools.elhadry.mcp_add`) with:

| Field | Required | Meaning |
| --- | --- | --- |
| `name` | Yes | Unique server name: lowercase letters, numbers, dots, dashes, underscores. |
| `config` | Yes | Remote or local server shape (below). |
| `connect` | No | Default `false`. Pass `true` only when the user explicitly asked to connect now. |

Remote server:

```json
{ "type": "remote", "url": "https://mcp.example.com/mcp", "headers": { "API_KEY": "{env:MCP_API_KEY}" }, "oauth": false }
```

Local server:

```json
{ "type": "local", "command": ["npx", "-y", "@modelcontextprotocol/server-everything"], "cwd": ".", "environment": { "LOG_LEVEL": "info" } }
```

Both shapes also accept:

| Field | Meaning |
| --- | --- |
| `disabled` | Do not connect. `mcp_add` sets this automatically when `connect` is false. |
| `codemode` | Default `true`. Set `false` to expose the server's tools directly instead of through Code Mode. |
| `timeout` | Per-server overrides in milliseconds: `{ "startup": …, "catalog": …, "execution": … }`. |
| `protocol` | `"legacy"` (default), `"auto"`, or `"2026-07-28"`. |

- Remote servers use OAuth by default. Do not add an API key header when the
  server supports OAuth. For key-only servers, set `oauth: false` and pass the
  credential as `{env:NAME}`, never as a literal secret.
- Local servers inherit the process environment; add variables under
  `environment`. `{env:NAME}` reads the value from the environment.
- Call `elhadry_mcp_list` first when the name may already be taken, and call it
  again after connecting to confirm the status.
- After adding, tell the user to open **Settings → Extensions → MCP** (or run
  `/mcps` in the TUI), select the server, and sign in. Report it as configured
  but awaiting sign-in until the status is `connected`.
- `elhadry_mcp_remove` removes the server from configuration and disconnects
  it. Ask before removing a server you did not add.

The saved configuration lives under `mcp.servers` in the global or project
`elhadry.json(c)`. Prefer the tool because it preserves unrelated settings. The
CLI equivalent is `elhadry mcp add <name> --url <remote-url>` (add `--global`
for every project); never run an interactive auth command through the shell.

## Schedules

A schedule wakes **this session** later by admitting a prompt, so the session
continues the work unattended. The user may be away: never ask questions in a
scheduled prompt, make reasonable assumptions, and finish. Schedules are
durable and survive restarts. A one-shot that falls due while the app is closed
fires late when it resumes; a repeating schedule skips missed slots and
continues at its next slot.

Use schedules whenever the request involves a time or a condition — never sleep,
poll in a loop, or tell the user to come back. A request such as "remind me in
20 minutes", "every morning at 9", "check CI until it passes", or "when this file
changes" is a schedule.

### Create

Call `elhadry_schedule_create` (Code Mode:
`tools.elhadry.schedule_create`):

| Field | Required | Meaning |
| --- | --- | --- |
| `prompt` | Yes | The instruction the session receives when the schedule fires. Write it to stand alone. |
| `when` | Yes unless `until` is set | Exactly one trigger (below). |
| `name` | No | Short label shown in `schedule_list`. |
| `if` | No | Recurring gate checked on each slot (below). |
| `until` | No | One-shot gate polled until it passes (below). Cannot be combined with `if`. |
| `ends` | No | Stop limit for a repeating schedule: `{ "after": "8 hours" }`, `{ "at": "2026-10-27T18:00" }`, or `{ "times": 3 }`. The first limit reached wins. |
| `model` | No | `{ "providerID": "…", "id": "…" }` to run this task with its own model instead of the session's selected model. |

Durations use full words: `"90 seconds"`, `"20 minutes"`, `"1 hour"`,
`"2 days"`. Short forms such as `"5m"` are rejected. Set `tz` to an IANA zone
(for example `"Africa/Cairo"`) when the user's time zone differs from the app's
configured time zone; otherwise times use the configured time zone, then the
server's local zone. Always pass `tz` when the user names a zone.

#### `when` triggers

| Shape | Use | Behavior |
| --- | --- | --- |
| `{ "in": "20 minutes", "tz": "…" }` | One-shot delay from now. | Fires once. |
| `{ "at": "2026-10-27T09:00", "tz": "Africa/Cairo" }` | One-shot wall-clock time. An ISO string with an offset is also accepted. | Must be in the future; fires once. |
| `{ "every": "1 hour", "tz": "…" }` | Repeating interval. | Minimum 1 minute, or 15 seconds when a check is attached. Keeps its phase and skips missed slots instead of firing a burst. |
| `{ "cron": "0 9 * * 1-5", "tz": "…" }` | Calendar schedule. | Standard five-field cron (minute, hour, day of month, month, day of week); an optional leading seconds field is accepted. It must fire at most once a minute. Use `*/15 * * * *` for every 15 minutes and `0 9 * * 1-5` for weekdays at 09:00. |

The trigger is required unless `until` is set, in which case the default is
`{ "every": "30 seconds" }`. The schedule ends before it starts if `ends` falls
before the first run; the tool rejects that.

#### `if` — recurring gate

Checked on every slot **before** the model is called. The prompt fires only on
slots where the check passes; failed slots advance the schedule normally. Use it
for "only tell me when something changed" without burning model calls.

#### `until` — one-shot gate

Polled without a model call until it passes, then the prompt fires once and the
schedule is done. Defaults to `{ "every": "30 seconds" }` and `ends.after` of
24 hours. If it already passes at creation, the schedule is done immediately
and reports "Matched immediately". On timeout the schedule wakes once with an
expired note and stops.

Both gates accept one of:

```json
{ "run": "gh pr checks 59962" }
```

```json
{ "code": "const r = await tools.elhadry.schedule_list({}); return r.schedules.length > 0" }
```

Shell checks run in the session's directory. Alone, exit 0 passes and any
non-zero exit means "not yet". With `is`, `matches`, or `changes`, non-zero is
an error and exit 0 passes when trimmed stdout equals `is`, matches the `matches`
regular expression, or differs from the previous run (`changes`, which baselines
at creation).

Code checks run in a confined Code Mode runtime with no `fetch`, a 30-second
limit, 20 tool calls, and a 32 KB output cap. Call tools statically as
`tools.<namespace>.<tool>(...)` or `tools["namespace-name"].tool(...)`; each is
authorized once at creation to run unattended. The program receives `state`
(initially `null`), `now` (epoch milliseconds), and `runs` (completed checks),
and returns a boolean or `{ wake, state?, message? }`; `message` is appended to
the prompt when it wakes. An `if` check baselines `state` at creation without
waking. A code check that throws at creation fails `schedule_create` — fix the
script instead of retrying blindly. After a check fails three times the
schedule pauses and sends a failure note.

### Manage

| Tool | Use |
| --- | --- |
| `elhadry_schedule_list` | Show this session's schedules with status, next run, last outcome, and the current time (UTC). |
| `elhadry_schedule_pause` | Stop firing but keep the settings. |
| `elhadry_schedule_resume` | A one-shot that fell due while paused fires once now; a repeating schedule resumes at its next slot. |
| `elhadry_schedule_delete` | Remove the schedule permanently. |

Statuses are `active`, `paused`, and `done`. `nextDueAt` and `lastFiredAt` are
rendered in the schedule's own zone. The tools only see the calling session's
schedules; another session's ID is reported as not found.

The `/schedule <request>` command hands a request to the model with these same
instructions. If `experimental.schedules` is `false`, the tools and command are
unavailable and calls fail with "Scheduled tasks are disabled".

### Mapping requests

| User asks | Create |
| --- | --- |
| "Remind me in 20 minutes" | `when: { in: "20 minutes" }` and a prompt that restates the reminder with its context. |
| "Every day at 9 summarize the repo" | `when: { cron: "0 9 * * *", tz }` and a prompt describing the summary and where to send it. |
| "Check the build every 30 minutes" | `when: { every: "30 minutes" }`. Add `ends` when the user names a limit. |
| "Tell me when CI passes" | `until: { run: "gh pr checks <n>" }` with a one-shot success prompt. |
| "Only when the branch changes" | `if: { run: "git rev-parse HEAD", changes: true }` on an `every` schedule. |
| "Run this on another model" | Add `model: { providerID, id }`. |
| "Stop after 3 times" | `ends: { times: 3 }`. |

After creating, report the schedule ID, the trigger, and the next run time in
the user's time zone. Confirm pause, resume, and delete with the resulting
status. Never claim a schedule exists without the tool result.

## Working rules

Inspect the real files before changing configuration, keep writes inside the
workspace unless the user asked for a global change, and verify with the
project's own checks. Read the `base` skill for the full programming, path,
command, and debugging rules.


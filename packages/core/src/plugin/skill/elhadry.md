# Elhadry Agent

Use this guide as the starting point for work involving Elhadry Agent itself. It
covers the core concepts needed to configure and customize Elhadry Agent, extend it
with plugins, and build integrations with the Elhadry Agent SDK, clients, and API.

Every guide that documents Elhadry Agent V2 ships with this app. Read the `docs` skill to
get the index, which lists each guide with the absolute path to open. Read the guide
for the topic you need instead of fetching a documentation page: the files are the
same source, already rewritten for this app.

## Version policy

Always answer for Elhadry Agent V2 unless the user explicitly asks about V1,
legacy Elhadry Agent, or migrating from V1.

The bundled guides under `docs` document V2. They do not cover V1, so consult them
only when the user explicitly asks about V1 or needs V1 as migration input. Outputs
and recommendations must still use V2 unless the user specifically requests a V1
result. If the bundled guides do not answer a question, say what is uncertain
instead of inventing V1 behaviour.

Elhadry Agent writes a `$schema` value into new configuration files so the user's
editor can validate the file. Keep the existing `$schema` value in examples and
never fetch it to learn the shape: the bundled guides are the source of truth. The
schema accepts both V2 fields and deprecated V1 fields. Never recommend a field the
bundled guide marks deprecated.

## CLI

For questions about the terminal interface, command-line invocation, `run`, `mini`,
terminal providers, or other CLI behavior, read `cli/index.md` from the `docs` skill.

CLI and TUI preferences are separate from Elhadry Agent's server and project
configuration. They live in the global `~/.config/elhadry/cli.json`, or
`$XDG_CONFIG_HOME/elhadry/cli.json` when `XDG_CONFIG_HOME` is set. There is no
project-local CLI configuration. Set `OPENCODE_CLI_CONFIG_CONTENT` to merge
inline JSON over the global settings. Most preferences can also be changed from
the TUI by pressing `Ctrl+P` and selecting **Open settings**.

### Settings

Read `cli/config.md` from the `docs` skill before editing `cli.json`. It documents
every terminal-only setting, accepted values, and examples, including themes, input,
sessions, tabs, diffs, alerts, Mini, keybindings, terminal plugins, and debugging. Do
not put these settings in `elhadry.json(c)`.

### Keybinds

Configure keybindings under `keybinds` in `cli.json`. The leader key is the
`keybinds.leader` entry; leader timing is configured separately under
`leader.timeout`. Bindings can use a string, an array of strings, or an object
when event behavior such as `preventDefault` is required. Disable a binding
with `"none"` or `false`.

Never guess a command ID, default binding, or accepted key syntax. Read
`cli/keybinds.md` from the `docs` skill, which lists the current IDs and defaults,
before answering or editing a binding.

## Elhadry Agent configuration

Elhadry Agent's server and project configuration uses JSON or JSONC. When you create
a file, keep the `$schema` value the app writes so the user's editor can validate
fields and provide autocomplete. Copy it from an existing Elhadry Agent configuration
file; do not fetch a schema URL.

Global configuration lives at `~/.config/elhadry/elhadry.json(c)` and applies
to every project for that user. Project configuration can live in any directory
as `elhadry.json(c)` or `.elhadry/elhadry.json(c)`, including nested packages
in a monorepo.

During ordinary project discovery, Elhadry Agent searches the current Location
directory and every ancestor through the filesystem root, including directories
above the detected project or repository root. It merges direct
`elhadry.json(c)` files from the farthest ancestor to the current directory,
then does the same for `.elhadry/elhadry.json(c)` files. This means every
discovered `.elhadry` config overrides every discovered direct config. Global
filesystem configuration has lower precedence than these discovered documents.

Common configuration fields include `model`, `default_agent`, `permissions`,
`agents`, `commands`, `plugins`, `providers`, `mcp`, `skills`, `instructions`,
`references`, `formatter`, and `lsp`.

This configuration is distinct from `cli.json`. Read `cli/config.md` from the
`docs` skill for terminal preferences, especially themes and keybindings.

Config changes apply without a restart. Elhadry Agent watches config files and
reloads agents, commands, skills, MCP servers, and plugins after a save. The TUI
does the same for `cli.json`. To force a full reload, use `/reload`. Don't tell
the user to restart Elhadry Agent after editing config.

Do not guess field names or shapes. Read `configure/config.md` and the guide for the
specific feature from the `docs` skill as the source of truth, and preserve unrelated
settings when editing an existing file. Keep the existing `$schema` value in
configuration examples, but do not fetch it to determine the V2 configuration shape.

## Skills

When the user asks to create or add a skill, call `elhadry_skill_add` yourself.
It writes a `SKILL.md` with the name, description, and Markdown instructions,
and the skill becomes available immediately. Use `elhadry_skill_list` first when
the ID may exist, and pass `overwrite: true` only when the user asks to replace
an existing skill. For a project-only skill, write
`.elhadry/skills/<id>/SKILL.md` instead.

Global skills live under `~/.config/elhadry/skills/<id>/SKILL.md`; project skills
under `.elhadry/skills/<id>/SKILL.md`. The description is what makes a skill
discoverable, so state what it does and when to use it. Supporting scripts and
references belong beside `SKILL.md` and are referenced by relative path.

Read the `capabilities` skill for the exact tool inputs, frontmatter, and
directory layout, or `configure/skills.md` from the `docs` skill for the bundled
guide. For general coding, path, command, and verification rules, read the
`base` skill.

## MCP servers

Configure MCP servers under `mcp.servers`. When the user asks to add any MCP
server, including a custom or third-party one that is not in the ready-made
catalog, call the `elhadry_mcp_add` tool yourself. It accepts a remote server as
`{ type: "remote", url }` or a local server as `{ type: "local", command,
environment }`, plus optional headers, codemode, timeout, and protocol.

The tool saves the server disabled so the user can complete any sign-in from the
app. Do not write an API key into a header when the server supports OAuth; prefer
an environment substitution such as `{env:MCP_API_KEY}`. After adding, tell the
user to open Settings → Extensions → MCP and connect the server. Use
`elhadry_mcp_remove` when the user asks to delete a server, and
`elhadry_mcp_list` to check the exact name and status.

Read the `capabilities` skill for the full input shape and the OAuth flow, or
`configure/mcp-servers.md` from the `docs` skill for every configuration field.

Prefer the tool for edits because it preserves unrelated configuration. When
editing outside the tool, use the CLI without `--global` for a project-local
server and with `--global` when the user wants it in every project:

```sh
elhadry mcp add <name> --global --url <remote-url>
elhadry mcp list
```

Remote servers use OAuth by default. If a server needs authentication, tell the
user to run `/mcps`, select the server, and sign in. Do not run
`elhadry mcp auth` through the shell tool: it starts an interactive flow whose
authorization link can be hidden in background process output. Report the server
as configured but awaiting sign-in until its status is `connected`.

OAuth credentials are stored outside the Elhadry Agent configuration. Do not ask
for or store an API key when the server supports OAuth. Use header-based
credentials only when OAuth is unavailable or the user explicitly requires them,
and use an environment substitution such as `{env:MCP_API_KEY}` instead of
writing a secret into configuration.

## Scheduled tasks

When a request involves a time or a condition — "in 20 minutes", "every morning
at 9", "when CI passes", "only when the branch changes" — create a schedule
instead of waiting, sleeping, or telling the user to come back. Call
`elhadry_schedule_create`; use `elhadry_schedule_list`,
`elhadry_schedule_pause`, `elhadry_schedule_resume`, and
`elhadry_schedule_delete` to manage this session's schedules.

- `when` takes exactly one of `{ in }`, `{ at }`, `{ every }`, or `{ cron }`.
- `until` polls a shell or Code Mode check and wakes once when it passes; `if`
  gates each recurring slot with no model call.
- `ends` stops a repeating schedule by time or run count, and `model` runs the
  task with its own model.

Scheduled prompts run unattended, so write them to stand on their own: include
every path and instruction, never ask questions, make reasonable assumptions,
and finish. Pass the user's IANA time zone as `tz` when it differs from the app's
configured time zone.

Read the `capabilities` skill for every trigger, gate, and limit, and for the
exact tool inputs. The user can also run `/schedule <request>`.

## V1 to V2 migration

For any request to migrate Elhadry Agent configuration, agents, commands, skills,
plugins, integrations, or other behavior from V1 to V2, read
`configure/migrate-v1.md` from the `docs` skill before acting.

V1 config files and `.elhadry/` definitions are intended to remain compatible.
The only intentional breaking changes are the server API and plugin API. Native
V2 config uses more ergonomic shapes, but conversion is optional. When the user
requests conversion, inspect the complete configuration, preserve behavior and
unrelated settings, and apply only the relevant migrations from the guide. For
plugin migrations, read both `configure/migrate-v1.md` and `build/plugins/migrate-v1.md`.
If non-API V1 functionality fails in V2, use the `report` skill to file it as a
compatibility bug.

## Plugins

For questions about creating, configuring, loading, publishing, or migrating
plugins, read `build/plugins/index.md` from the `docs` skill before answering. Refer
to that guide when the user wants to build a plugin. It covers hooks, transforms,
tools, plugin context capabilities, and package entrypoints. Plugins can also extend
the TUI; for those, read `build/plugins/cli.md`. For custom methods and events shared
with other plugins or clients, read `build/plugins/rpc.md`.

## Service

Elhadry Agent uses a client-server architecture. Interfaces such as the TUI connect
to a background Elhadry Agent service, which owns sessions, configuration, plugins,
permissions, and tool execution.

Elhadry Agent normally discovers or starts the shared background service
automatically. Restart it only if it is stuck or unhealthy, not to apply
configuration changes:

```sh
elhadry service restart
```

Check its status after restarting:

```sh
elhadry service status
```

## API

Elhadry Agent exposes an HTTP API from its server. The API is described by an
OpenAPI document available from the running server at `/openapi.json`.

Use Elhadry Agent's built-in `api` command for local requests. It uses the same
discovery and authentication flow as the TUI and may start the background
service when no compatible healthy service is available. It accepts either an
HTTP method and path or an OpenAPI operation ID.

Call an endpoint with an HTTP method and path:

```sh
elhadry api get /api/info
```

Pass a request body with `--data` or `-d`, and additional headers with
`--header` or `-H`:

```sh
elhadry api post /api/example --data '{"key":"value"}'
elhadry api get /api/example --header 'X-Example:value'
```

Request bodies default to `Content-Type: application/json`. When Elhadry Agent is
connected to an explicit server instead of its managed background service, use
the same configured server and authentication context rather than constructing
an unauthenticated request separately.

Read `api/index.md` from the `docs` skill for available endpoints, parameters,
request bodies, and response schemas. The running server's `/openapi.json` is the
machine-readable contract for code generation and other tooling.

## Client

For questions about connecting an application to Elhadry Agent over the network,
read `build/client/index.md` from the `docs` skill before answering.

`@elhadry/client` is the generated TypeScript client for the Elhadry Agent HTTP
API. Its methods and types come from the same contract as the API reference.
The default entrypoint exposes Promise-based resource clients and async
iterables for streaming endpoints. The `@elhadry/client/effect` entrypoint
exposes typed Effects, Streams, and decoded Elhadry Agent schema values. Its
`Service` API can discover, start, stop, and authenticate with the local
background service from a Node application.

## SDK

For questions about embedding Elhadry Agent directly in an application, read
`build/sdk/index.md` from the `docs` skill before answering. The SDK hosts Elhadry
Agent in the application without opening an HTTP listener.

Use `build/sdk/effect.md` for Effect applications. For Cloudflare Durable Objects,
use `build/sdk/cloudflare.md`.

## Troubleshooting

Elhadry Agent runs a client and a background server. Start by determining whether a
problem belongs to the client, the shared server, or one project.

- Check the service with `elhadry service status` and verify the API with
  `elhadry api get /api/info`.
- Compare with `elhadry --standalone`, which runs the TUI with a private
  server, to isolate shared-service issues.
- Inspect `~/.local/share/elhadry/log/elhadry.log`. Filter `role=cli` for
  client startup and `role=server` for sessions, providers, plugins,
  permissions, and tools.
- Run one reproduction with `OPENCODE_LOG_LEVEL=DEBUG` when normal logs are not
  sufficient.
- Do not delete or edit the database, service registration, or service config
  while diagnosing a problem. Back up persistent data before inspecting it
  with external tools.
- Redact API keys, authorization headers, prompts, file contents, and other
  sensitive data before sharing diagnostics.

Read `configure/troubleshooting.md` from the `docs` skill for service lifecycle
commands, API inspection, log locations, explicit server connections,
issue-reporting details, and local development paths.

# Elhadry Agent documentation

This is the offline copy of the Elhadry Agent documentation. Every guide that documents
Elhadry Agent V2 ships inside the app, already rewritten for this app's paths, config file
names, and CLI.

Read the file for the topic you need. These guides are the source of truth for this app and
need no network request.

## Contents

| Section | File |
| --- | --- |
| Configure | `configure/` |
| Build | `build/` |
| CLI | `cli/` |
| Console | `console/` |

## How to read a guide

1. Find the file that covers the question in the index below.
2. Read it with the `read` tool, using the absolute path shown in the index.
3. Follow the guide. Answer from these files; never open a documentation website.

## Never fetch the documentation site

These files replace any documentation website. Do not open an external documentation site, do
not search the web for a guide, and do not follow a documentation link you remember from
elsewhere. If a guide does not cover the question, say what is uncertain rather than guessing.

## Paths in this copy

Every path has already been rewritten for Elhadry Agent:

| Kind | Location |
| --- | --- |
| Global config | `~/.config/elhadry/elhadry.json` or `elhadry.jsonc` |
| Project config | `.elhadry/elhadry.json` or `.elhadry/elhadry.jsonc` |
| Global skills | `~/.config/elhadry/skills/<skill-id>/SKILL.md` |
| Project skills | `.elhadry/skills/<skill-id>/SKILL.md` |
| CLI binary | `elhadry` |

Keep these exactly as written, because they are identifiers rather than paths on this machine:
package names (`@elhadry/...`), environment variables (`OPENCODE_...`), provider and model IDs,
theme and keybind names, and `$schema` URLs.

## Index

| Section | Guide | File |
| --- | --- | --- |
| Build | Effect | `{root}/build/client/effect.md` |
| Build | JavaScript | `{root}/build/client/index.md` |
| Build | Intro | `{root}/build/index.md` |
| Build | TUI | `{root}/build/plugins/cli.md` |
| Build | Effect | `{root}/build/plugins/effect.md` |
| Build | RPC | `{root}/build/plugins/effect/rpc.md` |
| Build | GUI | `{root}/build/plugins/gui/index.md` |
| Build | Overview | `{root}/build/plugins/index.md` |
| Build | Migrate plugins from V1 | `{root}/build/plugins/migrate-v1.md` |
| Build | RPC | `{root}/build/plugins/rpc.md` |
| Build | Server | `{root}/build/plugins/server.md` |
| Build | Cloudflare | `{root}/build/sdk/cloudflare.md` |
| Build | Effect | `{root}/build/sdk/effect.md` |
| Build | Overview | `{root}/build/sdk/index.md` |
| CLI | ACP | `{root}/cli/acp.md` |
| CLI | Commands | `{root}/cli/commands.md` |
| CLI | Settings | `{root}/cli/config.md` |
| CLI | Intro | `{root}/cli/index.md` |
| CLI | Keybinds | `{root}/cli/keybinds.md` |
| CLI | Plugins | `{root}/cli/plugins.md` |
| CLI | Providers | `{root}/cli/providers.md` |
| CLI | Theme | `{root}/cli/theme.md` |
| CLI | TUI | `{root}/cli/tui.md` |
| CLI | Web | `{root}/cli/web.md` |
| Configure | Agents | `{root}/configure/agents.md` |
| Configure | Attachments | `{root}/configure/attachments.md` |
| Configure | Commands | `{root}/configure/commands.md` |
| Configure | Compaction | `{root}/configure/compaction.md` |
| Configure | Config | `{root}/configure/config.md` |
| Configure | Formatters | `{root}/configure/formatters.md` |
| Configure | Intro | `{root}/configure/index.md` |
| Configure | Instructions | `{root}/configure/instructions.md` |
| Configure | MCP servers | `{root}/configure/mcp-servers.md` |
| Configure | Migrate from V1 | `{root}/configure/migrate-v1.md` |
| Configure | Models | `{root}/configure/models.md` |
| Configure | Network | `{root}/configure/network.md` |
| Configure | Permissions | `{root}/configure/permissions.md` |
| Configure | Plugins | `{root}/configure/plugins.md` |
| Configure | Policies | `{root}/configure/policies.md` |
| Configure | Providers | `{root}/configure/providers.md` |
| Configure | References | `{root}/configure/references.md` |
| Configure | Skills | `{root}/configure/skills.md` |
| Configure | Snapshots | `{root}/configure/snapshots.md` |
| Configure | Themes | `{root}/configure/themes.md` |
| Configure | Tools | `{root}/configure/tools.md` |
| Configure | Troubleshooting | `{root}/configure/troubleshooting.md` |
| Configure | Warming | `{root}/configure/warming.md` |
| Configure | Websearch | `{root}/configure/websearch.md` |
| Console | API Overview | `{root}/console/api/index.md` |
| Console | Inference API | `{root}/console/api/inference.md` |
| Console | Providers API | `{root}/console/api/providers.md` |
| Console | Billing | `{root}/console/billing.md` |
| Console | Budgets | `{root}/console/budgets.md` |
| Console | Go | `{root}/console/go.md` |
| Console | Claude Code | `{root}/console/harnesses/claude-code.md` |
| Console | Codex | `{root}/console/harnesses/codex.md` |
| Console | Hermes | `{root}/console/harnesses/hermes.md` |
| Console | Harnesses | `{root}/console/harnesses/index.md` |
| Console | Pi | `{root}/console/harnesses/pi.md` |
| Console | Raycast | `{root}/console/harnesses/raycast.md` |
| Console | Intro | `{root}/console/index.md` |
| Console | Members | `{root}/console/members.md` |
| Console | Models | `{root}/console/models.md` |
| Console | Providers | `{root}/console/providers.md` |
| Console | Directory Sync | `{root}/console/scim.md` |
| Console | SSO | `{root}/console/sso.md` |
| Console | Web Search | `{root}/console/websearch.md` |
| Console | Basics | `{root}/console/workspaces.md` |

# Name, identifier and hosting exceptions

Elhadry Agent is a fork of OpenCode. The product name, workspace package scope
(`@elhadry/*`), launcher binaries (`elhadry`, `elhadry2`), directory names
(`elhadry`, `.elhadry`) and documentation use the fork's own names. The
identifiers below intentionally keep their upstream spelling because they are
wire, package, protocol or hosting contracts. Do not "rebrand" them without a
migration and a compatibility alias.

## Upstream-compatible identifiers

- `@opencode/pty` and its `@opencode/pty-*` platform packages, the
  `opencode-pty` binary and its npm `bin` entry. The npm package name changes
  only after `@elhadry/pty@0.4.0` exists on the registry.
- `OPENCODE_*` environment variables (`OPENCODE_API_KEY`, `OPENCODE_PTY_BIN`,
  `OPENCODE_CLAUDE_PATH`, `OPENCODE_STORY`, …). `ELHADRY_*` is the public
  prefix: `packages/cli/src/env.ts` mirrors every `ELHADRY_*` name onto its
  legacy `OPENCODE_*` twin.
- Provider and integration IDs `"opencode"` / `"opencode-go"`, model references
  such as `opencode/<model-id>`, provider metadata key `"opencode"`, and the
  `x-opencode-*` request headers.
- Config schema URLs (`opencode.ai/config.json`, `opencode.ai/theme.json`),
  `.well-known/opencode`, the default mDNS name `opencode.local`, and legacy
  config aliases under `@opencode-ai/*` and `opencode.*`.
- Plugin and MCP identifiers: `opencode.provider.*`, `opencode.config.*`,
  `opencode.notifications`, MCP server name `"opencode"`, the
  `mcp__opencode__` tool prefix, `ai.opencode/sessionID`, the built-in tool IDs
  `opencode.tool.*`, and the runtime keys `Symbol.for("opencode.plugin.v2.*")`
  and `Symbol.for("opencode.extension.live")`. Tool IDs are written into
  session history, so renaming them would orphan existing tool parts.
- Storage and lock keys that must stay readable by existing installs, such as
  `opencode.global.dat`, `opencode.browser.dat`, `opencode.settings`,
  `opencode.status`, `.git/opencode-pack.lock`, and the `opencode` /
  `opencode2` theme keys (the picker displays "Elhadry Agent" /
  "Elhadry Agent V2").
- The GUI extension manifest schema literal `opencode.gui-extension/1`, which
  is accepted alongside `elhadry.gui-extension/1` so existing manifests keep
  loading.
- Keybind names `opencode.settings`, `opencode.status`, `opencode.debug`,
  `opencode.stats`, `opencode.highlights` and `opencode.update`. They are config
  keys and internal command IDs, not product copy.
- Public API symbols such as `OpenCode`, `OpenCodeEvent`, `OpenCodeClient`,
  `OpenCodeWorkerd`, `OpenCodeLogo`, and the `@elhadry/sdk/OpenCode` service
  tag. These are exported names, not product copy.
- Legacy launcher shims (`opencode`, `opencode2`, `install` binary fallback,
  WSL `opencode-pty`, remote SSH `binary=opencode` fallback).
- Third-party attribution headers sent to upstream providers
  (`X-Title: "opencode"`, `HTTP-Referer: https://opencode.ai/`) and the
  `X-Cerebras-3rd-Party-Integration` value.
- Historical records: `CHANGELOG.md`, license copyright lines, Claude Code
  replay fixtures, and third-party package names in prose.

## Hosting identities

The fork owns its source and release hosting; the upstream names below still
appear where a real external contract requires them:

- Source repository `Micoer11/Elhadry-Agent` (public). It is both the source and
  the release host, serving
  `releases/latest/download/version.json`, `latest.yml`, the installers, and
  their `.blockmap` files.
- Homebrew tap `Micoer11/tap`, winget ID `Elhadry.Agent`, and the CLI release
  manifest at
  `https://github.com/Micoer11/Elhadry-Agent/releases/latest/download/version.json`.
  AUR, Scoop, and the GHCR image are not published by this fork.
- Upstream Cloudflare zones (`opencode.ai`, `beta.opencode.ai`,
  `trust.opencode.ai`), R2 buckets `opencode-*-files`, Worker/D1 names, and the
  `models.opencode.ai` model catalog. The `opencode` provider needs these
  endpoints, so they stay until the provider itself is replaced.
- Releases are published with the workflow's `GITHUB_TOKEN`; no separate
  release token is needed.

## Pending

- Publish `@elhadry/pty@0.4.0`, then move the PTY packages and binary name with
  a compatibility alias.
- Add Linux and macOS build jobs, which also unblock WSL remote installs and
  non-Windows `elhadry upgrade`.
- Replace the console and desktop brand imagery with real Elhadry assets, and
  point `packages/gui-extensions/src/wsl/remote-cli.ts` at a published Linux
  CLI binary instead of the retired `elhadry.ai/v2/install` URL.

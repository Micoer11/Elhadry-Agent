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
  `mcp__opencode__` tool prefix, and `ai.opencode/sessionID`.
- Storage and lock keys that must stay readable by existing installs, such as
  `opencode.global.dat`, `opencode.settings`, `opencode.status`,
  `.git/opencode-pack.lock`, and the `opencode` / `opencode2` theme keys (the
  picker displays "Elhadry Agent" / "Elhadry Agent V2").
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

## Hosting identities still upstream

These point at real infrastructure and need new names plus a migration before
they can change:

- GitHub repository `anomalyco/opencode`, release fetches, `validGitHubClaims`
  in `services/update/src/index.ts`, and the release workflows' repo claims.
- Homebrew tap/formula (`anomalyco/tap/opencode`, `opencode-bin`,
  `opencode-beta`, `opencode-desktop`), AUR `opencode-bin`, winget IDs, Scoop,
  and the GHCR image.
- Cloudflare zones (`opencode.ai`, `dev.opencode.ai`, `beta.opencode.ai`,
  `trust.opencode.ai`), R2 buckets `opencode-*-files`, Worker/D1 names, and the
  `models.opencode.ai` model catalog endpoints.
- The update service accepts both `update.elhadry.ai` and legacy
  `update.opencode.ai` hostnames and both `elhadry/` and `opencode/`
  User-Agent prefixes, so old clients keep updating.

## Pending

- Publish `@elhadry/pty@0.4.0`, then move the PTY packages and binary name with
  a compatibility alias.
- Replace the console and desktop brand imagery with real Elhadry assets.

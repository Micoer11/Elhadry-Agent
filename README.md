<p align="center">
  <a href="https://elhadry.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Elhadry Agent logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@elhadry/cli"><img alt="npm" src="https://img.shields.io/npm/v/@elhadry/cli?style=flat-square" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a>
</p>

[![Elhadry Agent Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://elhadry.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://elhadry.ai/v2/install | bash

# Package managers
npm i -g @elhadry/cli@latest      # or bun/pnpm/yarn
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

Elhadry Agent is also available as a desktop application. Download it from [elhadry.ai/download](https://elhadry.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `elhadry-desktop-mac-arm64.dmg`    |
| macOS (Intel)         | `elhadry-desktop-mac-x64.dmg`      |
| Windows               | `elhadry-desktop-win-x64.exe`      |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

#### Installation Directory

The install script installs Elhadry Agent to `$HOME/.elhadry/bin`.

### Agents

Elhadry Agent includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://elhadry.ai/docs/agents).

### Documentation

For more info on how to configure Elhadry Agent, [**head over to our docs**](https://elhadry.ai/docs).

### Contributing

If you're interested in contributing to Elhadry Agent, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on Elhadry Agent

If you are working on a project that's related to Elhadry Agent and is using "elhadry" as part of its name, for example "elhadry-dashboard" or "elhadry-mobile", please add a note to your README to clarify that it is not built by the Elhadry Agent team and is not affiliated with us in any way.

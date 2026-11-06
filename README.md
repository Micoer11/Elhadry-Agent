<p align="center">
  <img src="packages/desktop/app-icon.png" width="112" alt="Elhadry Agent" />
</p>

<h1 align="center">Elhadry Agent</h1>

<p align="center">AI coding agent that runs on your own computer.</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a>
</p>

---

## Download

Every version is built automatically on GitHub and published on the
[Releases page](https://github.com/Micoer11/Elhadry-Agent-Releases/releases/latest).
Nothing needs to be compiled on your machine.

| What                      | File                               |
| ------------------------- | ---------------------------------- |
| Windows installer         | `elhadry-desktop-windows-x64.exe`  |
| Windows portable (no install) | `elhadry-desktop-windows-x64.zip` |
| Windows command line tool | `elhadry-cli-windows-x64.exe`      |
| Update information        | `version.json`                     |

These links always point at the newest release:

- Installer: `https://github.com/Micoer11/Elhadry-Agent-Releases/releases/latest/download/elhadry-desktop-windows-x64.exe`
- Portable: `https://github.com/Micoer11/Elhadry-Agent-Releases/releases/latest/download/elhadry-desktop-windows-x64.zip`
- CLI: `https://github.com/Micoer11/Elhadry-Agent-Releases/releases/latest/download/elhadry-cli-windows-x64.exe`

### First run on Windows

The builds are not code signed, so Windows SmartScreen may show a warning:

1. Click **More info**.
2. Click **Run anyway**.

The portable zip only needs to be extracted and `Elhadry Agent.exe` started.

## Command line tool

Open PowerShell and download the CLI:

```powershell
curl.exe -L -o "$env:LOCALAPPDATA\elhadry.exe" https://github.com/Micoer11/Elhadry-Agent-Releases/releases/latest/download/elhadry-cli-windows-x64.exe
& "$env:LOCALAPPDATA\elhadry.exe" --version
```

Then start it in the folder you want to work in:

```powershell
cd C:\path\to\your\project
& "$env:LOCALAPPDATA\elhadry.exe"
```

## Updates

Elhadry Agent updates itself. It checks the newest release when it starts and
again every 30 minutes, then shows a **Download Elhadry Agent** button in the
sidebar above Settings when a newer version exists. The download starts only
after you confirm it, and it fetches just the parts that changed when possible.
After the download, install and restart from the same button; your settings and
chats are kept.

You can also check by hand from **Settings → Updates**, or download the newest
installer from the
[Releases page](https://github.com/Micoer11/Elhadry-Agent-Releases/releases/latest)
and run it.

Each release keeps its own files, so an older version can be installed again at
any time from the Releases page.

## Build from source

The build runs on GitHub Actions (`.github/workflows/build-release.yml`) and
publishes the result as a release. To build locally:

```bash
bun install
bun run --cwd packages/desktop dev
```

The repository contains source code only. `node_modules`, build output and
binaries are never committed.

## License

MIT. See [LICENSE](./LICENSE).

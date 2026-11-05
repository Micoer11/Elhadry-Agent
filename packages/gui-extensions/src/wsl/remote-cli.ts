// The part of the SSH extension's remote CLI scripts that WSL uses. Extensions share only contracts, so
// keep the two copies in step.

export function quote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function requireVersion(version: string) {
  if (version !== "local" && !/^[0-9][a-zA-Z0-9.+-]*$/.test(version)) throw new Error(version)

  return version
}

export function discoverScript() {
  return `cli=""
if [ -z "$cli" ] && [ -x "$HOME/.elhadry/bin/elhadry" ]; then cli="$HOME/.elhadry/bin/elhadry"; fi
if [ -n "$cli" ]; then printf '%s\\n' "$cli"; fi
`
}

// Adapters supply a quoted shell expression, including remote HOME or wslpath expansion.
export function versionScript(command: string) {
  return `if [ -x ${command} ]; then ${command} --version 2>/dev/null || true; fi\n`
}

export function parseVersion(output: string) {
  const line = output
    .split(/\r?\n/)
    .find((line) => line.trim())
    ?.trim()

  if (!line) return null
  const marker = line.lastIndexOf(" v")
  const version = marker === -1 ? line : line.slice(marker + 2)

  if (!version) throw new Error("V2 CLI did not provide a version")

  return version
}

/** The managed CLI installer also configures the user's shell PATH. */
/** The CLI lives in the fork's own directory so installing it never overwrites another agent's binary. */
export function installScript(input: { version: string; binary?: string }) {
  const version = requireVersion(input.version)
  const verify = `test "$("$HOME/.elhadry/bin/elhadry" --version | awk '{print $NF}' | sed 's/^v//')" = ${quote(version)}`

  if (input.binary)
    return `set -eu
mkdir -p "$HOME/.elhadry/bin"
cp ${input.binary} "$HOME/.elhadry/bin/elhadry"
chmod 755 "$HOME/.elhadry/bin/elhadry"
${verify}
`

  // The published installer writes into $HOME, so stage it in a throwaway directory and move only
  // the resulting binary into place. A pre-existing install in the user's real home stays untouched.
  return `set -eu
stage="$HOME/.elhadry/install-$$"
mkdir -p "$stage" "$HOME/.elhadry/bin"
curl -fsSL ${quote(installUrl())} | env HOME="$stage" bash -s -- --version ${quote(version)} --no-modify-path
source=""
for candidate in "$stage/.elhadry/bin/elhadry" "$stage/.opencode/bin/opencode"; do
  if [ -x "$candidate" ]; then source="$candidate"; break; fi
done
if [ -z "$source" ]; then echo "The installer did not produce a CLI binary" >&2; exit 1; fi
mv "$source" "$HOME/.elhadry/bin/elhadry"
rm -rf "$stage"
chmod 755 "$HOME/.elhadry/bin/elhadry"
${verify}
`
}

// The fork serves its own installer once published; the upstream URL keeps WSL installs working
// until then, and that installer's binary is renamed into the fork's directory above.
function installUrl() {
  return process.env.ELHADRY_INSTALL_URL ?? "https://elhadry.ai/v2/install"
}

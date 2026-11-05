export function hasExistingAppState(entries: Array<{ name: string; directory: boolean }>) {
  return entries.some((entry) => {
    if (entry.name === "elhadry.settings") return true

    // Only this app's own store namespaces count: another agent's profile in the same directory
    // (for example the upstream `opencode.global.dat`) is not state this app ever wrote.
    if (entry.name === "default.dat" || /^elhadry\..+\.dat$/.test(entry.name)) return true

    if (entry.name === "drafts.sqlite") return true

    if (/^window-state-.+\.json$/.test(entry.name)) return true

    return entry.directory && entry.name === "elhadry"
  })
}

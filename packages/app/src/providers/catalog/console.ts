type Provider = {
  id: string
  integrationID?: string
  name: string
}

export function consoleProviderGroup<T extends Provider>(providers: readonly T[]) {
  const root = providers.find((provider) => provider.id === "opencode" && provider.integrationID === "opencode")
  if (!root) return
  // The Console names its root provider `<workspace> / <product>`. Accept the Elhadry name as well as the legacy
  // Elhadry Agent one so workspaces created before the rebrand keep grouping their providers.
  const suffix = [" / Elhadry Agent", " / OpenCode"].find((value) => root.name.endsWith(value))

  if (!suffix) return
  const workspace = root.name.slice(0, -suffix.length).trim()

  if (!workspace) return
  const prefix = `${workspace} / `

  return {
    root,
    workspace,
    prefix,
    providers: providers.filter(
      (provider) => provider.integrationID === "opencode" && provider.name.startsWith(prefix),
    ),
  }
}

export function consoleProviderName(group: { prefix: string }, name: string) {
  return name.startsWith(group.prefix) ? name.slice(group.prefix.length) : name
}

import type { McpServerConfig } from "./controller"
import { readOverlay, recordAdded } from "./overlay"
import type { useServerSDK } from "@/runtime/server/client"

type SDK = ReturnType<typeof useServerSDK>

/**
 * Persists an explicit connect or disconnect so the next app start reflects it instead of falling back
 * to the saved `disabled` state. Only servers the app added, or servers in the global document
 * `config.update` writes, are updated; a server that only exists in a project document is left alone.
 */
export async function persistConnection(sdk: SDK, name: string, enabled: boolean) {
  const added = readOverlay().added[name]

  if (added) {
    const saved: McpServerConfig = { ...added, disabled: !enabled }
    recordAdded(name, saved)
    // The live connection already changed, so a failed document write must not surface as an error.
    await sdk.api.config.update({ mcp: { servers: { [name]: saved } } }).catch(() => undefined)

    return
  }

  const config = await findGlobal(sdk, name)

  if (config)
    await sdk.api.config
      .update({ mcp: { servers: { [name]: { ...config, disabled: !enabled } } } })
      .catch(() => undefined)
}

async function findGlobal(sdk: SDK, name: string) {
  const entries = await sdk.api.config.get().catch(() => [])

  // Entries are ordered lowest to highest priority with a directory entry closing each root, so the
  // first segment holds the same global documents that `config.update` writes.
  const boundary = entries.findIndex((entry) => entry.type === "directory")
  const global = boundary === -1 ? entries : entries.slice(0, boundary)

  return global.flatMap((entry) => (entry.type === "document" ? [entry.info.mcp?.servers?.[name]] : [])).at(-1)
}

import { Option, Schema } from "effect"
import { ServerConfig } from "@elhadry/schema/mcp"
import type { useServerSDK } from "@/runtime/server/client"
import type { McpServerConfig } from "./controller"

type SDK = ReturnType<typeof useServerSDK>

type McpOverlay = {
  added: Record<string, McpServerConfig>
  removed: Record<string, boolean>
}

const KEY = "elhadry.mcp.overlay.v1"

const Overlay = Schema.Struct({
  added: Schema.Record(Schema.String, ServerConfig),
  removed: Schema.Record(Schema.String, Schema.Boolean),
})

const decode = Schema.decodeUnknownOption(Schema.fromJsonString(Overlay))

const empty = (): McpOverlay => ({ added: {}, removed: {} })

export function readOverlay(): McpOverlay {
  try {
    const raw = localStorage.getItem(KEY)

    if (!raw) return empty()

    const overlay = decode(raw)

    // Decoded records are readonly; copy them so callers can record changes in place.
    if (Option.isNone(overlay)) return empty()

    return { added: { ...overlay.value.added }, removed: { ...overlay.value.removed } }
  } catch {
    return empty()
  }
}

function writeOverlay(overlay: McpOverlay) {
  try {
    localStorage.setItem(KEY, JSON.stringify(overlay))
  } catch {
    // Storage pressure should not stop a connection that already works at runtime.
  }
}

export function recordAdded(name: string, config: McpServerConfig) {
  const overlay = readOverlay()

  delete overlay.removed[name]
  overlay.added[name] = config
  writeOverlay(overlay)
}

export function recordRemoved(name: string) {
  const overlay = readOverlay()

  delete overlay.added[name]
  overlay.removed[name] = true
  writeOverlay(overlay)
}

export async function applyOverlay(sdk: SDK, directory?: string) {
  const overlay = readOverlay()
  const location = directory ? { directory } : undefined

  for (const [name, config] of Object.entries(overlay.added)) {
    // Additions saved before the start-disconnected policy have no flag. Migrate them once so a
    // restart does not silently connect a server the user never authorized.
    const saved = config.disabled === undefined ? { ...config, disabled: true } : config

    if (saved !== config) recordAdded(name, saved)

    // The app keeps its own durable copy, so additions still apply when a config write was not available.
    await sdk.api.mcp.add({ server: name, config: saved, location }).catch(() => undefined)
  }

  for (const name of Object.keys(overlay.removed)) {
    await sdk.api.mcp.remove({ server: name, location }).catch(() => undefined)
  }
}

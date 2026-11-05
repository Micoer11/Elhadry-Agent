import { createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import type { ExperimentalMcpAddInput, McpServer } from "@elhadry/client/promise"
import type { useGlobal } from "@/runtime/server/runtime"
import { ServerConnection } from "@/runtime/server/registry"
import type { useLayout } from "@/shell/state/layout"
import type { useLanguage } from "@/runtime/i18n/language"
import { usePlatform } from "@/runtime/platform/platform"
import { formatServerError } from "@/runtime/server/errors"
import { showToast } from "@/shell/notifications/toast"
import { MCP_CATALOG, type McpCatalogEntry } from "./catalog"
import { persistConnection } from "./config"
import { applyOverlay, recordAdded, recordRemoved } from "./overlay"

type Global = ReturnType<typeof useGlobal>

type Layout = ReturnType<typeof useLayout>

type Language = ReturnType<typeof useLanguage>

export type ConnectionEntry = {
  server: McpServer
  catalog?: McpCatalogEntry
}

export type McpServerConfig = ExperimentalMcpAddInput["config"]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useConnectionsController(input: { global: Global; layout: Layout; language: Language }) {
  const platform = usePlatform()

  const [state, setState] = createStore<{
    loading: boolean
    refreshing: boolean
    busy: Record<string, boolean>
    linked: McpServer[]
    error?: string
  }>({ loading: true, refreshing: false, busy: {}, linked: [] })

  const [tab, setTab] = createSignal<"available" | "linked">("available")
  const [search, setSearch] = createSignal("")
  let generation = 0
  let disposed = false
  let overlaySynced = false

  const connection = createMemo(() => {
    const servers = input.global.servers.list()
    const selected = input.layout.home.selection().server

    return servers.find((item) => ServerConnection.key(item) === selected) ?? servers[0]
  })

  const context = createMemo(() => {
    const conn = connection()

    return conn ? input.global.ensureServerCtx(conn) : undefined
  })

  const projects = createMemo(() => context()?.projects.list() ?? [])

  const currentDirectory = createMemo(() => {
    const route = input.layout.route()

    if (route.type === "session") return context()?.data.session.get(route.sessionId)?.location.directory

    return undefined
  })

  const lastDirectory = createMemo(() => {
    const current = context()

    if (!current) return undefined

    return current.projects.last() ?? current.projects.list()[0]?.worktree
  })

  const defaultDirectory = createMemo(() => {
    const route = input.layout.route()
    const sessionDirectory = route.type === "session" ? currentDirectory() : undefined
    const list = projects()

    if (sessionDirectory && list.some((project) => project.worktree === sessionDirectory)) return sessionDirectory

    return lastDirectory() ?? list[0]?.worktree
  })

  const catalogEntry = (name: string) => MCP_CATALOG.find((entry) => entry.id === name)

  const linked = createMemo<ConnectionEntry[]>(() =>
    state.linked.map((server) => ({ server, catalog: catalogEntry(server.name) })),
  )

  const linkedNames = createMemo(() => new Set(state.linked.map((server) => server.name)))

  const matches = (query: string, values: ReadonlyArray<string | undefined>) =>
    values.some((value) => value?.toLowerCase().includes(query))

  const available = createMemo(() => {
    const query = search().trim().toLowerCase()
    const list = MCP_CATALOG.filter((entry) => !linkedNames().has(entry.id))

    if (!query) return list

    return list.filter((entry) => matches(query, [entry.name, entry.id, entry.description]))
  })

  const availableCount = createMemo(() => MCP_CATALOG.filter((entry) => !linkedNames().has(entry.id)).length)

  const linkedCount = createMemo(() => linked().length)

  const visibleLinked = createMemo(() => {
    const query = search().trim().toLowerCase()

    if (!query) return linked()

    return linked().filter((entry) =>
      matches(query, [
        entry.server.name,
        entry.server.title,
        entry.catalog?.name,
        entry.catalog?.id,
        entry.catalog?.description,
      ]),
    )
  })

  const linkedFor = (name: string) => linked().find((entry) => entry.server.name === name)

  const load = async (silent = false) => {
    const current = context()
    const directory = defaultDirectory()

    if (!current || !directory || disposed) return

    // Projects can still be loading at mount, so the first successful load applies the saved overlay.
    if (!overlaySynced) {
      overlaySynced = true
      await applyOverlay(current.sdk, directory)
    }

    const run = ++generation

    if (!silent) setState("loading", true)
    else setState("refreshing", true)

    try {
      const list = await current.sdk.api.mcp.list({ location: { directory } })

      if (disposed || run !== generation) return

      setState({ loading: false, refreshing: false, linked: list.data, error: undefined })
    } catch (error) {
      if (disposed || run !== generation) return

      setState({
        loading: false,
        refreshing: false,
        error: formatServerError(error, input.language.t, input.language.t("connections.loadFailed")),
      })
    }
  }

  const runtime = () => {
    const current = context()
    const directory = defaultDirectory()

    if (!current || !directory) throw new Error(input.language.t("connections.loadFailed"))

    return { sdk: current.sdk, location: { directory } }
  }

  const runtimeAdd = async (name: string, config: McpServerConfig) => {
    const { sdk, location } = runtime()
    await sdk.api.mcp.add({ server: name, config, location })
  }

  const runtimeRemove = async (name: string) => {
    const current = context()
    const directory = defaultDirectory()

    if (!current || !directory) return

    // Hiding it at runtime also covers configs that live in a lower-precedence document.
    await current.sdk.api.mcp.remove({ server: name, location: { directory } }).catch(() => undefined)
  }

  const persist = async (servers: Record<string, McpServerConfig | null>) => {
    const current = context()

    if (!current) throw new Error(input.language.t("connections.loadFailed"))

    // The app's own overlay is authoritative; a failed config write must not undo a live connection.
    await current.sdk.api.config.update({ mcp: { servers } }).catch(() => undefined)
    // The config store reloads on a short debounce, so give it a beat before reading the registry.
    await sleep(300)
    await load(true)
  }

  const add = async (entry: McpCatalogEntry) => {
    if (state.busy[entry.id]) return

    setState("busy", entry.id, true)

    try {
      // New servers start disabled so adding never waits on a network handshake and the first
      // explicit connect can start the OAuth flow instead of silently reporting "connected".
      const config: McpServerConfig = { type: "remote", url: entry.url, disabled: true }
      await runtimeAdd(entry.id, config)
      recordAdded(entry.id, config)
      await persist({ [entry.id]: config })
      showToast({ variant: "success", title: input.language.t("connections.toast.added"), description: entry.name })
      setTab("linked")
    } catch (error) {
      showToast({
        variant: "error",
        title: input.language.t("connections.toast.failed"),
        description: formatServerError(error, input.language.t, input.language.t("connections.toast.failed")),
      })
    } finally {
      setState("busy", entry.id, false)
    }
  }

  const addCustom = async (name: string, config: McpServerConfig) => {
    if (state.busy[name]) return

    setState("busy", name, true)

    // The form's "connect now" opt-out is explicit; anything else is saved disabled.
    const saved: McpServerConfig = { ...config, disabled: config.disabled !== false }

    try {
      await runtimeAdd(name, saved)
      recordAdded(name, saved)
      await persist({ [name]: saved })
      showToast({ title: input.language.t("connections.toast.added"), description: name })
      setTab("linked")
    } finally {
      setState("busy", name, false)
    }

    if (saved.disabled === false) await connect(name)
  }

  const remove = async (name: string) => {
    if (state.busy[name]) return

    setState("busy", name, true)

    try {
      await runtimeRemove(name)
      recordRemoved(name)
      await persist({ [name]: null })
      showToast({ title: input.language.t("connections.toast.removed") })
    } catch (error) {
      showToast({
        variant: "error",
        title: input.language.t("connections.toast.failed"),
        description: formatServerError(error, input.language.t, input.language.t("connections.toast.failed")),
      })
    } finally {
      setState("busy", name, false)
    }
  }

  // Starts the browser OAuth flow for a server that needs authorization. Callers own the busy flag
  // so connect() can reuse this without tripping its own guard.
  const authorization = async (name: string) => {
    const current = context()
    const directory = defaultDirectory()

    if (!current || !directory) return

    const list = async () =>
      (await current.sdk.api.mcp.list({ location: { directory } })).data.find((item) => item.name === name)

    // A just-added server takes a moment to appear in the MCP registry, so wait for it before
    // deciding whether this entry needs an OAuth sign-in.
    let server: McpServer | undefined

    for (let attempt = 0; attempt < 20 && !server; attempt++) {
      if (attempt > 0) await sleep(500)
      server = await list()
    }

    if (!server) return

    // Wait out the startup probe so we read the settled status instead of the transient one.
    for (let attempt = 0; attempt < 20 && server?.status.status === "pending"; attempt++) {
      await sleep(500)
      server = await list()
    }

    if (!server || server.status.status === "connected") return

    if (server.status.status !== "needs_auth") {
      await current.sdk.api.mcp.connect({ server: name, location: { directory } })
      await persistConnection(current.sdk, name, true)
      server = await list()
    }

    if (!server || server.status.status !== "needs_auth" || !server.integrationID) return

    const integration = await current.sdk.api.integration.get({
      integrationID: server.integrationID,
      location: { directory },
    })

    const method = integration.data?.methods.find((item) => item.type === "oauth" && !item.form?.length)

    if (!method || method.type !== "oauth") throw new Error(input.language.t("mcp.auth.interactiveForm", { name }))

    const attempt = await current.sdk.api.integration.oauth.connect({
      integrationID: server.integrationID,
      methodID: method.id,
      location: { directory },
    })

    platform.openExternal(attempt.data.url)
  }

  const authorize = async (name: string) => {
    if (!context() || !defaultDirectory() || state.busy[name]) return

    setState("busy", name, true)

    try {
      await authorization(name)
      await load(true)
    } catch (error) {
      showToast({
        variant: "error",
        title: input.language.t("connections.toast.failed"),
        description: formatServerError(error, input.language.t, input.language.t("connections.toast.failed")),
      })
    } finally {
      setState("busy", name, false)
    }
  }

  const connect = async (name: string) => {
    const current = context()
    const directory = defaultDirectory()

    if (!current || !directory || state.busy[name]) return

    setState("busy", name, true)

    try {
      await current.sdk.api.mcp.connect({ server: name, location: { directory } })
      await persistConnection(current.sdk, name, true)
      // The first explicit connect continues into the sign-in flow when the server asks for it.
      await authorization(name)
      await load(true)
    } catch (error) {
      showToast({
        variant: "error",
        title: input.language.t("connections.toast.failed"),
        description: formatServerError(error, input.language.t, input.language.t("connections.toast.failed")),
      })
    } finally {
      setState("busy", name, false)
    }
  }

  const disconnect = async (name: string) => {
    const current = context()
    const directory = defaultDirectory()

    if (!current || !directory || state.busy[name]) return

    setState("busy", name, true)

    try {
      await current.sdk.api.mcp.disconnect({ server: name, location: { directory } })
      await persistConnection(current.sdk, name, false)
      await load(true)
    } catch (error) {
      showToast({
        variant: "error",
        title: input.language.t("connections.toast.failed"),
        description: formatServerError(error, input.language.t, input.language.t("connections.toast.failed")),
      })
    } finally {
      setState("busy", name, false)
    }
  }

  const [timer, setTimer] = createSignal<ReturnType<typeof setInterval>>()

  onMount(() => {
    void load()

    setTimer(
      setInterval(() => {
        if (document.visibilityState === "visible") void load(true)
      }, 5_000),
    )
  })

  onCleanup(() => {
    disposed = true
    const current = timer()

    if (current) clearInterval(current)
  })

  return {
    state,
    tab,
    setTab,
    search,
    setSearch,
    available,
    availableCount,
    linked,
    linkedCount,
    visibleLinked,
    linkedFor,
    catalogEntry,
    connection,
    defaultDirectory,
    load,
    add,
    addCustom,
    remove,
    authorize,
    connect,
    disconnect,
  }
}

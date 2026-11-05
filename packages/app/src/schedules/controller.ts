import { createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import type { ExperimentalScheduleCreateInput, ScheduleInfo, SessionInfo } from "@elhadry/client/promise"
import type { useGlobal } from "@/runtime/server/runtime"
import { ServerConnection } from "@/runtime/server/registry"
import type { useLayout } from "@/shell/state/layout"
import type { useLanguage } from "@/runtime/i18n/language"
import { formatServerError } from "@/runtime/server/errors"
import { showToast } from "@/shell/notifications/toast"

type Global = ReturnType<typeof useGlobal>
type Layout = ReturnType<typeof useLayout>
type Language = ReturnType<typeof useLanguage>

export type ScheduleEntry = {
  info: ScheduleInfo
  session?: SessionInfo
}

export type CreateScheduleInput = {
  name: string
  prompt: string
  directory: string
  when: NonNullable<ExperimentalScheduleCreateInput["when"]>
  ends?: { times?: number; at?: string }
  model?: { providerID: string; id: string }
}

export type ScheduleModel = {
  providerID: string
  id: string
  name: string
}

const MARKER = "elhadry.schedules"

/**
 * Scheduled tasks live in a normal Session so they run with that project's agent, model, and files. One session per
 * project keeps the list short and gives every task the same place to report its runs.
 */
export function useSchedulesController(input: { global: Global; layout: Layout; language: Language }) {
  const [state, setState] = createStore<{
    loading: boolean
    refreshing: boolean
    rows: ScheduleEntry[]
    error?: string
  }>({ loading: true, refreshing: false, rows: [] })

  const [modelState, setModelState] = createStore<{
    directory?: string
    loading: boolean
    items: ScheduleModel[]
    preferred?: { providerID: string; id: string }
  }>({ loading: false, items: [] })

  let generation = 0
  let disposed = false

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

  const projectName = (directory: string) => {
    const project = projects().find((item) => item.worktree === directory)
    return project?.name?.trim() || project?.worktree.split(/[\\/]/).filter(Boolean).at(-1) || directory
  }

  const modelLabel = (model: { providerID: string; id: string }) =>
    modelState.items.find((item) => item.providerID === model.providerID && item.id === model.id)?.name ??
    `${model.providerID}/${model.id}`

  const load = async (silent = false) => {
    const current = context()
    if (!current || disposed) return

    const run = ++generation
    if (!silent) setState("loading", true)
    else setState("refreshing", true)

    try {
      const [sessions, schedules] = await Promise.all([
        current.sdk.api.session.list({ limit: 200, order: "desc" }),
        current.sdk.api.experimental.schedule.list({}),
      ])
      if (disposed || run !== generation) return

      const byID = new Map(sessions.data.map((session) => [session.id, session]))
      const rows = schedules
        .map((info) => ({ info, session: info.sessionID ? byID.get(info.sessionID) : undefined }))
        .sort((a, b) => {
          const rank = { active: 0, paused: 1, done: 2 }
          const status = rank[a.info.status] - rank[b.info.status]
          if (status !== 0) return status

          return (a.info.nextDueAt ?? Number.POSITIVE_INFINITY) - (b.info.nextDueAt ?? Number.POSITIVE_INFINITY)
        })

      setState({ loading: false, refreshing: false, rows, error: undefined })
    } catch (error) {
      if (disposed || run !== generation) return
      setState({
        loading: false,
        refreshing: false,
        error: formatServerError(error, input.language.t, input.language.t("schedules.loadFailed")),
      })
    }
  }

  const pendingSessions = new Map<string, Promise<SessionInfo>>()

  /**
   * Models a task can run with, for the project it belongs to. Each task stores its own model so changing the session's
   * model later does not silently change every task.
   */
  // Plain locals on purpose: the dialog calls this from an effect, and store reads there would retrigger it in a loop.
  let modelDirectory: string | undefined
  let modelReady = false

  const loadModels = async (directory: string) => {
    const current = context()
    if (!current || !directory || disposed) return
    if (modelDirectory === directory && modelReady) return

    modelDirectory = directory
    modelReady = false
    setModelState({ directory, loading: true, items: [], preferred: undefined })
    try {
      const [list, preferred] = await Promise.all([
        current.sdk.api.model.list({ location: { directory }, types: ["chat"] }),
        current.sdk.api.model.default({ location: { directory } }),
      ])
      if (disposed || modelDirectory !== directory) return
      setModelState({
        loading: false,
        items: list.data
          .filter((model) => model.enabled)
          .map((model) => ({ providerID: model.providerID, id: model.id, name: model.name })),
        preferred: preferred.data ? { providerID: preferred.data.providerID, id: preferred.data.id } : undefined,
      })
      modelReady = true
    } catch {
      if (disposed || modelDirectory !== directory) return
      setModelState({ loading: false, items: [], preferred: undefined })
    }
  }

  const schedulerSession = async (directory: string) => {
    const current = context()
    if (!current) throw new Error(input.language.t("schedules.loadFailed"))

    const key = directory
    const pending = pendingSessions.get(key)
    if (pending) return pending

    const promise = (async () => {
      const title = input.language.t("schedules.sessionTitle")
      const find = (sessions: SessionInfo[]) =>
        sessions.find((session) => session.metadata?.[MARKER] === true)
      const searched = await current.sdk.api.session.list({
        directory,
        limit: 100,
        order: "desc",
        search: title,
      })
      // A renamed session, or one created under another locale, falls outside the title search.
      const existing =
        find(searched.data) ??
        find((await current.sdk.api.session.list({ directory, limit: 200, order: "desc" })).data)
      if (existing) return existing

      const created = await current.sdk.api.session.create({
        title,
        location: { directory },
        metadata: { [MARKER]: true },
        // Scheduled tasks run while nobody is watching, so the task session does not wait on permission asks.
        permissions: [{ action: "*", resource: "*", effect: "allow" as const }],
      })
      current.data.session.remember(created)
      return created
    })()

    pendingSessions.set(key, promise)
    try {
      return await promise
    } finally {
      pendingSessions.delete(key)
    }
  }

  const create = async (value: CreateScheduleInput) => {
    const current = context()
    if (!current) throw new Error(input.language.t("schedules.loadFailed"))

    const session = await schedulerSession(value.directory)
    const info = await current.sdk.api.experimental.schedule.create({
      sessionID: session.id,
      name: value.name.trim() || undefined,
      when: value.when,
      ends: value.ends,
      prompt: value.prompt,
      model: value.model,
    })

    await load(true)
    return info
  }

  const pause = async (entry: ScheduleEntry) => {
    const current = context()
    if (!current) return

    try {
      await current.sdk.api.experimental.schedule.pause({ scheduleID: entry.info.id })
      await load(true)
      showToast({ title: input.language.t("schedules.toast.paused") })
    } catch (error) {
      showToast({
        title: input.language.t("schedules.toast.failed"),
        description: formatServerError(error, input.language.t, input.language.t("schedules.toast.failed")),
      })
    }
  }

  const resume = async (entry: ScheduleEntry) => {
    const current = context()
    if (!current) return

    try {
      await current.sdk.api.experimental.schedule.resume({ scheduleID: entry.info.id })
      await load(true)
      showToast({ title: input.language.t("schedules.toast.resumed") })
    } catch (error) {
      showToast({
        title: input.language.t("schedules.toast.failed"),
        description: formatServerError(error, input.language.t, input.language.t("schedules.toast.failed")),
      })
    }
  }

  const remove = async (entry: ScheduleEntry) => {
    const current = context()
    if (!current) return

    try {
      await current.sdk.api.experimental.schedule.delete({ scheduleID: entry.info.id })
      await load(true)
      showToast({ title: input.language.t("schedules.toast.deleted") })
    } catch (error) {
      showToast({
        title: input.language.t("schedules.toast.failed"),
        description: formatServerError(error, input.language.t, input.language.t("schedules.toast.failed")),
      })
    }
  }

  const runNow = async (entry: ScheduleEntry) => {
    const current = context()
    if (!current || !entry.info.sessionID) return

    try {
      const now = Date.now()
      await current.sdk.api.session.prompt({
        sessionID: entry.info.sessionID,
        text: entry.info.action.prompt,
        delivery: "steer",
        metadata: {
          schedule: {
            id: entry.info.id,
            ...(entry.info.name === undefined ? {} : { name: entry.info.name }),
            run: entry.info.runCount + 1,
            dueAt: now,
            late: false,
            ...(entry.info.action.model === undefined ? {} : { model: entry.info.action.model }),
          },
        },
      })
      showToast({
        title: input.language.t("schedules.toast.run"),
        description: input.language.t("schedules.toast.run.description"),
      })
    } catch (error) {
      showToast({
        title: input.language.t("schedules.toast.failed"),
        description: formatServerError(error, input.language.t, input.language.t("schedules.toast.failed")),
      })
    }
  }

  const [timer, setTimer] = createSignal<ReturnType<typeof setInterval>>()

  onMount(() => {
    void load()
    setTimer(
      setInterval(() => {
        if (document.visibilityState === "visible") void load(true)
      }, 10_000),
    )
  })

  onCleanup(() => {
    disposed = true
    const current = timer()
    if (current) clearInterval(current)
  })

  return {
    state,
    modelState,
    connection,
    projects,
    defaultDirectory,
    projectName,
    modelLabel,
    load,
    loadModels,
    create,
    pause,
    resume,
    remove,
    runNow,
  }
}

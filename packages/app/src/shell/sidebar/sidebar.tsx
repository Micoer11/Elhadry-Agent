import { skipToken, useQuery, useQueryClient } from "@tanstack/solid-query"
import { useNavigate } from "@solidjs/router"
import { createMemo, createSignal, For, type JSX, Show, startTransition } from "solid-js"
import { Schema } from "effect"
import { displayName } from "@elhadry/ui/project-avatar"
import { Icon } from "@elhadry/ui/icon"
import { IconButton } from "@elhadry/ui/icon-button"
import { Logo, Mark } from "@elhadry/ui/logo"
import { Menu } from "@elhadry/ui/menu"
import { SessionProgressIndicatorV2 } from "@elhadry/session-ui/v2/session-progress-indicator-v2"
import type { SessionInfo } from "@elhadry/client/promise"
import { useLanguage } from "@/runtime/i18n/language"
import { useCommand } from "@/shell/commands/command"
import { Persistence } from "@/runtime/persistence/schema"
import { Persist, persisted } from "@/runtime/persistence/storage"
import { ServerConnection } from "@/runtime/server/registry"
import { useGlobal } from "@/runtime/server/runtime"
import { HOME_SESSION_LIMIT, loadHomeSessionIndex, mergeHomeSessionIndex, retainHomeSessions } from "@/home/sessions/index"
import { buildHomeSessionRecords, type HomeSessionRecord } from "@/home/sessions/records"
import { sessionLabel } from "@/session/title"
import { useSettingsDialog } from "@/settings/command"
import { type LocalProject, useLayout } from "@/shell/state/layout"
import { useTabs } from "@/shell/tabs/tabs"
import { pathKey, type PathKey } from "@/workspaces/path-key"

const SidebarState = Persistence.struct({
  expanded: Persistence.record(Schema.Boolean),
})

// Keep the immutable result opaque so Solid Query does not recursively unwrap every session on mount.
const selectSessions = (sessions: SessionInfo[]) => () => sessions

export function ShellSidebar(props: { onNewSession: () => void; footer?: JSX.Element }) {
  const language = useLanguage()
  const openSettings = useSettingsDialog()
  const command = useCommand()
  const global = useGlobal()
  const layout = useLayout()
  const tabs = useTabs()
  const navigate = useNavigate()
  const [state, setState] = persisted(Persist.window("sidebar-projects"), SidebarState, { expanded: {} })

  const servers = createMemo(() => global.servers.list())

  const expanded = (key: string) => state.expanded[key] === true
  const toggle = (key: string) => setState("expanded", { ...state.expanded, [key]: !expanded(key) })

  const currentTabIndex = () => {
    const route = layout.route()

    if (route.type === "session") {
      return tabs.store.findIndex(
        (tab) =>
          tab.type === "session" &&
          tab.server === route.server &&
          (tab.sessionId === route.sessionId || tab.routeSessionId === route.sessionId),
      )
    }

    if (route.type === "draft") return tabs.store.findIndex((tab) => tab.type === "draft" && tab.draftID === route.draftID)

    return -1
  }

  const selectRelativeTab = (offset: number) => {
    const list = tabs.store

    if (list.length === 0) return
    const tab = list[(currentTabIndex() + offset + list.length) % list.length]

    if (tab) tabs.select(tab)
  }

  command.register("sidebar-tab-cycle", () => [
    {
      id: "tab.prev",
      category: "tab",
      title: language.t("command.session.previous"),
      keybind: "mod+option+ArrowLeft,ctrl+shift+tab",
      hidden: true,
      onSelect: () => selectRelativeTab(-1),
    },
    {
      id: "tab.next",
      category: "tab",
      title: language.t("command.session.next"),
      keybind: "mod+option+ArrowRight,ctrl+tab",
      hidden: true,
      onSelect: () => selectRelativeTab(1),
    },
    ...tabs.store.slice(0, 9).map((tab, index) => ({
      id: `tab.${index + 1}`,
      category: "tab",
      title: "",
      keybind: `mod+${index + 1}`,
      hidden: true,
      onSelect: () => tabs.select(tab),
    })),
  ])

  command.register("sidebar-schedules", () => [
    {
      id: "schedules.open",
      title: language.t("schedules.title"),
      category: language.t("command.category.view"),
      onSelect: () => navigate("/schedules"),
    },
  ])

  command.register("sidebar-connections", () => [
    {
      id: "connections.open",
      title: language.t("connections.title"),
      category: language.t("command.category.view"),
      onSelect: () => navigate("/connections"),
    },
  ])

  return (
    <div data-component="shell-sidebar" class="flex size-full min-h-0 flex-col gap-3">
      <div class="flex h-8 shrink-0 items-center gap-2 px-1" dir="ltr">
        <Mark class="size-[18px] shrink-0" />
        <Logo class="h-[17px] w-[98px] text-white" />
      </div>

      <button
        type="button"
        data-action="sidebar-new-session"
        class="flex h-10 w-full shrink-0 items-center justify-center gap-2.5 rounded-[10px] bg-[#3a3b3f] text-[13px] font-[500] text-v2-text-text-contrast transition-colors hover:bg-[#44454a] focus-visible:outline-none"
        onClick={() => props.onNewSession()}
      >
        <span class="flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-white/90 text-white">
          <svg viewBox="0 0 20 20" class="block size-[10px]" fill="none" aria-hidden="true">
            <path d="M10 3.5V16.5M3.5 10H16.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
          </svg>
        </span>
        <span class="truncate">{language.t("command.session.new")}</span>
      </button>

      <button
        type="button"
        data-action="sidebar-schedules"
        data-active={layout.route().type === "schedules"}
        class="flex h-8 w-full shrink-0 items-center gap-2 rounded-[10px] border border-v2-border-border-muted px-2.5 text-[13px] font-[500] text-white transition-colors hover:bg-v2-overlay-simple-overlay-hover hover:text-white data-[active=true]:bg-v2-overlay-simple-overlay-pressed data-[active=true]:text-white focus-visible:outline-none"
        onClick={() => navigate("/schedules")}
        aria-label={language.t("sidebar.schedules")}
      >
        <Icon name="clock" size="small" class="shrink-0 text-white" />
        <span class="truncate">{language.t("sidebar.schedules")}</span>
      </button>

      <button
        type="button"
        data-action="sidebar-connections"
        data-active={layout.route().type === "connections"}
        class="flex h-8 w-full shrink-0 items-center gap-2 rounded-[10px] border border-v2-border-border-muted px-2.5 text-[13px] font-[500] text-white transition-colors hover:bg-v2-overlay-simple-overlay-hover hover:text-white data-[active=true]:bg-v2-overlay-simple-overlay-pressed data-[active=true]:text-white focus-visible:outline-none"
        onClick={() => navigate("/connections")}
        aria-label={language.t("sidebar.connections")}
      >
        <Icon name="outline-globe-plus" size="small" class="shrink-0 text-white" />
        <span class="truncate">{language.t("sidebar.connections")}</span>
      </button>

      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div class="flex items-center justify-between gap-2 px-2 pb-1 pt-2">
          <span class="text-[11px] font-medium tracking-wide text-v2-text-text-faint">
            {language.t("sidebar.projects")}
          </span>
        </div>
        <Show
          when={servers().length > 0}
          fallback={<p class="px-2 py-1 text-[12px] text-v2-text-text-faint">{language.t("sidebar.projects.empty")}</p>}
        >
          <For each={servers()}>
            {(conn) => (
              <SidebarServer conn={conn} expanded={expanded} onToggle={toggle} onNewSession={props.onNewSession} />
            )}
          </For>
        </Show>
      </div>

      <div class="flex shrink-0 flex-col gap-1 border-t border-v2-border-border-muted pt-2">
        <Show when={props.footer}>{props.footer}</Show>
        <button
          type="button"
          data-action="sidebar-settings"
          class="group flex h-8 w-full shrink-0 items-center gap-2 rounded-[10px] px-2 text-[13px] text-v2-text-text-base transition-colors hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-contrast focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:outline-none"
          onClick={() => openSettings()}
          aria-label={language.t("sidebar.settings")}
        >
          <Icon name="settings-gear" size="small" class="shrink-0" />
          <span class="min-w-0 truncate">{language.t("sidebar.settings")}</span>
        </button>
      </div>
    </div>
  )
}

function SidebarServer(props: {
  conn: ServerConnection.Any
  expanded: (key: string) => boolean
  onToggle: (key: string) => void
  onNewSession: () => void
}) {
  const global = useGlobal()
  const layout = useLayout()
  const tabs = useTabs()
  const command = useCommand()
  const language = useLanguage()
  const serverKey = ServerConnection.key(props.conn)
  const ctx = createMemo(() => global.ensureServerCtx(props.conn))

  const sessionLoad = useQuery(() => {
    const current = ctx()
    const connected = current.sdk.connection.status() === "connected"

    return {
      queryKey: ["home-sessions", props.conn] as const,
      enabled: connected,
      queryFn: connected
        ? ({ signal }) => loadHomeSessionIndex((input, options) => current.sdk.api.session.list(input, options), signal)
        : skipToken,
      retry: false,
      staleTime: 30_000,
      refetchOnMount: true,
      refetchOnReconnect: true,
      select: selectSessions,
    }
  })

  const groups = createMemo(() => {
    const current = ctx()

    const sessions = retainHomeSessions(
      current.data.session.apply(
        mergeHomeSessionIndex(
          sessionLoad.isPending ? [] : (sessionLoad.data?.() ?? []),
          current.data.session.list(),
        ),
      ),
      HOME_SESSION_LIMIT,
      Date.now(),
    )

    const records = buildHomeSessionRecords({
      sessions: () => sessions,
      projectDirectories: () => undefined,
      projects: () => current.projects.list(),
      resolveProject: (session) => current.projects.forSession(session),
    })

    const byKey = new Map<PathKey, HomeSessionRecord[]>()

    for (const record of records) {
      const key = pathKey(record.project.worktree)
      const bucket = byKey.get(key)

      if (bucket) bucket.push(record)
      else byKey.set(key, [record])
    }

    const seen = new Set<PathKey>()

    const rows = current.projects.list().map((project) => {
      const key = pathKey(project.worktree)
      seen.add(key)

      return { key, project, name: displayName(project), sessions: byKey.get(key) ?? [] }
    })

    for (const [key, items] of byKey) {
      if (seen.has(key)) continue
      rows.push({ key, project: items[0].project, name: items[0].projectName, sessions: items })
    }

    return rows.toSorted(
      (a, b) => (b.sessions[0]?.session.time.updated ?? 0) - (a.sessions[0]?.session.time.updated ?? 0),
    )
  })

  const active = (session: SessionInfo) => {
    const route = layout.route()

    return route.type === "session" && route.server === serverKey && route.sessionId === session.id
  }

  const running = (session: SessionInfo) => ctx().data.session.status(session.id) === "running"

  const flatSessions = createMemo(() => groups().flatMap((group) => group.sessions))

  const selectRelativeSession = (offset: number) => {
    const list = flatSessions()

    if (list.length === 0) return
    const current = list.findIndex((record) => active(record.session))
    const record = list[(current + offset + list.length) % list.length]

    if (record) openSession(record.project, record.session)
  }

  command.register("sidebar-session-cycle", () => [
    {
      id: "session.previous",
      category: language.t("command.category.session"),
      title: language.t("command.session.previous"),
      keybind: "alt+arrowup",
      onSelect: () => selectRelativeSession(-1),
    },
    {
      id: "session.next",
      category: language.t("command.category.session"),
      title: language.t("command.session.next"),
      keybind: "alt+arrowdown",
      onSelect: () => selectRelativeSession(1),
    },
  ])

  const openSession = (project: LocalProject, session: SessionInfo) => {
    const current = ctx()
    void current.data.session.message.sync(session.id).catch(() => undefined)
    void startTransition(() => {
      const tab = tabs.addSessionTab({ server: serverKey, sessionId: session.id })
      tabs.select(tab)
      current.data.session.remember(session)
      current.projects.open(project.worktree)
      current.projects.touch(project.worktree)
    })
  }

  const closeSession = (session: SessionInfo) => {
    const index = tabs.store.findIndex(
      (tab) =>
        tab.type === "session" &&
        tab.server === serverKey &&
        (tab.sessionId === session.id || tab.routeSessionId === session.id),
    )

    if (index !== -1) tabs.closeTab(index)
  }

  const isOpen = (session: SessionInfo) =>
    tabs.store.some(
      (tab) =>
        tab.type === "session" &&
        tab.server === serverKey &&
        (tab.sessionId === session.id || tab.routeSessionId === session.id),
    )

  const [names, setNames] = persisted(Persist.window("sidebar-project-names"), Persistence.record(Schema.String), {})
  const [renaming, setRenaming] = createSignal<string>()
  const [draft, setDraft] = createSignal("")

  const queryClient = useQueryClient()
  const [pins, setPins] = persisted(Persist.window("sidebar-pinned-sessions"), Persistence.record(Schema.Boolean), {})
  const [renamingSession, setRenamingSession] = createSignal<string>()
  const [sessionDraft, setSessionDraft] = createSignal("")

  const sortSessions = (sessions: HomeSessionRecord[]) =>
    [...sessions].sort((a, b) => Number(!!pins[b.session.id]) - Number(!!pins[a.session.id]))

  const relativeTime = (updated: number) => {
    const minutes = Math.floor((Date.now() - updated) / 60_000)

    if (minutes < 1) return language.t("common.time.justNow")
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`

    return `${Math.floor(hours / 24)}d`
  }

  const saveSessionRename = (session: SessionInfo) => {
    if (renamingSession() !== session.id) return
    const title = sessionDraft().trim()
    setRenamingSession(undefined)
    if (!title || title === sessionLabel(session)) return
    const current = ctx()
    current.data.session.remember({ ...session, title })
    void current.sdk.api.session.update({ sessionID: session.id, title }).catch(() => undefined)
  }

  const projectName = (group: { key: PathKey; name: string }) => names[group.key] || group.name

  const isDefaultProject = (group: { name: string }) =>
    group.name === language.t("desktop.onboarding.defaultProject")

  const startRename = (group: { key: PathKey; name: string }) => {
    setDraft(projectName(group))
    setRenaming(group.key)
  }

  const saveRename = (group: { key: PathKey; name: string }) => {
    if (renaming() !== group.key) return
    const value = draft().trim()
    setNames(group.key, value === group.name ? "" : value)
    setRenaming(undefined)
  }

  return (
    <div class="flex flex-col gap-0.5">
      <For each={groups()}>
        {(group) => (
          <div data-slot="sidebar-project">
            <div class="group/project relative flex items-center">
              <Show
                when={renaming() === group.key}
                fallback={
                  <button
                    type="button"
                    data-action="sidebar-project-toggle"
                    data-open={props.expanded(group.key)}
                    class="group flex h-8 w-full items-center gap-1.5 rounded-[10px] px-2 text-[13px] text-v2-text-text-contrast transition-colors hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:outline-none"
                    onClick={() => props.onToggle(group.key)}
                    aria-expanded={props.expanded(group.key)}
                  >
                    <Icon
                      name={
                        props.expanded(group.key)
                          ? "chevron-down"
                          : language.direction() === "rtl"
                            ? "chevron-left"
                            : "chevron-right"
                      }
                      size="small"
                      class="shrink-0 text-v2-text-text-faint"
                    />
                    <Icon name="folder" size="small" class="shrink-0 text-v2-text-text-contrast" />
                    <span class="min-w-0 flex-1 truncate text-start">{projectName(group)}</span>
                    <Show when={group.sessions.length > 0}>
                      <span class="shrink-0 text-[11px] text-v2-text-text-faint group-hover/project:opacity-0">
                        {group.sessions.length}
                      </span>
                    </Show>
                  </button>
                }
              >
                <div class="flex h-8 w-full items-center gap-1.5 rounded-[10px] bg-v2-overlay-simple-overlay-hover px-2 text-[13px]">
                  <Icon name="folder" size="small" class="shrink-0 text-v2-text-text-contrast" />
                  <input
                    value={draft()}
                    class="min-w-0 flex-1 rounded-[6px] bg-v2-background-bg-layer-03 px-1.5 text-[13px] text-v2-text-text-contrast outline-none"
                    autofocus
                    onInput={(event) => setDraft(event.currentTarget.value)}
                    onBlur={() => saveRename(group)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== "Escape") return
                      event.stopPropagation()
                      if (event.key === "Enter") saveRename(group)
                      else setRenaming(undefined)
                    }}
                  />
                </div>
              </Show>
              <div class="absolute end-0.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/project:opacity-100 focus-within:opacity-100">
                <IconButton
                  data-action="sidebar-project-new-session"
                  icon={<Icon name="plus" size="small" />}
                  variant="ghost-muted"
                  size="small"
                  aria-label={language.t("command.session.new")}
                  onClick={() => {
                    const current = ctx()
                    current.projects.open(group.project.worktree)
                    current.projects.touch(group.project.worktree)
                    void tabs.newDraft({ server: serverKey, directory: group.project.worktree }, "")
                  }}
                />
                <Menu gutter={4} placement="bottom-end">
                  <Menu.Trigger
                    as={IconButton}
                    data-action="sidebar-project-menu"
                    icon={<Icon name="outline-dots" size="small" />}
                    variant="ghost-muted"
                    size="small"
                    aria-label={language.t("common.moreOptions")}
                  />
                  <Menu.Portal>
                    <Menu.Content data-menu-glass class="w-[164px] rounded-[18px]">
                      <Menu.Item onSelect={() => startRename(group)}>
                        <Icon name="pencil-line" size="small" />
                        <span class="min-w-0 flex-1 truncate">{language.t("common.rename")}</span>
                      </Menu.Item>
                      <Menu.Separator />
                      <Show when={!isDefaultProject(group)}>
                        <Menu.Item
                          onSelect={() => {
                            const current = ctx()
                            const sessionIDs = group.sessions.map((record) => record.session.id)
                            for (const record of group.sessions) {
                              if (isOpen(record.session)) closeSession(record.session)
                            }
                            queryClient.setQueryData<SessionInfo[]>(
                              ["home-sessions", props.conn],
                              (list) => list?.filter((item) => !sessionIDs.includes(item.id)),
                            )
                            current.projects.remove(group.project.worktree)
                            void Promise.all(
                              sessionIDs.map((id) => current.data.session.remove(id).catch(() => undefined)),
                            ).finally(() =>
                              queryClient.invalidateQueries({
                                queryKey: ["home-sessions", props.conn],
                                exact: true,
                              }),
                            )
                          }}
                        >
                          <Icon name="trash" size="small" class="text-[#ff5d5d]" />
                          <span class="min-w-0 flex-1 truncate text-[#ff5d5d]">
                            {language.t("workspace.delete.button")}
                          </span>
                        </Menu.Item>
                      </Show>
                    </Menu.Content>
                  </Menu.Portal>
                </Menu>
              </div>
            </div>
            <Show when={props.expanded(group.key)}>
              <div class="flex flex-col gap-0.5 py-0.5">
                <Show
                  when={group.sessions.length > 0}
                  fallback={
                    <p class="py-1 ps-9 pe-2 text-[12px] text-v2-text-text-faint">
                      {language.t("sidebar.project.empty")}
                    </p>
                  }
                >
                  <For each={sortSessions(group.sessions)}>
                    {(record) => (
                      <div class="group/session relative flex items-center">
                        <Show
                          when={renamingSession() === record.session.id}
                          fallback={
                            <button
                              type="button"
                              data-action="sidebar-project-session"
                              data-active={active(record.session)}
                              title={sessionLabel(record.session)}
                              class="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-[10px] ps-9 pe-2 text-[13px] text-v2-text-text-muted transition-colors hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base data-[active=true]:bg-v2-overlay-simple-overlay-pressed data-[active=true]:text-v2-text-text-contrast focus-visible:outline-none"
                              onClick={() => openSession(record.project, record.session)}
                            >
                              <Show when={pins[record.session.id]}>
                                <Icon name="pin" size="small" class="shrink-0 text-v2-text-text-faint" />
                              </Show>
                              <span class="min-w-0 flex-1 truncate text-start">
                                {sessionLabel(record.session)}
                              </span>
                            </button>
                          }
                        >
                          <div class="flex h-8 min-w-0 flex-1 items-center rounded-[10px] bg-v2-overlay-simple-overlay-hover ps-9 pe-2">
                            <input
                              value={sessionDraft()}
                              class="min-w-0 flex-1 rounded-[6px] bg-v2-background-bg-layer-03 px-1.5 text-[13px] text-v2-text-text-contrast outline-none"
                              autofocus
                              onInput={(event) => setSessionDraft(event.currentTarget.value)}
                              onBlur={() => saveSessionRename(record.session)}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== "Escape") return
                                event.stopPropagation()
                                if (event.key === "Enter") saveSessionRename(record.session)
                                else setRenamingSession(undefined)
                              }}
                            />
                          </div>
                        </Show>
                        <div class="absolute end-1 flex items-center gap-0.5">
                          <Show
                            when={running(record.session)}
                            fallback={
                              <span class="text-[11px] text-v2-text-text-faint transition-opacity group-hover/session:opacity-0">
                                {relativeTime(record.session.time.updated)}
                              </span>
                            }
                          >
                            <span
                              role="status"
                              aria-label={language.t("session.timeline.working")}
                              class="flex size-4 shrink-0 items-center justify-center text-v2-icon-icon-muted"
                            >
                              <SessionProgressIndicatorV2 class="shrink-0" />
                            </span>
                          </Show>
                          <div class="flex items-center opacity-0 transition-opacity group-hover/session:opacity-100 focus-within:opacity-100">
                            <Menu gutter={4} placement="bottom-end">
                              <Menu.Trigger
                                as={IconButton}
                                data-action="sidebar-session-menu"
                                icon={<Icon name="outline-dots" size="small" />}
                                variant="ghost-muted"
                                size="small"
                                aria-label={language.t("common.moreOptions")}
                              />
                              <Menu.Portal>
                                <Menu.Content data-menu-glass class="w-[164px] rounded-[18px]">
                                  <Menu.Item
                                    onSelect={() =>
                                      setPins(record.session.id, !pins[record.session.id])
                                    }
                                  >
                                    <Icon name="pin" size="small" />
                                    <span class="min-w-0 flex-1 truncate">
                                      {pins[record.session.id] ? "Unpin session" : "Pin session"}
                                    </span>
                                  </Menu.Item>
                                  <Menu.Item
                                    onSelect={() => {
                                      setSessionDraft(sessionLabel(record.session))
                                      setRenamingSession(record.session.id)
                                    }}
                                  >
                                    <Icon name="pencil-line" size="small" />
                                    <span class="min-w-0 flex-1 truncate">{language.t("common.rename")}</span>
                                  </Menu.Item>
                                  <Menu.Separator />
                                  <Menu.Item
                                    onSelect={() => {
                                      const current = ctx()
                                      const id = record.session.id
                                      if (isOpen(record.session)) closeSession(record.session)
                                      queryClient.setQueryData<SessionInfo[]>(
                                        ["home-sessions", props.conn],
                                        (list) => list?.filter((item) => item.id !== id),
                                      )
                                      void current.data.session
                                        .remove(id)
                                        .catch(() => undefined)
                                        .finally(() =>
                                          queryClient.invalidateQueries({
                                            queryKey: ["home-sessions", props.conn],
                                            exact: true,
                                          }),
                                        )
                                    }}
                                  >
                                    <Icon name="trash" size="small" class="text-[#ff5d5d]" />
                                    <span class="min-w-0 flex-1 truncate text-[#ff5d5d]">
                                      {language.t("session.delete.button")}
                                    </span>
                                  </Menu.Item>
                                </Menu.Content>
                              </Menu.Portal>
                            </Menu>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </Show>
          </div>
        )}
      </For>
    </div>
  )
}

import { createMemo, lazy, on, onCleanup, Show, Suspense } from "solid-js"
import { Icon } from "@elhadry/ui/icon"
import { IconButton } from "@elhadry/ui/icon-button"
import { Keybind } from "@elhadry/ui/keybind"
import { Tooltip } from "@elhadry/ui/tooltip"
import { Command, createKeyed, MenuItem, onIdle, Panel, Slot, type MountedSession, type Setup } from "../sdk"
import type Terminal from "./index"
import { createTerminalModel, type TerminalWorkspace } from "./model"

// The terminal is a side tab, next to the browser and the workspace files, not a panel under the session.
const PANEL = "terminal:main"

const setup: Setup<typeof Terminal> = (ctx) => {
  const sessions = ctx.sessions
  const layout = ctx.layout
  const model = createTerminalModel({ storage: ctx.storage, sessions })

  onCleanup(model.dispose)
  // The host withdraws the listener with the extension.
  ctx.workspaces.on("remove", model.remove)

  // The routed session's workspace stays loaded while no panel renders it, like the session route did.
  const workspace = createMemo<TerminalWorkspace | undefined>((previous) => {
    const session = sessions.current()

    return session ? model.load(session) : previous
  })

  // The workspace each later route change leaves.
  const left = createMemo(
    on(workspace, (next, previous) => (previous && next !== previous ? previous : undefined), { defer: true }),
  )

  // A workspace the route leaves drops its restore buffers.
  createKeyed(left, (previous) => previous.trimAll())

  const routed = createMemo(() => !!sessions.current())

  const current = () => {
    const session = sessions.current()

    if (!session) return

    return { session, terminal: model.load(session) }
  }

  ctx.add(
    Command,
    (): Command => ({
      id: "toggle",
      title: ctx.t("command.toggle"),
      group: ctx.t("command.category.view"),
      section: "terminal",
      featured: true,
      bind: "ctrl+`",
      slash: { name: "terminal", after: "open" },
      editable: true,
      enabled: routed(),
      run() {
        const target = current()

        if (!target) return

        if (layout.state(PANEL, target.session) === "visible") {
          target.terminal.cancelFocus()
          layout.close(PANEL, target.session)

          return
        }

        layout.open(PANEL, target.session)
        target.terminal.requestFocus(target.terminal.active())
      },
    }),
  )

  ctx.add(
    Command,
    (): Command => ({
      id: "new",
      title: ctx.t("command.new"),
      description: ctx.t("command.new.description"),
      group: ctx.t("command.category"),
      section: "terminal",
      bind: "ctrl+alt+t",
      editable: true,
      enabled: routed(),
      run() {
        const target = current()

        if (!target) return

        layout.open(PANEL, target.session)

        if (target.terminal.all().length > 0) target.terminal.new()

        if (target.terminal.all().length === 0) target.terminal.requestFocus()
      },
    }),
  )

  ctx.add(
    Command,
    (): Command => ({
      id: "close",
      title: ctx.t("close"),
      group: ctx.t("command.category"),
      section: "terminal",
      bind: "mod+w",
      hidden: true,
      scope: '[data-component="terminal"]',
      enabled: routed(),
      run() {
        const target = current()

        if (!target) return

        const id = target.terminal.active()

        if (!id) return

        const last = target.terminal.all().length === 1

        void target.terminal.close(id)

        if (last) layout.close(PANEL, target.session)
      },
    }),
  )

  // The review panel's + menu opens the terminal tab for the routed session.
  ctx.add(MenuItem, (): MenuItem | undefined => {
    if (!routed()) return undefined

    return {
      menu: "session.panel",
      id: "open",
      title: ctx.t("tab.title"),
      icon: "terminal-prompt",
      keybind: "terminal.toggle",
      order: 30,
      run() {
        const target = current()

        if (!target) return

        layout.open(PANEL, target.session)
        target.terminal.requestFocus(target.terminal.active())
      },
    }
  })

  const TerminalPanel = lazy(() => import("./panel"))

  // Warms the panel chunk so the first tab open has no blank frame. ghostty-web still loads on the first terminal.
  onCleanup(onIdle(() => void TerminalPanel.preload()))
  // A stored terminal tab renders with its session at startup, so its chunk loads with the app, not when it idles.
  createKeyed(
    () => sessions.list().some((session) => layout.state(PANEL, session) !== "closed"),
    () => void TerminalPanel.preload(),
  )

  // Stable objects with live titles, so a locale change never remounts the tab's terminals.
  const tab = {
    id: "main",
    get title() {
      return ctx.t("tab.title")
    },
  }

  const newTerminalKeybind = createMemo(() => [...ctx.keybinds.keybind("terminal.new")])

  const TerminalNewButton = (props: { session: MountedSession }) => {
    const workspace = () => model.load(props.session)

    // A lone terminal needs no strip of its own, so its new-terminal action joins the side strip.
    return (
      <Show when={workspace().all().length <= 1}>
        <Tooltip
          value={
            <>
              {ctx.t("command.new")}
              <Show when={newTerminalKeybind().length > 0}>
                <Keybind keys={newTerminalKeybind()} variant="neutral" />
              </Show>
            </>
          }
          placement="bottom"
          class="flex items-center"
        >
          <IconButton
            icon={<Icon name="plus-small" size="large" />}
            variant="ghost"
            aria-label={ctx.t("command.new")}
            onClick={() => workspace().new()}
          />
        </Tooltip>
      </Show>
    )
  }

  ctx.add(Slot, {
    at: "session.panel.end",
    render: (input) => (
      <Show when={layout.state(PANEL, input.session) === "visible"}>
        <TerminalNewButton session={input.session} />
      </Show>
    ),
  })

  ctx.add(Panel, {
    id: "main",
    region: "side",
    mobile: {
      get title() {
        return ctx.t("tab.title")
      },
      order: 30,
      kind: "menu",
      icon: "terminal",
    },
    list: () => [tab],
    render: (props) => (
      <Suspense>
        <TerminalPanel model={model} session={props.session} onClose={() => layout.close(PANEL, props.session)} />
      </Suspense>
    ),
  })
}

export default setup

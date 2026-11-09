import { showToast } from "@elhadry/ui/toast"
import { lazy, onCleanup, Suspense } from "solid-js"
import { createKeyed, onIdle, Command, SettingsPage, TitlebarItem, type Setup, type SetupContext } from "../sdk"
import { updaterAction } from "./action"
import type { UpdaterState } from "./contract"
import type definition from "./index"

const setup: Setup<typeof definition> = (ctx) => {
  whatsNew(ctx)

  if (!ctx.desktop) return
  const updater = ctx.uses.updater
  const autoInstall = ctx.uses.autoInstall

  const state = () => {
    const live = updater()

    return live.status === "active" ? live.value.state() : undefined
  }

  // The pill keeps the last update it knew while the updater Ipc is pending or briefly inactive, so a restart of the
  // main extension never makes an available or staged update disappear from the sidebar.
  let pill: UpdaterState | undefined

  const pillState = () => {
    const current = state()

    if (current) pill = current

    return current ?? pill
  }

  const act = (name: "check" | "download" | "install") => {
    const live = updater()

    if (live.status === "active") return void import("./actions").then((module) => module[name](ctx, live.value))

    // Not loaded yet, or gone (disabled, failed, blocked, restarting): nothing can check or install.
    showToast({ title: ctx.t("common.requestFailed") })
  }

  const Section = lazy(() => import("./section"))
  // Settings rows are small; load them while idle so settings opens without a blank row.
  onCleanup(onIdle(() => void Section.preload()))

  ctx.add(TitlebarItem, () => {
    const current = pillState()

    if (!current) return

    // The pill follows the whole update flow, so its label and title stay visible while it downloads too.
    if (
      current.status !== "available" &&
      current.status !== "ready" &&
      current.status !== "download-required" &&
      current.status !== "downloading" &&
      current.status !== "installing"
    )
      return

    const action = updaterAction(current)
    const progress = current.status === "downloading" ? (current.progress ?? 0) : undefined
    const detail = current.status === "downloading" ? transferDetail(ctx, current) : undefined
    const run = action.run

    return {
      id: "update",
      label: ctx.t("status.label"),
      title: ctx.t(action.label, action.params),
      detail,
      busy: current.status === "installing",
      progress,
      run: run ? () => act(run) : undefined,
    }
  })

  ctx.add(SettingsPage, {
    id: "updates",
    placement: "end",
    icon: "refresh",
    available: "desktop",
    get title() {
      return ctx.t("section.title")
    },
    get entries() {
      return [
        { id: "settings-latest-release", title: ctx.t("latest.title"), description: ctx.t("latest.published") },
        { id: "settings-auto-install", title: ctx.t("auto.title"), description: ctx.t("auto.description") },
        { id: "settings-release-notes", title: ctx.t("releaseNotes.title") },
        { id: "settings-check-updates", title: ctx.t("check.title") },
      ]
    },
    render: () => (
      <Suspense>
        <Section
          state={state}
          autoInstall={autoInstall}
          run={() => {
            const run = updaterAction(state()).run

            if (run) act(run)
          }}
          check={() => act("check")}
        />
      </Suspense>
    ),
  })

  ctx.add(Command, {
    id: "check",
    get title() {
      return ctx.t("menu.check")
    },
    hidden: true,
    run: () => act("check"),
  })

  // Beta builds answer the app menu's Check for Updates in the focused window instead of a native dialog. The
  // listener ends with the generation of the main side that sends it.
  createKeyed(updater, (client) => void client.on("check", () => act("check")))
}

/** Download size and speed shown beside the titlebar label while an update transfers. */
function transferDetail(ctx: SetupContext<typeof definition>, state: Extract<UpdaterState, { status: "downloading" }>) {
  if (state.transferred === undefined || state.total === undefined || state.total <= 0) return

  const locale = ctx.locale.locale()

  const size = ctx.t("transfer.size", {
    transferred: formatBytes(locale, state.transferred),
    total: formatBytes(locale, state.total),
  })

  if (state.bytesPerSecond === undefined || state.bytesPerSecond <= 0) return size

  return ctx.t("transfer.detail", {
    size,
    speed: ctx.t("transfer.speed", { speed: formatBytes(locale, state.bytesPerSecond) }),
  })
}

function formatBytes(locale: string, bytes: number) {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const
  const index = bytes > 0 ? Math.min(units.length - 1, Math.floor(Math.log10(bytes) / 3)) : 0
  const value = bytes / 1000 ** index

  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: units.at(index) ?? "byte",
    // "short" bytes render as the singular "byte"; the long form pluralizes correctly.
    unitDisplay: index === 0 ? "long" : "short",
    maximumFractionDigits: value >= 100 || index === 0 ? 0 : 1,
  }).format(value)
}

/**
 * What's New after an update, on every platform: the release highlights since the version last seen. The first run
 * and a disabled What's New only remember the version.
 */
function whatsNew(ctx: SetupContext<typeof definition>) {
  const version = ctx.build.version
  const seen = ctx.stores.seen
  const previous = seen.value.version

  if (!version || previous === version) return

  const markSeen = () =>
    seen.update((draft) => {
      draft.version = version
    })

  if (!previous || !ctx.stores.releaseNotes.value.enabled) return markSeen()

  void import("./whats-new").then((module) => {
    if (ctx.signal.aborted) return

    module.showWhatsNew(ctx, { previous, current: version, markSeen })
  })
}

export default setup

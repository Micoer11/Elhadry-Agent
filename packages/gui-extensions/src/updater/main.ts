import { dialog } from "electron"
import { Effect, Exit, Scope } from "effect"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { MenubarItem, type MainSetup } from "../sdk/main"
import { AutoInstall, Updater } from "./contract"
import type definition from "./index"
import { logContext } from "./log"
import { make } from "./machine"

const setup: MainSetup<typeof definition> = async (ctx) => {
  const build = ctx.build
  const lifecycle = ctx.lifecycle
  // electron-updater reads its release feed from app-update.yml, which electron-builder only emits when the
  // build defines a publish provider. Without one there is nothing to check or install and the update UI stays
  // out of the way instead of failing on every check.
  const enabled = build.packaged && build.channel !== "dev" && existsSync(join(process.resourcesPath, "app-update.yml"))
  // Holds no resources, so it needs no cleanup.
  const context = logContext(ctx.log.write)
  const runPromise = Effect.runPromiseWith(context)
  const runFork = Effect.runForkWith(context)
  const ready = ctx.stores.ready
  const autoInstall = ctx.stores.autoInstall

  // electron-updater loads only in packaged builds that update, after the first window is up.
  const platform = enabled
    ? await import("./platform").then((module) => runPromise(module.make(build.channel)))
    : undefined

  if (ctx.scope.signal.aborted) return
  const scope = Scope.makeUnsafe()
  ctx.scope.addFinalizer(() => runPromise(Scope.close(scope, Exit.void)))
  const publish = { changed: () => {} }

  const updater = await runPromise(
    make({
      currentVersion: build.version,
      platform,
      // The updater stays active through the handoff, so a failed install returns to a state the user can retry.
      restart: (handoff) =>
        Effect.tryPromise({
          try: () => lifecycle.restart(() => runPromise(handoff), { keep: ctx.scope }),
          catch: (error) => error,
        }),
      persistence: {
        get: Effect.sync(() => ready.value ?? undefined),
        set: (value) => Effect.sync(() => ready.set(value)),
        clear: Effect.sync(() => ready.set(null)),
      },
      autoInstall: () => autoInstall.value.enabled,
      changed: () => publish.changed(),
    }).pipe(Scope.provide(scope)),
  )

  const provider = ctx.provide(Updater, {
    state: () => updater.state(),
    check: () => runPromise(updater.check),
    download: () => runPromise(updater.download),
    install: () => runPromise(updater.install),
  })

  const autoProvider = ctx.provide(AutoInstall, {
    state: () => autoInstall.value.enabled,
    set: (enabled) => {
      autoInstall.set({ enabled })
      autoProvider.changed()
    },
  })

  publish.changed = () => provider.changed()

  // A menu check reports what it found; the download and the restart each wait for a confirmation here.
  const confirmInstall = (version: string) =>
    Effect.gen(function* () {
      const answer = yield* promise(() =>
        dialog.showMessageBox({
          type: "info",
          message: ctx.t("dialog.ready.message", { version }),
          title: ctx.t("dialog.ready.title"),
          buttons: [ctx.t("dialog.restart"), ctx.t("dialog.later")],
          defaultId: 0,
          cancelId: 1,
        }),
      )

      if (answer.response === 0) yield* updater.install
    })

  const show = Effect.gen(function* () {
    const state = yield* updater.check

    if (state.status === "error") {
      yield* promise(() =>
        dialog.showMessageBox({
          type: "error",
          message: ctx.t("dialog.checkFailed.message"),
          title: ctx.t("dialog.checkFailed.title"),
        }),
      )

      return
    }

    if (state.status === "up-to-date") {
      yield* promise(() =>
        dialog.showMessageBox({
          type: "info",
          message: ctx.t("dialog.upToDate.message"),
          title: ctx.t("dialog.upToDate.title"),
        }),
      )

      return
    }

    if (state.status === "available") {
      const answer = yield* promise(() =>
        dialog.showMessageBox({
          type: "info",
          message: ctx.t("dialog.available.message", { version: state.version }),
          title: ctx.t("dialog.available.title"),
          buttons: [ctx.t("dialog.download"), ctx.t("dialog.later")],
          defaultId: 0,
          cancelId: 1,
        }),
      )

      if (answer.response !== 0) return

      const staged = yield* updater.download

      if (staged.status === "ready") yield* confirmInstall(staged.version)

      return
    }

    if (state.status === "ready" || state.status === "download-required") {
      yield* confirmInstall(state.version)
    }
  })

  ctx.add(
    MenubarItem,
    (): MenubarItem => ({
      menu: "app",
      id: "check",
      label: ctx.t("menu.check"),
      after: "about",
      enabled: () => enabled,
      run(window) {
        // Beta builds check in the focused window, which reports the result in-app.
        if (build.channel !== "beta") return void runFork(show)

        if (window) provider.emit("check", null, window.id)
      },
    }),
  )
}

function promise<A>(evaluate: () => Promise<A>) {
  return Effect.tryPromise(evaluate).pipe(Effect.orDie)
}

export default setup

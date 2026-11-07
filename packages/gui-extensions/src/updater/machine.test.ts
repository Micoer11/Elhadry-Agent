import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Exit, Scope } from "effect"
import type { UpdaterState } from "./contract"
import { make, type Dependencies } from "./machine"

const scopes: Scope.Closeable[] = []

afterEach(async () => {
  await Promise.all(scopes.splice(0).map((scope) => Effect.runPromise(Scope.close(scope, Exit.void))))
})

// Drives the updater the way the app does: start, check, download when the user confirms, then install like a button
// click. `calls` records the platform operations in order; downloads record whether a differential download was allowed
// and installs record the staged version they would apply. `seen` records every state the updater published.
async function setup(input?: {
  currentVersion?: string
  ready?: { version: string }
  /** Whether a background check installs what it finds; off unless a test turns it on. */
  autoInstall?: boolean
  /** The release each platform check finds, in order; the last one repeats. "offline" fails the check. */
  checks?: readonly string[]
  stage?: () => Promise<void>
  /** Percent values the platform reports while staging, in order. */
  progress?: readonly number[]
  install?: () => Promise<void>
  /** Runs before the platform answers the given 0-based check, so a test can hold one check in flight. */
  gate?: (check: number) => Promise<void>
  external?: boolean
  open?: () => Promise<void>
}) {
  const calls: string[] = []
  const seen: UpdaterState[] = []
  const store = { ready: input?.ready }
  const autoInstall = { enabled: input?.autoInstall ?? false }
  const checks = input?.checks ?? ["2.0.0"]
  const cursor = { check: 0 }

  const dependencies: Dependencies = {
    currentVersion: input?.currentVersion ?? "1.0.0",
    platform: {
      checkForUpdate: Effect.tryPromise({
        try: async () => {
          calls.push("check")
          const index = cursor.check++
          await input?.gate?.(index)
          const version = checks[Math.min(index, checks.length - 1)] ?? "2.0.0"

          if (version === "offline") throw new Error("offline")

          return input?.external
            ? { mode: "external" as const, version, url: `https://files.test/${version}.dmg` }
            : { mode: "restart" as const, version }
        },
        catch: (error) => error,
      }),
      stageUpdate: (options) =>
        Effect.tryPromise(async () => {
          calls.push(options.differential ? "download" : "download:full")

          for (const percent of input?.progress ?? []) options.onProgress?.(percent)
          await input?.stage?.()
        }),
      installAndRestart: Effect.suspend(() => {
        calls.push("install")

        return Effect.tryPromise({
          try: () => input?.install?.() ?? new Promise<void>(() => {}),
          catch: (error) => error,
        })
      }),
      externalInstall: input?.external
        ? (url) =>
            Effect.tryPromise(async () => {
              calls.push(`external:${url}`)
              await input?.open?.()
            })
        : undefined,
    },
    restart: (handoff) =>
      Effect.suspend(() => {
        calls.push("prepare")

        return handoff
      }),
    persistence: {
      get: Effect.sync(() => store.ready),
      set: (value) =>
        Effect.sync(() => {
          store.ready = value
        }),
      clear: Effect.sync(() => {
        store.ready = undefined
      }),
    },
    autoInstall: () => autoInstall.enabled,
    changed: (state) => seen.push(state),
  }

  const scope = Scope.makeUnsafe()
  scopes.push(scope)
  const updater = await Effect.runPromise(make(dependencies).pipe(Scope.provide(scope)))

  return {
    calls,
    seen,
    getReady: () => store.ready,
    state: updater.state,
    start: () => Effect.runPromise(updater.started),
    startFork: () => Effect.runFork(updater.started),
    check: () => Effect.runPromise(updater.check),
    download: () => Effect.runPromise(updater.download),
    install: () => Effect.runPromise(updater.install),
    installFork: () => Effect.runFork(updater.install),
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("updater", () => {
  // The launch check, then one silent re-check per further entry in `checks`. `rechecks` lists the states the
  // re-checks published: a ready or offered update never leaves the screen while one runs.
  test.each([
    {
      name: "reports an available update on launch without downloading or staging anything",
      input: { checks: ["2.0.0"] },
      stage: false,
      calls: ["check"],
      state: { status: "available", version: "2.0.0" },
      ready: undefined,
      rechecks: [],
    },
    {
      name: "restores a persisted target on launch without downloading again",
      input: { ready: { version: "2.0.0" }, checks: ["2.0.0"] },
      stage: false,
      calls: ["check"],
      state: { status: "ready", version: "2.0.0" },
      ready: { version: "2.0.0" },
      rechecks: [],
    },
    {
      name: "reports up to date and clears the record once the update is installed",
      input: { currentVersion: "2.0.0", ready: { version: "2.0.0" }, checks: ["2.0.0"] },
      stage: false,
      calls: ["check"],
      state: { status: "up-to-date" },
      ready: undefined,
      rechecks: [],
    },
    {
      name: "keeps differential downloads after the persisted target was installed",
      input: { currentVersion: "2.0.0", ready: { version: "2.0.0" }, checks: ["3.0.0"] },
      stage: true,
      calls: ["check", "download"],
      state: { status: "ready", version: "3.0.0" },
      ready: { version: "3.0.0" },
      rechecks: [],
    },
    {
      name: "offers a newer release without staging it while one is already staged",
      input: { checks: ["2.0.0", "3.0.0"] },
      stage: true,
      calls: ["check", "download", "check"],
      state: { status: "available", version: "3.0.0" },
      ready: { version: "2.0.0" },
      rechecks: [{ status: "available", version: "3.0.0" }],
    },
    {
      name: "later checks stay silent while ready and pick up newer versions",
      input: { checks: ["2.0.0", "2.0.0", "3.0.0"] },
      stage: true,
      calls: ["check", "download", "check", "check"],
      state: { status: "available", version: "3.0.0" },
      ready: { version: "2.0.0" },
      rechecks: [{ status: "available", version: "3.0.0" }],
    },
    {
      name: "keeps the staged update installable when a silent re-check fails",
      input: { checks: ["2.0.0", "offline"] },
      stage: true,
      calls: ["check", "download", "check"],
      state: { status: "ready", version: "2.0.0" },
      ready: { version: "2.0.0" },
      rechecks: [],
    },
    {
      name: "keeps an offered update across re-checks without republishing the same version",
      input: { checks: ["2.0.0", "2.0.0", "3.0.0"] },
      stage: false,
      calls: ["check", "check", "check"],
      state: { status: "available", version: "3.0.0" },
      ready: undefined,
      rechecks: [{ status: "available", version: "3.0.0" }],
    },
    {
      name: "offers an external installer when its version equals the running beta",
      input: { currentVersion: "2.0.0", external: true, checks: ["2.0.0"] },
      stage: false,
      calls: ["check"],
      state: { status: "download-required", version: "2.0.0" },
      ready: undefined,
      rechecks: [],
    },
    {
      name: "keeps an external installer available when a refresh fails",
      input: { external: true, checks: ["2.0.0", "offline"] },
      stage: false,
      calls: ["check", "check"],
      state: { status: "download-required", version: "2.0.0" },
      ready: undefined,
      rechecks: [],
    },
  ])("$name", async (row) => {
    const app = await setup(row.input)
    await app.start()

    // Confirm the offer the launch check found, so the remaining rows exercise the staged-update paths.
    if (row.stage) await app.download()
    const launched = app.seen.length
    await row.input.checks.slice(1).reduce<Promise<unknown>>((chain) => chain.then(app.check), Promise.resolve())

    expect(app.calls).toEqual([...row.calls])
    expect(app.state()).toEqual(row.state)
    expect(app.getReady()).toEqual(row.ready)
    expect(app.seen.slice(launched)).toEqual([...row.rechecks])
  })

  test.each([
    {
      name: "pressing download stages the offered release once",
      then: undefined,
      calls: ["check", "download"],
    },
    {
      name: "pressing download twice stages once",
      then: "download",
      calls: ["check", "download"],
    },
    {
      name: "a check after staging refreshes without downloading again",
      then: "check",
      calls: ["check", "download", "check"],
    },
  ])("$name", async (row) => {
    const app = await setup()
    await app.start()
    await app.download()

    if (row.then === "download") await app.download()

    if (row.then === "check") await app.check()

    expect(app.calls).toEqual([...row.calls])
    expect(app.state()).toEqual({ status: "ready", version: "2.0.0" })
    expect(app.getReady()).toEqual({ version: "2.0.0" })
  })

  test("installs a release found on launch when automatic installation is on", async () => {
    const app = await setup({ autoInstall: true })

    app.startFork()
    await tick()
    await tick()

    expect(app.calls).toEqual(["check", "download", "prepare", "install"])
    expect(app.state()).toEqual({ status: "installing", version: "2.0.0" })
  })

  test("waits for an in-flight launch check before installing a restored release", async () => {
    const gate = Promise.withResolvers<void>()
    const app = await setup({ ready: { version: "2.0.0" }, checks: ["2.0.0"], gate: () => gate.promise })

    app.startFork()
    await tick()
    expect(app.state()).toEqual({ status: "ready", version: "2.0.0" })
    expect(app.calls).toEqual(["check"])

    app.installFork()
    await tick()
    expect(app.calls).toEqual(["check"])

    gate.resolve()
    await tick()
    expect(app.calls).toEqual(["check", "prepare", "install"])
    expect(app.state()).toEqual({ status: "installing", version: "2.0.0" })
  })

  test("keeps a newer launch offer instead of installing the older staged release", async () => {
    const gate = Promise.withResolvers<void>()
    const app = await setup({ ready: { version: "2.0.0" }, checks: ["3.0.0"], gate: () => gate.promise })

    app.startFork()
    await tick()
    expect(app.state()).toEqual({ status: "ready", version: "2.0.0" })

    app.installFork()
    await tick()
    expect(app.calls).toEqual(["check"])

    gate.resolve()
    await tick()
    expect(app.calls).toEqual(["check"])
    expect(app.state()).toEqual({ status: "available", version: "3.0.0" })
  })

  test("a check while the download is in flight waits for it instead of downloading again", async () => {
    const staging = Promise.withResolvers<void>()
    const app = await setup({ stage: () => staging.promise })
    await app.start()

    const download = app.download()
    await tick()
    expect(app.state()).toEqual({ status: "downloading", version: "2.0.0" })

    const check = app.check()
    await tick()
    expect(app.calls).toEqual(["check", "download"])

    staging.resolve()
    await Promise.all([download, check])
    expect(app.calls).toEqual(["check", "download"])
    expect(app.state()).toEqual({ status: "ready", version: "2.0.0" })
  })

  test("download after staging is a no-op", async () => {
    const app = await setup()
    await app.start()
    await app.download()

    expect(await app.download()).toEqual({ status: "ready", version: "2.0.0" })
    expect(app.calls).toEqual(["check", "download"])
  })

  // After the download staged 2.0.0, a click installs it at once without another check or download; `then` is a
  // second action right after it.
  test.each([
    {
      name: "clicking install twice installs the staged version once",
      checks: ["2.0.0"],
      then: "install",
      calls: ["check", "download", "prepare", "install"],
      state: { status: "installing", version: "2.0.0" },
    },
    {
      name: "ignores checks while an installation is in progress",
      checks: ["2.0.0"],
      then: "check",
      calls: ["check", "download", "prepare", "install"],
      state: { status: "installing", version: "2.0.0" },
    },
    {
      name: "installs the staged release even when a newer one is published",
      checks: ["2.0.0", "3.0.0"],
      then: undefined,
      calls: ["check", "download", "prepare", "install"],
      state: { status: "installing", version: "2.0.0" },
    },
  ])("$name", async (row) => {
    const app = await setup({ checks: row.checks })
    await app.start()
    await app.download()

    app.installFork()
    expect(app.state()).toEqual({ status: "installing", version: "2.0.0" })

    if (row.then === "install") app.installFork()

    if (row.then === "check") await app.check()
    await tick()

    expect(app.calls).toEqual([...row.calls])
    expect(app.state()).toEqual(row.state)
  })

  test("offers an external installer without staging or preparing to restart", async () => {
    const app = await setup({ external: true })

    await app.start()
    expect(app.calls).toEqual(["check"])
    expect(app.state()).toEqual({ status: "download-required", version: "2.0.0" })
    expect(app.getReady()).toBeUndefined()

    await app.install()
    expect(app.calls).toEqual(["check", "check", "external:https://files.test/2.0.0.dmg"])
    expect(app.state()).toEqual({ status: "download-required", version: "2.0.0" })
  })

  test("opens an external installer once for concurrent clicks", async () => {
    const opened = Promise.withResolvers<void>()
    const app = await setup({ external: true, open: () => opened.promise })
    await app.start()

    const clicks = Promise.all([app.install(), app.install()])
    await tick()

    expect(app.calls).toEqual(["check", "check", "external:https://files.test/2.0.0.dmg"])
    opened.resolve()
    await clicks
    expect(app.state()).toEqual({ status: "download-required", version: "2.0.0" })
  })

  test("concurrent checks share one platform check and download nothing", async () => {
    const gate = Promise.withResolvers<void>()
    const app = await setup({ gate: () => gate.promise })

    const checks = Promise.all([app.check(), app.check(), app.check()])
    await tick()
    gate.resolve()
    await checks

    expect(app.calls).toEqual(["check"])
  })

  test("publishes monotonic download progress that stays below 100 until ready", async () => {
    const app = await setup({ progress: [12.4, 50.6, 9, 99.9] })
    await app.start()
    await app.download()

    expect(app.seen.filter((state) => state.status === "downloading")).toEqual([
      { status: "downloading", version: "2.0.0" },
      { status: "downloading", version: "2.0.0", progress: 12 },
      { status: "downloading", version: "2.0.0", progress: 51 },
      { status: "downloading", version: "2.0.0", progress: 99 },
    ])
    expect(app.state()).toEqual({ status: "ready", version: "2.0.0" })
  })

  test("returns to ready after a failed installation and allows a retry", async () => {
    const attempts = { count: 0 }

    const app = await setup({
      install() {
        attempts.count++

        if (attempts.count === 1) return Promise.reject(new Error("install failed"))

        return new Promise<void>(() => {})
      },
    })

    await app.start()
    await app.download()

    await expect(app.install()).rejects.toThrow("install failed")
    expect(app.state()).toEqual({ status: "ready", version: "2.0.0" })

    app.installFork()
    await tick()
    expect(attempts.count).toBe(2)
    expect(app.state()).toEqual({ status: "installing", version: "2.0.0" })
  })
})

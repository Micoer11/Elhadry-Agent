import { app, autoUpdater } from "electron"
import pkg from "electron-updater"
import { Effect } from "effect"
import type { DownloadProgress, Platform } from "./machine"

const updateClient = pkg.autoUpdater

const restartTimeout = 10_000

export const make = Effect.fn("Updater.platform")(function* (channel: string) {
  const userAgent = `elhadry/${channel === "prod" ? "latest" : channel}/${app.getVersion()}/desktop`
  const runFork = Effect.runForkWith(yield* Effect.context())
  updateClient.logger = {
    info: (...args) => runFork(Effect.logInfo(...args)),
    warn: (...args) => runFork(Effect.logWarning(...args)),
    error: (...args) => runFork(Effect.logError(...args)),
    debug: (...args) => runFork(Effect.logDebug(...args)),
  }
  updateClient.channel = "latest"
  updateClient.requestHeaders = { "User-Agent": userAgent }
  updateClient.allowPrerelease = false
  updateClient.allowDowngrade = true
  updateClient.autoDownload = false
  updateClient.autoInstallOnAppQuit = process.platform === "darwin"
  yield* Effect.logInfo("auto updater configured", {
    channel: updateClient.channel,
    allowPrerelease: updateClient.allowPrerelease,
    allowDowngrade: updateClient.allowDowngrade,
    currentVersion: app.getVersion(),
  })

  const stageUpdate = (options: {
    readonly differential: boolean
    readonly onProgress?: (progress: DownloadProgress) => void
  }) =>
    Effect.gen(function* () {
      // Only the NSIS cache goes stale: macOS refreshes its cached zip with every download and AppImage reads the
      // blockmap embedded in the running file. An emulated x64 install updates to the ARM64 installer, which cannot be
      // patched from the cached x64 one.
      if (process.platform !== "darwin")
        updateClient.disableDifferentialDownload =
          process.platform === "win32" && (!options.differential || app.runningUnderARM64Translation)

      // electron-updater wires its progress callback only when a listener exists as the download starts, so subscribe
      // here and remove the listener as soon as the download settles.
      const onProgress = options.onProgress
      const progress = (info: DownloadProgress) => onProgress?.(info)

      if (onProgress) updateClient.on("download-progress", progress)

      yield* Effect.tryPromise({
        // The returned promise settles after electron-updater dispatches update-downloaded. Waiting for the event on
        // Electron's autoUpdater stopped the flow at 100%: electron-updater emits it on its own client.
        try: () => updateClient.downloadUpdate(),
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
      }).pipe(Effect.ensuring(Effect.sync(() => updateClient.removeListener("download-progress", progress))))
    })

  // electron-updater keeps a downloaded installer in its on-disk cache but forgets it in memory between launches.
  // Running the download again adopts that cache entry (validating its SHA-512), and is instant when this run already
  // downloaded it, so quitAndInstall always has an installer to run.
  const adoptDownloaded = Effect.tryPromise({
    try: () => updateClient.downloadUpdate(),
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  })

  // BaseUpdater.quitAndInstall emits before-quit-for-update on Electron's autoUpdater, then quits the app.
  const quitAndInstall = Effect.callback<void, Error>((resume) => {
    const cleanup = () => {
      autoUpdater.removeListener("before-quit-for-update", started)
      updateClient.removeListener("error", fail)
    }

    const started = () => {
      cleanup()
      resume(Effect.void)
    }

    const fail = (error: Error) => {
      cleanup()
      resume(Effect.fail(error))
    }

    autoUpdater.once("before-quit-for-update", started)
    updateClient.once("error", fail)

    try {
      updateClient.quitAndInstall()
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)))
    }

    return Effect.sync(cleanup)
  }).pipe(
    Effect.timeoutOrElse({
      duration: restartTimeout,
      orElse: () =>
        Effect.logError("update restart did not start").pipe(
          Effect.andThen(Effect.fail(new Error("Update restart did not start"))),
        ),
    }),
  )

  const installAndRestart = adoptDownloaded.pipe(Effect.andThen(quitAndInstall))

  return {
    checkForUpdate: Effect.tryPromise({
      try: async () => {
        const result = await updateClient.checkForUpdates()

        if (!result?.isUpdateAvailable) return undefined
        const files = result.updateInfo.files
        // electron-updater picks the installer whose name contains process.arch, which emulation on Windows ARM64
        // reports as x64. downloadUpdate() reads this same list, so keeping only the ARM64 installer moves the install
        // to the native build. macOS needs nothing here: electron-updater already prefers arm64 under Rosetta.
        const native = files.filter((file) => file.url.includes("arm64"))

        if (process.platform === "win32" && app.runningUnderARM64Translation && native.length > 0) {
          files.splice(0, files.length, ...native)
          runFork(
            Effect.logInfo("updating emulated x64 install to native ARM64", { urls: native.map((file) => file.url) }),
          )
        }

        return { mode: "restart", version: result.updateInfo.version } as const
      },
      catch: (error) => error,
    }),
    stageUpdate,
    installAndRestart,
  } satisfies Platform
})

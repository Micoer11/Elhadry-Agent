export * as Tunnel from "./tunnel.js"

import { Context, Deferred, Effect, Fiber, Layer, Ref, Schema, Scope, Stream } from "effect"
import { randomUUID } from "node:crypto"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import os from "os"
import path from "path"
import { Tunnel } from "@elhadry/schema/tunnel"
import { FSUtil } from "@elhadry/util/fs-util"
import { AppProcess } from "@elhadry/util/process"
import { makeGlobalNode } from "@elhadry/util/effect/app-node"

export const Info = Tunnel.Info
export type Info = Tunnel.Info

/** Cloudflare's own release channel; a quick tunnel needs no account. */
const RELEASE = "https://github.com/cloudflare/cloudflared/releases/latest/download"
const URL_MARKER = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i
/**
 * Free SSH remote forwards, used only when cloudflared cannot reach Cloudflare's edge. Both services need no account,
 * and their addresses stay put for the session.
 */
const SSH_HOSTS = [
  // localhost.run works on this network; serveo.net DNS fails.
  // localhost.run has no notice, but reassigns free addresses after a few minutes.
  { host: "nokey@localhost.run", label: "localhost.run" },
  // Serveo terminates TLS and streams; it shows first-time visitors a one-click safety notice.
  { host: "serveo.net", label: "Serveo" },
] as const
const SSH_URL_MARKER = /https:\/\/[a-z0-9][a-z0-9.-]*\.(?:serveousercontent\.com|lhr\.life)/i
const SSH_FAILURE =
  /permission denied|could not resolve|connection refused|connection closed|remote port forwarding failed|kex_exchange_identification|operation timed out|rate limit|too many/i
/** Both transports accept connections shortly after printing their URL, not instantly. */
const SETTLE_MS = 1500
const START_TIMEOUT_MS = 45_000
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g

export class UnsupportedPlatformError extends Schema.TaggedError<UnsupportedPlatformError>()(
  "Tunnel.UnsupportedPlatformError",
  { platform: Schema.String, arch: Schema.String },
) {}

export class DownloadError extends Schema.TaggedError<DownloadError>()("Tunnel.DownloadError", {
  message: Schema.String,
}) {}

export class StartError extends Schema.TaggedError<StartError>()("Tunnel.StartError", {
  message: Schema.String,
}) {}

export type TunnelError = UnsupportedPlatformError | DownloadError | StartError

export interface Interface {
  /** Every link this process is publishing right now, in the order they were created. */
  readonly status: () => Effect.Effect<ReadonlyArray<Info>>
  readonly start: (input: { origin: string; password?: string }) => Effect.Effect<Info, TunnelError>
  /** Stops one link by id, or every link when no id is given, and answers with the links still running. */
  readonly stop: (id?: string) => Effect.Effect<ReadonlyArray<Info>>
}

export class Service extends Context.Service<Service, Interface>()("@elhadry/Tunnel") {}

/** The release asset Cloudflare publishes for a platform, or undefined when it publishes none. */
export function asset(platform: NodeJS.Platform = process.platform, arch: string = process.arch) {
  const name =
    platform === "win32"
      ? arch === "arm64"
        ? "cloudflared-windows-arm64.exe"
        : "cloudflared-windows-amd64.exe"
      : platform === "darwin"
        ? arch === "arm64"
          ? "cloudflared-darwin-arm64.tgz"
          : "cloudflared-darwin-amd64.tgz"
        : platform === "linux"
          ? arch === "arm64"
            ? "cloudflared-linux-arm64"
            : arch === "arm"
              ? "cloudflared-linux-arm"
              : "cloudflared-linux-amd64"
          : undefined

  return name ? { name, url: `${RELEASE}/${name}`, archive: name.endsWith(".tgz") } : undefined
}

/**
 * Where the app's installer puts cloudflared: the desktop build copies it into its resources directory, which also
 * holds the CLI executable. `ELHADRY_CLOUDFLARED` lets a deployment point at its own binary.
 */
export function bundledCopies(name: string) {
  const resources = (process as { resourcesPath?: string }).resourcesPath
  return [
    process.env.ELHADRY_CLOUDFLARED,
    resources ? path.join(resources, "cloudflared", name) : undefined,
    path.join(path.dirname(process.execPath), "cloudflared", name),
  ].filter((file): file is string => file !== undefined)
}

/** The public URL a cloudflared log line announced, if it announced one. */
export function tunnelURL(line: string) {
  return line.match(URL_MARKER)?.[0]
}

/** A cloudflared line that explains why it could not register the tunnel. */
export function tunnelFailure(line: string) {
  return /(^|\s)ERR\s|failed to (request|start|serve|connect)|no such host/i.test(line) ? line.trim() : undefined
}

/** The public URL the SSH service announced, if it announced one. */
export function sshURL(line: string) {
  return line.replace(ANSI, "").match(SSH_URL_MARKER)?.[0]
}

/** An SSH line that explains why the remote forward never came up. */
export function sshFailure(line: string) {
  const clean = line.replace(ANSI, "").trim()
  return SSH_FAILURE.test(clean) ? clean : undefined
}

/** One published link: its public description plus the transport currently serving it. */
type Active = {
  info: Info
  child?: ChildProcessSpawner.ChildProcessHandle
  fibers: ReadonlyArray<Fiber.Fiber<void>>
  job?: Fiber.Fiber<void>
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const proc = yield* AppProcess.Service
    // Transports outlive an individual call, so their pipe readers and processes live in a service scope.
    const scope = yield* Scope.make()
    const tunnels = yield* Ref.make<ReadonlyMap<string, Active>>(new Map())

    const list = Effect.fn("Tunnel.list")(function* () {
      const active = yield* Ref.get(tunnels)
      return [...active.values()].map((entry) => entry.info)
    })

    /** Rewrites one link's record; a link that was already stopped is left alone. */
    const update = (id: string, f: (entry: Active) => Active) =>
      Ref.update(tunnels, (active) => {
        const entry = active.get(id)
        if (!entry) return active
        return new Map(active).set(id, f(entry))
      })

    /** Tears down one live transport without touching the connection job that is starting another link. */
    const stopTransport = Effect.fn("Tunnel.stopTransport")(function* (id: string) {
      const entry = (yield* Ref.get(tunnels)).get(id)
      if (!entry) return
      yield* update(id, (current) => ({ ...current, fibers: [] }))
      yield* Effect.forEach(entry.fibers, (fiber) => Fiber.interrupt(fiber).pipe(Effect.ignore)).pipe(Effect.asVoid)
      // A tunnel that already exited answers the kill with an error that carries no user meaning.
      if (entry.child) yield* entry.child.kill({ forceKillAfter: "3 seconds" }).pipe(Effect.ignore)
    })

    const stop = Effect.fn("Tunnel.stop")(function* (id?: string) {
      const targets = id === undefined ? [...(yield* Ref.get(tunnels)).keys()] : [id]
      yield* Effect.forEach(
        targets,
        (key) =>
          Effect.gen(function* () {
            const entry = (yield* Ref.get(tunnels)).get(key)
            if (!entry) return
            if (entry.job) yield* Fiber.interrupt(entry.job).pipe(Effect.ignore)
            yield* stopTransport(key)
            // A stopped link is gone: its address and password must not linger in a list.
            yield* Ref.update(tunnels, (active) => {
              if (!active.has(key)) return active
              const next = new Map(active)
              next.delete(key)
              return next
            })
          }),
        { discard: true },
      )
      return yield* list()
    })

    /** Downloads cloudflared once into the user cache; later starts reuse the same binary. */
    const ensureBinary = Effect.fn("Tunnel.binary")(function* () {
      const target = asset()
      if (!target) return yield* new UnsupportedPlatformError({ platform: process.platform, arch: process.arch })
      const name = target.name.replace(/\.tgz$/, "")
      // A packaged app ships the binary next to the CLI, so a downloaded copy only covers the source checkout and
      // platforms the installer did not bundle.
      const bundled = yield* Effect.forEach(
        bundledCopies(name),
        (candidate) => fs.existsSafe(candidate).pipe(Effect.map((exists) => (exists ? candidate : undefined))),
        { concurrency: "unbounded" },
      )
      const found = bundled.find((candidate) => candidate !== undefined)
      if (found) return found
      const directory = path.join(os.homedir(), ".cache", "elhadry", "cloudflared")
      const file = path.join(directory, name)
      if (yield* fs.existsSafe(file)) return file

      yield* fs
        .ensureDir(directory)
        .pipe(Effect.mapError(() => new DownloadError({ message: "Could not prepare the cloudflared cache" })))
      const bytes = yield* Effect.tryPromise({
        try: async () => {
          const response = await fetch(target.url, { redirect: "follow" })
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
          return new Uint8Array(await response.arrayBuffer())
        },
        catch: () => new DownloadError({ message: "Could not download cloudflared" }),
      })

      if (!target.archive) {
        yield* fs
          .writeFile(file, bytes)
          .pipe(Effect.mapError(() => new DownloadError({ message: "Could not save cloudflared" })))
        return file
      }

      const archive = `${file}.tgz`
      yield* fs
        .writeFile(archive, bytes)
        .pipe(Effect.mapError(() => new DownloadError({ message: "Could not save cloudflared" })))
      yield* proc
        .run(ChildProcess.make("tar", ["-xzf", archive, "-C", directory], { stdin: "ignore", extendEnv: true }))
        .pipe(Effect.mapError(() => new DownloadError({ message: "Could not extract cloudflared" })))
      yield* fs.remove(archive).pipe(Effect.ignore)
      return file
    })

    /** Drains a child stream line by line: a full pipe would otherwise stall the transport. */
    const pump = (stream: Stream.Stream<Uint8Array, unknown>, onLine: (line: string) => Effect.Effect<void>) =>
      stream.pipe(
        Stream.decodeText(),
        Stream.splitLines,
        Stream.runForEach((line) => Effect.suspend(() => onLine(line))),
        Effect.ignore,
      )

    /** Resolves with the announced URL, or fails with whatever stopped the transport. */
    const awaitURL = (input: {
      child: ChildProcessSpawner.ChildProcessHandle
      url: Deferred.Deferred<string>
      failure: Deferred.Deferred<string>
      timeout: string
    }) =>
      Effect.raceAll([
        Deferred.await(input.url),
        Deferred.await(input.failure).pipe(Effect.flatMap((reason) => Effect.fail(new StartError({ message: reason })))),
        input.child.exitCode.pipe(
          Effect.ignore,
          Effect.andThen(Effect.fail(new StartError({ message: "The tunnel exited before it was ready" }))),
        ),
        Effect.sleep(START_TIMEOUT_MS).pipe(Effect.flatMap(() => Effect.fail(new StartError({ message: input.timeout })))),
      ])

    /** A published tunnel whose transport dies must stop claiming to be live. */
    const watch = (id: string, child: ChildProcessSpawner.ChildProcessHandle) =>
      child.exitCode.pipe(
        Effect.ignore,
        Effect.andThen(
          update(id, (entry) =>
            entry.info.state === "online"
              ? { ...entry, info: { ...entry.info, state: "error", message: "The tunnel connection closed" } }
              : entry,
          ),
        ),
        Effect.forkIn(scope),
      )

    const startSsh = Effect.fn("Tunnel.startSsh")(function* (
      id: string,
      input: { origin: string; password?: string; host: string },
    ) {
      const origin = new URL(input.origin)
      const known = path.join(os.homedir(), ".cache", "elhadry", "tunnel", "known_hosts")
      yield* fs
        .ensureDir(path.dirname(known))
        .pipe(Effect.mapError(() => new StartError({ message: "Could not prepare the tunnel cache" })))
      const child = yield* proc
        .spawn(
          ChildProcess.make(
            "ssh",
            [
              "-T",
              "-o",
              "StrictHostKeyChecking=no",
              "-o",
              `UserKnownHostsFile=${known}`,
              "-o",
              "ExitOnForwardFailure=yes",
              "-o",
              "ServerAliveInterval=20",
              "-o",
              "ServerAliveCountMax=3",
              "-o",
              "ConnectTimeout=15",
              // The service hands out a public HTTPS listener on 80; the forward points at the local server.
              "-R",
              `80:127.0.0.1:${origin.port || "80"}`,
              input.host,
            ],
            { stdin: "ignore", stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" }, extendEnv: true },
          ),
        )
        .pipe(
          Effect.provideService(Scope.Scope, scope),
          Effect.mapError(() => new StartError({ message: "SSH is not available for the tunnel" })),
        )

      const url = yield* Deferred.make<string>()
      const failure = yield* Deferred.make<string>()
      const announce = (line: string) =>
        Effect.suspend(() => {
          const found = sshURL(line)
          if (found)
            return Deferred.succeed(url, found).pipe(
              Effect.ignore,
              // Free SSH tunnel addresses can be reassigned; keep the newest one published.
              Effect.andThen(
                update(id, (entry) =>
                  entry.info.state === "online" ? { ...entry, info: { ...entry.info, url: found } } : entry,
                ),
              ),
            )
          const reason = sshFailure(line)
          if (reason) return Deferred.succeed(failure, reason).pipe(Effect.ignore)
          return Effect.void
        })

      // Both services print their address on stdout and connection trouble on stderr; both are read to the end.
      const readers = yield* Effect.forEach([child.stdout, child.stderr], (stream) => Effect.forkIn(pump(stream, announce), scope))
      const watcher = yield* watch(id, child)
      yield* update(id, (entry) => ({ ...entry, child, fibers: [...readers, watcher] }))

      const published = yield* awaitURL({ child, url, failure, timeout: "The tunnel service did not answer in time" })
      yield* Effect.sleep(SETTLE_MS)
      return {
        id,
        state: "online",
        url: published,
        origin: input.origin,
        binary: "ssh",
        password: input.password,
      } satisfies Info
    })

    const startCloudflare = Effect.fn("Tunnel.startCloudflare")(function* (
      id: string,
      input: { origin: string; password?: string },
    ) {
      const executable = yield* ensureBinary()
      const child = yield* proc
        .spawn(
          ChildProcess.make(executable, ["tunnel", "--no-autoupdate", "--url", input.origin], {
            stdin: "ignore",
            stderr: "pipe",
            env: { ...process.env, NO_COLOR: "1" },
            extendEnv: true,
          }),
        )
        .pipe(
          Effect.provideService(Scope.Scope, scope),
          Effect.mapError(() => new StartError({ message: "Could not start cloudflared" })),
        )

      const url = yield* Deferred.make<string>()
      const failure = yield* Deferred.make<string>()
      const announce = (line: string) =>
        Effect.suspend(() => {
          const found = tunnelURL(line)
          if (found) return Deferred.succeed(url, found).pipe(Effect.ignore)
          const reason = tunnelFailure(line)
          if (reason) return Deferred.succeed(failure, reason).pipe(Effect.ignore)
          return Effect.void
        })

      const fiber = yield* Effect.forkIn(pump(child.stderr, announce), scope)
      const watcher = yield* watch(id, child)
      yield* update(id, (entry) => ({ ...entry, child, fibers: [fiber, watcher] }))

      const published = yield* awaitURL({ child, url, failure, timeout: "Cloudflare did not answer in time" })
      yield* Effect.sleep(SETTLE_MS)
      return {
        id,
        state: "online",
        url: published,
        origin: input.origin,
        binary: executable,
        password: input.password,
      } satisfies Info
    })

    /**
     * Connects one link and records the outcome in its entry. Callers fork this so the
     * request that asked for the link answers at once and the caller polls `status`.
     *
     * Cloudflare comes first: a quick tunnel is far faster than the free SSH services (measured 650 KB/s against
     * 30 KB/s), and the app reads its event feed over a WebSocket, which the tunnel carries in full. Its edge does hold
     * back chunked response bodies, so the event stream must never travel as server-sent events through it.
     */
    const connect = Effect.fn("Tunnel.connect")(function* (
      id: string,
      input: { origin: string; password?: string },
    ) {
      const started = yield* startCloudflare(id, input).pipe(
        Effect.catch((error) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("cloudflared unavailable, falling back to ssh", { message: error.message })
            yield* stopTransport(id)
            return yield* startSsh(id, { ...input, host: SSH_HOSTS[0].host })
          }),
        ),
        Effect.catch((error) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("ssh tunnel unavailable, trying the next ssh service", { message: error.message })
            yield* stopTransport(id)
            return yield* startSsh(id, { ...input, host: SSH_HOSTS[1].host })
          }),
        ),
      )

      yield* update(id, (entry) => ({ ...entry, info: started }))
    })

    const start = Effect.fn("Tunnel.start")(function* (input: { origin: string; password?: string }) {
      // Every call adds a link: links differ by address and password, so one never replaces another.
      const id = randomUUID()
      const starting: Info = { id, state: "starting", origin: input.origin, password: input.password }
      yield* Ref.update(tunnels, (active) => new Map(active).set(id, { info: starting, fibers: [] }))

      const job = yield* connect(id, input).pipe(
        Effect.catch((error) =>
          Effect.gen(function* () {
            yield* stopTransport(id)
            yield* update(id, (entry) => ({ ...entry, info: { ...entry.info, state: "error", message: error.message } }))
          }),
        ),
        Effect.forkIn(scope),
      )
      yield* update(id, (entry) => ({ ...entry, job }))
      return starting
    })

    return Service.of({ status: list, start, stop })
  }),
)

export const node = makeGlobalNode({ service: Service, layer, deps: [FSUtil.node, AppProcess.node] })

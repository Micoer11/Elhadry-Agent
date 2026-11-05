import { expect } from "bun:test"
import { Effect } from "effect"
import { HttpServer } from "effect/http"
import { it } from "../../core/test/lib/effect"
import { ServerProcess } from "../src/process"

it.live("streams events over the websocket route", () =>
  Effect.gen(function* () {
    const server = yield* ServerProcess.start<never, never>({
      hostname: "127.0.0.1",
      port: 0,
      password: "secret",
      app: { version: "test-version" },
      database: { path: ":memory:" },
      models: { fetch: false },
      config: { directory: process.cwd(), project: false, content: "{}" },
      fs: { filewatcher: false },
    })
    const base = HttpServer.formatAddress(server.address)

    const first = yield* Effect.promise(
      () =>
        new Promise<string>((resolve, reject) => {
          const url = new URL("/api/event/ws", base)
          url.protocol = "ws:"
          url.searchParams.set("auth_token", btoa("elhadry:secret"))
          const socket = new WebSocket(url)
          const timer = setTimeout(() => {
            socket.close()
            reject(new Error("Timed out waiting for the event socket"))
          }, 5_000)
          socket.addEventListener("message", (event) => {
            if (typeof event.data !== "string") return
            clearTimeout(timer)
            socket.close()
            resolve(event.data)
          })
          socket.addEventListener("error", () => {
            clearTimeout(timer)
            reject(new Error("The event socket failed"))
          })
        }),
    )

    expect(JSON.parse(first)).toMatchObject({ type: "server.connected", data: {} })
  }),
)

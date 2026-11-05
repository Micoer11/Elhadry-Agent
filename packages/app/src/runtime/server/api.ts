import { OpenCode, type OpenCodeClient, type OpenCodeEvent } from "@elhadry/client/promise"
import type { ServerConnection } from "@/runtime/server/registry"
import { decode64 } from "@/runtime/persistence/base64"

// Keepalive frames the server writes between events. They only prove the socket is alive.
const HEARTBEAT = "heartbeat"

export function authTokenFromCredentials(input: { password: string }) {
  return btoa(`elhadry:${input.password}`)
}

export function authFromToken(token: string | null) {
  const decoded = decode64(token ?? undefined)

  if (!decoded) return
  const separator = decoded.indexOf(":")

  if (separator === -1) return

  return {
    password: decoded.slice(separator + 1),
  }
}

export function createApiForServer(input: {
  server: ServerConnection.HttpBase
  fetch?: typeof globalThis.fetch
}): OpenCodeClient {
  const options = {
    baseUrl: input.server.url,
    fetch: input.fetch,
    headers: input.server.password
      ? {
          Authorization: `Basic ${authTokenFromCredentials({
            password: input.server.password,
          })}`,
        }
      : undefined,
  }
  // Without a credential here the renderer cannot authenticate a socket upgrade (a browser sets no headers on one),
  // and the desktop hides the sidecar password behind a main-process proxy. The stream route works there.
  if (!input.server.password) return OpenCode.make(options)

  let fallback: OpenCodeClient | undefined
  return OpenCode.make({
    ...options,
    events: (signal, onActivity) =>
      subscribeEvents({
        server: input.server,
        signal,
        onActivity,
        // Servers without the socket route keep the server-sent event stream.
        sse: () => {
          fallback ??= OpenCode.make(options)
          return fallback.event.subscribe({ signal, onActivity })
        },
      }),
  })
}

/**
 * Event streams over the socket route first. A proxy in front of the server can hold back a chunked response body
 * forever, which the socket avoids; a socket that never delivers an event falls back to the stream.
 */
async function* subscribeEvents(input: {
  server: ServerConnection.HttpBase
  signal: AbortSignal
  onActivity: () => void
  sse: () => AsyncIterable<OpenCodeEvent>
}) {
  let delivered = false
  try {
    for await (const event of socketEvents(input)) {
      delivered = true
      yield event
    }
  } catch (error) {
    if (delivered || input.signal.aborted) throw error
  }
  if (!delivered && !input.signal.aborted) yield* input.sse()
}

function socketEvents(input: {
  server: ServerConnection.HttpBase
  signal: AbortSignal
  onActivity: () => void
}): AsyncIterable<OpenCodeEvent> {
  return {
    [Symbol.asyncIterator]() {
      const socket = new WebSocket(eventSocketURL(input.server))
      const queued: OpenCodeEvent[] = []
      const waiting: Array<PromiseWithResolvers<IteratorResult<OpenCodeEvent>>> = []
      let finished: { error?: unknown } | undefined

      const settle = () => {
        while (waiting.length) {
          const request = waiting[0]
          const value = queued.shift()
          if (value) {
            waiting.shift()
            request.resolve({ done: false, value })
            continue
          }
          if (!finished) return
          waiting.shift()
          if (finished.error) request.reject(finished.error)
          else request.resolve({ done: true, value: undefined })
        }
      }

      const finish = (error?: unknown) => {
        if (finished) return
        finished = { error }
        settle()
      }

      socket.addEventListener("message", (message) => {
        if (typeof message.data !== "string") return
        input.onActivity()
        if (message.data === HEARTBEAT) return
        const event = parseEvent(message.data)
        if (!event) return
        queued.push(event)
        settle()
      })
      socket.addEventListener("close", (event) => {
        finish(event.wasClean ? undefined : new Error("The event socket closed unexpectedly"))
      })
      socket.addEventListener("error", () => finish(new Error("The event socket failed")))
      input.signal.addEventListener(
        "abort",
        () => {
          socket.close()
          finish()
        },
        { once: true },
      )

      return {
        next() {
          const value = queued.shift()
          if (value) return Promise.resolve({ done: false, value })
          if (finished)
            return finished.error
              ? Promise.reject(finished.error)
              : Promise.resolve({ done: true, value: undefined })
          const request = Promise.withResolvers<IteratorResult<OpenCodeEvent>>()
          waiting.push(request)
          return request.promise
        },
        return() {
          socket.close()
          finish()
          return Promise.resolve({ done: true, value: undefined })
        },
      }
    },
  }
}

/** A browser cannot set headers on a WebSocket upgrade, and the route accepts the encoded credential as a query. */
function eventSocketURL(server: ServerConnection.HttpBase) {
  const target = new URL(`${server.url.replace(/\/+$/, "")}/api/event/ws`)
  target.protocol = target.protocol === "https:" ? "wss:" : "ws:"
  if (server.password) target.searchParams.set("auth_token", authTokenFromCredentials({ password: server.password }))
  return target.toString()
}

function parseEvent(text: string) {
  try {
    return JSON.parse(text) as OpenCodeEvent
  } catch {
    return undefined
  }
}

export type ServerApi = OpenCodeClient

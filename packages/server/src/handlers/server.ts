import { hostname } from "node:os"
import { Duration, Effect, Option } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/http"
import { HttpApiBuilder } from "effect/http-api"
import { PersistentPty } from "@elhadry/core/persistent-pty"
import { UnauthorizedError } from "@elhadry/protocol/errors"
import { Api } from "../api"
import { ServerAuth } from "../auth"
import { ServerInfo } from "../server-info"
import { ServerPairing } from "../pairing"

export const ServerHandler = HttpApiBuilder.group(Api, "server.server", (handlers) =>
  Effect.gen(function* () {
    const pairing = yield* ServerPairing.Service
    const auth = yield* ServerAuth.Config

    return handlers
      .handle("server.info", () =>
        Effect.gen(function* () {
          const info = yield* ServerInfo.Service
          return {
            version: info.app.version ?? "unknown",
            pid: process.pid ?? 0,
            hostname: hostname() || undefined,
            urls: info.urls(),
            paths: info.paths,
            capabilities: { persistentPty: PersistentPty.available },
          }
        }),
      )
      .handle("server.pair", () => pairing.issue())
      .handle(
        "server.password",
        Effect.fn(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          // A tunnel request carries the public host, so it can never read the credential that unlocks every link.
          if (!isLoopbackHost(request.headers.host) || Option.isNone(auth.password))
            return yield* new UnauthorizedError({ message: "The server password is only readable from this machine" })
          return { password: auth.password.value }
        }),
      )
      .handle(
        "server.connect",
        Effect.fn(function* (ctx) {
          const request = yield* HttpServerRequest.HttpServerRequest
          // Browser navigations ask for HTML; everything else is an API client that wants the token.
          const browser = request.headers.accept?.includes("text/html") === true
          const token = (yield* pairing.consume(ctx.params.code)) ? ServerAuth.issueSession(auth) : undefined
          if (token === undefined) {
            if (!browser) return yield* new UnauthorizedError({ message: "Pairing link expired or already used" })
            return HttpServerResponse.text(
              "This pairing link expired or was already used. Run `elhadry pair` to get a new one.",
              { status: 401 },
            )
          }
          if (!browser) return { token }
          return HttpServerResponse.redirect("/").pipe(
            HttpServerResponse.setCookieUnsafe(ServerAuth.sessionCookieName(request.headers.host), token, {
              path: "/",
              httpOnly: true,
              sameSite: "lax",
              maxAge: Duration.seconds(ServerAuth.SESSION_TTL_SECONDS),
            }),
          )
        }),
      )
  }),
)
// Same-machine callers reach the server as 127.0.0.1, localhost, or [::1]; a tunnel or LAN request cannot.
function isLoopbackHost(host: string | undefined) {
  if (!host) return false
  const url = URL.parse(`http://${host}`)
  if (!url) return false
  return (
    url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]" || url.hostname === "::1"
  )
}
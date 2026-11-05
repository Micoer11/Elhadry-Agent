import { ServerAuth } from "../auth"
import { UnauthorizedError } from "@elhadry/protocol/errors"
import { Authorization } from "@elhadry/protocol/middleware/authorization"
export { Authorization } from "@elhadry/protocol/middleware/authorization"
import { PTY_CONNECT_PATH, PTY_CONNECT_TICKET_QUERY } from "@elhadry/protocol/groups/pty"
import { PERSISTENT_PTY_CONNECT_PATH } from "@elhadry/protocol/groups/persistent-pty"
import { MCP_CLIENT_PATH } from "@elhadry/protocol/groups/mcp"
import { PAIRING_CONNECT_PATH } from "@elhadry/protocol/groups/server"
import { Tunnel } from "@elhadry/core/tunnel"
import { Effect, Layer, Redacted } from "effect"
import { Base64 } from "effect/encoding"
import { HttpEffect, HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"

const AUTH_TOKEN_QUERY = "auth_token"
const WWW_AUTHENTICATE = 'Basic realm="Secure Area"'

function emptyCredential() {
  return { username: "", password: Redacted.make("") }
}

function decodeCredential(input: string) {
  return Effect.fromResult(Base64.decodeString(input)).pipe(
    Effect.match({
      onFailure: emptyCredential,
      onSuccess: (header) => {
        const separator = header.indexOf(":")
        if (separator === -1) return emptyCredential()
        return { username: header.slice(0, separator), password: Redacted.make(header.slice(separator + 1)) }
      },
    }),
  )
}

function credentialFromRequest(request: HttpServerRequest.HttpServerRequest) {
  const url = new URL(request.url, "http://localhost")
  const token = url.searchParams.get(AUTH_TOKEN_QUERY)
  if (token) return decodeCredential(token)
  const match = /^Basic\s+(.+)$/i.exec(request.headers.authorization ?? "")
  if (match) return decodeCredential(match[1])
  return Effect.succeed(emptyCredential())
}

/**
 * The secret that belongs to each live link, keyed by the host that link answers on. A link has no secret
 * unless it is serving, so a stopped or failed tunnel appears in neither.
 */
export function publicAccess(infos: ReadonlyArray<Tunnel.Info>) {
  return new Map(
    infos.flatMap((info) =>
      info.state === "online" && info.url && info.password
        ? [[bareHost(new URL(info.url).host), info.password] as const]
        : [],
    ),
  )
}

// A public address is served on the default port, but a proxy may still forward the port it bound.
function bareHost(host: string) {
  return host.replace(/:\d+$/, "").toLowerCase()
}

/**
 * The live link credentials, keyed by public host.
 *
 * The request guard in `process.ts` runs before the application's layers exist, so it cannot ask the tunnel
 * service. Every place that learns the current links publishes them here, and every check reads the same table:
 * a visitor admitted by one check is never refused by the other.
 */
const live = new Map<string, string>()

export function publishLinks(infos: ReadonlyArray<Tunnel.Info>) {
  live.clear()
  for (const [host, password] of publicAccess(infos)) live.set(host, password)
}

function matches(credentials: ServerAuth.DecodedCredentials, username: string, password: string) {
  return credentials.username === username && Redacted.value(credentials.password) === password
}

const UNAUTHORIZED_MESSAGE = "Authentication required"

// Browsers show a native credentials prompt for a Basic challenge even on fetch, which would stall the web app
// before it can show its own sign-in screen. Only non-browser clients and page navigations get the challenge.
function challengeRequest(request: HttpServerRequest.HttpServerRequest) {
  const mode = request.headers["sec-fetch-mode"]
  return mode === undefined || mode === "navigate"
}

// Matches what the Authorization middleware encodes, for requests rejected before the HttpApi runs.
export function unauthorizedResponse(request: HttpServerRequest.HttpServerRequest) {
  return HttpServerResponse.jsonUnsafe(
    { _tag: "UnauthorizedError", message: UNAUTHORIZED_MESSAGE },
    { status: 401, headers: challengeRequest(request) ? { "www-authenticate": WWW_AUTHENTICATE } : undefined },
  )
}

/**
 * A request arriving through a link is answered by that link's own password and nothing else, so the
 * server's local credential is never usable from a shared link. Anyone else, including the app on this
 * machine, is checked against the server credential or its pairing session.
 */
export function authorizedRequest(
  request: HttpServerRequest.HttpServerRequest,
  config: ServerAuth.Info,
  links: ReadonlyMap<string, string> = live,
) {
  // A proxy forwards the public host in the Host header; an in-process handler may only offer an absolute URL.
  const host = bareHost(request.headers.host ?? URL.parse(request.url)?.host ?? "")

  return credentialFromRequest(request).pipe(
    Effect.map((credential) => {
      const password = links.get(host)
      if (password !== undefined) return matches(credential, config.username, password)
      return ServerAuth.authorized(credential, config) || authorizedSessionCookie(request, config)
    }),
  )
}

function authorizedSessionCookie(request: HttpServerRequest.HttpServerRequest, config: ServerAuth.Info) {
  const token = request.cookies[ServerAuth.sessionCookieName(request.headers.host)]
  if (!token) return false
  // Same-site pages on other ports still send this cookie, so only same-origin requests may use it.
  const origin = request.headers.origin
  if (origin !== undefined && URL.parse(origin)?.host !== request.headers.host) return false
  return ServerAuth.verifySession(token, config)
}

export const authorizationLayer = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const config = yield* ServerAuth.Config
    const tunnel = yield* Tunnel.Service
    return Authorization.of((effect) =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        const route = yield* HttpRouter.RouteContext
        // A tunnel can carry a password of its own, so authorization is a per-request question even when the
        // server itself was started without one.
        const info = yield* tunnel.status()
        const links = publicAccess(info)
        publishLinks(info)
        if (!ServerAuth.required(config) && links.size === 0) return yield* effect
        // Ticketed PTY and client MCP connects (browsers cannot set headers on WebSocket upgrades) and pairing links
        // skip credential checks here; their handlers consume and validate the ticket or code. Use the
        // route selected by Effect so authorization and dispatch cannot disagree about the request path.
        const url = new URL(request.url, "http://localhost")
        if (
          ((route.route.path === PTY_CONNECT_PATH ||
            route.route.path === PERSISTENT_PTY_CONNECT_PATH ||
            route.route.path === MCP_CLIENT_PATH) &&
            !!url.searchParams.get(PTY_CONNECT_TICKET_QUERY)) ||
          route.route.path === PAIRING_CONNECT_PATH
        )
          return yield* effect
        if (yield* authorizedRequest(request, config, links)) return yield* effect
        if (challengeRequest(request))
          yield* HttpEffect.appendPreResponseHandler((_request, response) =>
            Effect.succeed(HttpServerResponse.setHeader(response, "www-authenticate", WWW_AUTHENTICATE)),
          )
        return yield* new UnauthorizedError({ message: UNAUTHORIZED_MESSAGE })
      }),
    )
  }),
)

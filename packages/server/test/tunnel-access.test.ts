import { expect, test } from "bun:test"
import { Tunnel } from "@elhadry/core/tunnel"
import { Effect, Layer } from "effect"
import { it } from "../../core/test/lib/effect"
import { ServerFetch } from "../src/fetch"
import { publicAccess } from "../src/middleware/authorization"

const SERVER_PASSWORD = "serverpass"
const FIRST_HOST = "quiet-river.trycloudflare.com"
const SECOND_HOST = "eagle-households.trycloudflare.com"

test.each([
  [[]],
  [[{ id: "a", state: "starting", origin: "http://127.0.0.1:4096", password: "secret" }]],
  [[{ id: "a", state: "error", message: "Cloudflare did not answer in time", password: "secret" }]],
  [[{ id: "a", state: "online", url: `https://${FIRST_HOST}`, origin: "http://127.0.0.1:4096" }]],
  [[{ id: "a", state: "online", url: `https://${FIRST_HOST}`, origin: "http://127.0.0.1:4096", password: "" }]],
] as const)("publicAccess(%p) grants nothing without a live link password", (infos) => {
  expect(publicAccess(infos).size).toBe(0)
})

test("publicAccess keys every live link by its own host", () => {
  expect(
    publicAccess([
      { id: "a", state: "online", url: `https://${FIRST_HOST}`, origin: "http://127.0.0.1:4096", password: "1111" },
      { id: "b", state: "online", url: `https://${SECOND_HOST}`, origin: "http://127.0.0.1:4096", password: "2222" },
    ]),
  ).toEqual(
    new Map([
      [FIRST_HOST, "1111"],
      [SECOND_HOST, "2222"],
    ]),
  )
})

const options = {
  app: { version: "test-version" },
  database: { path: ":memory:" },
  config: { project: false },
  models: { fetch: false },
  fs: { filewatcher: false },
} as const

const links = [
  { id: "a", state: "online", url: `https://${FIRST_HOST}`, origin: "http://127.0.0.1:4096", password: "1111" },
  { id: "b", state: "online", url: `https://${SECOND_HOST}`, origin: "http://127.0.0.1:4096", password: "2222" },
] as const satisfies ReadonlyArray<Tunnel.Info>

const tunnel = Layer.succeed(
  Tunnel.Service,
  Tunnel.Service.of({
    status: () => Effect.succeed(links),
    start: () => Effect.succeed(links[0]),
    stop: () => Effect.succeed([]),
  }),
)

// Each link answers only to its own password, and the server's own credential never travels through any of them.
it.live("accepts one password per link through the tunnel", () =>
  Effect.gen(function* () {
    const handler = yield* ServerFetch.make(
      { ...options, password: SERVER_PASSWORD },
      { overrides: [Tunnel.node.replace(tunnel)] },
    )
    const status = (host: string | undefined, password?: string) =>
      Effect.promise(() =>
        handler(
          new Request("http://server.local/api/info", {
            headers: {
              ...(host ? { host } : {}),
              ...(password ? { authorization: `Basic ${btoa(`elhadry:${password}`)}` } : {}),
            },
          }),
        ),
      ).pipe(Effect.map((response) => response.status))

    expect(yield* status(FIRST_HOST, "1111")).toBe(200)
    expect(yield* status(SECOND_HOST, "2222")).toBe(200)
    // A password belongs to the link it was made for.
    expect(yield* status(FIRST_HOST, "2222")).toBe(401)
    expect(yield* status(SECOND_HOST, "1111")).toBe(401)
    expect(yield* status(FIRST_HOST, SERVER_PASSWORD)).toBe(401)
    expect(yield* status(FIRST_HOST)).toBe(401)
    // The app on this machine keeps using the server credential; a link's password is not an extra local key.
    expect(yield* status("127.0.0.1:4096", SERVER_PASSWORD)).toBe(200)
    expect(yield* status("127.0.0.1:4096", "1111")).toBe(401)
  }),
)

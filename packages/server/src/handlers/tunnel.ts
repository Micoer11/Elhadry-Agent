import { Tunnel } from "@elhadry/core/tunnel"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../api"
import { InvalidRequestError } from "@elhadry/protocol/errors"
import { publishLinks } from "../middleware/authorization"

// Both this handler and the request guard read the same live-link table, so a link starts admitting its own
// password the moment it is created instead of on the next request.
export const TunnelHandler = HttpApiBuilder.group(Api, "server.tunnel", (handlers) =>
  handlers
    .handle("tunnel.status", () =>
      Effect.gen(function* () {
        const tunnel = yield* Tunnel.Service
        const infos = yield* tunnel.status()
        publishLinks(infos)
        return infos
      }),
    )
    .handle("tunnel.start", (ctx) =>
      Effect.gen(function* () {
        const tunnel = yield* Tunnel.Service
        const started = yield* tunnel
          .start(ctx.payload)
          .pipe(Effect.mapError((error) => new InvalidRequestError({ message: error.message, kind: "tunnel" })))
        publishLinks(yield* tunnel.status())
        return started
      }),
    )
    .handle("tunnel.stop", (ctx) =>
      Effect.gen(function* () {
        const tunnel = yield* Tunnel.Service
        const remaining = yield* tunnel.stop(ctx.query.id)
        publishLinks(remaining)
        return remaining
      }),
    ),
)

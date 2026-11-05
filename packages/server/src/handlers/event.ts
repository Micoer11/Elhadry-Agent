import { Event } from "@elhadry/schema/event"
import { Effect, Queue, Stream } from "effect"
import { HttpServerResponse } from "effect/http"
import { HttpApiBuilder } from "effect/http-api"
import { Socket } from "effect/socket"
import { Api } from "../api"
import { EventFeed } from "../event-feed"
import { type Outbound, runPtySocket } from "./pty-socket"

// Text frames that are not events keep the connection alive without making anything up in the event schema.
const HEARTBEAT = "heartbeat"

export const EventHandler = HttpApiBuilder.group(Api, "server.event", (handlers) =>
  Effect.gen(function* () {
    const feed = yield* EventFeed.Service
    const connected = () =>
      ({
        id: Event.ID.create(),
        type: "server.connected",
        data: {},
      }) as const
    return handlers
      .handleRaw("event.subscribe", (ctx) =>
        Effect.gen(function* () {
          const output = Stream.unwrap(
            feed
              .subscribe(ctx.query.types)
              .pipe(Effect.map((live) => Stream.make(EventFeed.encode(connected())).pipe(Stream.concat(live)))),
          )
          const heartbeat = Stream.tick("15 seconds").pipe(Stream.map(() => ": heartbeat\n\n"))
          return HttpServerResponse.stream(
            output.pipe(
              Stream.map((event) => `data: ${event}\n\n`),
              Stream.merge(heartbeat, { haltStrategy: "left" }),
              Stream.encodeText,
            ),
            {
              contentType: "text/event-stream",
              headers: {
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",
                "X-Content-Type-Options": "nosniff",
              },
            },
          )
        }),
      )
      // Proxies in front of the server (for example a Cloudflare quick tunnel) buffer chunked response bodies, so the
      // SSE route never delivers a frame there. The socket route carries the same events as bare JSON text frames.
      .handleRaw("event.connect", (ctx) =>
        Effect.gen(function* () {
          const socket = yield* Effect.orDie(ctx.request.upgrade)
          const outbox = yield* Queue.unbounded<Outbound>()
          yield* Effect.gen(function* () {
            const live = yield* feed.subscribe(ctx.query.types)
            Queue.offerUnsafe(outbox, EventFeed.encode(connected()))
            yield* live.pipe(
              Stream.runForEach((frame) => Effect.sync(() => Queue.offerUnsafe(outbox, frame))),
              // A subscriber that overflows loses events, so fail the connection instead of going quiet.
              Effect.catchCause(() =>
                Effect.sync(() => Queue.offerUnsafe(outbox, new Socket.CloseEvent(1011, "event feed failed"))),
              ),
              Effect.forkScoped,
            )
            yield* Stream.tick("15 seconds").pipe(
              Stream.runForEach(() => Effect.sync(() => Queue.offerUnsafe(outbox, HEARTBEAT))),
              Effect.forkScoped,
            )
            yield* runPtySocket({ socket, outbox, onMessage: () => Effect.void, detach: () => {} })
          }).pipe(Effect.scoped)
          return HttpServerResponse.empty()
        }),
      )
  }),
)

export * as OpenCode from "./client.js"

import { SharedEvents } from "../shared-events.js"
import { OpenCode } from "./generated/index.js"
import type { ClientOptions } from "./generated/client.js"
import type { EventSubscribeOutput } from "./generated/types.js"
import { makeRpc } from "./rpc.js"

export type { ClientOptions, RequestOptions } from "./generated/client.js"

/**
 * The event transport: an async iterable that yields parsed events and reports traffic through `onActivity`.
 * Callers replace it when the SSE route cannot reach them, for example behind a proxy that buffers response bodies.
 */
export type EventsTransport = (
  signal: AbortSignal,
  onActivity: () => void,
) => AsyncIterable<EventSubscribeOutput>

export function make(options: ClientOptions & { readonly events?: EventsTransport }) {
  const raw = OpenCode.make(options)
  const events = SharedEvents.make(
    options.events ?? ((signal, onActivity) => raw.event.subscribe(undefined, { signal, onActivity })),
  )
  return {
    ...raw,
    rpc: Object.assign(makeRpc(raw, events), raw.rpc),
    event: events,
  }
}

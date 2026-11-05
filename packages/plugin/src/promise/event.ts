import type { OpenCodeEvent } from "@elhadry/client"
import type { SelectedEvent, SubscribeOptions } from "@elhadry/client/promise/api"

type EventType = Exclude<OpenCodeEvent["type"], "server.connected">

export interface EventDomain {
  readonly subscribe: <Type extends EventType = EventType>(
    options?: SubscribeOptions<Type>,
  ) => AsyncIterable<SelectedEvent<OpenCodeEvent, Type>>
}

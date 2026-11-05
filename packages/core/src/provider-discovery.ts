export * as ProviderDiscovery from "./provider-discovery.js"

import { Effect, Option, Schema } from "effect"

export interface Model {
  readonly id: string
  readonly name?: string
}

export class DiscoveryError extends Schema.TaggedError<DiscoveryError>()("ProviderDiscovery.DiscoveryError", {
  url: Schema.String,
  message: Schema.String,
}) {}

const Listed = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.optional(Schema.NullOr(Schema.String)),
    }),
  ),
})
const decodeListed = Schema.decodeUnknownOption(Listed)

/**
 * Asks an OpenAI-compatible server which models it serves. The runtime performs this so a browser
 * cross-origin policy cannot block a custom provider whose server sends no CORS headers.
 */
export const list = Effect.fn("ProviderDiscovery.list")(function* (input: {
  readonly baseURL: string
  readonly apiKey?: string
  readonly headers?: Readonly<Record<string, string>>
}) {
  const url = modelsURL(input.baseURL)
  if (!url)
    return yield* new DiscoveryError({
      url: input.baseURL,
      message: "Base URL must start with http:// or https://",
    })
  const apiKey = input.apiKey?.trim()
  const listed = yield* Effect.tryPromise({
    try: async () => {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          // Never send an empty authorization header: keyless servers reject it.
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          ...input.headers,
        },
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return await response.json()
    },
    catch: (cause) =>
      new DiscoveryError({
        url,
        message: `Could not read models from ${url}: ${cause instanceof Error ? cause.message : String(cause)}`,
      }),
  })
  const parsed = decodeListed(listed)
  if (Option.isNone(parsed))
    return yield* new DiscoveryError({ url, message: `${url} did not return an OpenAI-compatible model list` })
  return parsed.value.data
    .filter((model) => model.id.trim().length > 0)
    .map((model) => ({
      id: model.id.trim(),
      ...(model.name?.trim() ? { name: model.name.trim() } : {}),
    }))
    .toSorted((a, b) => a.id.localeCompare(b.id))
})

function modelsURL(baseURL: string) {
  const trimmed = baseURL.trim().replace(/\/+$/, "")
  if (!URL.canParse(trimmed)) return
  const url = new URL(trimmed)
  if (url.protocol !== "http:" && url.protocol !== "https:") return
  return `${trimmed}/models`
}

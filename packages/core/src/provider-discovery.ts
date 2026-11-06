export * as ProviderDiscovery from "./provider-discovery.js"

import { ConfigProvider } from "@elhadry/schema/config/provider"
import { Effect, Option, Schema } from "effect"

export interface Model {
  readonly id: string
  readonly name?: string
  readonly capabilities?: {
    readonly tools?: boolean
    readonly input?: readonly string[]
    readonly output?: readonly string[]
    readonly temperature?: boolean
  }
  readonly reasoning?: ConfigProvider.Reasoning
  readonly limit?: {
    readonly context?: number
    readonly input?: number
    readonly output?: number
  }
}

export class DiscoveryError extends Schema.TaggedError<DiscoveryError>()("ProviderDiscovery.DiscoveryError", {
  url: Schema.String,
  message: Schema.String,
}) {}

// Servers share the OpenAI list envelope but add their own metadata. Fields this build does not know are
// ignored, and each metadata block is decoded separately so one odd shape does not drop the model.
const ListedModel = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.NullOr(Schema.String)),
  capabilities: Schema.optional(Schema.Unknown),
  opencode: Schema.optional(Schema.Unknown),
  supported_parameters: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  context_length: Schema.optional(Schema.NullOr(Schema.Finite)),
  top_provider: Schema.optional(Schema.Unknown),
  max_completion_tokens: Schema.optional(Schema.NullOr(Schema.Finite)),
  architecture: Schema.optional(Schema.Unknown),
  modalities: Schema.optional(Schema.Unknown),
})
type ListedModel = Schema.Schema.Type<typeof ListedModel>
const Listed = Schema.Struct({ data: Schema.Array(ListedModel) })
const decodeListed = Schema.decodeUnknownOption(Listed)

const SourceCapabilities = Schema.Struct({
  tools: Schema.optional(
    Schema.NullOr(Schema.Union([Schema.Boolean, Schema.Struct({ supported: Schema.Boolean })])),
  ),
  temperature: Schema.optional(Schema.NullOr(Schema.Boolean)),
  reasoning: Schema.optional(Schema.Unknown),
})
const decodeCapabilities = Schema.decodeUnknownOption(SourceCapabilities)

const SourceOpencode = Schema.Struct({
  reasoning_options: Schema.optional(
    Schema.NullOr(
      Schema.Array(
        Schema.Struct({
          type: Schema.String,
          values: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
        }),
      ),
    ),
  ),
  variants: Schema.optional(
    Schema.NullOr(
      Schema.Record(
        Schema.String,
        Schema.Struct({
          reasoning: Schema.optional(
            Schema.NullOr(Schema.Struct({ effort: Schema.optional(Schema.NullOr(Schema.String)) })),
          ),
        }),
      ),
    ),
  ),
})
const decodeOpencode = Schema.decodeUnknownOption(SourceOpencode)

const SourceTopProvider = Schema.Struct({
  context_length: Schema.optional(Schema.NullOr(Schema.Finite)),
  max_completion_tokens: Schema.optional(Schema.NullOr(Schema.Finite)),
})
const decodeTopProvider = Schema.decodeUnknownOption(SourceTopProvider)

const SourceModalities = Schema.Struct({
  input_modalities: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  output_modalities: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  input: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  output: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
})
const decodeModalities = Schema.decodeUnknownOption(SourceModalities)

const decodeReasoning = Schema.decodeUnknownOption(ConfigProvider.Reasoning)

// Real reasoning levels come from the server that serves the models, not a guessed ladder. A short cache keeps a
// provider list request from fetching the same endpoint again while the model selector opens and closes.
const CACHE_TTL = 5 * 60_000

const cache = new Map<string, { readonly at: number; readonly models: readonly Model[] }>()

/** The last model list read for this endpoint, while it is still fresh. */
export function cached(baseURL: string | undefined): readonly Model[] | undefined {
  if (!baseURL) return undefined
  const key = cacheKey(baseURL)
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.at > CACHE_TTL) {
    cache.delete(key)
    return undefined
  }
  return entry.models
}

/**
 * Reads an endpoint's model list, reusing a fresh result. Returns whether it fetched, so callers know when to rebuild
 * the models that read the cache.
 */
export const refresh = Effect.fn("ProviderDiscovery.refresh")(function* (input: {
  readonly baseURL: string
  readonly apiKey?: string
  readonly headers?: Readonly<Record<string, string>>
}) {
  const key = cacheKey(input.baseURL)
  const entry = cache.get(key)
  if (entry && Date.now() - entry.at <= CACHE_TTL) return false
  const models = yield* list(input)
  cache.set(key, { at: Date.now(), models })
  return true
})

function cacheKey(baseURL: string) {
  return baseURL.trim().replace(/\/+$/, "").toLowerCase()
}

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
    .map((model) => {
      const name = model.name?.trim()
      const capabilities = capabilitiesOf(model)
      const reasoning = reasoningOf(model)
      const limit = limitOf(model)
      return {
        id: model.id.trim(),
        ...(name ? { name } : {}),
        ...(capabilities ? { capabilities } : {}),
        ...(reasoning ? { reasoning } : {}),
        ...(limit ? { limit } : {}),
      }
    })
    .toSorted((a, b) => a.id.localeCompare(b.id))
})

function reasoningOf(model: ListedModel): ConfigProvider.Reasoning | undefined {
  const capabilities = Option.getOrUndefined(decodeCapabilities(model.capabilities))
  if (capabilities?.reasoning !== undefined && capabilities.reasoning !== null) {
    // models.dev v2 sends its reasoning object; some compatible servers send only a support flag.
    const explicit = Option.getOrUndefined(decodeReasoning(capabilities.reasoning))
    if (explicit) return explicit
    if (capabilities.reasoning === true) return { supported: true }
    if (capabilities.reasoning === false) return { supported: false }
  }
  const opencode = Option.getOrUndefined(decodeOpencode(model.opencode))
  if (!opencode) return undefined
  // Variant overlays carry the exact efforts the server accepts. A none/high pair is a real two-level
  // control, not the low/medium/high default this build would otherwise invent.
  const efforts = [
    ...new Set(
      Object.values(opencode.variants ?? {}).flatMap((variant) =>
        variant.reasoning?.effort && variant.reasoning.effort !== "default"
          ? [variant.reasoning.effort]
          : [],
      ),
    ),
  ]
  if (efforts.length > 0) return { supported: true, effort: efforts }
  const options = opencode.reasoning_options ?? []
  const effort = options.find((option) => option.type === "effort" && option.values?.length)
  if (effort?.values?.length) return { supported: true, effort: effort.values }
  if (options.some((option) => option.type === "toggle")) return { supported: true, toggle: true }
  return options.length > 0 ? { supported: true } : undefined
}

function capabilitiesOf(model: ListedModel) {
  const source = Option.getOrUndefined(decodeCapabilities(model.capabilities))
  const parameters = new Set(model.supported_parameters ?? [])
  const tools =
    typeof source?.tools === "boolean" ? source.tools : (source?.tools?.supported ?? (parameters.has("tools") ? true : undefined))
  const temperature = source?.temperature ?? (parameters.has("temperature") ? true : undefined)
  const modalities =
    Option.getOrUndefined(decodeModalities(model.architecture)) ?? Option.getOrUndefined(decodeModalities(model.modalities))
  const input = modalities?.input_modalities ?? modalities?.input
  const output = modalities?.output_modalities ?? modalities?.output
  if (tools === undefined && temperature === undefined && !input && !output) return undefined
  return {
    ...(tools === undefined ? {} : { tools }),
    ...(input ? { input } : {}),
    ...(output ? { output } : {}),
    ...(temperature === undefined ? {} : { temperature }),
  }
}

function limitOf(model: ListedModel) {
  const top = Option.getOrUndefined(decodeTopProvider(model.top_provider))
  const context = top?.context_length ?? model.context_length ?? undefined
  const output = top?.max_completion_tokens ?? model.max_completion_tokens ?? undefined
  if (context === undefined && output === undefined) return undefined
  return {
    ...(context === undefined ? {} : { context: Math.floor(context) }),
    ...(output === undefined ? {} : { output: Math.floor(output) }),
  }
}

function modelsURL(baseURL: string) {
  const trimmed = baseURL.trim().replace(/\/+$/, "")
  if (!URL.canParse(trimmed)) return
  const url = new URL(trimmed)
  if (url.protocol !== "http:" && url.protocol !== "https:") return
  return `${trimmed}/models`
}

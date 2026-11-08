export * as NousModels from "./models.js"

import { Money } from "@elhadry/schema/money"
import { Option, Schema } from "effect"
import { Model } from "../model.js"
import { Provider } from "../provider.js"
import { Variant } from "../variant.js"

const providerID = Provider.ID.make("nous")
const packageName = "@elhadry/ai/providers/openai-compatible"

const Pricing = Schema.Struct({
  prompt: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
  completion: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
  input_cache_read: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
})

// The Portal serves the OpenRouter model schema. Only the fields Elhadry Agent reads are
// declared, so unknown additions from the Portal do not invalidate the whole inventory.
const RemoteModel = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  created: Schema.optional(Schema.Number),
  context_length: Schema.optional(Schema.Number),
  architecture: Schema.optional(
    Schema.Struct({
      input_modalities: Schema.optional(Schema.Array(Schema.String)),
      output_modalities: Schema.optional(Schema.Array(Schema.String)),
    }),
  ),
  pricing: Schema.optional(Pricing),
  supported_parameters: Schema.optional(Schema.Array(Schema.String)),
  reasoning: Schema.optional(
    Schema.Struct({
      supported_efforts: Schema.optional(Schema.Array(Schema.NullOr(Schema.String))),
    }),
  ),
  top_provider: Schema.optional(
    Schema.Struct({
      max_completion_tokens: Schema.optional(Schema.NullOr(Schema.Number)),
    }),
  ),
})

const Response = Schema.Struct({ data: Schema.Array(Schema.Unknown) })
const decodeResponse = Schema.decodeUnknownSync(Response)
const decodeModel = Schema.decodeUnknownOption(RemoteModel)

type RemoteModel = typeof RemoteModel.Type

export type Snapshot = readonly RemoteModel[]

export async function load(baseURL: string, apiKey: string): Promise<Snapshot> {
  const response = await fetch(`${baseURL.replace(/\/+$/, "")}/models`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Failed to fetch Nous Portal models: ${response.status}`)

  // Decode each item tolerantly so one malformed entry cannot discard the whole inventory.
  return decodeResponse(await response.json()).data.flatMap((raw) => {
    const model = Option.getOrUndefined(decodeModel(raw))
    return model ? [model] : []
  })
}

/**
 * Builds the catalog from the Portal inventory alone. Nous models are not in models.dev, so a
 * remote entry has no source template to merge into; every field comes from the live list.
 */
export function derive(remote: Snapshot): Model.Info[] {
  const result = new Map<Model.ID, Model.Info>()
  for (const item of remote) {
    // Hermes models are not reliable for agentic tool calling, matching Hermes Agent's own filter.
    if (item.id.toLowerCase().includes("hermes")) continue
    const output = item.architecture?.output_modalities ?? ["text"]
    if (!output.includes("text")) continue

    const id = Model.ID.make(item.id)
    const efforts = item.reasoning?.supported_efforts?.filter((value): value is string => !!value) ?? []
    const base = {
      ...Model.Info.default(providerID, id),
      modelID: id,
      name: item.name ?? item.id,
      package: packageName,
      capabilities: {
        tools: item.supported_parameters?.includes("tools") ?? true,
        input: modalities(item.architecture?.input_modalities),
        output: modalities(output),
        temperature: item.supported_parameters?.includes("temperature") ?? false,
      },
      time: { released: priceValue(item.created) * 1000 },
      cost: [
        {
          input: price(item.pricing?.prompt),
          output: price(item.pricing?.completion),
          cache: { read: price(item.pricing?.input_cache_read), write: Money.USDPerMillionTokens.zero },
        },
      ],
      limit: {
        context: limit(item.context_length, 200_000),
        // OpenRouter omits the completion cap for some models; keep Elhadry Agent's default so a
        // request is never implicitly capped at zero tokens.
        output: limit(item.top_provider?.max_completion_tokens, 32_000),
      },
    } satisfies Model.Info
    result.set(id, {
      ...base,
      variants: Variant.resolve(base, efforts.length > 0 ? [{ type: "effort", values: efforts }] : []),
    })
  }
  return Array.from(result.values())
}

function price(value: string | number | undefined) {
  if (value === undefined) return Money.USDPerMillionTokens.zero
  const parsed = Number(value) * 1_000_000
  return Number.isFinite(parsed) && parsed >= 0 ? Money.USDPerMillionTokens.make(parsed) : Money.USDPerMillionTokens.zero
}

function priceValue(value: number | undefined) {
  return value === undefined || !Number.isFinite(value) || value < 0 ? 0 : Math.trunc(value)
}

function limit(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : fallback
}

// OpenRouter names document files "file"; Elhadry Agent's capabilities use the broad kind "pdf".
function modalities(values: readonly string[] | undefined) {
  return [
    ...new Set(
      (values ?? ["text"]).map((value) => {
        if (value === "file" || value === "application/pdf") return "pdf"
        const kind = value.split("/")[0]
        return kind === "text" || kind === "image" || kind === "audio" || kind === "video" ? kind : value
      }),
    ),
  ]
}

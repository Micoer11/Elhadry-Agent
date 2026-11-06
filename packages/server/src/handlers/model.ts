import { Model } from "@elhadry/core/model"
import { Provider } from "@elhadry/core/provider"
import { ProviderDiscovery } from "@elhadry/core/provider-discovery"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../api"
import { awaitPlugins, response } from "../location"

export const ModelHandler = HttpApiBuilder.group(Api, "server.model", (handlers) =>
  Effect.gen(function* () {
    return handlers
      .handle(
        "model.list",
        Effect.fn(function* (ctx) {
          yield* awaitPlugins
          yield* refreshDiscoveredModels()
          const models = yield* Model.Service
          return yield* response(models.available(ctx.query.types))
        }),
      )
      .handle(
        "model.default",
        Effect.fn(function* () {
          yield* awaitPlugins
          const models = yield* Model.Service
          return yield* response(models.default())
        }),
      )
  }),
)

// A model configured before its provider advertised reasoning levels reaches the window without them. The first
// model list request reads the provider's own `/models` response, then rebuilds the transforms that apply it.
const refreshDiscoveredModels = Effect.fnUntraced(function* () {
  const providers = yield* Provider.Service
  const models = yield* Model.Service
  const snapshot = yield* providers.snapshot()
  const targets = snapshot.available.flatMap((record) => {
    const baseURL = record.provider.settings?.baseURL
    if (typeof baseURL !== "string") return []
    if (!Array.from(record.models.values()).some((model) => model.enabled && model.variants.length === 0)) return []
    const apiKey = record.provider.settings?.apiKey
    return [
      {
        baseURL,
        ...(typeof apiKey === "string" && apiKey !== "public" ? { apiKey } : {}),
        ...(record.provider.headers ? { headers: record.provider.headers } : {}),
      },
    ]
  })
  // The same gateway can be configured under more than one provider id; one request serves them all.
  const unique = Array.from(
    new Map(targets.map((target) => [target.baseURL.trim().replace(/\/+$/, "").toLowerCase(), target])).values(),
  )
  const fetched = yield* Effect.forEach(
    unique,
    (target) => ProviderDiscovery.refresh(target).pipe(Effect.catch(() => Effect.succeed(false))),
    { concurrency: "unbounded" },
  )
  if (!fetched.some(Boolean)) return
  // Rebuilding the models alone re-seeds them from the provider definitions that were built before the fetch. The
  // provider transforms must run again so they can read the discovery cache and attach the real levels.
  yield* providers.reload()
  yield* models.reload()
})

import { Credential } from "@elhadry/core/credential"
import { Integration } from "@elhadry/core/integration"
import { Provider } from "@elhadry/core/provider"
import { ProviderDiscovery } from "@elhadry/core/provider-discovery"
import { InvalidRequestError, ProviderNotFoundError } from "@elhadry/protocol/errors"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../api"
import { awaitPlugins, response } from "../location"

export const ProviderHandler = HttpApiBuilder.group(Api, "server.provider", (handlers) =>
  Effect.gen(function* () {
    return handlers
      .handle(
        "provider.list",
        Effect.fn(function* () {
          yield* awaitPlugins
          const providers = yield* Provider.Service
          return yield* response(providers.available())
        }),
      )
      .handle(
        "provider.get",
        Effect.fn(function* (ctx) {
          const providers = yield* Provider.Service
          const provider = yield* providers.get(ctx.params.providerID)
          if (!provider)
            return yield* new ProviderNotFoundError({
              providerID: ctx.params.providerID,
              message: `Provider not found: ${ctx.params.providerID}`,
            })
          return yield* response(Effect.succeed(provider))
        }),
      )
      .handle(
        "provider.models",
        Effect.fn(function* (ctx) {
          const providers = yield* Provider.Service
          const credentials = yield* Credential.Service
          const providerID = ctx.payload.providerID
          const provider = providerID === undefined ? undefined : yield* providers.get(providerID)
          if (providerID !== undefined && !provider)
            return yield* new ProviderNotFoundError({
              providerID,
              message: `Provider not found: ${providerID}`,
            })
          const configuredBaseURL = provider?.settings?.baseURL
          const baseURL =
            ctx.payload.baseURL ?? (typeof configuredBaseURL === "string" ? configuredBaseURL : undefined)
          if (!baseURL)
            return yield* new InvalidRequestError({
              message:
                provider === undefined ? "A base URL is required" : `Provider has no base URL: ${provider.name}`,
              field: "baseURL",
            })
          // The dialog already sends the key it was given; a refresh omits it so the runtime resolves the stored one.
          const stored = provider
            ? (yield* credentials.list(provider.integrationID ?? Integration.ID.make(provider.id))).at(-1)
            : undefined
          const apiKey = ctx.payload.apiKey ?? (stored?.value.type === "key" ? stored.value.key : undefined)
          const models = yield* ProviderDiscovery.list({
            baseURL,
            apiKey,
            headers: ctx.payload.headers ?? provider?.headers,
          }).pipe(
            Effect.mapError((error) => new InvalidRequestError({ message: error.message, field: "baseURL" })),
          )
          return { data: models }
        }),
      )
  }),
)
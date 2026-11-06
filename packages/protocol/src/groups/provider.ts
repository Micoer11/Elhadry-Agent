import { Provider } from "@elhadry/schema/provider"
import { ConfigProvider } from "@elhadry/schema/config/provider"
import { Location } from "@elhadry/schema/location"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api"
import { InvalidRequestError, ProviderNotFoundError, ServiceUnavailableError } from "../errors.js"
import { LocationQuery, locationQueryOpenApi } from "./location.js"

const DiscoverModelsInput = Schema.Struct({
  /** OpenAI-compatible server root, for example `https://api.example.com/v1`. */
  baseURL: Schema.String,
  apiKey: Schema.optional(Schema.String),
  headers: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).annotate({ identifier: "Provider.DiscoverModelsInput" })

const DiscoveredCapabilities = Schema.Struct({
  tools: Schema.optional(Schema.Boolean),
  input: Schema.optional(Schema.Array(Schema.String)),
  output: Schema.optional(Schema.Array(Schema.String)),
  temperature: Schema.optional(Schema.Boolean),
}).annotate({ identifier: "Provider.DiscoveredCapabilities" })

const DiscoveredLimit = Schema.Struct({
  context: Schema.optional(Schema.Int),
  input: Schema.optional(Schema.Int),
  output: Schema.optional(Schema.Int),
}).annotate({ identifier: "Provider.DiscoveredLimit" })

const DiscoveredModel = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  // Metadata is optional: many OpenAI-compatible servers only return ids, so clients keep their defaults.
  capabilities: Schema.optional(DiscoveredCapabilities),
  // The server's reasoning controls in models.dev's shape, so clients persist real levels instead of guessing.
  reasoning: Schema.optional(ConfigProvider.Reasoning),
  limit: Schema.optional(DiscoveredLimit),
}).annotate({ identifier: "Provider.DiscoveredModel" })

export const ProviderGroup = HttpApiGroup.make("server.provider")
  .add(
    HttpApiEndpoint.get("provider.list", "/api/provider", {
      query: LocationQuery,
      success: Location.response(Schema.Array(Provider.Info)),
      error: ServiceUnavailableError,
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "provider.list",
          summary: "List providers",
          description: "Retrieve active AI providers so clients can show provider availability and configuration.",
        }),
      ),
  )
  .add(
    HttpApiEndpoint.get("provider.get", "/api/provider/:providerID", {
      params: { providerID: Provider.ID },
      query: LocationQuery,
      success: Location.response(Provider.Info),
      error: [ProviderNotFoundError, ServiceUnavailableError],
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "provider.get",
          summary: "Get provider",
          description: "Retrieve a single AI provider so clients can inspect its availability and endpoint settings.",
        }),
      ),
  )
  .add(
    HttpApiEndpoint.post("provider.models", "/api/provider/models", {
      payload: DiscoverModelsInput,
      success: Schema.Struct({ data: Schema.Array(DiscoveredModel) }),
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "provider.models",
        summary: "Discover models",
        description: "List the models an OpenAI-compatible endpoint serves, for the custom-provider dialog.",
      }),
    ),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "provider",
      description: "Experimental provider routes.",
    }),
  )

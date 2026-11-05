import { Tunnel } from "@elhadry/schema/tunnel"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api"
import { InvalidRequestError } from "../errors.js"

export const TunnelGroup = HttpApiGroup.make("server.tunnel")
  .add(
    HttpApiEndpoint.get("tunnel.status", "/api/tunnel", {
      success: Schema.Array(Tunnel.Info),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "tunnel.status",
        summary: "Cloudflare tunnel status",
        description: "List every link the local server is currently published through, one per quick tunnel.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("tunnel.start", "/api/tunnel", {
      payload: Schema.Struct({ origin: Schema.String, password: Schema.optional(Schema.String) }),
      success: Tunnel.Info,
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "tunnel.start",
        summary: "Publish the local server",
        description:
          "Download cloudflared on first use and open another Cloudflare quick tunnel to the given local origin. Each call adds a link; several links can run at once and each keeps its own `password`, which is the only secret accepted through that link and is never the server's own credential. Quick tunnels need no Cloudflare account and expire when the app stops.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.delete("tunnel.stop", "/api/tunnel", {
      query: Schema.Struct({ id: Schema.optional(Schema.String) }),
      success: Schema.Array(Tunnel.Info),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "tunnel.stop",
        summary: "Stop a link",
        description: "Close the quick tunnel with the given id and release its process. Omit `id` to stop every link.",
      }),
    ),
  )
  .annotateMerge(OpenApi.annotations({ title: "tunnel", description: "Public access routes for the local server." }))

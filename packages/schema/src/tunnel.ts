export * as Tunnel from "./tunnel.js"

import { Schema } from "effect"

export const Info = Schema.Struct({
  /** Identifies one published link for as long as it lives; several links can run at once, each with its own password. */
  id: Schema.String,
  state: Schema.Literals(["stopped", "starting", "online", "error"]),
  /** Public `https://…` URL once the tunnel is serving. */
  url: Schema.optional(Schema.String),
  /** Local origin the tunnel forwards to. */
  origin: Schema.optional(Schema.String),
  /** Populated when `state` is `error`. */
  message: Schema.optional(Schema.String),
  /** Transport serving this tunnel: the cloudflared binary path, or `ssh`. */
  binary: Schema.optional(Schema.String),
  /**
   * The password this tunnel's public link uses. It is chosen for the link alone and never read from the
   * server's own credential, so a shared link can carry its own secret.
   */
  password: Schema.optional(Schema.String),
}).annotate({ identifier: "Tunnel.Info" })
export type Info = typeof Info.Type

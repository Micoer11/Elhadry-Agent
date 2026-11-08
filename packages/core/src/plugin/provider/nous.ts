import type { IntegrationOAuthMethodRegistration } from "@elhadry/plugin/effect/integration"
import { define } from "@elhadry/plugin/effect/plugin"
import { Clock, Effect, Option, Schema, Semaphore, Stream } from "effect"
import { App } from "../../app.js"
import { Bus } from "../../bus.js"
import { Credential } from "../../credential.js"
import { Integration } from "../../integration.js"
import { IntegrationConnection } from "../../integration/connection.js"
import { NousModels } from "../../nous/models.js"
import { Provider } from "../../provider.js"
import type { PluginInternal } from "../internal.js"

const providerID = Provider.ID.make("nous")
const integrationID = Integration.ID.make("nous")
const methodID = Integration.MethodID.make("device")
const packageName = "@elhadry/ai/providers/openai-compatible"

// Mirrors Hermes Agent's Nous Portal device-code client (hermes-cli).
const portalBaseURL = "https://portal.nousresearch.com"
const defaultInferenceBaseURL = "https://inference-api.nousresearch.com/v1"
const clientID = "hermes-cli"
const scope = "inference:invoke"
const deviceGrantType = "urn:ietf:params:oauth:grant-type:device_code"
const slowDownCap = 30_000
const edgeBackoffCap = 60_000

// Only the Portal's production inference hosts may receive the bearer token. A URL from a token
// response is network input, so an unrecognized host falls back to the default instead of routing
// the user's JWT elsewhere.
const inferenceHosts = new Set(["inference-api.nousresearch.com", "welcome-api.nousresearch.com"])

const Device = Schema.Struct({
  device_code: Schema.String,
  user_code: Schema.String,
  verification_uri: Schema.String,
  verification_uri_complete: Schema.optional(Schema.String),
  expires_in: Schema.Number,
  interval: Schema.Number,
})
const Token = Schema.Struct({
  access_token: Schema.optional(Schema.String),
  refresh_token: Schema.optional(Schema.String),
  expires_in: Schema.optional(Schema.Number),
  inference_base_url: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  error_description: Schema.optional(Schema.String),
})
const Claims = Schema.Struct({ email: Schema.optional(Schema.String) })

const ErrorBody = Schema.Struct({
  error: Schema.optional(Schema.String),
  error_description: Schema.optional(Schema.String),
})

const decodeDevice = Schema.decodeUnknownOption(Schema.fromJsonString(Device))
const decodeToken = Schema.decodeUnknownOption(Schema.fromJsonString(Token))
const decodeClaims = Schema.decodeUnknownOption(Schema.fromJsonString(Claims))
const decodeError = Schema.decodeUnknownOption(Schema.fromJsonString(ErrorBody))

const oauth = (app: App.Info) =>
  ({
    integrationID,
    method: {
      id: methodID,
      type: "oauth",
      label: "Login with Nous Portal",
    },
    authorize: () =>
      Effect.gen(function* () {
        const device = yield* post(`${portalBaseURL}/api/oauth/device/code`, { client_id: clientID, scope }, app).pipe(
          Effect.flatMap((response) =>
            read(response, decodeDevice, "Nous Portal device authorization"),
          ),
        )
        return {
          mode: "auto" as const,
          url: device.verification_uri_complete ?? device.verification_uri,
          instructions: `Enter code: ${device.user_code}`,
          callback: poll(device, app),
        }
      }),
    refresh: (credential) => refresh(credential, app),
    label: (credential) => label(credential),
  }) satisfies IntegrationOAuthMethodRegistration

export const NousPlugin = define({
  id: "opencode.provider.nous",
  effect: Effect.fn(function* (ctx) {
    const bus = yield* Bus.Service
    const loading = Semaphore.makeUnsafe(1)
    const loaded: {
      baseURL?: string
      models?: NousModels.Snapshot
      connection?: Effect.Success<ReturnType<typeof ctx.integration.connection.active>>
    } = {}

    const load = Effect.fn("NousPlugin.load")(function* () {
      const connection = yield* ctx.integration.connection.active(integrationID)
      const credential = connection
        ? yield* ctx.integration.connection.resolve(connection).pipe(Effect.orElseSucceed(() => undefined))
        : undefined
      if (credential?.type !== "oauth" || credential.methodID !== methodID) {
        loaded.baseURL = undefined
        loaded.models = undefined
        loaded.connection = undefined
        return
      }

      const baseURL = inferenceBaseURL(credential.metadata?.inferenceBaseURL)
      const remote = yield* Effect.tryPromise({
        try: () => NousModels.load(baseURL, credential.access),
        catch: (cause) => cause,
      }).pipe(
        Effect.catch((cause) =>
          Effect.logWarning("failed to sync Nous Portal models", { cause }).pipe(Effect.as(undefined)),
        ),
      )
      if (
        IntegrationConnection.key(connection) !==
        IntegrationConnection.key(yield* ctx.integration.connection.active(integrationID))
      )
        return
      loaded.baseURL = baseURL
      loaded.models = remote
      loaded.connection = connection
    })

    yield* ctx.integration.transform((editor) => {
      editor.update(integrationID, (integration) => {
        integration.name = "Nous Portal"
      })
      editor.method.update(oauth(ctx.app))
    })
    yield* ctx.provider.transform((evt) => {
      if (!loaded.models || !loaded.baseURL || !loaded.connection) return
      evt.add({
        info: {
          id: providerID,
          integrationID,
          name: "Nous Portal",
          activation: "auto",
          package: packageName,
          settings: { baseURL: loaded.baseURL, provider: "nous" },
        },
        models: NousModels.derive(loaded.models),
        sourceConnection: loaded.connection,
      })
    })
    const refresh = () => loading.withPermit(load().pipe(Effect.andThen(ctx.provider.reload())))
    yield* bus.subscribe(Credential.Event.Switched).pipe(
      Stream.filter((event) => event.data.integrationID === integrationID),
      Stream.runForEach(refresh),
      Effect.forkScoped({ startImmediately: true }),
    )
    yield* refresh().pipe(Effect.forkScoped)
  }),
} satisfies PluginInternal.InternalPlugin)

function post(url: string, body: Record<string, string>, app: App.Info, headers?: Record<string, string>) {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": App.useragent(app),
          ...headers,
        },
        body: new URLSearchParams(body).toString(),
        signal,
      }),
    catch: (cause) => cause,
  })
}

function read<A>(response: Response, decode: (text: string) => Option.Option<A>, description: string) {
  return Effect.gen(function* () {
    const text = yield* Effect.tryPromise({ try: () => response.text(), catch: (cause) => cause })
    if (!response.ok) {
      const error = Option.getOrUndefined(decodeError(text))
      const detail = error?.error_description ?? error?.error
      return yield* Effect.fail(new Error(`${description} failed (HTTP ${response.status})${detail ? `: ${detail}` : ""}`))
    }
    const value = Option.getOrUndefined(decode(text))
    if (!value) return yield* Effect.fail(new Error(`${description} returned an invalid response`))
    return value
  })
}

// Hermes Agent caps polling at one request per second regardless of the advertised interval.
const poll = (device: typeof Device.Type, app: App.Info) =>
  Effect.gen(function* () {
    const deadline = (yield* Clock.currentTimeMillis) + Math.max(1, device.expires_in) * 1000
    return yield* pollToken(device.device_code, app, { deadline, interval: 1_000, edgeBackoff: 0 })
  })

const pollToken = (
  deviceCode: string,
  app: App.Info,
  state: { deadline: number; interval: number; edgeBackoff: number },
): Effect.Effect<Credential.OAuth, unknown> =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis
    if (now >= state.deadline)
      return yield* Effect.fail(
        new Error(
          "Timed out waiting for Nous Portal approval. Complete the sign-in in the browser tab, then connect again.",
        ),
      )

    const response = yield* post(
      `${portalBaseURL}/api/oauth/token`,
      { grant_type: deviceGrantType, client_id: clientID, device_code: deviceCode },
      app,
    )
    const text = yield* Effect.tryPromise({ try: () => response.text(), catch: (cause) => cause })
    const payload = Option.getOrUndefined(decodeToken(text))
    const remaining = Math.max(0, state.deadline - now)

    if (response.status === 200) {
      if (!payload?.access_token)
        return yield* Effect.fail(new Error("Nous Portal token response did not include access_token"))
      return yield* credential(payload.access_token, payload)
    }

    // The Vercel Security Checkpoint in front of the Portal answers non-browser clients with an
    // HTML 403/429 page. Backing off keeps a login the user may still be approving alive.
    if (!payload) {
      const mitigated = response.status === 403 && response.headers.has("x-vercel-mitigated")
      if (response.status === 408 || response.status === 429 || response.status >= 500 || mitigated) {
        const retryAfter = retryAfterMillis(response.headers)
        const backoff =
          retryAfter === undefined
            ? Math.min(Math.max(state.edgeBackoff * 2, state.interval * 2, 5000), edgeBackoffCap)
            : Math.min(Math.max(state.interval, retryAfter), edgeBackoffCap)
        return yield* Effect.sleep(Math.min(backoff, remaining)).pipe(
          Effect.andThen(
            pollToken(deviceCode, app, { ...state, edgeBackoff: backoff }),
          ),
        )
      }
      return yield* Effect.fail(new Error(`Nous Portal token request failed (HTTP ${response.status})`))
    }

    if (payload.error === "authorization_pending")
      return yield* Effect.sleep(Math.min(state.interval, remaining)).pipe(
        Effect.andThen(pollToken(deviceCode, app, { ...state, edgeBackoff: 0 })),
      )
    if (payload.error === "slow_down") {
      const interval = Math.min(state.interval + 1000, slowDownCap)
      return yield* Effect.sleep(interval).pipe(
        Effect.andThen(pollToken(deviceCode, app, { ...state, interval, edgeBackoff: 0 })),
      )
    }
    return yield* Effect.fail(
      new Error(
        payload.error === undefined
          ? `Nous Portal authorization failed (HTTP ${response.status})`
          : `Nous Portal authorization failed: ${payload.error_description ?? payload.error}`,
      ),
    )
  })

// Refresh tokens are single-use and rotate on every successful refresh. Keep the previous token
// when the response omits a new one, matching Hermes Agent.
const refresh = (value: Credential.OAuth, app: App.Info) =>
  Effect.gen(function* () {
    if (!value.refresh)
      return yield* Effect.fail(new Error("This Nous Portal connection has no refresh token. Connect again."))
    const response = yield* post(
      `${portalBaseURL}/api/oauth/token`,
      { grant_type: "refresh_token", client_id: clientID },
      app,
      { "x-nous-refresh-token": value.refresh },
    )
    const token = yield* read(response, decodeToken, "Nous Portal token refresh")
    if (!token.access_token)
      return yield* Effect.fail(new Error("Nous Portal token refresh did not include access_token"))
    return Credential.OAuth.make({
      ...value,
      access: token.access_token,
      refresh: token.refresh_token ?? value.refresh,
      expires: (yield* Clock.currentTimeMillis) + Math.max(0, token.expires_in ?? 0) * 1000,
      metadata: { ...value.metadata, inferenceBaseURL: inferenceBaseURL(token.inference_base_url) },
    })
  })

const credential = (access: string, token: typeof Token.Type) =>
  Effect.gen(function* () {
    return Credential.OAuth.make({
      type: "oauth",
      methodID,
      access,
      refresh: token.refresh_token ?? "",
      expires: (yield* Clock.currentTimeMillis) + Math.max(0, token.expires_in ?? 0) * 1000,
      metadata: { inferenceBaseURL: inferenceBaseURL(token.inference_base_url) },
    })
  })

const label = (credential: Credential.OAuth) => {
  const parts = credential.access.split(".")
  if (parts.length !== 3) return undefined
  const payload = parts[1]
  if (!payload) return undefined
  const claims = Option.getOrUndefined(decodeClaims(Buffer.from(payload, "base64url").toString("utf8")))
  return claims?.email
}

function inferenceBaseURL(value: unknown) {
  if (typeof value !== "string" || !URL.canParse(value)) return defaultInferenceBaseURL
  const url = new URL(value)
  if (url.protocol !== "https:" || !inferenceHosts.has(url.hostname)) return defaultInferenceBaseURL
  return value.replace(/\/+$/, "")
}

function retryAfterMillis(headers: Headers) {
  const value = headers.get("retry-after")?.trim()
  if (!value) return undefined
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined
}

import type {
  ConfigEntry,
  ConfigModelCapabilities,
  ConfigProviderSettings,
  ProviderDiscoveredModel,
} from "@elhadry/client"

const PROVIDER_ID = /^[a-z0-9][a-z0-9-_]*$/

const OPENAI_COMPATIBLE = "aisdk:@ai-sdk/openai-compatible"

type ProviderConfig = NonNullable<NonNullable<Extract<ConfigEntry, { type: "document" }>["info"]["providers"]>[string]>

type ModelConfig = NonNullable<ProviderConfig["models"]>[string]

type Translator = (key: string, vars?: Record<string, string | number | boolean>) => string

/** Metadata the server discovered for a model, kept on the row until the provider is saved. */
export type ModelMeta = Omit<ProviderDiscoveredModel, "id" | "name">

export type ModelErr = {
  id?: string
  name?: string
}

export type HeaderErr = {
  key?: string
  value?: string
}

export type ModelRow = {
  row: string
  id: string
  name: string
  meta?: ModelMeta
  err: ModelErr
}

export type HeaderRow = {
  row: string
  key: string
  value: string
  err: HeaderErr
}

export type FormState = {
  providerID: string
  name: string
  baseURL: string
  apiKey: string
  models: ModelRow[]
  headers: HeaderRow[]
  err: {
    providerID?: string
    name?: string
    baseURL?: string
    models?: string
  }
}

type ValidateArgs = {
  form: FormState
  t: Translator
  disabledProviders: string[]
  existingProviderIDs: Set<string>
}

/** A row the user left untouched: skipped instead of reported as missing. */
const blankModel = (model: ModelRow) => !model.id.trim() && !model.name.trim()

export function validateCustomProvider(input: ValidateArgs) {
  const providerID = input.form.providerID.trim()
  const name = input.form.name.trim()
  const baseURL = input.form.baseURL.trim()
  const apiKey = input.form.apiKey.trim()

  const env = apiKey.match(/^\{env:([^}]+)\}$/)?.[1]?.trim()
  const key = apiKey && !env ? apiKey : undefined

  const idError = !providerID
    ? input.t("provider.custom.error.providerID.required")
    : !PROVIDER_ID.test(providerID)
      ? input.t("provider.custom.error.providerID.format")
      : undefined

  const nameError = !name ? input.t("provider.custom.error.name.required") : undefined

  const urlError = !baseURL
    ? input.t("provider.custom.error.baseURL.required")
    : !/^https?:\/\//.test(baseURL)
      ? input.t("provider.custom.error.baseURL.format")
      : undefined

  const disabled = input.disabledProviders.includes(providerID)

  const existsError = idError
    ? undefined
    : input.existingProviderIDs.has(providerID) && !disabled
      ? input.t("provider.custom.error.providerID.exists")
      : undefined

  const seenModels = new Set<string>()

  const models = input.form.models.map((m) => {
    const id = m.id.trim()

    if (blankModel(m)) return {}

    const idError = !id
      ? input.t("provider.custom.error.required")
      : seenModels.has(id)
        ? input.t("provider.custom.error.duplicate")
        : (() => {
            seenModels.add(id)

            return undefined
          })()

    // A model without a display name is fine: the id is the name.
    const nameError = undefined

    return { id: idError, name: nameError }
  })

  const modelsValid = models.every((m) => !m.id && !m.name)

  const filled = input.form.models
    .map((m) => ({ id: m.id.trim(), name: m.name.trim() || m.id.trim(), meta: m.meta }))
    .filter((m) => !!m.id)

  const modelConfig = Object.fromEntries(
    filled.map((m) => {
      const capabilities: ConfigModelCapabilities = { tools: m.meta?.capabilities?.tools ?? true }

      if (m.meta?.capabilities?.input) capabilities.input = [...m.meta.capabilities.input]

      if (m.meta?.capabilities?.output) capabilities.output = [...m.meta.capabilities.output]

      const temperature = m.meta?.capabilities?.temperature

      if (temperature !== null && temperature !== undefined) capabilities.temperature = temperature

      if (m.meta?.reasoning) capabilities.reasoning = m.meta.reasoning

      const config: ModelConfig = { capabilities }

      if (m.name !== m.id) config.name = m.name

      if (m.meta?.limit) {
        const limit: NonNullable<ModelConfig["limit"]> = {}

        if (m.meta.limit.context !== null && m.meta.limit.context !== undefined) limit.context = m.meta.limit.context

        if (m.meta.limit.input !== null && m.meta.limit.input !== undefined) limit.input = m.meta.limit.input

        if (m.meta.limit.output !== null && m.meta.limit.output !== undefined) limit.output = m.meta.limit.output

        config.limit = limit
      }

      return [m.id, config]
    }),
  )

  const modelsError = filled.length === 0 ? input.t("provider.custom.error.models.required") : undefined

  const seenHeaders = new Set<string>()

  const headers = input.form.headers.map((h) => {
    const key = h.key.trim()
    const value = h.value.trim()

    if (!key && !value) return {}

    const keyError = !key
      ? input.t("provider.custom.error.required")
      : seenHeaders.has(key.toLowerCase())
        ? input.t("provider.custom.error.duplicate")
        : (() => {
            seenHeaders.add(key.toLowerCase())

            return undefined
          })()

    const valueError = !value ? input.t("provider.custom.error.required") : undefined

    return { key: keyError, value: valueError }
  })

  const headersValid = headers.every((h) => !h.key && !h.value)

  const headerConfig = Object.fromEntries(
    input.form.headers
      .map((h) => ({ key: h.key.trim(), value: h.value.trim() }))
      .filter((h) => !!h.key && !!h.value)
      .map((h) => [h.key, h.value]),
  )

  const err = {
    providerID: idError ?? existsError,
    name: nameError,
    baseURL: urlError,
    models: modelsError,
  }

  const ok = !idError && !existsError && !nameError && !urlError && modelsValid && headersValid && !modelsError

  if (!ok) return { err, models, headers }

  const settings: ConfigProviderSettings = { baseURL }

  if (Object.keys(headerConfig).length) settings.headers = headerConfig

  const config: ProviderConfig = {
    package: OPENAI_COMPATIBLE,
    name,
    settings,
    models: modelConfig,
  }

  if (env) config.env = [env]

  return {
    err,
    models,
    headers,
    result: {
      providerID,
      name,
      key,
      config,
    },
  }
}

let row = 0

const nextRow = () => `row-${row++}`

export const modelRow = (id = "", name = "", meta?: ModelMeta): ModelRow => ({ row: nextRow(), id, name, meta, err: {} })

export const headerRow = (): HeaderRow => ({ row: nextRow(), key: "", value: "", err: {} })

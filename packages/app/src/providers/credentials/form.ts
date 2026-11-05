const PROVIDER_ID = /^[a-z0-9][a-z0-9-_]*$/

const OPENAI_COMPATIBLE = "aisdk:@ai-sdk/openai-compatible"

type Translator = (key: string, vars?: Record<string, string | number | boolean>) => string

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
    .map((m) => ({ id: m.id.trim(), name: m.name.trim() || m.id.trim() }))
    .filter((m) => !!m.id)

  const modelConfig = Object.fromEntries(
    filled.map((m) => [m.id, { ...(m.name === m.id ? {} : { name: m.name }), capabilities: { tools: true } }]),
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

  return {
    err,
    models,
    headers,
    result: {
      providerID,
      name,
      key,
      config: {
        package: OPENAI_COMPATIBLE,
        name,
        ...(env ? { env: [env] } : {}),
        // No `apiKey` key at all when the field is empty: the request must not carry an empty credential.
        settings: {
          baseURL,
          ...(Object.keys(headerConfig).length ? { headers: headerConfig } : {}),
        },
        models: modelConfig,
      },
    },
  }
}

let row = 0

const nextRow = () => `row-${row++}`

export const modelRow = (id = "", name = ""): ModelRow => ({ row: nextRow(), id, name, err: {} })

export const headerRow = (): HeaderRow => ({ row: nextRow(), key: "", value: "", err: {} })

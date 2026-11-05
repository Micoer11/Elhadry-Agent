import { describe, expect, test } from "bun:test"
import { validateCustomProvider } from "./form"

const t = (key: string) => key

describe("validateCustomProvider", () => {
  test("builds trimmed config payload", () => {
    const result = validateCustomProvider({
      form: {
        providerID: "custom-provider",
        name: " Custom Provider ",
        baseURL: "https://api.example.com ",
        apiKey: " {env: CUSTOM_PROVIDER_KEY} ",
        models: [{ row: "m0", id: " model-a ", name: " Model A ", err: {} }],
        headers: [
          { row: "h0", key: " X-Test ", value: " enabled ", err: {} },
          { row: "h1", key: "", value: "", err: {} },
        ],
        err: {},
      },
      t,
      disabledProviders: [],
      existingProviderIDs: new Set(),
    })

    expect(result.result).toEqual({
      providerID: "custom-provider",
      name: "Custom Provider",
      key: undefined,
      config: {
        package: "aisdk:@ai-sdk/openai-compatible",
        name: "Custom Provider",
        env: ["CUSTOM_PROVIDER_KEY"],
        settings: {
          baseURL: "https://api.example.com",
          headers: {
            "X-Test": "enabled",
          },
        },
        models: {
          "model-a": { name: "Model A", capabilities: { tools: true } },
        },
      },
    })
  })

  test("flags duplicate rows and allows reconnecting disabled providers", () => {
    const result = validateCustomProvider({
      form: {
        providerID: "custom-provider",
        name: "Provider",
        baseURL: "https://api.example.com",
        apiKey: "secret",
        models: [
          { row: "m0", id: "model-a", name: "Model A", err: {} },
          { row: "m1", id: "model-a", name: "Model A 2", err: {} },
        ],
        headers: [
          { row: "h0", key: "Authorization", value: "one", err: {} },
          { row: "h1", key: "authorization", value: "two", err: {} },
        ],
        err: {},
      },
      t,
      disabledProviders: ["custom-provider"],
      existingProviderIDs: new Set(["custom-provider"]),
    })

    expect(result.result).toBeUndefined()
    expect(result.err.providerID).toBeUndefined()
    expect(result.models[1]).toEqual({
      id: "provider.custom.error.duplicate",
      name: undefined,
    })
    expect(result.headers[1]).toEqual({
      key: "provider.custom.error.duplicate",
      value: undefined,
    })
  })

  test("omits the key entirely when the field is empty", () => {
    const result = validateCustomProvider({
      form: {
        providerID: "ai",
        name: "ai",
        baseURL: "http://127.0.0.1:8080/v1",
        apiKey: "   ",
        models: [{ row: "m0", id: "model-a", name: "", err: {} }],
        headers: [{ row: "h0", key: "", value: "", err: {} }],
        err: {},
      },
      t,
      disabledProviders: [],
      existingProviderIDs: new Set(),
    })

    expect(result.result?.key).toBeUndefined()
    expect(result.result?.config.settings).toEqual({ baseURL: "http://127.0.0.1:8080/v1" })
    // A model with no display name takes the id as its name, so the config stays minimal.
    expect(result.result?.config.models).toEqual({ "model-a": { capabilities: { tools: true } } })
  })

  test("requires at least one model instead of failing on a blank row", () => {
    const result = validateCustomProvider({
      form: {
        providerID: "ai",
        name: "ai",
        baseURL: "http://127.0.0.1:8080/v1",
        apiKey: "",
        models: [{ row: "m0", id: "", name: "", err: {} }],
        headers: [{ row: "h0", key: "", value: "", err: {} }],
        err: {},
      },
      t,
      disabledProviders: [],
      existingProviderIDs: new Set(),
    })

    expect(result.result).toBeUndefined()
    // A blank row is not reported as a missing field; the section says models are required instead.
    expect(result.models).toEqual([{}])
    expect(result.err.models).toBe("provider.custom.error.models.required")
  })
})

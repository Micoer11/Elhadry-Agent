import { expect, test } from "bun:test"
import { NousModels } from "@elhadry/core/nous/models"
import { Model } from "@elhadry/core/model"
import { Provider } from "@elhadry/core/provider"
import { ProviderPlugins } from "@elhadry/core/plugin/provider"
import { Money } from "@elhadry/schema/money"

const providerID = Provider.ID.make("nous")

test("nous plugin is registered", () => {
  expect(ProviderPlugins.map((item) => item.id)).toContain("opencode.provider.nous")
})

test("loads the live Portal inventory and derives the catalog", async () => {
  const server = Bun.serve({
    port: 0,
    fetch: (request) => {
      expect(request.headers.get("Authorization")).toBe("Bearer test-token")
      expect(new URL(request.url).pathname).toBe("/v1/models")
      return Response.json({
        data: [
          {
            id: "acme/alpha",
            name: "Alpha",
            created: 1_700_000_000,
            context_length: 200_000,
            architecture: { input_modalities: ["text", "image", "file"], output_modalities: ["text"] },
            pricing: { prompt: "0.000003", completion: 0.000015, input_cache_read: "0.0000003" },
            supported_parameters: ["tools", "temperature"],
            reasoning: { supported_efforts: ["low", "high", null] },
            top_provider: { max_completion_tokens: 64_000 },
          },
          { id: "acme/Hermes-4", output_modalities: ["text"] },
          { id: "acme/image", architecture: { output_modalities: ["image"] } },
          { id: "acme/sparse" },
          { id: 123 },
        ],
      })
    },
  })

  try {
    const models = NousModels.derive(await NousModels.load(`${server.url.origin}/v1/`, "test-token"))

    expect(models.map((model) => model.id)).toEqual([
      Model.ID.make("acme/alpha"),
      Model.ID.make("acme/sparse"),
    ])

    const alpha = models[0]!
    expect(alpha.name).toBe("Alpha")
    expect(alpha.providerID).toBe(providerID)
    expect(alpha.modelID).toBe(Model.ID.make("acme/alpha"))
    expect(alpha.package).toBe("@elhadry/ai/providers/openai-compatible")
    expect(alpha.capabilities).toMatchObject({ tools: true, temperature: true, input: ["text", "image", "pdf"] })
    expect(alpha.cost[0]?.input).toBe(Money.USDPerMillionTokens.make(3))
    expect(alpha.cost[0]?.output).toBe(Money.USDPerMillionTokens.make(15))
    expect(Number(alpha.cost[0]?.cache.read)).toBeCloseTo(0.3, 10)
    expect(alpha.cost[0]?.cache.write).toBe(Money.USDPerMillionTokens.zero)
    expect(alpha.limit).toMatchObject({ context: 200_000, output: 64_000 })
    expect(alpha.time.released).toBe(1_700_000_000_000)
    expect(alpha.variants.map((variant) => variant.id)).toEqual([
      Model.VariantID.make("low"),
      Model.VariantID.make("high"),
    ])
    expect(alpha.variants[0]?.settings).toMatchObject({ reasoningEffort: "low" })
    expect(alpha.status).toBe("active")

    const sparse = models[1]!
    expect(sparse.name).toBe("acme/sparse")
    expect(sparse.capabilities).toMatchObject({ tools: true, temperature: false, input: ["text"], output: ["text"] })
    expect(sparse.cost[0]).toMatchObject({ input: 0, output: 0 })
    expect(sparse.limit).toMatchObject({ context: 200_000, output: 32_000 })
    expect(sparse.variants).toEqual([])
  } finally {
    await server.stop(true)
  }
})

test("throws on Portal failure so the plugin can fail soft", async () => {
  const server = Bun.serve({
    port: 0,
    fetch: () => new Response("nope", { status: 500 }),
  })

  try {
    await expect(NousModels.load(server.url.origin, "test-token")).rejects.toThrow()
  } finally {
    await server.stop(true)
  }
})

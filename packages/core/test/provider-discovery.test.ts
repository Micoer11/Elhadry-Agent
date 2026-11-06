import { expect, test } from "bun:test"
import { ProviderDiscovery } from "@elhadry/core/provider-discovery"
import { Effect } from "effect"

test("reads real reasoning controls, capabilities, and limits from a rich model list", async () => {
  const paths: string[] = []
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      paths.push(new URL(request.url).pathname)
      return Response.json({
        data: [
          {
            id: "nvidia/nemotron-3.5-super-vl:free",
            name: "NVIDIA: Nemotron 3.5 Super VL (free)",
            architecture: { input_modalities: ["text", "image", "video"], output_modalities: ["text"] },
            top_provider: { context_length: 1_000_000, max_completion_tokens: 131_072 },
            supported_parameters: ["tools", "temperature", "reasoning"],
            opencode: {
              variants: {
                instant: { reasoning: { enabled: false, effort: "none" } },
                thinking: { reasoning: { enabled: true, effort: "high" } },
              },
              reasoning_options: [{ type: "toggle" }],
            },
          },
          {
            id: "explicit-reasoning",
            capabilities: { reasoning: { supported: true, effort: ["low", "max"] } },
          },
          {
            id: "toggle-only",
            opencode: { reasoning_options: [{ type: "toggle" }] },
          },
          { id: "plain" },
        ],
      })
    },
  })
  try {
    const models = await Effect.runPromise(
      ProviderDiscovery.list({ baseURL: `http://127.0.0.1:${server.port}/v1` }),
    )
    expect(paths).toEqual(["/v1/models"])
    expect(models).toEqual([
      {
        id: "explicit-reasoning",
        reasoning: { supported: true, effort: ["low", "max"] },
      },
      {
        id: "nvidia/nemotron-3.5-super-vl:free",
        name: "NVIDIA: Nemotron 3.5 Super VL (free)",
        capabilities: {
          tools: true,
          input: ["text", "image", "video"],
          output: ["text"],
          temperature: true,
        },
        reasoning: { supported: true, effort: ["none", "high"] },
        limit: { context: 1_000_000, output: 131_072 },
      },
      { id: "plain" },
      {
        id: "toggle-only",
        reasoning: { supported: true, toggle: true },
      },
    ])
  } finally {
    await server.stop()
  }
})

test("reuses a fresh discovery result instead of asking the same endpoint again", async () => {
  let requests = 0
  const server = Bun.serve({
    port: 0,
    fetch: () => {
      requests += 1
      return Response.json({
        data: [{ id: "chat", opencode: { reasoning_options: [{ type: "effort", values: ["low", "high"] }] } }],
      })
    },
  })
  try {
    const baseURL = `http://127.0.0.1:${server.port}/v1`
    expect(await Effect.runPromise(ProviderDiscovery.refresh({ baseURL }))).toBe(true)
    expect(ProviderDiscovery.cached(`${baseURL}/`)?.map((model) => model.id)).toEqual(["chat"])
    expect(await Effect.runPromise(ProviderDiscovery.refresh({ baseURL }))).toBe(false)
    expect(requests).toBe(1)
  } finally {
    await server.stop()
  }
})

test("adds no metadata when the server only returns ids", async () => {
  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json({
        data: [
          {
            id: "chat",
            context_length: null,
            max_completion_tokens: null,
            supported_parameters: null,
            capabilities: null,
          },
        ],
      }),
  })
  try {
    const models = await Effect.runPromise(ProviderDiscovery.list({ baseURL: `http://127.0.0.1:${server.port}/v1` }))
    expect(models).toEqual([{ id: "chat" }])
  } finally {
    await server.stop()
  }
})

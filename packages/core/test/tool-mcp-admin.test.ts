import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { AppNodeBuilder } from "@elhadry/core/effect/app-node-builder"
import { Config } from "@elhadry/core/config"
import { Image } from "@elhadry/core/image"
import { Mcp } from "@elhadry/core/mcp/index"
import { Permission } from "@elhadry/core/permission"
import { Session } from "@elhadry/core/session"
import { Tool } from "@elhadry/core/tool"
import { McpAdminTools } from "@elhadry/core/tool/plugin/mcp-admin"
import { Mcp as McpSchema } from "@elhadry/schema/mcp"
import { testEffect } from "./lib/effect"
import { imagePassthrough } from "./lib/image"
import { permissionLayer } from "./lib/permission"
import { executeTool, registerToolPlugin, toolIdentity } from "./lib/tool"

const sessionID = Session.ID.make("ses_tool_mcp_admin")

const it = testEffect(
  AppNodeBuilder.build(Tool.node, [
    Image.node.replace(imagePassthrough),
    Permission.node.replace(permissionLayer({ assert: () => Effect.void })),
  ]),
)

const call = (registry: Tool.Interface, name: string, input: unknown) =>
  executeTool(registry, {
    sessionID,
    ...toolIdentity,
    call: {
      type: "tool-call",
      id: `call-${name}`,
      name: "execute",
      input: { code: `return await tools.elhadry.${name}(${JSON.stringify(input)})` },
    },
  }).pipe(
    Effect.map((result) => {
      const text = result.content?.map((part) => (part.type === "text" ? part.text : "")).join("") ?? ""
      return {
        error: result.metadata?.error === true,
        text,
        output: text && result.metadata?.error !== true ? (JSON.parse(text) as Record<string, unknown>) : undefined,
      }
    }),
  )

const setup = () =>
  Effect.gen(function* () {
    const registry = yield* Tool.Service
    const added: Array<{ name: string; config: McpSchema.ServerConfig }> = []
    const removed: string[] = []
    const updates: unknown[] = []
    let status: McpSchema.Status = { status: "disabled" }

    yield* registerToolPlugin(McpAdminTools.Plugin).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(Mcp.Service)({
            add: (name, config) =>
              Effect.sync(() => {
                added.push({ name: String(name), config })
                status = config.disabled === true ? { status: "disabled" } : { status: "connected" }
              }),
            remove: (name) =>
              Effect.sync(() => {
                removed.push(String(name))
              }),
            servers: () => Effect.succeed([{ name: "context7", status }]),
          }),
          Layer.mock(Config.Service)({
            update: (patch) =>
              Effect.sync(() => {
                updates.push(patch)
              }),
          }),
        ),
      ),
    )

    return { registry, added, removed, updates }
  })

describe("McpAdminTools", () => {
  it.effect("adds a remote server disabled by default and persists it", () =>
    Effect.gen(function* () {
      const state = yield* setup()
      const result = yield* call(state.registry, "mcp_add", {
        name: "context7",
        config: { type: "remote", url: "https://mcp.context7.com/mcp" },
      })

      expect(result.error).toBe(false)
      expect(result.output).toMatchObject({ name: "context7", status: { status: "disabled" } })
      expect(state.added).toEqual([
        {
          name: "context7",
          config: { type: "remote", url: "https://mcp.context7.com/mcp", disabled: true },
        },
      ])
      expect(state.updates).toEqual([
        {
          mcp: {
            servers: {
              context7: { type: "remote", url: "https://mcp.context7.com/mcp", disabled: true },
            },
          },
        },
      ])
    }),
  )

  it.effect("connects immediately only when connect is true and keeps local options", () =>
    Effect.gen(function* () {
      const state = yield* setup()
      const result = yield* call(state.registry, "mcp_add", {
        name: "context7",
        connect: true,
        config: {
          type: "local",
          command: ["npx", "-y", "@modelcontextprotocol/server-everything"],
          environment: { LOG_LEVEL: "info" },
        },
      })

      expect(result.error).toBe(false)
      expect(result.output).toMatchObject({ name: "context7", status: { status: "connected" } })
      expect(state.added[0]?.config).toEqual({
        type: "local",
        command: ["npx", "-y", "@modelcontextprotocol/server-everything"],
        environment: { LOG_LEVEL: "info" },
        disabled: false,
      })
    }),
  )

  it.effect("removes a server and clears its configuration", () =>
    Effect.gen(function* () {
      const state = yield* setup()
      const result = yield* call(state.registry, "mcp_remove", { name: "context7" })

      expect(result.error).toBe(false)
      expect(state.removed).toEqual(["context7"])
      expect(state.updates).toEqual([{ mcp: { servers: { context7: null } } }])
    }),
  )

  it.effect("lists configured servers and rejects a blank name", () =>
    Effect.gen(function* () {
      const state = yield* setup()
      const list = yield* call(state.registry, "mcp_list", {})
      expect(list.output).toEqual({ servers: [{ name: "context7", status: { status: "disabled" } }] })

      const blank = yield* call(state.registry, "mcp_add", {
        name: "  ",
        config: { type: "remote", url: "https://example.com/mcp" },
      })
      expect(blank.error).toBe(true)
      expect(blank.text).toContain("MCP server name is required")
    }),
  )
})

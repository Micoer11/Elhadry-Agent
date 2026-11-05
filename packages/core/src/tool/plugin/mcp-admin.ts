export * as McpAdminTools from "./mcp-admin.js"

import { ToolFailure } from "@elhadry/ai/effect"
import type { Context } from "@elhadry/plugin/effect/plugin"
import { Server, ServerConfig } from "@elhadry/schema/mcp"
import { Effect, Schema } from "effect"
import { Config } from "../../config.js"
import { Mcp } from "../../mcp/index.js"

const AddInput = Schema.Struct({
  name: Schema.String.annotate({
    description: "Unique server name. Use lowercase letters, numbers, dots, dashes, or underscores.",
  }),
  config: ServerConfig.annotate({
    description:
      'Server configuration. Remote servers use { type: "remote", url, headers?, oauth? }. Local servers use { type: "local", command, cwd?, environment? }. Both accept disabled, codemode, timeout, and protocol.',
  }),
  connect: Schema.optional(Schema.Boolean).annotate({
    description:
      "Connect immediately after saving. Defaults to false so the server is saved disabled and the user can start the sign-in flow from the app.",
  }),
})

const RemoveInput = Schema.Struct({
  name: Schema.String.annotate({ description: "Name of the MCP server to remove." }),
})

const ListInput = Schema.Struct({})

const ListOutput = Schema.Struct({ servers: Schema.Array(Server) })

const RemoveOutput = Schema.Struct({ name: Schema.String, removed: Schema.Boolean })

export const Plugin = {
  id: "opencode.tool.mcp-admin",
  effect: Effect.fn("McpAdminTools.Plugin")(function* (ctx: Context) {
    // Acquire services while the plugin layer is built; executors must not require services.
    const mcp = yield* Mcp.Service
    const config = yield* Config.Service

    const failure = (error: { readonly message: string }) => new ToolFailure({ message: error.message, error })

    yield* ctx.tool
      .transform((editor) => {
        editor.add({
          name: "mcp_add",
          description:
            "Add an MCP server the user asked for, including custom servers that are not in the ready-made catalog. The server is saved to the app configuration, so it survives a restart. New servers are saved disabled by default; pass connect: true only when the user explicitly asked to connect it now. OAuth servers then need the user to authorize in the app before their tools appear. Use mcp_list first when you are unsure whether the name is already taken.",
          input: AddInput,
          output: Server,
          options: { namespace: "elhadry", codemode: true },
          execute: (input) =>
            Effect.gen(function* () {
              const name = input.name.trim()

              if (!name) yield* Effect.fail(new ToolFailure({ message: "MCP server name is required." }))

              const connect = input.connect === true
              const serverConfig = { ...input.config, disabled: !connect }

              yield* mcp.add(name, serverConfig)

              if (config.update) yield* config.update({ mcp: { servers: { [name]: serverConfig } } })

              const info = (yield* mcp.servers()).find((server) => server.name === name)
              const result = info ?? { name, status: { status: "disabled" as const } }

              return {
                output: result,
                content: connect
                  ? `Added and connected MCP server ${name}: ${result.status.status}`
                  : `Added MCP server ${name} as disabled. Connect it from Settings → Extensions → MCP when the user is ready.`,
              }
            }).pipe(Effect.mapError(failure)),
        })

        editor.add({
          name: "mcp_remove",
          description:
            "Remove an MCP server from the app configuration and disconnect it. Use when the user asks to delete, remove, or stop an MCP server.",
          input: RemoveInput,
          output: RemoveOutput,
          options: { namespace: "elhadry", codemode: true },
          execute: (input) =>
            Effect.gen(function* () {
              const name = input.name.trim()

              if (!name) yield* Effect.fail(new ToolFailure({ message: "MCP server name is required." }))

              yield* mcp.remove(name).pipe(Effect.catchTag("MCP.NotFoundError", () => Effect.void))

              if (config.update) yield* config.update({ mcp: { servers: { [name]: null } } })

              return {
                output: { name, removed: true },
                content: `Removed MCP server ${name}.`,
              }
            }).pipe(Effect.mapError(failure)),
        })

        editor.add({
          name: "mcp_list",
          description:
            "List configured MCP servers with their connection status. Use before mcp_add or mcp_remove when you need the exact server name.",
          input: ListInput,
          output: ListOutput,
          options: { namespace: "elhadry", codemode: true },
          execute: () =>
            Effect.gen(function* () {
              const servers = yield* mcp.servers()

              return {
                output: { servers },
                content:
                  servers.length === 0
                    ? "No MCP servers are configured."
                    : servers.map((server) => `${server.name}: ${server.status.status}`).join("\n"),
              }
            }),
        })
      })
      .pipe(Effect.orDie)
  }),
}

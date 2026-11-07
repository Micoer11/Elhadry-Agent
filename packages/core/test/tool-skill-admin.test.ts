import path from "node:path"
import fs from "node:fs/promises"
import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { AppNodeBuilder } from "@elhadry/core/effect/app-node-builder"
import { Image } from "@elhadry/core/image"
import { Permission } from "@elhadry/core/permission"
import { Session } from "@elhadry/core/session"
import { Skill } from "@elhadry/core/skill"
import { Tool } from "@elhadry/core/tool"
import { SkillAdminTools } from "@elhadry/core/tool/plugin/skill-admin"
import { AbsolutePath } from "@elhadry/schema/schema"
import { LayerNode } from "@elhadry/util/effect/layer-node"
import { FSUtil } from "@elhadry/util/fs-util"
import { Global } from "@elhadry/util/global"
import { testEffect } from "./lib/effect"
import { withTempDir } from "./fixture/tmpdir"
import { imagePassthrough } from "./lib/image"
import { permissionLayer } from "./lib/permission"
import { executeTool, registerToolPlugin, toolIdentity } from "./lib/tool"

const it = testEffect(Layer.empty)
const sessionID = Session.ID.make("ses_tool_skill_admin")

const listed = [
  Skill.Info.make({
    id: Skill.ID.make("docs"),
    name: Skill.Name.make("Docs"),
    description: "Bundled documentation",
    path: AbsolutePath.make("/builtin/docs.md"),
    content: "docs",
  }),
]

const skillService = Layer.succeed(Skill.Service, {
  get: () => Effect.succeed(undefined),
  list: () => Effect.succeed(listed),
} as unknown as Skill.Interface)

const setup = (config: string) =>
  Effect.gen(function* () {
    const registry = yield* Tool.Service
    yield* registerToolPlugin(SkillAdminTools.Plugin)
    return registry
  }).pipe(
    Effect.provide(
      Layer.merge(
        AppNodeBuilder.build(LayerNode.group([Tool.node, FSUtil.node, Global.node]), [
          Global.node.replace(Global.layerWith({ config })),
          Image.node.replace(imagePassthrough),
          Permission.node.replace(permissionLayer({ assert: () => Effect.void })),
        ]),
        skillService,
      ),
    ),
  )

/** Runs one Code Mode call, the way the model reaches these tools. */
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
        output: text && result.metadata?.error !== true ? (JSON.parse(text) as Record<string, string>) : undefined,
      }
    }),
  )

describe("SkillAdminTools", () => {
  it.effect("creates a global skill with frontmatter and makes it discoverable", () =>
    withTempDir((tmp) =>
      Effect.gen(function* () {
        const registry = yield* setup(tmp.path)
        const result = yield* call(registry, "skill_add", {
          name: "Deploy App",
          description: "Use when deploying this application",
          content: "# Deploy\n\nRun `make deploy` and verify the health check.",
        })

        expect(result.error).toBe(false)
        expect(result.output).toMatchObject({ id: "deploy-app", name: "Deploy App" })
        expect(result.output?.path).toBe(path.join(tmp.path, "skills", "deploy-app", "SKILL.md"))

        const file = yield* Effect.promise(() => fs.readFile(result.output!.path, "utf8"))
        expect(file).toContain('name: "Deploy App"')
        expect(file).toContain('description: "Use when deploying this application"')
        expect(file).toContain("metadata:\n  elhadry/autoinvoke: true")
        expect(file).toContain("Run `make deploy` and verify the health check.")
      }),
    ),
  )

  it.effect("rejects a duplicate unless overwrite is set, and validates the ID", () =>
    withTempDir((tmp) =>
      Effect.gen(function* () {
        const registry = yield* setup(tmp.path)
        const input = { name: "Release", description: "Use for releases", content: "first" }
        expect((yield* call(registry, "skill_add", input)).error).toBe(false)

        const duplicate = yield* call(registry, "skill_add", input)
        expect(duplicate.error).toBe(true)
        expect(duplicate.text).toContain("already exists")

        const replaced = yield* call(registry, "skill_add", { ...input, content: "second", overwrite: true })
        expect(replaced.error).toBe(false)
        const file = yield* Effect.promise(() => fs.readFile(replaced.output!.path, "utf8"))
        expect(file).toContain("second")

        const invalid = yield* call(registry, "skill_add", { ...input, id: "../escape", overwrite: true })
        expect(invalid.error).toBe(true)
        expect(invalid.text).toContain("may only contain letters")
      }),
    ),
  )

  it.effect("honors autoinvoke false and reports a missing name", () =>
    withTempDir((tmp) =>
      Effect.gen(function* () {
        const registry = yield* setup(tmp.path)
        const result = yield* call(registry, "skill_add", {
          name: "Manual",
          description: "Load by ID only",
          content: "manual",
          autoinvoke: false,
        })
        const file = yield* Effect.promise(() => fs.readFile(result.output!.path, "utf8"))
        expect(file).toContain("elhadry/autoinvoke: false")

        const missing = yield* call(registry, "skill_add", { name: "  ", description: "x", content: "x" })
        expect(missing.error).toBe(true)
        expect(missing.text).toContain("Skill name is required")
      }),
    ),
  )

  it.effect("lists available skills", () =>
    withTempDir((tmp) =>
      Effect.gen(function* () {
        const registry = yield* setup(tmp.path)
        const result = yield* call(registry, "skill_list", {})
        expect(JSON.parse(result.text)).toMatchObject({ skills: [{ id: "docs", name: "Docs" }] })
      }),
    ),
  )
})

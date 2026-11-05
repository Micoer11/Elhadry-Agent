export * as SkillAdminTools from "./skill-admin.js"

import { ToolFailure } from "@elhadry/ai/effect"
import type { Context } from "@elhadry/plugin/effect/plugin"
import { FSUtil } from "@elhadry/util/fs-util"
import { Global } from "@elhadry/util/global"
import path from "path"
import { Effect, Schema } from "effect"
import { Skill } from "../../skill.js"

const AddInput = Schema.Struct({
  name: Schema.String.annotate({ description: "Human-readable skill name." }),
  description: Schema.String.annotate({
    description: "What the skill does and when the agent should use it.",
  }),
  content: Schema.String.annotate({
    description: "Markdown instructions, rules, and examples that make up the skill body.",
  }),
  id: Schema.String.pipe(Schema.optional).annotate({
    description: "Folder name and skill ID. Defaults to a slug of the name.",
  }),
  autoinvoke: Schema.Boolean.pipe(Schema.optional).annotate({
    description: "Let the agent invoke the skill automatically. Default: true.",
  }),
  overwrite: Schema.Boolean.pipe(Schema.optional).annotate({
    description: "Replace an existing skill with the same ID. Default: false.",
  }),
})

const ListInput = Schema.Struct({})

const AddOutput = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  path: Schema.String,
})

const ListOutput = Schema.Struct({ skills: Schema.Array(Skill.Info) })

const slug = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)

const skillFile = (input: { name: string; description: string; content: string; autoinvoke: boolean }) =>
  [
    "---",
    `name: ${JSON.stringify(input.name)}`,
    `description: ${JSON.stringify(input.description)}`,
    "metadata:",
    `  elhadry/autoinvoke: ${input.autoinvoke}`,
    "---",
    "",
    input.content.trim(),
    "",
  ].join("\n")

export const Plugin = {
  id: "opencode.tool.skill-admin",
  effect: Effect.fn("SkillAdminTools.Plugin")(function* (ctx: Context) {
    const fs = yield* FSUtil.Service
    const global = yield* Global.Service
    const skills = yield* Skill.Service

    const failure = (error: { readonly message: string }) => new ToolFailure({ message: error.message, error })
    const directory = (id: string) => path.join(global.config, "skills", id)

    yield* ctx.tool
      .transform((editor) => {
        editor.add({
          name: "skill_add",
          description:
            "Create a skill the user asked for. A skill is a SKILL.md file with a name, description, and Markdown instructions. It is saved to the global configuration and becomes available to the agent right away. Skills are additive: this tool never removes a skill. Use skill_list first when you need to know whether the ID is taken, and pass overwrite: true only when the user explicitly asked to replace an existing skill.",
          input: AddInput,
          output: AddOutput,
          options: { namespace: "elhadry", codemode: true },
          execute: (input) =>
            Effect.gen(function* () {
              const name = input.name.trim()
              const description = input.description.trim()
              const id = (input.id?.trim() || slug(name)).trim()

              if (!name) yield* Effect.fail(new ToolFailure({ message: "Skill name is required." }))
              if (!description) yield* Effect.fail(new ToolFailure({ message: "Skill description is required." }))
              if (!id) yield* Effect.fail(new ToolFailure({ message: "Skill ID is required." }))
              if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(id))
                yield* Effect.fail(
                  new ToolFailure({
                    message: "Skill ID may only contain letters, numbers, dots, dashes, and underscores.",
                  }),
                )

              const target = path.join(directory(id), "SKILL.md")
              const exists = yield* fs.existsSafe(target)

              if (exists && !input.overwrite)
                yield* Effect.fail(
                  new ToolFailure({
                    message: `Skill ${id} already exists. Pass overwrite: true to replace it.`,
                  }),
                )

              yield* fs.writeWithDirs(
                target,
                skillFile({ name, description, content: input.content, autoinvoke: input.autoinvoke ?? true }),
              )

              return {
                output: { id, name, path: target },
                content: `Added skill ${id} at ${target}.`,
              }
            }).pipe(Effect.mapError(failure)),
        })

        editor.add({
          name: "skill_list",
          description:
            "List the skills available to the agent, including skills that already exist in the program configuration.",
          input: ListInput,
          output: ListOutput,
          options: { namespace: "elhadry", codemode: true },
          execute: () =>
            Effect.gen(function* () {
              const list = yield* skills.list()

              return {
                output: { skills: list },
                content:
                  list.length === 0
                    ? "No skills are available."
                    : list.map((skill) => `${skill.id}: ${skill.name}`).join("\n"),
              }
            }),
        })
      })
      .pipe(Effect.orDie)
  }),
}

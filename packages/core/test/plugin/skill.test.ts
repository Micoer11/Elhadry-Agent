import { describe, expect } from "bun:test"
import { AppNodeBuilder } from "@elhadry/core/effect/app-node-builder"
import { Config } from "@elhadry/core/config"
import { Document, Info } from "@elhadry/schema/config"
import { Effect, Layer, Stream } from "effect"
import { SkillPlugin } from "@elhadry/core/plugin/skill"
import { Skill } from "@elhadry/core/skill"
import { testEffect } from "../lib/effect"
import { host } from "./host"

const it = testEffect(AppNodeBuilder.build(Skill.node))
const config = (plugins: Info["plugins"] = []) =>
  Layer.succeed(
    Config.Service,
    Config.Service.of({
      entries: () => Effect.succeed([new Document({ type: "document", info: new Info({ plugins }) })]),
      changes: () => Stream.never,
    }),
  )

describe("SkillPlugin.Plugin", () => {
  it.effect("registers built-in skills", () =>
    Effect.gen(function* () {
      const skill = yield* Skill.Service
      yield* SkillPlugin.Plugin.effect(
        host({
          app: { name: "test", version: "1.2.3", channel: "beta" },
          skill: {
            list: () => Effect.die("unused skill.list"),
            transform: skill.transform,
            reload: skill.reload,
          },
        }),
      ).pipe(Effect.provide(config()))
      const skills = yield* skill.list()
      const report = skills.find((item) => item.id === "report")

      expect(skills).toContainEqual(
        expect.objectContaining({
          id: "elhadry",
          name: "Elhadry Agent",
          description: expect.stringContaining("any question about Elhadry Agent itself"),
        }),
      )
      expect(skills).toContainEqual(
        expect.objectContaining({
          id: "report",
          name: "Report",
          description: expect.stringContaining("Elhadry Agent issue"),
        }),
      )
      expect(skills).toContainEqual(
        expect.objectContaining({
          id: "base",
          name: "Base",
          description: expect.stringContaining("coding or file task"),
        }),
      )
      expect(skills).toContainEqual(
        expect.objectContaining({
          id: "capabilities",
          name: "Elhadry Agent Capabilities",
          description: expect.stringContaining("schedule a prompt for later"),
        }),
      )
      const base = skills.find((item) => item.id === "base")
      expect(base?.content).toContain("## Paths")
      expect(base?.content).toContain("Verify and report")
      const capabilities = skills.find((item) => item.id === "capabilities")
      expect(capabilities?.content).toContain("elhadry_schedule_create")
      expect(capabilities?.content).toContain("elhadry_mcp_add")
      expect(capabilities?.content).toContain("elhadry_skill_add")
      expect(report?.content).toContain("- Elhadry Agent version: 1.2.3")
      expect(report?.content).toContain("- install/channel: beta")
    }),
  )

  it.effect("reports canonical configured plugin sources with existing labels and ordering", () =>
    Effect.gen(function* () {
      const skill = yield* Skill.Service
      yield* SkillPlugin.Plugin.effect(
        host({
          skill: {
            list: () => Effect.die("unused skill.list"),
            transform: skill.transform,
            reload: skill.reload,
          },
        }),
      )
      const report = (yield* skill.list()).find((item) => item.id === "report")
      expect(report?.content).toContain("- Active plugins: -disabled, local.ts, package-plugin, package-plugin")
    }).pipe(
      Effect.provide(
        config([
          "package-plugin",
          "-disabled",
          "local.ts",
          { package: "package-plugin", options: { enabled: true } },
        ]),
      ),
    ),
  )
})

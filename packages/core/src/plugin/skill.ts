/// <reference path="../markdown.d.ts" />

export * as SkillPlugin from "./skill.js"

import { define, type Context } from "@elhadry/plugin/effect/plugin"
import { Document } from "@elhadry/schema/config"
import { Effect } from "effect"
import { AbsolutePath } from "../schema.js"
import { Skill } from "../skill.js"
import { Config } from "../config.js"
import os from "os"
import elhadryContent from "./skill/elhadry.md" with { type: "text" }
import baseContent from "./skill/base.md" with { type: "text" }
import capabilitiesContent from "./skill/capabilities.md" with { type: "text" }
import docsContent from "./skill/docs.md" with { type: "text" }
import reportContent from "./skill/report.md" with { type: "text" }
import { DocsFiles } from "./skill/docs.generated.js"
import nodePath from "node:path"
import { mkdirSync, writeFileSync } from "node:fs"
import { Global } from "@elhadry/util/global"

export const ElhadryContent = elhadryContent
export const BaseContent = baseContent
export const CapabilitiesContent = capabilitiesContent
export const ReportContent = reportContent

const DOCS_DESCRIPTION =
  "Use for questions about configuring or extending Elhadry Agent: agents, commands, skills, tools, permissions, providers, models, MCP servers, plugins, themes, keybinds, formatters, the CLI, the TUI, the SDK, the HTTP API, and the Console. Reads the bundled offline guides instead of the network."

export const ElhadryDescription =
  "Use this skill for any question about Elhadry Agent itself, including how Elhadry Agent works, using or configuring it, migrating from V1 to V2, troubleshooting it, developing plugins or integrations, using the Elhadry Agent SDK, clients, server, or API, and contributing to the Elhadry Agent codebase. Also use it for Elhadry Agent agents, commands, skills, tools, permissions, MCP servers, providers, models, themes, keybinds, formatters, the CLI, TUI, desktop app, and web app."
const REPORT_DESCRIPTION =
  "Use when the user wants to report an Elhadry Agent issue or bug. Collect standard diagnostics, add user-specific reproduction context, and write up the report."
const CAPABILITIES_DESCRIPTION =
  "Use when the user asks to add or create a skill, add, remove, or connect an MCP server, or schedule a prompt for later or on a repeating basis (a reminder, a task at a specific time, every interval, a cron job, or when a condition becomes true). Covers the elhadry_skill_add, elhadry_mcp_add, and elhadry_schedule_create tools, their exact inputs, and the time-zone, gate, and unattended-run rules."
const BASE_DESCRIPTION =
  "Use for any coding or file task in a project: locating code, handling paths on Windows and Unix, editing safely, running package commands, debugging failures, and verifying work with the project's own typecheck, tests, lint, and formatter."

// The packaged CLI is one executable, so the guides travel inside the bundle and are unpacked once
// into the data directory. The skill index names those paths, and the model opens a guide with the
// read tool only when a question needs it.
export const DocsRoot = Effect.fn("SkillPlugin.docsRoot")(function* () {
  const global = yield* Effect.serviceOption(Global.Service)
  const base = global._tag === "Some" ? global.value.data : nodePath.join(os.homedir(), ".local", "share", "elhadry")
  const root = nodePath.join(base, "docs")
  yield* Effect.sync(() => {
    for (const [file, content] of Object.entries(DocsFiles)) {
      const target = nodePath.join(root, file)
      mkdirSync(nodePath.dirname(target), { recursive: true })
      writeFileSync(target, content, "utf8")
    }
  }).pipe(Effect.ignore)
  return root
})

export const DocsContent = (root: string) => docsContent.replaceAll("{root}", root)

export const Plugin = define({
  id: "opencode.skill",
  effect: Effect.fn(function* (ctx) {
    const reportContent = yield* reportContentWithDiagnostics(ctx.app)
    const docsRoot = yield* DocsRoot()
    yield* ctx.skill.transform((editor) => {
      editor.add(
        Skill.Info.make({
          id: Skill.ID.make("base"),
          name: Skill.Name.make("Base"),
          description: BASE_DESCRIPTION,
          path: AbsolutePath.make("/builtin/base.md"),
          content: BaseContent,
        }),
      )
      editor.add(
        Skill.Info.make({
          id: Skill.ID.make("elhadry"),
          name: Skill.Name.make("Elhadry Agent"),
          description: ElhadryDescription,
          path: AbsolutePath.make("/builtin/elhadry.md"),
          content: ElhadryContent,
        }),
      )
      editor.add(
        Skill.Info.make({
          id: Skill.ID.make("docs"),
          name: Skill.Name.make("Elhadry Agent Documentation"),
          description: DOCS_DESCRIPTION,
          path: AbsolutePath.make("/builtin/docs.md"),
          content: DocsContent(docsRoot),
        }),
      )
      editor.add(
        Skill.Info.make({
          id: Skill.ID.make("capabilities"),
          name: Skill.Name.make("Elhadry Agent Capabilities"),
          description: CAPABILITIES_DESCRIPTION,
          path: AbsolutePath.make("/builtin/capabilities.md"),
          content: CapabilitiesContent,
        }),
      )
      editor.add(
        Skill.Info.make({
          id: Skill.ID.make("report"),
          name: Skill.Name.make("Report"),
          description: REPORT_DESCRIPTION,
          path: AbsolutePath.make("/builtin/report.md"),
          content: reportContent,
        }),
      )
    })
  }),
})

const reportContentWithDiagnostics = Effect.fn("SkillPlugin.reportContentWithDiagnostics")(function* (
  app: Context["app"],
) {
  const plugins = yield* configuredPlugins()
  // Under emulation on Windows ARM64, os.arch() reads x64 but PROCESSOR_IDENTIFIER still names the ARM host.
  const emulated =
    process.platform === "win32" && os.arch() === "x64" && process.env.PROCESSOR_IDENTIFIER?.startsWith("ARM")
  return [
    ReportContent,
    "",
    "## Runtime Diagnostics Snapshot",
    "",
    "These values were captured when the built-in report skill was registered. Verify them before publishing.",
    "",
    `- Elhadry Agent version: ${app.version}`,
    `- install/channel: ${app.channel}`,
    `- OS: ${os.type()} ${os.release()} (${os.platform()} ${os.arch()}${emulated ? ", emulated on ARM64" : ""})`,
    `- Terminal: ${terminal()}`,
    `- Shell: ${shell()}`,
    `- Active plugins: ${plugins.length === 0 ? "None found in config" : plugins.join(", ")}`,
  ].join("\n")
})

const configuredPlugins = Effect.fn("SkillPlugin.configuredPlugins")(function* () {
  const config = yield* Config.Service
  return (yield* config.entries())
    .filter((entry): entry is Document => entry.type === "document")
    .flatMap((entry) => entry.info.plugins ?? [])
    .map((entry) => (typeof entry === "string" ? entry : entry.package))
    .toSorted()
})

function terminal() {
  return (
    [
      process.env.TERM_PROGRAM ? `TERM_PROGRAM=${process.env.TERM_PROGRAM}` : undefined,
      process.env.TERM ? `TERM=${process.env.TERM}` : undefined,
      process.env.COLORTERM ? `COLORTERM=${process.env.COLORTERM}` : undefined,
    ]
      .filter((item): item is string => item !== undefined)
      .join(", ") || "Unavailable: terminal environment variables are not set"
  )
}

function shell() {
  return (
    process.env.SHELL ??
    process.env.ComSpec ??
    process.env.COMSPEC ??
    "Unavailable: shell environment variable is not set"
  )
}

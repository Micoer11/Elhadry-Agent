import {
  Agent,
  Command,
  Connection,
  Credential,
  Integration,
  Model,
  Plugin,
  Provider,
  Reference,
  Skill,
} from "@elhadry/plugin/effect"
import { Tool } from "@elhadry/schema/tool"

const key = Symbol.for("opencode.plugin.v2.effect")
;(globalThis as typeof globalThis & { [key]?: unknown })[key] = {
  Agent,
  Command,
  Connection,
  Credential,
  Integration,
  Model,
  Plugin,
  Provider,
  Reference,
  Skill,
  Tool: { Error: Tool.Error },
}

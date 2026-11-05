import { NodeFileSystem } from "@effect/platform-node"
import { compile, emitEffectImported, emitEffectShape, emitPromise, write } from "@elhadry/httpapi-codegen"
import {
  ClientApi,
  clientNamespace,
  effectOmitEndpoints,
  groupNames,
  promiseOmitEndpoints,
} from "@elhadry/protocol/client"
import { Agent } from "@elhadry/schema/agent"
import { Artifact } from "@elhadry/schema/artifact"
import { Command } from "@elhadry/schema/command"
import { Config } from "@elhadry/schema/config"
import { Credential } from "@elhadry/schema/credential"
import { Event } from "@elhadry/schema/event"
import { EventLog } from "@elhadry/schema/event-log"
import { FileDiff } from "@elhadry/schema/file-diff"
import { FileSystem } from "@elhadry/schema/filesystem"
import { Form } from "@elhadry/schema/form"
import { Generate } from "@elhadry/schema/generate"
import { Instruction } from "@elhadry/schema/instruction"
import { InstructionEntry } from "@elhadry/schema/instruction-entry"
import { Integration } from "@elhadry/schema/integration"
import { Location } from "@elhadry/schema/location"
import { Mcp } from "@elhadry/schema/mcp"
import { Model } from "@elhadry/schema/model"
import { Money } from "@elhadry/schema/money"
import { Permission } from "@elhadry/schema/permission"
import { PermissionSaved } from "@elhadry/schema/permission-saved"
import { Plugin } from "@elhadry/schema/plugin"
import { Project } from "@elhadry/schema/project"
import { Worktree } from "@elhadry/schema/worktree"
import { AgentAttachment, FileAttachment, Prompt, PromptMention } from "@elhadry/schema/prompt"
import { PromptInput } from "@elhadry/schema/prompt-input"
import { Provider } from "@elhadry/schema/provider"
import { Pty } from "@elhadry/schema/pty"
import { PtyTicket } from "@elhadry/schema/pty-ticket"
import { Question } from "@elhadry/schema/question"
import { Reference } from "@elhadry/schema/reference"
import { AbsolutePath, RelativePath } from "@elhadry/schema/schema"
import { Schedule } from "@elhadry/schema/schedule"
import { Session } from "@elhadry/schema/session"
import { SessionMessage } from "@elhadry/schema/session-message"
import { SessionInbox } from "@elhadry/schema/session-inbox"
import { Shell } from "@elhadry/schema/shell"
import { Skill } from "@elhadry/schema/skill"
import { Snapshot } from "@elhadry/schema/snapshot"
import { UsageLimits } from "@elhadry/schema/usage-limits"
import { Vcs } from "@elhadry/schema/vcs"
import { WebSearch } from "@elhadry/schema/websearch"
import { Workspace } from "@elhadry/schema/workspace"
import { Effect, Schema } from "effect"
import { fileURLToPath } from "url"

const promiseContract = compile(ClientApi, {
  groupNames,
  omitEndpoints: promiseOmitEndpoints,
  namespace: clientNamespace,
  aliases: true,
})
const effectContract = compile(ClientApi, {
  groupNames,
  omitEndpoints: effectOmitEndpoints,
  namespace: clientNamespace,
  aliases: true,
})
const effectTypeReferences = [
  ...namespaceTypes("Agent", "@elhadry/schema/agent", Agent),
  ...namespaceTypes("Artifact", "@elhadry/schema/artifact", Artifact),
  ...namespaceTypes("Command", "@elhadry/schema/command", Command),
  ...namespaceTypes("Config", "@elhadry/schema/config", Config),
  ...namespaceTypes("Credential", "@elhadry/schema/credential", Credential),
  ...namespaceTypes("Event", "@elhadry/schema/event", Event),
  ...namespaceTypes("EventLog", "@elhadry/schema/event-log", EventLog),
  ...namespaceTypes("FileDiff", "@elhadry/schema/file-diff", FileDiff),
  ...namespaceTypes("FileSystem", "@elhadry/schema/filesystem", FileSystem),
  ...namespaceTypes("Form", "@elhadry/schema/form", Form),
  ...namespaceTypes("Generate", "@elhadry/schema/generate", Generate),
  ...namespaceTypes("Instruction", "@elhadry/schema/instruction", Instruction),
  ...namespaceTypes("InstructionEntry", "@elhadry/schema/instruction-entry", InstructionEntry),
  ...namespaceTypes("Integration", "@elhadry/schema/integration", Integration),
  typeReference("Location.PublicRef", "@elhadry/schema/location", Location.PublicRef),
  typeReference("Location.PublicInfo", "@elhadry/schema/location", Location.PublicInfo),
  ...namespaceTypes("Mcp", "@elhadry/schema/mcp", Mcp),
  ...namespaceTypes("Model", "@elhadry/schema/model", Model),
  ...namespaceTypes("Money", "@elhadry/schema/money", Money),
  ...namespaceTypes("Permission", "@elhadry/schema/permission", Permission),
  ...namespaceTypes("PermissionSaved", "@elhadry/schema/permission-saved", PermissionSaved),
  ...namespaceTypes("Plugin", "@elhadry/schema/plugin", Plugin),
  ...namespaceTypes("Project", "@elhadry/schema/project", Project),
  ...namespaceTypes("Worktree", "@elhadry/schema/worktree", Worktree),
  ...namespaceTypes("PromptInput", "@elhadry/schema/prompt-input", PromptInput),
  ...namespaceTypes("Provider", "@elhadry/schema/provider", Provider),
  ...namespaceTypes("Pty", "@elhadry/schema/pty", Pty),
  ...namespaceTypes("PtyTicket", "@elhadry/schema/pty-ticket", PtyTicket),
  ...namespaceTypes("Question", "@elhadry/schema/question", Question),
  ...namespaceTypes("Reference", "@elhadry/schema/reference", Reference),
  ...namespaceTypes("Schedule", "@elhadry/schema/schedule", Schedule),
  ...namespaceTypes("Session", "@elhadry/schema/session", Session),
  ...namespaceTypes("SessionMessage", "@elhadry/schema/session-message", SessionMessage),
  ...namespaceTypes("SessionInbox", "@elhadry/schema/session-inbox", SessionInbox),
  ...namespaceTypes("Shell", "@elhadry/schema/shell", Shell),
  ...namespaceTypes("Skill", "@elhadry/schema/skill", Skill),
  ...namespaceTypes("Snapshot", "@elhadry/schema/snapshot", Snapshot),
  ...namespaceTypes("UsageLimits", "@elhadry/schema/usage-limits", UsageLimits),
  ...namespaceTypes("Vcs", "@elhadry/schema/vcs", Vcs),
  ...namespaceTypes("WebSearch", "@elhadry/schema/websearch", WebSearch),
  ...namespaceTypes("Workspace", "@elhadry/schema/workspace", Workspace),
  typeReference("Prompt", "@elhadry/schema/prompt", Prompt),
  typeReference("PromptMention", "@elhadry/schema/prompt", PromptMention),
  typeReference("FileAttachment", "@elhadry/schema/prompt", FileAttachment),
  typeReference("AgentAttachment", "@elhadry/schema/prompt", AgentAttachment),
  typeReference("AbsolutePath", "@elhadry/schema/schema", AbsolutePath),
  typeReference("RelativePath", "@elhadry/schema/schema", RelativePath),
]

await Effect.runPromise(
  Effect.all(
    [
      write(
        emitPromise(promiseContract, {
          mutableOutputs: true,
        }),
        fileURLToPath(new URL("../src/promise/generated", import.meta.url)),
      ),
      write(
        emitEffectImported(effectContract, {
          module: "../../contract",
          api: "ClientApi",
          shapeModule: "../api/api.js",
        }),
        fileURLToPath(new URL("../src/effect/generated", import.meta.url)),
      ),
      write(
        emitEffectShape(effectContract, {
          typeReferences: effectTypeReferences,
          outputTypes: {
            "event.subscribe": {
              name: "OpenCodeEvent",
              import: 'import type { OpenCodeEvent } from "@elhadry/protocol/groups/event"',
            },
          },
        }),
        fileURLToPath(new URL("../src/effect/api", import.meta.url)),
      ),
    ],
    { concurrency: 3, discard: true },
  ).pipe(Effect.provide(NodeFileSystem.layer)),
)

function namespaceTypes(namespace: string, module: string, values: object) {
  return Object.entries(values).flatMap(([name, schema]) =>
    Schema.isSchema(schema) ? [typeReference(`${namespace}.${name}`, module, schema)] : [],
  )
}

function typeReference(name: string, module: string, schema: Schema.Top) {
  return {
    schema,
    name,
    import: `import type { ${name.split(".")[0]} } from ${JSON.stringify(module)}`,
  }
}

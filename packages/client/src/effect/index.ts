// TODO: Keep additional network capabilities inside Schema and Protocol as the client grows; /effect must never import
// Core or Server. Preserve these datatype exports so internal model reorganizations do not require caller migrations.
import type { Effect } from "effect"
import type { OpenCode } from "./client.js"

export * from "./generated/index"
export { OpenCode } from "./client.js"
export type {
  AgentApi,
  AppApi,
  CommandApi,
  ConfigApi,
  EventApi,
  IntegrationApi,
  ModelApi,
  PluginApi,
  ProviderApi,
  ReferenceApi,
  RpcApi,
  RpcClient,
  WebSearchApi,
  SessionApi,
  SkillApi,
} from "./api.js"
export { Agent } from "@elhadry/schema/agent"
export { Command } from "@elhadry/schema/command"
export { Config } from "@elhadry/schema/config"
export { Credential } from "@elhadry/schema/credential"
export { Event } from "@elhadry/schema/event"
export { EventLog } from "@elhadry/schema/event-log"
export { FileSystem } from "@elhadry/schema/filesystem"
export { Form } from "@elhadry/schema/form"
export { Integration } from "@elhadry/schema/integration"
export { Location } from "@elhadry/schema/location"
export { Model } from "@elhadry/schema/model"
export { Permission } from "@elhadry/schema/permission"
export { PermissionSaved } from "@elhadry/schema/permission-saved"
export { Project } from "@elhadry/schema/project"
export { Worktree } from "@elhadry/schema/worktree"
export { Vcs } from "@elhadry/schema/vcs"
export { Provider } from "@elhadry/schema/provider"
export { Pty } from "@elhadry/schema/pty"
export { Question } from "@elhadry/schema/question"
export { Reference } from "@elhadry/schema/reference"
export { WebSearch } from "@elhadry/schema/websearch"
export { AbsolutePath, RelativePath } from "@elhadry/schema/schema"
export { Session } from "@elhadry/schema/session"
export { SessionInbox } from "@elhadry/schema/session-inbox"
export { SessionMessage } from "@elhadry/schema/session-message"
export { Skill } from "@elhadry/schema/skill"
export { Prompt } from "@elhadry/schema/prompt"
export { PromptInput } from "@elhadry/schema/prompt-input"
export type { OpenCodeEvent } from "@elhadry/protocol/groups/event"
export type OpenCodeClient = Effect.Success<ReturnType<typeof OpenCode.make>>

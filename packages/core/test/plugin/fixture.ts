import { Agent } from "@elhadry/core/agent"
import { Artifact } from "@elhadry/core/artifact"
import { AISDK } from "@elhadry/core/aisdk"
import { Command } from "@elhadry/core/command"
import { Config } from "@elhadry/core/config"
import { Credential } from "@elhadry/core/credential"
import { Database } from "@elhadry/core/database/database"
import { Environment } from "@elhadry/core/environment/index"
import { FileAccess } from "@elhadry/core/file-access"
import { LayerNodePlatform } from "@elhadry/util/effect/app-node-platform"
import { AppProcess } from "@elhadry/util/process"
import { LayerNode } from "@elhadry/util/effect/layer-node"
import { Bus } from "@elhadry/core/bus"
import { FileSystem } from "@elhadry/core/filesystem"
import { FSUtil } from "@elhadry/util/fs-util"
import { Global } from "@elhadry/util/global"
import { Form } from "@elhadry/core/form"
import { Generate } from "@elhadry/core/generate"
import { Integration } from "@elhadry/core/integration"
import { Job } from "@elhadry/core/job"
import { KV } from "@elhadry/core/kv"
import { Location } from "@elhadry/core/location"
import { Mcp } from "@elhadry/core/mcp/index"
import { Model } from "@elhadry/core/model"
import { Npm } from "@elhadry/util/npm"
import { Plugin } from "@elhadry/core/plugin"
import { PluginHooks } from "@elhadry/core/plugin/hooks"
import { Provider } from "@elhadry/core/provider"
import { Session } from "@elhadry/core/session"
import { InstructionEntry } from "@elhadry/core/session/instruction-entry"
import { PersistentPty } from "@elhadry/core/persistent-pty"
import { LocationServiceMap } from "@elhadry/core/location-service-map"
import { AppNodeBuilder } from "@elhadry/core/effect/app-node-builder"
import { Permission } from "@elhadry/core/permission"
import { Reference } from "@elhadry/core/reference"
import { Rpc } from "@elhadry/core/rpc"
import { Skill } from "@elhadry/core/skill"
import { SkillDiscovery } from "@elhadry/core/skill/discovery"
import { Watcher } from "@elhadry/core/filesystem/watcher"
import { Tool } from "@elhadry/core/tool"
import { Vcs } from "@elhadry/core/vcs"
import { WebSearch } from "@elhadry/core/websearch"
import { Worktree } from "@elhadry/core/worktree"
import { WorktreeStrategies } from "@elhadry/core/worktree/strategies"
import { Effect, Layer } from "effect"
import { tempLocationLayer } from "../fixture/location"
import { emptyMcpLayer } from "../fixture/mcp"
import { offlineModels } from "../fixture/models"

const npmLayer = Layer.succeed(
  Npm.Service,
  Npm.Service.of({
    add: (name) => Effect.succeed({ directory: "", name }),
    resolve: (name) => Effect.succeed({ directory: "", name }),
    check: () => Effect.succeed(false),
    update: (name) => Effect.succeed({ directory: "", name }),
    which: () => Effect.undefined,
  }),
)

const generateLayer = Layer.succeed(
  Generate.Service,
  Generate.Service.of({
    text: () => Effect.succeed(""),
    image: () => Effect.die("unused"),
    decisions: () => Effect.die("unused"),
  }),
)

const configLayer = Config.testLayer()

const permissionLayer = Layer.succeed(
  Permission.Service,
  Permission.Service.of({
    close: Effect.void,
    ask: (input) => Effect.succeed({ id: input.id ?? Permission.ID.create(), effect: "ask" }),
    assert: () => Effect.void,
    assertNotDenied: () => Effect.void,
    reply: () => Effect.void,
    get: () => Effect.succeed(undefined),
    forSession: () => Effect.succeed([]),
    list: () => Effect.succeed([]),
  }),
)

export const makePluginTestLayer = (permission = permissionLayer, generate = generateLayer) =>
  AppNodeBuilder.build(
    LayerNode.group([
      AppProcess.node,
      FileSystem.node,
      FSUtil.node,
      Location.node,
      Npm.node,
      Credential.node,
      Config.node,
      Database.node,
      Environment.node,
      FileAccess.node,
      Global.node,
      Bus.node,
      Form.node,
      Generate.node,
      LayerNodePlatform.httpClient,
      Plugin.node,
      Agent.node,
      Artifact.node,
      AISDK.node,
      Provider.node,
      Model.node,
      Command.node,
      Integration.node,
      Job.node,
      KV.node,
      Mcp.node,
      Session.node,
      InstructionEntry.node,
      PersistentPty.node,
      LocationServiceMap.node,
      Permission.node,
      PluginHooks.node,
      Reference.node,
      Rpc.node,
      Skill.node,
      SkillDiscovery.node,
      Tool.node,
      Vcs.node,
      Watcher.node,
      WebSearch.node,
      Worktree.node,
      WorktreeStrategies.node,
    ]),
    [
      Location.node.replace(tempLocationLayer),
      Npm.node.replace(npmLayer),
      Config.node.replace(configLayer),
      Mcp.node.replace(emptyMcpLayer),
      Generate.node.replace(generate),
      Permission.node.replace(permission),
      offlineModels,
    ],
  ).pipe(Layer.provideMerge(configLayer))

export const PluginTestLayer = makePluginTestLayer()

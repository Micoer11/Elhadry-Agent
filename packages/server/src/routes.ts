import { Database } from "@elhadry/core/database/database"
import { V1Migration } from "@elhadry/core/database/v1-migration"
import { App } from "@elhadry/core/app"
import { LayerNode } from "@elhadry/util/effect/layer-node"
import { Node } from "@elhadry/util/effect/app-node"
import { httpClient } from "@elhadry/util/effect/app-node-platform"
import { AppNodeBuilder } from "@elhadry/core/effect/app-node-builder"
import { Bus } from "@elhadry/core/bus"
import { EventLogger } from "@elhadry/core/event-logger"
import { FileSystemSearch } from "@elhadry/core/filesystem/search"
import { Credential } from "@elhadry/core/credential"
import { Config } from "@elhadry/core/config"
import { PermissionSaved } from "@elhadry/core/permission/saved"
import { PtyTicket } from "@elhadry/core/pty/ticket"
import { PersistentPty } from "@elhadry/core/persistent-pty"
import { Project } from "@elhadry/core/project"
import { Worktree } from "@elhadry/core/worktree"
import { Session } from "@elhadry/core/session"
import { Instance } from "@elhadry/core/instance/service"
import { SessionTransfer } from "@elhadry/core/session/transfer"
import { InstructionEntry } from "@elhadry/core/session/instruction-entry"
import { ShellSelect } from "@elhadry/core/shell/select"
import { Job } from "@elhadry/core/job"
import { KV } from "@elhadry/core/kv"
import { Mcp } from "@elhadry/core/mcp/index"
import { Global } from "@elhadry/util/global"
import { FSUtil } from "@elhadry/util/fs-util"
import { InstructionDiscovery } from "@elhadry/core/instruction-discovery"
import { LocationServiceMap } from "@elhadry/core/location-service-map"
import { LocationActivity } from "@elhadry/core/location-activity"
import { ModelsDev } from "@elhadry/core/models-dev"
import { SessionRestart } from "@elhadry/core/session/execution/restart"
import { Schedule } from "@elhadry/core/schedule"
import { PluginUpdate } from "@elhadry/core/plugin/update"
import { SdkPlugins } from "@elhadry/core/plugin/sdk"
import { WellKnown } from "@elhadry/core/wellknown"
import { Workspace } from "@elhadry/core/workspace"
import { Tunnel } from "@elhadry/core/tunnel"
import { Watcher } from "@elhadry/core/filesystem/watcher"
import { FileWatch } from "@elhadry/core/filesystem/file-watch"
import { HttpRouter } from "effect/http"
import { HttpApiBuilder } from "effect/http-api"
import { Context, Effect, Layer, Option } from "effect"
import { Api } from "./api"
import { ServerAuth } from "./auth"
import { CorsConfig } from "./cors"
import { handlers } from "./handlers"
import { authorizationLayer } from "./middleware/authorization"
import { schemaErrorLayer } from "./middleware/schema-error"
import { ServerPairing } from "./pairing"
import { layer } from "./location"
import { formLocationLayer } from "./middleware/form-location"
import { sessionLocationLayer } from "./middleware/session-location"
import { ServerInfo } from "./server-info"
import type { ServerOptions } from "./options"

const applicationServiceNodes = [
  Global.node,
  FSUtil.node,
  Database.node,
  KV.node,
  Bus.node,
  EventLogger.node,
  httpClient,
  Job.node,
  Project.node,
  Project.sweepNode,
  Worktree.node,
  Session.node,
  Instance.node,
  SessionTransfer.node,
  InstructionEntry.node,
  SdkPlugins.node,
  PluginUpdate.node,
  PermissionSaved.node,
  PtyTicket.node,
  PersistentPty.node,
  Credential.node,
  WellKnown.node,
  ServerPairing.node,
  LocationServiceMap.node,
  LocationActivity.node,
  SessionRestart.node,
  Schedule.node,
  Workspace.node,
  Tunnel.node,
  FileWatch.node,
] as const
const applicationServices = LayerNode.group(applicationServiceNodes)

export function createRoutes(
  options: ServerOptions = {},
  serviceURLs: () => ReadonlyArray<string> = () => [],
  overrides: LayerNode.Replacements = [],
) {
  return makeRoutes(
    options.password
      ? ServerAuth.Config.configLayer({ password: Option.some(options.password) })
      : ServerAuth.Config.layer,
    options,
    serviceURLs,
    overrides,
  )
}

type InstanceNode = (
  replacements: () => LayerNode.Replacements,
) => LayerNode.Provider<Instance.Service, never, typeof Node.tags.values.global>

export function createEmbeddedRoutes(
  options: ServerOptions = {},
  overrides: LayerNode.Replacements = [],
  instances?: InstanceNode,
) {
  return makeRoutes(ServerAuth.Config.configLayer({ password: Option.none() }), options, () => [], overrides, instances)
}

function makeRoutes<AuthError, AuthServices>(
  auth: Layer.Layer<ServerAuth.Config, AuthError, AuthServices>,
  options: ServerOptions,
  serviceURLs: () => ReadonlyArray<string>,
  // Runtime-profile replacements (e.g. workerd) applied after the standard set, so later entries win.
  overrides: LayerNode.Replacements,
  instances?: InstanceNode,
) {
  const standard: LayerNode.Replacements = [
    Database.node.replace(Database.configured(options.database)),
    PersistentPty.node.replace(PersistentPty.configured(options.pty)),
    Bus.node.replace(Bus.configured({ persist: options.events?.persist })),
    App.node.replace(App.configured(options.app)),
    ModelsDev.node.replace(ModelsDev.configured(options.models)),
    Watcher.node.replace(Watcher.configured({ enabled: options.fs?.filewatcher })),
    FileWatch.node.replace(FileWatch.configured({ enabled: options.fs?.filewatcher })),
    FileSystemSearch.node.replace(FileSystemSearch.configured({ fff: options.fs?.fff })),
    Global.node.replace(Global.layerWith(options.config?.directory ? { config: options.config.directory } : {})),
    Config.node.replace(
      Config.configured({
        project: options.config?.project,
        claude: options.config?.claude,
        file: options.config?.file,
        content: options.config?.content,
      }),
    ),
    InstructionDiscovery.node.replace(InstructionDiscovery.configured({ project: options.config?.project })),
    ShellSelect.node.replace(ShellSelect.configured({ gitbash: options.windows?.gitbash })),
    Mcp.node.replace(
      Mcp.configured({
        clientInfo: {
          name: "elhadry",
          version: options.app?.version ?? "unknown",
        },
      }),
    ),
  ]
  const build = (overrides: LayerNode.Replacements) => {
    const replacements: LayerNode.Replacements = [
      ...standard,
      // Private instances resolve this list lazily so they inherit the complete host graph, including the selector.
      ...(instances ? [Instance.node.replace(instances(() => replacements))] : []),
      ...overrides,
    ]
    return AppNodeBuilder.build(applicationServices, replacements)
  }
  const serviceLayer = options.simulation
    ? Layer.unwrap(
        Effect.gen(function* () {
          const { simulationReplacements } = yield* Effect.promise(() => import("@elhadry/simulation/backend"))
          const simulation = yield* simulationReplacements({ version: App.make(options.app).version })
          return build([...overrides, ...simulation])
        }),
      )
    : build(overrides)
  return serviceLayer.pipe(
    Layer.flatMap((context) => {
      const services = Layer.succeedContext(context)
      const requestServices = Layer.merge(
        Layer.succeedContext(
          Context.pick(
            Database.Service,
            Credential.Service,
            PermissionSaved.Service,
            PluginUpdate.Service,
            Project.Service,
            WellKnown.Service,
            Tunnel.Service,
          )(context),
        ),
        ServerInfo.layer(serviceURLs, Context.get(context, Global.Service).tmp, options.app),
      )
      const api = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
        Layer.provide(handlers.pipe(Layer.provide(services), Layer.provide(Layer.succeed(CorsConfig, options)))),
        Layer.provide(formLocationLayer),
        Layer.provide(sessionLocationLayer),
        Layer.provide(layer),
        Layer.provide(authorizationLayer),
        Layer.provide(schemaErrorLayer),
        Layer.provide(auth),
        HttpRouter.provideRequest(requestServices),
        Layer.provideMerge(services),
        Layer.provideMerge(HttpRouter.layer),
      )
      return Layer.merge(api, V1Migration.layer.pipe(Layer.provide(services)))
    }),
  )
}

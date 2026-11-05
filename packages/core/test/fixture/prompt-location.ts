import type { FileSystem } from "@elhadry/core/filesystem"
import { Bus } from "@elhadry/core/bus"
import { Image } from "@elhadry/core/image"
import { LocationServiceMap } from "@elhadry/core/location-service-map"
import type { LocationServices } from "@elhadry/core/location-services"
import { Plugin } from "@elhadry/core/plugin"
import { PluginHooks } from "@elhadry/core/plugin/hooks"
import { Skill } from "@elhadry/core/skill"
import type { Location } from "@elhadry/schema/location"
import { makeGlobalNode } from "@elhadry/util/effect/app-node"
import { LayerNode } from "@elhadry/util/effect/layer-node"
import { Effect, Layer, LayerMap } from "effect"

// Plain-prompt unit fixtures use virtual directories.
export const promptLocationNode = makeGlobalNode({
  service: LocationServiceMap.Service,
  layer: Layer.effect(
    LocationServiceMap.Service,
    Effect.gen(function* () {
      const bus = yield* Bus.Service
      return yield* LayerMap.make(
        (_ref: Location.Ref) =>
          LayerNode.compile(LayerNode.group([PluginHooks.node, Image.node, Skill.node, Plugin.node]), {
            replacements: [
              Bus.node.replace(Layer.succeed(Bus.Service, bus)),
              Plugin.node.replace(Layer.mock(Plugin.Service, { awaitActivation: Effect.void })),
            ],
          }) as unknown as Layer.Layer<LocationServices, FileSystem.DirectoryNotFoundError>,
      )
    }),
  ),
  deps: [Bus.node],
})

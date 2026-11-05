import { ensurePluginRuntime, provides } from "@elhadry/plugin/runtime"
import { Plugin, PluginContextProvider, usePlugin } from "@elhadry/plugin/tui"
import { ensureRuntimePluginSupport } from "@opentui/solid/runtime-plugin-support/configure"

ensurePluginRuntime()
ensureRuntimePluginSupport({
  additional: {
    "@elhadry/plugin/tui": { Plugin, PluginContextProvider, usePlugin },
  },
  preserve: provides,
})

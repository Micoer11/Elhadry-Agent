import { defineConfig } from "electron-vite"
import type { Plugin } from "vite"
import { pickerPlugin } from "./scripts/picker"
import { nodePtyPackage } from "./scripts/utils"

function resolveChannel() {
  const raw = process.env.OPENCODE_CHANNEL

  if (raw === "local" || raw === "dev" || raw === "beta" || raw === "prod") return raw

  if (raw === "latest") return "prod"

  return "dev"
}

const appPlugin = (await import("@elhadry/app/vite")).default

const sentry =
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? (await import("@sentry/vite-plugin")).sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        telemetry: false,
        release: {
          name: process.env.SENTRY_RELEASE ?? process.env.VITE_SENTRY_RELEASE,
        },
        sourcemaps: {
          assets: "./out/renderer/**",
          filesToDeleteAfterUpload: "./out/renderer/**/*.map",
        },
      })
    : false

// Every module the entry reaches through static imports lands in one chunk. Automatic splitting
// otherwise fragments the initial graph into ~50 files shared with lazy routes, and each file costs
// the renderer a main-thread request round trip through the main process before first paint.
// Rolldown hands every chunk-name call a fresh context, so the graph is walked once per output.
const initialGraph = new Set<string>()


// Some ESM dependencies (@effect/platform-node among them) declare a module-local `require`. Once bundled
// into one chunk that binding collides with electron-vite's CommonJS shim, so rename it in place.
const localRequire: Plugin = {
  name: "opencode:local-require",
  enforce: "pre",
  transform(code) {
    if (!code.includes("createRequire(")) return
    if (!/\b(?:const|let|var)\s+require\s*=/.test(code)) return

    return code.replace(/\brequire\b/g, "__module_require")
  },
}

const initialChunk: Plugin = {
  name: "opencode-desktop:initial-chunk",
  renderStart() {
    const entries = [...this.getModuleIds()].filter((id) => this.getModuleInfo(id)?.isEntry)
    initialGraph.clear()
    entries.forEach((id) => initialGraph.add(id))

    // A Set's iterator also visits members added while iterating, so this reaches every static import.
    for (const id of initialGraph) this.getModuleInfo(id)?.importedIds.forEach((imported) => initialGraph.add(imported))
  },
}

export default defineConfig(({ command }) => {
  const channel = resolveChannel()
  const nodePtyPkg = nodePtyPackage()

  return {
    main: {
      resolve: {
        dedupe: ["effect"],
      },
      define: {
        // Local renderer/server mode still uses the dev application identity and updater policy.
        "import.meta.env.OPENCODE_CHANNEL": JSON.stringify(channel === "local" ? "dev" : channel),
      },
      build: {
        minify: command === "build",
        rolldownOptions: {
          input: { index: "src/main/index.ts" },
          output: {
            format: "es",
            // DesktopPaths resolves resources from the main output directory,
            // including when the lazy desktop entry shares it with other chunks.
            chunkFileNames: "[name]-[hash].js",
          },
        },
        externalizeDeps: {
          // Bundle the Effect family together.
          exclude: ["effect", "@effect/platform-node", "@effect/platform-node-shared", "drizzle-orm"],
          include: [nodePtyPkg],
        },
      },
      plugins: [
        localRequire,
        {
          name: "opencode:node-pty-narrower",
          enforce: "pre",
          resolveId(s) {
            if (s === "@lydell/node-pty") return nodePtyPkg

            return undefined
          },
        },
      ],
    },
    preload: {
      build: {
        minify: command === "build",
        rolldownOptions: {
          input: { index: "src/preload/index.ts" },
          output: {
            format: "cjs",
            // The package is "type": "module". Under --no-sandbox Electron loads the preload
            // through Node's module loader, which treats a .js file as ESM and fails on
            // require("electron"). The sandboxed path ignores the extension.
            entryFileNames: "[name].cjs",
          },
        },
      },
    },
    renderer: {
      experimental: {
        bundledDev: true,
      },
      define: {
        "import.meta.env.OPENCODE_VERSION": JSON.stringify(process.env.OPENCODE_VERSION),
        "import.meta.env.VITE_OPENCODE_CHANNEL": JSON.stringify(channel),
        "import.meta.env.OPENCODE_TEST_ONBOARDING": JSON.stringify(
          command === "serve" && process.env.OPENCODE_TEST_ONBOARDING === "1",
        ),
      },
      plugins: [pickerPlugin(), appPlugin, initialChunk, sentry],
      publicDir: "../../../app/public",
      root: "src/renderer",
      build: {
        minify: command === "build",
        sourcemap: true,
        rolldownOptions: {
          input: {
            main: "src/renderer/index.html",
          },
          output: {
            codeSplitting: {
              groups: [{ name: (id) => (initialGraph.has(id) ? "app" : null), priority: 10 }],
            },
          },
        },
      },
    },
  }
})

import { app } from "electron"

type Channel = "local" | "dev" | "beta" | "prod"

const raw = import.meta.env.OPENCODE_CHANNEL

export const CHANNEL: Channel = raw === "local" || raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const VERSION = app.isPackaged ? app.getVersion() : (process.env.OPENCODE_VERSION ?? app.getVersion())

// Fork identity: this build is not Elhadry Agent, so it must never share a userData directory,
// single-instance lock or update feed with an installed Elhadry Agent build.
const appNames: Record<string, string> = {
  dev: "Elhadry Agent Dev",
  beta: "Elhadry Agent Beta",
  prod: "Elhadry Agent",
}

const appIDs: Record<string, string> = {
  dev: "ai.elhadry.desktop.dev",
  beta: "ai.elhadry.desktop.beta",
  prod: "ai.elhadry.desktop",
}

// Local renderer/server mode keeps the dev application identity.
export const APP_NAME = app.isPackaged ? appNames[CHANNEL] : "Elhadry Agent Dev"

export const APP_ID = app.isPackaged ? appIDs[CHANNEL] : "ai.elhadry.desktop.dev"

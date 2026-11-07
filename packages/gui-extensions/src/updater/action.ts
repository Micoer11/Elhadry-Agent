import type { Params } from "../sdk"
import type { UpdaterState } from "./contract"

type UpdaterAction = {
  readonly label: string
  readonly params?: Params
  /** Whether an update exists, so the button stays on screen through the whole download and install. */
  readonly visible?: boolean
  /** Keeps the button on screen but unclickable while the action is already running. */
  readonly disabled?: boolean
  readonly run?: "check" | "download" | "install"
}

/** The one update action the settings row and the titlebar pill offer for a state. */
export function updaterAction(state: UpdaterState | undefined): UpdaterAction {
  if (!state) return { label: "action.checkNow" }

  switch (state.status) {
    case "checking":
      return { label: "action.checking", disabled: true }
    case "downloading":
      return {
        label: state.progress === undefined ? "action.downloading" : "action.downloadingProgress",
        params: state.progress === undefined ? undefined : { progress: state.progress },
        visible: true,
        disabled: true,
      }
    case "available":
      return { label: "action.download", visible: true, run: "download" }
    case "ready":
      return { label: "action.installRestart", visible: true, run: "install" }
    case "download-required":
      return { label: "action.download", visible: true, run: "install" }
    case "installing":
      return { label: "action.installing", visible: true, disabled: true }
    case "disabled":
      return { label: "action.checkNow" }
    default:
      return { label: "action.checkNow", run: "check" }
  }
}

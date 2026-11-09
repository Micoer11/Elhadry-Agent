import { Schema } from "effect"
import { Ipc } from "../sdk"

export const UpdaterState = Schema.Union([
  Schema.Struct({ status: Schema.Literal("disabled") }),
  Schema.Struct({ status: Schema.Literal("idle") }),
  Schema.Struct({ status: Schema.Literal("checking") }),
  Schema.Struct({ status: Schema.Literal("available"), version: Schema.String }),
  Schema.Struct({
    status: Schema.Literal("downloading"),
    version: Schema.String,
    /** Whole-percent download progress, once the platform reports it. */
    progress: Schema.optional(Schema.Number),
    /** Bytes downloaded so far, once the platform reports it. */
    transferred: Schema.optional(Schema.Number),
    /** Total bytes in the download, once the platform reports it. */
    total: Schema.optional(Schema.Number),
    /** Current download speed in bytes per second, once the platform reports it. */
    bytesPerSecond: Schema.optional(Schema.Number),
  }),
  Schema.Struct({ status: Schema.Literal("ready"), version: Schema.String }),
  Schema.Struct({ status: Schema.Literal("download-required"), version: Schema.String }),
  Schema.Struct({ status: Schema.Literal("up-to-date") }),
  Schema.Struct({ status: Schema.Literal("installing"), version: Schema.String }),
  Schema.Struct({ status: Schema.Literal("error"), message: Schema.String }),
])

export type UpdaterState = typeof UpdaterState.Type

/** The desktop app updater. Its state is app-wide; every window receives the same value. */
export const Updater = Ipc.define({
  id: "updater",
  state: UpdaterState,
  methods: {
    check: { output: UpdaterState },
    /** Downloads the release offered in the `available` state. */
    download: { output: UpdaterState },
    /** Restarts into a staged update, or opens the installer download. */
    install: {},
  },
  events: {
    /** The app menu asks the focused window to check with in-app feedback (beta builds). */
    check: Schema.Null,
  },
})

/**
 * Whether an update found by the background check is downloaded, installed and restarted without asking. Off until
 * the user turns it on; the background check itself always runs.
 */
export const AutoInstall = Ipc.define({
  id: "updater.auto-install",
  state: Schema.Boolean,
  methods: {
    /** Turns automatic installation on or off and remembers the choice. */
    set: { input: Schema.Boolean },
  },
})

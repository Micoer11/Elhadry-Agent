import { Schema } from "effect"
import { Extension, Store } from "../sdk"
import { AutoInstall, Updater } from "./contract"
import en from "./i18n/en"

const ReleaseNotes = Schema.Struct({ enabled: Schema.Boolean })

const Seen = Schema.Struct({ version: Schema.optional(Schema.String) })

const AutoInstallPreference = Schema.Struct({ enabled: Schema.Boolean })

export default Extension.define({
  id: "updater",
  provides: { updater: Updater, autoInstall: AutoInstall },
  stores: {
    // Whether What's New shows after an update; stored before in the app settings.
    releaseNotes: Store.global(
      ReleaseNotes,
      { enabled: true },
      {
        key: "settings.v3",
        pick: (value: { general?: { releaseNotes?: unknown } } | null) => {
          const enabled = value?.general?.releaseNotes

          return enabled === undefined ? undefined : { enabled }
        },
      },
    ),
    // The version whose What's New was last shown or skipped; stored before under the app's own key.
    seen: Store.global(Seen, {}, "highlights.v1"),
    // The update main staged for the next start; stored before in the updater's settings file.
    ready: Store.main(Schema.NullOr(Schema.Struct({ version: Schema.String })), null, {
      settings: "ready",
      file: "elhadry.updater",
    }),
    // Whether a background check installs what it finds. Off until the user turns it on.
    autoInstall: Store.main(AutoInstallPreference, { enabled: false }),
  },
  i18n: {
    en,
    ar: () => import("./i18n/ar"),
  },
})

import { createMemo, createResource, type Accessor } from "solid-js"
import { useSettings } from "@/settings/model"
import { playSoundById, SOUND_OPTIONS } from "@/shell/notifications/sound"
import { createSoundPreviewController } from "./behavior"
import { ServerConnection } from "@/runtime/server/registry"
import { useServerCtx } from "@/runtime/server/runtime"
import { useLanguage } from "@/runtime/i18n/language"
import { showToast } from "@/shell/notifications/toast"

export { createShellOptions, createSoundPreviewController } from "./behavior"

export type { ShellOption, ShellSelectOption } from "./behavior"

export function createServerShellController(server: Accessor<ServerConnection.Any>) {
  const language = useLanguage()
  const serverCtx = useServerCtx(server)
  const source = () => ServerConnection.key(server())

  const [state, actions] = createResource(
    source,
    async () => {
      const context = serverCtx()

      const [entries, shells] = await Promise.all([
        context.sdk.api.config.get().catch(() => []),
        context.sdk.api.config.shells().catch(() => []),
      ])

      const boundary = entries.findIndex((entry) => entry.type === "directory")
      const global = boundary === -1 ? entries : entries.slice(0, boundary)

      return {
        shells,
        shell: global
          .flatMap((entry) => (entry.type === "document" && entry.info.shell !== undefined ? [entry.info.shell] : []))
          .at(-1),
      }
    },
    { initialValue: { shells: [], shell: undefined } },
  )

  return {
    shells: () => state.latest.shells,
    current: () => state.latest.shell ?? "",
    select: (value: string) => {
      if (value === (state.latest.shell ?? "")) return
      const previous = state.latest
      actions.mutate({ ...previous, shell: value || undefined })
      void serverCtx()
        .sdk.api.config.update({ shell: value || null })
        .catch((error: unknown) => {
          actions.mutate(previous)
          showToast({
            variant: "error",
            title: language.t("common.requestFailed"),
            description: error instanceof Error ? error.message : language.t("common.requestFailed"),
          })
        })
    },
  }
}

const noneSound = { id: "none", label: "sound.option.none" } as const

export const soundOptions = [noneSound, ...SOUND_OPTIONS]

export type SoundSelectOption = (typeof soundOptions)[number]

export function createSoundSettingsController() {
  const settings = useSettings()
  const preview = createSoundPreviewController(playSoundById)

  const channel = (
    enabled: Accessor<boolean>,
    current: Accessor<string>,
    setEnabled: (value: boolean) => void,
    set: (id: string) => void,
  ) => ({
    current: createMemo(() =>
      enabled() ? (soundOptions.find((option) => option.id === current()) ?? noneSound) : noneSound,
    ),
    highlight: (option: SoundSelectOption | undefined) => {
      if (!option) return
      preview.play(option.id === "none" ? undefined : option.id)
    },
    select: (option: SoundSelectOption | null) => {
      if (!option) return

      if (option.id === "none") {
        setEnabled(false)
        preview.stop()

        return
      }

      setEnabled(true)
      set(option.id)
      preview.play(option.id)
    },
  })

  return {
    agent: channel(
      settings.sounds.agentEnabled,
      settings.sounds.agent,
      (value) => settings.sounds.setAgentEnabled(value),
      (id) => settings.sounds.setAgent(id),
    ),
    permissions: channel(
      settings.sounds.permissionsEnabled,
      settings.sounds.permissions,
      (value) => settings.sounds.setPermissionsEnabled(value),
      (id) => settings.sounds.setPermissions(id),
    ),
    errors: channel(
      settings.sounds.errorsEnabled,
      settings.sounds.errors,
      (value) => settings.sounds.setErrorsEnabled(value),
      (id) => settings.sounds.setErrors(id),
    ),
  }
}

export type ShellSettingsController = ReturnType<typeof createServerShellController>

export type SoundSettingsController = ReturnType<typeof createSoundSettingsController>

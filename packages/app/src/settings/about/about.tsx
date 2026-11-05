import { Logo } from "@elhadry/ui/logo"
import { useDialog } from "@elhadry/ui/context/dialog"
import { useLanguage } from "@/runtime/i18n/language"
import { usePlatform } from "@/runtime/platform/platform"
import { showToast } from "@/shell/notifications/toast"

export function SettingsAbout(props: { active: boolean }) {
  const language = useLanguage()
  const platform = usePlatform()
  const dialog = useDialog()

  const showNotices = async () => {
    // The license texts load only when someone reads them.
    const loaded = await import("./notices/dialog").catch(() => undefined)

    if (!loaded) {
      showToast({ variant: "error", title: language.t("settings.about.notices.loadFailed") })

      return
    }

    void dialog.show(() => <loaded.default />)
  }

  return (
    <div class="settings-about-content">
      <Logo class="settings-about-wordmark" />

      <div class="settings-about-intro">
        <p>
          {language.t("settings.about.version", {
            version: platform.version ?? language.t("settings.about.devVersion"),
          })}
        </p>
        <p>{language.t("settings.about.developedBy")}</p>
      </div>

      <div class="settings-about-details">
        <p>{language.t("settings.about.description")}</p>
        <p>
          <button type="button" class="settings-about-link" onClick={() => void showNotices()}>
            {language.t("settings.about.notices.title")}
          </button>
        </p>
      </div>
    </div>
  )
}

import { Button } from "@elhadry/ui/button"
import { Icon } from "@elhadry/ui/icon"
import { TextInput } from "@elhadry/ui/text-input"
import { onMount, Show, type Component } from "solid-js"
import { createStore } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import { useGlobal } from "@/runtime/server/runtime"
import { ServerConnection } from "@/runtime/server/registry"
import { showToast } from "@/shell/notifications/toast"
import "@/settings/settings.css"

/**
 * The credential the server itself asks for, not a link's password.
 *
 * A server added by hand carries its password with the connection. Otherwise the server reports its own
 * password over a loopback-only route, so a visitor on a public link never receives it.
 */
export const SettingsServerPassword: Component<{ server: ServerConnection.Any }> = (props) => {
  const language = useLanguage()
  const global = useGlobal()

  const [state, setState] = createStore<{
    reveal: boolean
    service: string | null | undefined
  }>({
    reveal: true,
    service: undefined,
  })

  const stored = () => (props.server.type === "http" ? props.server.http.password : undefined)
  const password = () => stored() ?? state.service ?? undefined

  onMount(() => {
    if (stored()) return
    void global
      .ensureServerCtx(props.server)
      .sdk.api.server.password()
      .then((value) => setState("service", value.password))
      .catch(() => setState("service", null))
  })

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    showToast({ title: language.t("settings.server.password.copied") })
  }

  return (
    <section class="settings-section" data-component="settings-server-password">
      <h3 class="settings-section-title">{language.t("settings.server.section.password")}</h3>

      <Show when={password()}>
        {(value) => (
          <div class="settings-tunnel-form">
            <div class="settings-tunnel-field">
              <TextInput
                id="settings-server-password"
                type={state.reveal ? "text" : "password"}
                appearance="large"
                value={value()}
                readOnly
              />
              <button
                type="button"
                class="settings-tunnel-reveal"
                aria-pressed={state.reveal}
                aria-label={language.t(
                  state.reveal ? "settings.tunnel.password.hide" : "settings.tunnel.password.show",
                )}
                title={language.t(state.reveal ? "settings.tunnel.password.hide" : "settings.tunnel.password.show")}
                onClick={() => setState("reveal", !state.reveal)}
              >
                <Icon name="eye" size="small" />
              </button>
            </div>
            <div class="settings-tunnel-actions">
              <Button size="small" variant="neutral" onClick={() => void copy(value())}>
                {language.t("settings.tunnel.action.copyPassword")}
              </Button>
            </div>
          </div>
        )}
      </Show>

      <Show when={!password()}>
        <p class="settings-tunnel-description">{language.t("settings.server.password.unknown")}</p>
      </Show>

      <p class="settings-tunnel-hint">{language.t("settings.server.password.hint")}</p>
    </section>
  )
}

import { Button } from "@elhadry/ui/button"
import { Icon } from "@elhadry/ui/icon"
import { TextInput } from "@elhadry/ui/text-input"
import { createMemo, For, onCleanup, onMount, Show, type Component } from "solid-js"
import { createStore } from "solid-js/store"
import { useGlobal } from "@/runtime/server/runtime"
import { useLanguage } from "@/runtime/i18n/language"
import { usePlatform } from "@/runtime/platform/platform"
import { ServerConnection } from "@/runtime/server/registry"
import { shareLink, suggestPassword } from "@/settings/servers/share-link"
import { showToast } from "@/shell/notifications/toast"
import "@/settings/settings.css"

type TunnelState = {
  /** Identifies one published link for as long as it lives. */
  id: string
  state: "stopped" | "starting" | "online" | "error"
  url?: string
  origin?: string
  message?: string
  /** The password this link carries; the server accepts it on this link's host and nowhere else. */
  password?: string
}

/** How often the panel re-reads the server's links, so a link that drops shows as disconnected. */
const REFRESH_MS = 2500

/** Only a server reachable on this machine can be published from this machine. */
export function isLoopback(url: string) {
  try {
    const host = new URL(url).hostname

    return host === "127.0.0.1" || host === "::1" || host === "localhost" || host === "0.0.0.0"
  } catch {
    return false
  }
}

export const SettingsServerTunnel: Component<{ server: ServerConnection.Any }> = (props) => {
  const language = useLanguage()
  const global = useGlobal()
  const platform = usePlatform()

  const [state, setState] = createStore<{
    links: TunnelState[]
    password: string
    reveal: boolean
    busy: boolean
  }>({
    links: [],
    // A link gets its own password: never the server's own credential, which a shared link must not carry.
    password: suggestPassword(),
    reveal: true,
    busy: false,
  })
  let timer: ReturnType<typeof setInterval> | undefined

  const origin = createMemo(() => props.server.http.url.replace("localhost", "127.0.0.1").replace(/\/+$/, ""))

  const refresh = () =>
    global
      .ensureServerCtx(props.server)
      .sdk.api.tunnel.status()
      .then((links) => setState("links", links))
      .catch(() => undefined)

  // The server owns the list, so the panel follows it instead of remembering only what this page created.
  onMount(() => {
    void refresh()
    timer = setInterval(() => void refresh(), REFRESH_MS)
  })

  onCleanup(() => clearInterval(timer))

  const create = async () => {
    setState("busy", true)
    // An empty field still needs a password, and it is shown before the link exists so it can never be a surprise.
    const secret = state.password.trim() || suggestPassword()
    setState("password", secret)

    try {
      const link = await global
        .ensureServerCtx(props.server)
        .sdk.api.tunnel.start({ origin: origin(), password: secret })
      setState("links", (links) => [...links.filter((current) => current.id !== link.id), link])
      // The field keeps the password that was just used; the link row shows which one it carries.
    } catch {
      showToast({
        title: language.t("settings.tunnel.title"),
        description: language.t("settings.tunnel.failed"),
      })
    } finally {
      setState("busy", false)
    }
  }

  const stop = async (id: string) => {
    setState("busy", true)

    try {
      setState("links", await global.ensureServerCtx(props.server).sdk.api.tunnel.stop({ id }))
    } catch (error) {
      showToast({
        title: language.t("settings.tunnel.title"),
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setState("busy", false)
    }
  }

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    showToast({ title: language.t("settings.tunnel.copied") })
  }

  // The link opens outside the app, so it lands in the browser the user actually reads it in.
  const open = (value: string) => platform.openExternal(value)

  return (
    <section class="settings-section" data-component="settings-server-tunnel">
      <h3 class="settings-section-title">{language.t("settings.tunnel.title")}</h3>
      <p class="settings-tunnel-description">{language.t("settings.tunnel.description")}</p>

      <div class="settings-tunnel-form">
        <label class="settings-tunnel-label" for="settings-tunnel-password">
          {language.t("settings.tunnel.password")}
        </label>
        <div class="settings-tunnel-field">
          <TextInput
            id="settings-tunnel-password"
            type={state.reveal ? "text" : "password"}
            appearance="large"
            value={state.password}
            placeholder={language.t("settings.tunnel.password.placeholder")}
            onInput={(event) => setState("password", event.currentTarget.value)}
          />
          <button
            type="button"
            class="settings-tunnel-reveal"
            aria-pressed={state.reveal}
            aria-label={language.t(state.reveal ? "settings.tunnel.password.hide" : "settings.tunnel.password.show")}
            title={language.t(state.reveal ? "settings.tunnel.password.hide" : "settings.tunnel.password.show")}
            onClick={() => setState("reveal", !state.reveal)}
          >
            <Icon name="eye" size="small" />
          </button>
        </div>
        <span class="settings-tunnel-hint">{language.t("settings.tunnel.password.hint")}</span>

        <div class="settings-tunnel-actions">
          <Button size="small" disabled={state.busy} onClick={() => void create()}>
            {language.t("settings.tunnel.action.create")}
          </Button>
          <Button size="small" variant="neutral" onClick={() => setState("password", suggestPassword())}>
            {language.t("settings.tunnel.action.generate")}
          </Button>
        </div>
      </div>

      <Show when={state.links.length > 0}>
        <ul class="settings-tunnel-links">
          <For each={state.links}>
            {(link) => {
              const address = () => (link.url ? shareLink(link.url) : undefined)

              return (
                <li class="settings-tunnel-link-row" data-state={link.state}>
                  <Show when={address()}>
                    {(value) => (
                      <div class="settings-tunnel-link">
                        <bdi dir="ltr">{value()}</bdi>
                        <Button size="small" onClick={() => open(value())}>
                          {language.t("settings.tunnel.action.open")}
                        </Button>
                        <Button size="small" variant="neutral" onClick={() => void copy(value())}>
                          {language.t("settings.tunnel.action.copy")}
                        </Button>
                      </div>
                    )}
                  </Show>
                  <Show when={!address()}>
                    <span class="settings-tunnel-status-label">
                      {link.state === "error"
                        ? (link.message ?? language.t("settings.tunnel.status.error"))
                        : language.t("settings.tunnel.status.starting")}
                    </span>
                  </Show>
                  <div class="settings-tunnel-link-meta">
                    <Show when={link.password}>
                      {(password) => (
                        <span class="settings-tunnel-link-password">
                          <span class="settings-tunnel-link-label">{language.t("settings.tunnel.link.password")}</span>
                          <bdi dir="ltr">{password()}</bdi>
                          <Button
                            size="small"
                            variant="neutral"
                            onClick={() => void copy(password())}
                            title={language.t("settings.tunnel.action.copyPassword")}
                          >
                            {language.t("settings.tunnel.action.copyPassword")}
                          </Button>
                        </span>
                      )}
                    </Show>
                    <Button size="small" variant="neutral" disabled={state.busy} onClick={() => void stop(link.id)}>
                      {link.state === "error"
                        ? language.t("settings.tunnel.action.dismiss")
                        : language.t("settings.tunnel.action.stop")}
                    </Button>
                  </div>
                </li>
              )
            }}
          </For>
        </ul>
      </Show>
    </section>
  )
}

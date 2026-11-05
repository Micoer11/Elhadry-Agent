import { createMemo, createSignal, For, Show } from "solid-js"
import { useDialog } from "@elhadry/ui/context/dialog"
import { Button } from "@elhadry/ui/button"
import { Icon } from "@elhadry/ui/icon"
import { IconButton } from "@elhadry/ui/icon-button"
import { Spinner } from "@elhadry/ui/spinner"
import { useLanguage } from "@/runtime/i18n/language"
import { useGlobal } from "@/runtime/server/runtime"
import { useLayout } from "@/shell/state/layout"
import { usePlatform } from "@/runtime/platform/platform"
import { useConnectionsController, type ConnectionEntry } from "./controller"
import { DialogAddConnection } from "./dialog"
import type { McpCatalogEntry } from "./catalog"
import "./connections.css"

const statusLabels = {
  connected: "mcp.status.connected",
  pending: "mcp.status.pending",
  disabled: "mcp.status.disabled",
  failed: "mcp.status.failed",
  needs_auth: "mcp.status.needs_auth",
} as const

export function ConnectionsScreen() {
  const language = useLanguage()
  const layout = useLayout()
  const global = useGlobal()
  const dialog = useDialog()
  const controller = useConnectionsController({ global, layout, language })

  const searching = () => controller.search().trim().length > 0

  const openAdd = () =>
    dialog.push(() => (
      <DialogAddConnection onSubmit={(name, config) => controller.addCustom(name, config)} />
    ))

  return (
    <div class="connections-screen">
      <section class="connections-panel" aria-labelledby="connections-title">
        <header class="connections-header">
          <div class="connections-heading">
            <h1 id="connections-title">{language.t("connections.title")}</h1>
            <p class="connections-description">{language.t("connections.description")}</p>
          </div>

          <div class="connections-header-actions">
            <Button icon="plus" variant="neutral" class="connections-primary" onClick={openAdd}>
              {language.t("connections.add.button")}
            </Button>
            <IconButton
              type="button"
              variant="ghost-muted"
              size="large"
              icon={<Icon name="refresh" size="small" />}
              aria-label={language.t("connections.refresh")}
              onClick={() => void controller.load(true)}
            />
          </div>
        </header>

        <div class="connections-toolbar">
          <div class="connections-tabs" role="tablist" aria-label={language.t("connections.title")}>
            <button
              type="button"
              role="tab"
              class="connections-tab"
              data-active={controller.tab() === "available"}
              aria-selected={controller.tab() === "available"}
              onClick={() => controller.setTab("available")}
            >
              <span>{language.t("connections.tab.available")}</span>
              <span class="connections-tab-count">{controller.availableCount()}</span>
            </button>
            <button
              type="button"
              role="tab"
              class="connections-tab"
              data-active={controller.tab() === "linked"}
              aria-selected={controller.tab() === "linked"}
              onClick={() => controller.setTab("linked")}
            >
              <span>{language.t("connections.tab.linked")}</span>
              <span class="connections-tab-count">{controller.linkedCount()}</span>
            </button>
          </div>

          <label class="connections-search">
            <Icon name="magnifying-glass" size="small" class="connections-search-icon" />
            <input
              type="search"
              value={controller.search()}
              placeholder={language.t("connections.search.placeholder")}
              aria-label={language.t("connections.search.placeholder")}
              onInput={(event) => controller.setSearch(event.currentTarget.value)}
            />
            <Show when={searching()}>
              <button
                type="button"
                class="connections-search-clear"
                aria-label={language.t("common.clear")}
                onClick={() => controller.setSearch("")}
              >
                <Icon name="close" size="small" />
              </button>
            </Show>
          </label>
        </div>

        <div class="connections-body" role="tabpanel">
          <Show when={controller.state.error}>
            {(error) => (
              <div class="connections-message" role="alert">
                <p>{error()}</p>
                <Button variant="ghost" size="small" onClick={() => void controller.load()}>
                  {language.t("connections.retry")}
                </Button>
              </div>
            )}
          </Show>

          <Show
            when={!controller.state.loading}
            fallback={
              <div class="connections-message">
                <Spinner class="size-5" />
                <p>{language.t("connections.loading")}</p>
              </div>
            }
          >
            <Show
              when={controller.tab() === "available"}
              fallback={
                <Show
                  when={controller.visibleLinked().length > 0}
                  fallback={
                    <Show when={!controller.state.error}>
                      <div class="connections-empty">
                        <span class="connections-empty-icon">
                          <Icon name="outline-globe-plus" size="large" />
                        </span>
                        <Show
                          when={searching()}
                          fallback={
                            <>
                              <h2>{language.t("connections.linked.empty.title")}</h2>
                              <p>{language.t("connections.linked.empty.description")}</p>
                              <Button
                                variant="neutral"
                                class="connections-primary"
                                onClick={() => controller.setTab("available")}
                              >
                                {language.t("connections.linked.empty.action")}
                              </Button>
                            </>
                          }
                        >
                          <h2>{language.t("connections.empty.search.title")}</h2>
                          <p>{language.t("connections.empty.search.description")}</p>
                        </Show>
                      </div>
                    </Show>
                  }
                >
                  <div class="connections-grid">
                    <For each={controller.visibleLinked()}>
                      {(entry) => <LinkedCard entry={entry} controller={controller} />}
                    </For>
                  </div>
                </Show>
              }
            >
              <Show
                when={controller.available().length > 0}
                fallback={
                  <Show when={!controller.state.error}>
                    <div class="connections-empty">
                      <span class="connections-empty-icon">
                        <Icon name="check" size="large" />
                      </span>
                      <Show
                        when={searching()}
                        fallback={
                          <>
                            <h2>{language.t("connections.available.empty.title")}</h2>
                            <p>{language.t("connections.available.empty.description")}</p>
                          </>
                        }
                      >
                        <h2>{language.t("connections.empty.search.title")}</h2>
                        <p>{language.t("connections.empty.search.description")}</p>
                      </Show>
                    </div>
                  </Show>
                }
              >
                <div class="connections-grid">
                  <For each={controller.available()}>
                    {(entry) => <AvailableCard entry={entry} controller={controller} />}
                  </For>
                </div>
              </Show>
            </Show>
          </Show>
        </div>
      </section>
    </div>
  )
}

type Controller = ReturnType<typeof useConnectionsController>

function AvailableCard(props: { entry: McpCatalogEntry; controller: Controller }) {
  const language = useLanguage()
  const platform = usePlatform()
  const busy = () => props.controller.state.busy[props.entry.id] === true

  return (
    <article class="connections-card" data-kind="available">
      <div class="connections-card-top">
        <ConnectionLogo
          name={props.entry.name}
          url={props.entry.url}
          host={props.entry.host}
          color={props.entry.color}
        />
        <div class="connections-card-names">
          <span class="connections-card-name" dir="auto">
            {props.entry.name}
          </span>
          <Show when={props.entry.auth === "oauth"}>
            <span class="connections-tag">{language.t("connections.tag.oauth")}</span>
          </Show>
        </div>
        <Show when={props.entry.source}>
          <IconButton
            type="button"
            variant="ghost-muted"
            size="small"
            icon={<Icon name="outline-arrow-up-right" size="small" />}
            aria-label={language.t("connections.docs", { name: props.entry.name })}
            onClick={() => platform.openExternal(props.entry.source)}
          />
        </Show>
      </div>

      <p class="connections-card-description" dir="auto">
        {props.entry.description}
      </p>

      <div class="connections-card-actions">
        <Button
          size="small"
          variant="neutral"
          icon="plus"
          class="connections-primary connections-add"
          disabled={busy()}
          onClick={() => void props.controller.add(props.entry)}
        >
          {busy() ? language.t("connections.adding") : language.t("connections.add")}
        </Button>
      </div>
    </article>
  )
}

function LinkedCard(props: { entry: ConnectionEntry; controller: Controller }) {
  const language = useLanguage()
  const platform = usePlatform()
  const name = () => props.entry.server.name
  const busy = () => props.controller.state.busy[name()] === true
  const status = () => props.entry.server.status.status
  const title = () => props.entry.catalog?.name ?? props.entry.server.title ?? name()

  return (
    <article class="connections-card" data-kind="linked">
      <div class="connections-card-top">
        <ConnectionLogo
          name={title()}
          url={props.entry.catalog?.url ?? ""}
          host={props.entry.catalog?.host}
          color={props.entry.catalog?.color ?? "#4C8DFF"}
        />
        <div class="connections-card-names">
          <span class="connections-card-name" dir="auto">
            {title()}
          </span>
          <Show when={name() !== title()}>
            <span class="connections-card-id" dir="ltr">
              {name()}
            </span>
          </Show>
        </div>
        <span class="connections-status" data-status={status()}>
          {language.t(statusLabels[status()])}
        </span>
      </div>

      <p class="connections-card-description" dir="auto">
        {props.entry.catalog?.description ?? language.t("connections.linked.external")}
      </p>

      <div class="connections-card-actions">
        <Show when={status() === "pending"}>
          <span class="connections-pending">
            <Spinner class="size-4" />
            {language.t("mcp.status.pending")}
          </span>
        </Show>

        <Show when={status() === "needs_auth"}>
          <Button
            size="small"
            variant="neutral"
            class="connections-primary"
            disabled={busy()}
            onClick={() => void props.controller.authorize(name())}
          >
            {language.t("connections.authorize")}
          </Button>
        </Show>

        <Show when={status() === "connected"}>
          <Button
            size="small"
            variant="ghost"
            disabled={busy()}
            onClick={() => void props.controller.disconnect(name())}
          >
            {language.t("connections.disconnect")}
          </Button>
        </Show>

        <Show when={status() === "failed" || status() === "disabled"}>
          <Button
            size="small"
            variant="neutral"
            class="connections-primary"
            disabled={busy()}
            onClick={() => void props.controller.connect(name())}
          >
            {language.t("connections.connect")}
          </Button>
        </Show>

        <Show when={props.entry.catalog?.source}>
          {(source) => (
            <Button
              size="small"
              variant="ghost"
              icon="outline-arrow-up-right"
              onClick={() => platform.openExternal(source())}
            >
              {language.t("connections.docs.label")}
            </Button>
          )}
        </Show>

        <Button
          size="small"
          variant="ghost"
          icon="trash"
          class="connections-danger"
          disabled={busy()}
          onClick={() => void props.controller.remove(name())}
        >
          {language.t("connections.remove")}
        </Button>
      </div>
    </article>
  )
}

function ConnectionLogo(props: { name: string; url: string; host?: string; color: string }) {
  const origin = createMemo(() => {
    if (props.host) return `https://${props.host}`

    if (!props.url) return undefined

    try {
      return new URL(props.url).origin
    } catch {
      return undefined
    }
  })

  const sources = createMemo(() => {
    const base = origin()

    if (!base) return []

    return [`${base}/favicon.ico`, `${base}/favicon.png`, `${base}/favicon.svg`]
  })

  const [attempt, setAttempt] = createSignal(0)

  const monogram = () => {
    const words = props.name.split(/\s+/).filter(Boolean)

    if (words.length > 1) return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase()

    return props.name.slice(0, 2).toUpperCase()
  }

  return (
    <span class="connections-logo" aria-hidden="true">
      <Show
        when={attempt() < sources().length}
        fallback={
          <span
            class="connections-logo-monogram"
            style={{ background: props.color, color: inkFor(props.color) }}
          >
            {monogram()}
          </span>
        }
      >
        <img
          src={sources()[attempt()]}
          alt=""
          draggable={false}
          loading="lazy"
          referrerpolicy="no-referrer"
          onError={() => setAttempt((value) => value + 1)}
        />
      </Show>
    </span>
  )
}

function inkFor(color: string) {
  const value = color.replace("#", "")

  if (value.length !== 6) return "#fff"

  const [r, g, b] = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255

    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#111" : "#fff"
}

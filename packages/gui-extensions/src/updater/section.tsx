import { createMemo, For, Show, type Accessor, type JSX } from "solid-js"
import { Button } from "@elhadry/ui/button"
import { Switch } from "@elhadry/ui/switch"
import { showToast } from "@elhadry/ui/toast"
import { createLatest, useExtension, type IpcClient, type Live } from "../sdk"
import { updaterAction } from "./action"
import { AutoInstall, type UpdaterState } from "./contract"
import type definition from "./index"
import { fetchReleases } from "./releases"

type AutoClient = IpcClient<typeof AutoInstall.spec>

export default function UpdatesSection(props: {
  state: () => UpdaterState | undefined
  autoInstall: Accessor<Live<AutoClient>>
  run: () => void
}) {
  const ctx = useExtension<typeof definition>()
  const releaseNotes = ctx.stores.releaseNotes
  const action = createMemo(() => updaterAction(props.state()))

  // The published releases change only when a release ships, so the page reads them once and keeps the answer.
  const history = createLatest(ctx.uses.updater, (_client, signal) => fetchReleases(signal))

  const auto = () => {
    const live = props.autoInstall()

    return live.status === "active" ? live.value : undefined
  }

  const published = () => history.latest ?? []

  const latest = () => published()[0]

  // Older versions to go back to: everything below the newest release, without the version already installed.
  const previous = () =>
    published()
      .slice(1)
      .filter((release) => release.version !== ctx.build.version)
      .slice(0, 4)

  const latestTitle = () => {
    const current = props.state()
    const version = current && "version" in current ? current.version : latest()?.version

    return version ? ctx.t("latest.version", { version }) : ctx.t("latest.none")
  }

  const summary = () => {
    const current = props.state()

    if (!current) return ctx.t("latest.none")

    switch (current.status) {
      case "checking":
        return ctx.t("latest.checking")
      case "available":
        return ctx.t("latest.available", { version: current.version })
      case "downloading":
        return ctx.t("latest.downloading", { version: current.version })
      case "ready":
        return ctx.t("latest.ready", { version: current.version })
      case "installing":
        return ctx.t("latest.installing", { version: current.version })
      case "up-to-date":
        return ctx.t("latest.current")
      case "disabled":
        return ctx.t("latest.disabled")
      case "error":
        return current.message
      default:
        if (latest()) return ctx.t("latest.published")

        if (history.loading) return ctx.t("latest.loading")

        if (history.error) return ctx.t("latest.failed")

        return ctx.t("latest.none")
    }
  }

  const date = (value: string) => {
    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) return value

    return new Intl.DateTimeFormat(ctx.locale.locale(), { dateStyle: "medium" }).format(parsed)
  }

  return (
    <>
      <div class="settings-tab-header">
        <div class="settings-tab-header-row">
          <div class="flex flex-col gap-1">
            <h2 class="settings-tab-title">{ctx.t("section.title")}</h2>
            <span class="text-11-regular text-v2-text-text-muted">{ctx.t("section.description")}</span>
          </div>
        </div>
      </div>

      <div class="settings-tab-body settings-tab-body--sectioned">
        <section class="settings-section" aria-label={ctx.t("latest.title")}>
          <h3 class="settings-section-title">{ctx.t("latest.title")}</h3>
          <div data-component="settings-list">
            <div data-action="settings-latest-release">
              <Row title={latestTitle()} description={summary()}>
                <Show when={action().run}>
                  <Button size="normal" variant="neutral" onClick={() => props.run()}>
                    {ctx.t(action().label)}
                  </Button>
                </Show>
              </Row>
            </div>

            <div data-action="settings-auto-install">
              <Row title={ctx.t("auto.title")} description={ctx.t("auto.description")}>
                <Switch
                  hideLabel
                  checked={auto()?.state() === true}
                  disabled={!auto() || auto()?.state() === undefined}
                  onChange={(enabled) => {
                    const client = auto()

                    if (!client) return
                    void client.set(enabled).catch(() => showToast({ title: ctx.t("common.requestFailed") }))
                  }}
                >
                  {ctx.t("auto.title")}
                </Switch>
              </Row>
            </div>

            <div data-action="settings-release-notes">
              <Row title={ctx.t("releaseNotes.title")} description={ctx.t("releaseNotes.description")}>
                <Switch
                  hideLabel
                  checked={releaseNotes.value.enabled}
                  onChange={(checked) => {
                    releaseNotes.update((draft) => {
                      draft.enabled = checked
                    })
                  }}
                >
                  {ctx.t("releaseNotes.title")}
                </Switch>
              </Row>
            </div>

            <div data-action="settings-check-updates">
              <Row title={ctx.t("check.title")} description={ctx.t("check.description")}>
                <Button
                  size="normal"
                  variant="neutral"
                  disabled={!action().run}
                  onClick={() => props.run()}
                >
                  {ctx.t(action().label)}
                </Button>
              </Row>
            </div>
          </div>
        </section>

        <Show when={previous().length > 0 || history.error}>
          <section class="settings-section" aria-label={ctx.t("previous.title")}>
            <h3 class="settings-section-title">{ctx.t("previous.title")}</h3>
            <div data-component="settings-list">
              <Show when={history.error}>
                <Row title={ctx.t("previous.title")} description={ctx.t("previous.failed")}>
                  <span />
                </Row>
              </Show>
              <For each={previous()}>
                {(release) => (
                  <div data-action={`settings-release-${release.version}`}>
                    <Row
                      title={ctx.t("previous.version", { version: release.version })}
                      description={ctx.t("previous.published", { date: date(release.publishedAt) })}
                    >
                      <Button
                        size="normal"
                        variant="neutral"
                        onClick={() => ctx.system.openExternal(release.url)}
                      >
                        {ctx.t("previous.download")}
                      </Button>
                    </Row>
                  </div>
                )}
              </For>
            </div>
          </section>
        </Show>
      </div>
    </>
  )
}

// The host's settings row markup; its stylesheet is loaded with the settings screen.
function Row(props: { title: string; description: string; children: JSX.Element }) {
  return (
    <div data-component="settings-row">
      <div data-slot="settings-row-copy">
        <div data-slot="settings-row-title">{props.title}</div>
        <div data-slot="settings-row-description">{props.description}</div>
      </div>
      <div data-slot="settings-row-control">{props.children}</div>
    </div>
  )
}

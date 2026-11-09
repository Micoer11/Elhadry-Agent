import { Button } from "@elhadry/ui/button"
import { Badge } from "@elhadry/ui/badge"
import { useDialog } from "@elhadry/ui/context/dialog"
import { Icon } from "@elhadry/ui/icon"
import { IconButton } from "@elhadry/ui/icon-button"
import { Menu } from "@elhadry/ui/menu"
import { Spinner } from "@elhadry/ui/spinner"
import { OpenCodeLogo } from "@/providers/opencode-logo"
import { showToast } from "@/shell/notifications/toast"
import { popularProviders, useProviders } from "@/providers/catalog/providers"
import { consoleProviderGroup } from "@/providers/catalog/console"
import { useIntegrations } from "@/providers/catalog/integrations"
import { createEffect, createMemo, type Component, For, Show } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import { useServerSDK } from "@/runtime/server/client"
import { useData } from "@/runtime/server/current"
import { formatServerError } from "@/runtime/server/errors"
import { CONSOLE_INTEGRATION, CONSOLE_PROVIDERS } from "@/providers/connect/controller"
import { DialogConnectProvider, useProviderConnectController } from "@/providers/connect/dialog"
import { ProviderModelIcon } from "@/providers/models/provider-group"
import { modelConfigs, type ModelConfig } from "@/providers/credentials/form"
import { SettingsList } from "@/settings/list"
import { activeProviderAccount, providerAccounts, type ProviderAccount } from "./accounts"
import { AccountNameInput } from "./account-name"
import { useProviderAccountActions } from "./account-actions"
import "@/settings/settings.css"

type ProviderSource = "env" | "api" | "account" | "config" | "custom"

type ProviderItem = ReturnType<ReturnType<typeof useProviders>["connected"]>[number]

const PROVIDER_NOTES = [
  { match: (id: string) => id === "opencode", key: "dialog.provider.opencode.note" },
  { match: (id: string) => id === "anthropic", key: "dialog.provider.anthropic.note" },
  { match: (id: string) => id.startsWith("github-copilot"), key: "dialog.provider.copilot.note" },
  { match: (id: string) => id === "openai", key: "dialog.provider.openai.note" },
  { match: (id: string) => id === "google", key: "dialog.provider.google.note" },
  { match: (id: string) => id === "openrouter", key: "dialog.provider.openrouter.note" },
  { match: (id: string) => id === "vercel", key: "dialog.provider.vercel.note" },
] as const

export const SettingsProviders: Component<{
  directory: string | undefined
  onSelectProvider?: (providerID: string) => void
}> = (props) => {
  const dialog = useDialog()
  const language = useLanguage()
  const serverSdk = useServerSDK()
  const data = useData()
  const providers = useProviders(() => props.directory)
  const integrations = useIntegrations(() => props.directory)
  const providerConnect = useProviderConnectController()
  const accountActions = useProviderAccountActions(() => props.directory)

  const [state, setState] = createStore<{
    disconnecting: Record<string, "removing" | "removed" | "absent" | undefined>
    refreshing: Record<string, boolean | undefined>
    consoleExpanded: boolean
    credentialID?: string
    renaming?: string
    held?: ProviderItem[]
  }>({
    disconnecting: {},
    refreshing: {},
    consoleExpanded: false,
  })

  const updateDisconnecting = (ids: string[], status: "removing" | "removed" | "absent" | undefined) =>
    setState("disconnecting", (current) => ({
      ...current,
      ...Object.fromEntries(ids.map((id) => [id, status])),
    }))

  // Console-managed providers (`opencode-go`, `console-*`) connect through the `opencode`
  // integration, so the lookup must follow `integrationID` rather than the provider id.
  const integration = (item: ProviderItem) => {
    const id = item.integrationID ?? item.id

    return integrations.list().find((entry) => entry.id === id)
  }

  const connect = (provider?: string) => {
    // The list stays as it was while the dialog connects, so a new sign-in that briefly drops the
    // Console workspace providers from the catalog can't flash rows behind the dialog.
    setState("held", available())
    providerConnect.select(provider)
    void dialog.show(
      () => (
        <DialogConnectProvider
          directory={props.directory}
          defaultLocation={props.directory === undefined}
          controller={providerConnect}
          onConnected={(providerID) => {
            if (CONSOLE_PROVIDERS.has(providerID)) {
              setState("disconnecting", reconcile({}))

              return
            }

            setState("disconnecting", providerID, undefined)
          }}
        />
      ),
      () => void accountActions
          .refresh()
          .catch(() => undefined)
          .finally(() => setState("held", undefined)),
    )
  }

  const available = createMemo(() => {
    if (state.held) return state.held
    const connected = providers.connected()
    const managedConsole = consoleProviderGroup(connected)

    const consoleConnected = integrations
      .list()
      .find((item) => item.id === CONSOLE_INTEGRATION)
      ?.connections.some((connection) => connection.type === "credential" || connection.type === "env")

    return connected
      .filter(
        (provider) =>
          provider.id !== "opencode" ||
          managedConsole !== undefined ||
          consoleConnected ||
          Object.values(provider.models).some((model) => model.cost.input > 0),
      )
      .toSorted((a, b) => Number(b.id === "opencode-go") - Number(a.id === "opencode-go"))
  })

  createEffect(() => {
    const ids = new Set(available().map((item) => item.id))
    Object.entries(state.disconnecting).forEach(([id, status]) => {
      if ((status === "removing" || status === "removed") && !ids.has(id)) {
        setState("disconnecting", id, "absent")

        return
      }

      if (status === "absent" && ids.has(id)) setState("disconnecting", id, undefined)
    })
  })

  const connected = createMemo(() => available().filter((item) => !state.disconnecting[item.id]))

  const consoleGroup = createMemo(() => consoleProviderGroup(available()))

  const displayed = createMemo(() => {
    const group = consoleGroup()

    if (!group) return connected()
    const grouped = new Set(group.providers.filter((item) => item.id !== group.root.id).map((item) => item.id))

    return connected().filter((item) => !grouped.has(item.id))
  })

  const popular = createMemo(() => {
    const connectedIDs = new Set(connected().map((p) => p.id))
    // The Console account (integration `opencode`) shares its id with the Zen provider. A stored API
    // key, including one imported from a v1 auth.json, makes Zen "connected" without any account, so
    // the Popular list keeps the sign-in row until the active credential is an OAuth grant. Until the
    // integration list arrives the row is still the models.dev Zen provider, so dedupe it as before.
    const account = integrations.list().find((entry) => entry.id === CONSOLE_INTEGRATION)

    const items = providers
      .popular()
      .filter((p) => {
        if (p.id !== CONSOLE_INTEGRATION || !account) return !connectedIDs.has(p.id)

        return account.connections.find((connection) => connection.type === "credential")?.method !== "oauth"
      })
      .slice()

    items.sort((a, b) => popularProviders.indexOf(a.id) - popularProviders.indexOf(b.id))

    return items
  })

  // Connection state comes from the integration list like the TUI: credential
  // connections mean an API key or OAuth grant, env connections mean detected
  // environment variables, and a connectionless integration is config-provided.
  const source = (item: ProviderItem): ProviderSource | undefined => {
    const current = integration(item)
    const credential = current?.connections.find((connection) => connection.type === "credential")

    if (credential) return credential.method === "oauth" ? "account" : "api"

    if (current?.connections.some((connection) => connection.type === "env")) return "env"

    if (current) return "config"

    if (!("source" in item)) return
    const value = item.source

    if (value === "env" || value === "api" || value === "config" || value === "custom") return value

    return
  }

  const type = (item: ProviderItem) => {
    const current = source(item)

    if (current === "env") return language.t("settings.providers.tag.environment")

    if (current === "api") return language.t("provider.connect.method.apiKey")

    if (current === "account") return language.t("settings.providers.tag.account")

    if (current === "config") return language.t("settings.providers.tag.config")

    if (current === "custom") return language.t("settings.providers.tag.custom")

    return language.t("settings.providers.tag.other")
  }

  const canDisconnect = (item: ProviderItem) => {
    const current = integration(item)

    if (current) return current.connections.some((connection) => connection.type === "credential")
    const currentSource = source(item)

    return currentSource !== "env" && currentSource !== "config"
  }

  const canManageAccounts = (item: ProviderItem) => providerAccounts(integration(item)).length > 0

  const deleteCustom = async (item: ProviderItem) => {
    if (state.disconnecting[item.id]) return
    updateDisconnecting([item.id], "removing")
    const target = props.directory ? { directory: props.directory } : undefined

    try {
      await serverSdk.api.config.update({ providers: { [item.id]: null } })

      if (item.integrationID) {
        await serverSdk.api.credential.remove({ credentialID: `provider:${item.id}` }).catch(() => undefined)
      }

      data.location.config.invalidate(target)
      data.location.integration.invalidate(target)
      data.location.provider.invalidate(target)
      data.location.model.invalidate(target)
      await Promise.all([
        data.location.config.sync(target),
        data.location.integration.sync(target),
        data.location.provider.sync(target),
        data.location.model.sync(target),
      ]).catch(() => undefined)
      updateDisconnecting([item.id], "absent")
      showToast({ title: language.t("common.deleted") })
    } catch (error) {
      updateDisconnecting([item.id], undefined)
      showToast({
        title: language.t("common.requestFailed"),
        description: formatServerError(error),
      })
    }
  }

  const note = (id: string) => PROVIDER_NOTES.find((item) => item.match(id))?.key

  const isCustom = (item: ProviderItem) => item.source === "custom"

  const configEntries = createMemo(
    () => data.location.config.list(props.directory ? { directory: props.directory } : undefined) ?? [],
  )

  // Only providers the config gives an endpoint can be refreshed; catalog providers resolve their endpoint elsewhere.
  const configuredBaseURL = (providerID: string) =>
    configEntries().some(
      (entry) => entry.type === "document" && entry.info.providers?.[providerID]?.settings?.baseURL !== undefined,
    )

  const configuredModels = (providerID: string) =>
    configEntries().reduce<Record<string, ModelConfig>>((models, entry) => {
      if (entry.type !== "document") return models
      const configured = entry.info.providers?.[providerID]?.models

      return configured ? Object.assign(models, configured) : models
    }, {})

  // config.update replaces the provider's model list, so keep only the fields its patch accepts.
  const writableModel = (model: ModelConfig) => {
    const writable: ModelConfig = {}

    if (model.name !== undefined) writable.name = model.name

    if (model.capabilities !== undefined) writable.capabilities = model.capabilities

    if (model.limit !== undefined) writable.limit = model.limit

    return writable
  }

  const refreshModels = async (item: ProviderItem) => {
    if (state.refreshing[item.id]) return
    const target = props.directory ? { directory: props.directory } : undefined

    setState("refreshing", item.id, true)

    try {
      const discovered = await serverSdk.api.provider.models({ providerID: item.id })

      if (discovered.length === 0) {
        showToast({
          title: language.t("settings.providers.refresh.empty.title"),
          description: language.t("settings.providers.refresh.empty.description", { provider: item.name }),
        })

        return
      }

      const existing = configuredModels(item.id)
      const added = modelConfigs(discovered.map((model) => ({ id: model.id, name: model.name, meta: model })))

      const models = Object.fromEntries(
        discovered.map((model) => {
          const id = model.id.trim()
          const current = existing[id]

          return [id, current ? writableModel(current) : added[id]]
        }),
      )

      await serverSdk.api.config.update({ providers: { [item.id]: { models } } })
      data.location.config.invalidate(target)
      data.location.provider.invalidate(target)
      data.location.model.invalidate(target)
      await Promise.all([
        data.location.config.sync(target),
        data.location.provider.sync(target),
        data.location.model.sync(target),
      ]).catch(() => undefined)
      showToast({
        variant: "success",
        icon: "circle-check",
        title: language.t("settings.providers.refresh.success.title"),
        description: language.t("settings.providers.refresh.success.description", { provider: item.name }),
      })
    } catch (error) {
      showToast({
        title: language.t("common.requestFailed"),
        description: formatServerError(error, language.t),
      })
    } finally {
      setState("refreshing", item.id, undefined)
    }
  }

  const disconnect = async (item: ProviderItem, name: string) => {
    if (state.disconnecting[item.id]) return
    const group = consoleGroup()
    const ids = group?.root.id === item.id ? group.providers.map((provider) => provider.id) : [item.id]
    updateDisconnecting(ids, "removing")
    const location = props.directory ? { directory: props.directory } : undefined
    await serverSdk.api.integration
      .get({ integrationID: item.integrationID ?? item.id, location })
      .then(async (integration) => {
        const credentials = integration.data?.connections.filter((item) => item.type === "credential") ?? []

        if (credentials.length === 0) {
          showToast({
            title: language.t("common.requestFailed"),
            description: language.t("provider.disconnect.toast.noCredentials.description", { provider: name }),
          })

          return
        }

        await Promise.all(
          credentials.map((credential) => serverSdk.api.credential.remove({ credentialID: credential.id })),
        )
        updateDisconnecting(ids, "removed")
        showToast({
          variant: "success",
          icon: "circle-check",
          title: language.t("provider.disconnect.toast.disconnected.title", { provider: name }),
          description: language.t("provider.disconnect.toast.disconnected.description", { provider: name }),
        })
      })
      .catch((err) => {
        updateDisconnecting(ids, undefined)
        const message = formatServerError(err, language.t)
        showToast({
          title: language.t("common.requestFailed"),
          description: language.tDynamic("provider.disconnect.toast.failed.description", message, { provider: name }),
        })
      })
  }

  const activate = async (provider: ProviderItem, providerName: string, account: ProviderAccount) => {
    if (activeProviderAccount(integration(provider))?.id === account.id) return
    setState({ credentialID: account.id, held: available() })
    await accountActions.activate({ integrationID: provider.integrationID ?? provider.id, provider: providerName, account })
    setState({ credentialID: undefined, held: undefined })
  }

  const remove = async (provider: ProviderItem, providerName: string, account: ProviderAccount) => {
    setState({ credentialID: account.id, held: available() })
    await accountActions.remove({
      integrationID: provider.integrationID ?? provider.id,
      provider: providerName,
      account,
      final: providerAccounts(integration(provider)).length === 1,
    })
    setState({ credentialID: undefined, held: undefined })
  }

  function AccountMenu(menuProps: { provider: ProviderItem; name?: string }) {
    const accounts = () => providerAccounts(integration(menuProps.provider))
    const active = () => activeProviderAccount(integration(menuProps.provider))
    const name = () => menuProps.name ?? menuProps.provider.name
    const renaming = () => accounts().find((account) => account.id === state.renaming)

    return (
      <Show
        when={renaming()}
        fallback={
          <AccountMenuTrigger provider={menuProps.provider} name={name()} accounts={accounts()} active={active()} />
        }
      >
        {(account) => (
          <AccountNameInput
            value={account().label}
            class="settings-provider-account-input"
            onSave={(label) => accountActions.rename(account(), label)}
            onClose={() => setState("renaming", undefined)}
          />
        )}
      </Show>
    )
  }

  function AccountMenuTrigger(menuProps: {
    provider: ProviderItem
    name: string
    accounts: ProviderAccount[]
    active: ProviderAccount | undefined
  }) {
    const accounts = () => menuProps.accounts
    const active = () => menuProps.active
    const name = () => menuProps.name

    return (
      <div class="settings-provider-account-actions">
        <Menu placement="bottom-end" gutter={6}>
          <Menu.Trigger
            as={Button}
            size="normal"
            variant="ghost-muted"
            class="settings-provider-account-trigger"
            aria-label={language.t("settings.providers.account.manage", { provider: name() })}
          >
            <span>{active()?.label}</span>
            <Icon name="chevron-down" size="small" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content class="settings-provider-account-menu" onEscapeKeyDown={(event) => event.stopPropagation()}>
              <Menu.Group>
                <Menu.GroupLabel>{language.t("settings.providers.account.group")}</Menu.GroupLabel>
                <Menu.RadioGroup
                  class="settings-provider-account-list"
                  value={active()?.id}
                  onChange={(credentialID) => {
                    const account = accounts().find((item) => item.id === credentialID)

                    if (account) void activate(menuProps.provider, name(), account)
                  }}
                >
                  <For each={accounts()}>
                    {(account) => (
                      <Menu.RadioItem value={account.id} closeOnSelect disabled={state.credentialID !== undefined}>
                        <span class="settings-provider-account-label">{account.label}</span>
                      </Menu.RadioItem>
                    )}
                  </For>
                </Menu.RadioGroup>
              </Menu.Group>
              <Menu.Separator />
              <Menu.Item disabled={state.credentialID !== undefined} onSelect={() => connect(menuProps.provider.id)}>
                <Icon name="plus" size="small" class="shrink-0" />
                {language.t("settings.providers.account.add")}
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu>
        <Menu placement="bottom-end" gutter={6}>
          <Menu.Trigger
            as={IconButton}
            variant="ghost-muted"
            size="large"
            icon={<Icon name="outline-dots" />}
            disabled={state.credentialID !== undefined || !active()}
            aria-label={language.t("dialog.provider.accounts.options", { account: active()?.label ?? "" })}
          />
          <Menu.Portal>
            <Menu.Content onCloseAutoFocus={(event) => state.renaming && event.preventDefault()}>
              <Menu.Item onSelect={() => setState("renaming", active()?.id)}>
                {language.t("common.rename")}
              </Menu.Item>
              <Menu.Item
                onSelect={() => {
                  const account = active()

                  if (account) void remove(menuProps.provider, name(), account)
                }}
              >
                {language.t("dialog.provider.accounts.remove")}
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu>
      </div>
    )
  }

  return (
    <>
      <div class="settings-tab-header">
        <div class="settings-tab-header-row">
          <div class="flex flex-col gap-1">
            <h2 class="settings-tab-title">{language.t("settings.providers.title")}</h2>
            <span class="text-11-regular text-v2-text-text-muted">{language.t("settings.providers.description")}</span>
          </div>
        </div>
      </div>

      <div class="settings-tab-body settings-tab-body--sectioned settings-providers">
        <div class="settings-section" data-component="connected-providers-section">
          <h3 class="settings-section-title">{language.t("settings.providers.section.connected")}</h3>
          <SettingsList variant="catalog">
            <Show
              when={displayed().length > 0}
              fallback={<div class="settings-provider-empty">{language.t("settings.providers.connected.empty")}</div>}
            >
              <For each={displayed()}>
                {(item) => {
                  const managedGroup = () => (consoleGroup()?.root.id === item.id ? consoleGroup() : undefined)

                  return (
                    <Show
                      when={managedGroup()}
                      fallback={
                        <div class="settings-provider-row group">
                          <div class="settings-provider-lead">
                            <ProviderModelIcon provider={item} class="settings-provider-icon shrink-0" />

                            <div class="settings-provider-main">
                              <span class="settings-provider-name truncate">
                                {item.name}
                              </span>
                              <Badge>{type(item)}</Badge>
                            </div>
                          </div>
                          <Show
                            when={canManageAccounts(item)}
                            fallback={
                              <div class="flex items-center gap-1">
                                <Show when={configuredBaseURL(item.id)}>
                                  <Button
                                    size="normal"
                                    variant="ghost-muted"
                                    disabled={state.refreshing[item.id]}
                                    aria-label={language.t("settings.providers.refresh.aria", { provider: item.name })}
                                    onClick={() => void refreshModels(item)}
                                  >
                                    <Show when={state.refreshing[item.id]} fallback={<Icon name="refresh" size="small" />}>
                                      <Spinner class="size-4" />
                                    </Show>
                                    {language.t("settings.providers.refresh")}
                                  </Button>
                                </Show>
                                <Show
                                  when={isCustom(item)}
                                  fallback={
                                    <Show
                                      when={canDisconnect(item)}
                                      fallback={
                                        <span class="settings-provider-env-hint">
                                          {language.t("settings.providers.connected.environmentDescription")}
                                        </span>
                                      }
                                    >
                                      <Button
                                        size="normal"
                                        variant="ghost-muted"
                                        onClick={() => void disconnect(item, item.name)}
                                      >
                                        {language.t("common.disconnect")}
                                      </Button>
                                    </Show>
                                  }
                                >
                                  <Button
                                    size="normal"
                                    variant="ghost-muted"
                                    onClick={() => void deleteCustom(item)}
                                  >
                                    {language.t("common.delete")}
                                  </Button>
                                </Show>
                              </div>
                            }
                          >
                            <AccountMenu provider={item} />
                          </Show>
                        </div>
                      }
                    >
                      {(group) => (
                        <div class="settings-provider-console group">
                          <div class="settings-provider-console-header">
                            <div class="settings-provider-lead">
                              <OpenCodeLogo class="settings-provider-icon size-4 shrink-0" />
                              <div class="settings-provider-console-summary">
                                <div class="settings-provider-main">
                                  <span class="settings-provider-name truncate">
                                    {language.t("provider.connect.opencode.name")}
                                  </span>
                                  <Badge>{group().workspace}</Badge>
                                </div>
                                <Show when={group().providers.length > 1}>
                                  <button
                                    type="button"
                                    class="settings-provider-console-toggle"
                                    aria-expanded={state.consoleExpanded}
                                    onClick={() => setState("consoleExpanded", (value) => !value)}
                                  >
                                    <span>
                                      {language.plural(
                                        "settings.providers.console.available",
                                        group().providers.length,
                                        { count: group().providers.length },
                                      )}
                                    </span>
                                    <Icon
                                      name="chevron-right"
                                      size="small"
                                      classList={{
                                        "settings-provider-console-chevron": true,
                                        open: state.consoleExpanded,
                                      }}
                                    />
                                  </button>
                                </Show>
                              </div>
                            </div>
                            <Show
                              when={canManageAccounts(item)}
                              fallback={
                                <Button
                                  size="normal"
                                  variant="ghost-muted"
                                  onClick={() => void disconnect(item, language.t("provider.connect.opencode.name"))}
                                >
                                  {language.t("common.disconnect")}
                                </Button>
                              }
                            >
                              <AccountMenu provider={item} name={language.t("provider.connect.opencode.name")} />
                            </Show>
                          </div>
                          <Show when={state.consoleExpanded}>
                            <div class="settings-provider-console-list">
                              <div class="settings-provider-console-separator" aria-hidden="true" />
                              <For each={group().providers}>
                                {(provider) => (
                                  <button
                                    type="button"
                                    class="settings-provider-console-item"
                                    onClick={() => props.onSelectProvider?.(provider.id)}
                                  >
                                    <span>{provider.name.slice(group().prefix.length)}</span>
                                    <Icon
                                      name="chevron-right"
                                      size="small"
                                      class="settings-provider-console-item-chevron"
                                    />
                                  </button>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      )}
                    </Show>
                  )
                }}
              </For>
            </Show>
          </SettingsList>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">{language.t("settings.providers.section.popular")}</h3>
          <SettingsList variant="catalog">
            <For each={popular()}>
              {(item) => (
                <div class="settings-provider-row">
                  <div class="settings-provider-lead">
                    <ProviderModelIcon provider={item} class="settings-provider-icon shrink-0" />

                    <div class="settings-provider-copy">
                      <div class="settings-provider-main">
                        <span class="settings-provider-name">
                          {item.name}
                        </span>
                      </div>
                      <Show when={note(item.id)}>
                        {(key) => <p class="settings-provider-description">{language.t(key())}</p>}
                      </Show>
                    </div>
                  </div>
                  <Button size="normal" variant="neutral" icon="plus" onClick={() => connect(item.id)}>
                    {language.t("common.connect")}
                  </Button>
                </div>
              )}
            </For>
          </SettingsList>

          <button type="button" class="settings-providers-view-all" onClick={() => connect()}>
            {language.t("dialog.provider.viewAll")}
          </button>
        </div>
      </div>
    </>
  )
}

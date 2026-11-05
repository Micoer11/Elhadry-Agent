import { Component, For, Show, createEffect, createMemo, createResource } from "solid-js"
import { Button } from "@elhadry/ui/button"
import { useDialog } from "@elhadry/ui/context/dialog"
import { Icon } from "@elhadry/ui/icon"
import { IconButton } from "@elhadry/ui/icon-button"
import { Switch } from "@elhadry/ui/switch"
import { Tabs } from "@elhadry/ui/tabs"
import { useLanguage } from "@/runtime/i18n/language"
import { useData } from "@/runtime/server/current"
import { useServerSDK } from "@/runtime/server/client"
import { useMcpToggle } from "@/providers/connect/mcp"
import { pluginLabels } from "@/providers/catalog/plugin"
import { useMcpAuthorize } from "@/connections/authorize"
import { DialogAddConnection } from "@/connections/dialog"
import type { McpServerConfig } from "@/connections/controller"
import { applyOverlay, recordAdded, recordRemoved } from "@/connections/overlay"
import { DialogAddSkill } from "@/skills/add-dialog"
import { showToast } from "@/shell/notifications/toast"
import { formatServerError } from "@/runtime/server/errors"

import { SettingsList } from "@/settings/list"
import type { SettingsView } from "@/settings/surface"
import "@/settings/settings.css"

interface McpRowItem {
  name: string
  enabled: boolean
}

interface PluginRowItem {
  name: string
}

const dirname = (path: string) => {
  const at = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"))

  return at <= 0 ? path : path.slice(0, at)
}

const joinPath = (base: string, ...parts: string[]) => {
  const separator = base.includes("\\") ? "\\" : "/"

  return [base.replace(/[\\/]+$/, ""), ...parts].join(separator)
}

export const SettingsExtensions: Component<{
  subtab?: SettingsView["subtab"]
  onSubtab: (value: SettingsView["subtab"]) => void
}> = (props) => {
  const language = useLanguage()
  const serverSdk = useServerSDK()
  const data = useData()

  // Reading `.latest` rethrows a failed fetch, so these lists fall back to empty instead of crashing the page.
  const [mcpList, { refetch: refetchMcp }] = createResource(
    () => serverSdk.connection.status() === "connected",
    () =>
      serverSdk.api.mcp
        .list()
        .then((result) => result.data)
        .catch(() => []),
    { initialValue: [] },
  )

  const toggleMcp = useMcpToggle(() => undefined, refetchMcp)

  const dialog = useDialog()
  const authorizeMcp = useMcpAuthorize()

  const addMcp = async (name: string, config: McpServerConfig) => {
    // Adding never blocks on a handshake: the server is saved disabled unless the form explicitly
    // asked to connect now, and the first connect starts the OAuth flow when the server needs it.
    const saved: McpServerConfig = { ...config, disabled: config.disabled !== false }

    await serverSdk.api.mcp.add({ server: name, config: saved })
    recordAdded(name, saved)
    // The overlay above keeps the server even when the config document cannot be written.
    await serverSdk.api.config.update({ mcp: { servers: { [name]: saved } } }).catch(() => undefined)
    await refetchMcp()

    if (saved.disabled === false)
      void authorizeMcp(name).catch((error) =>
        showToast({
          variant: "error",
          title: language.t("connections.toast.failed"),
          description: formatServerError(error, language.t, language.t("connections.toast.failed")),
        }),
      )
  }

  const removeMcp = async (name: string) => {
    try {
      await serverSdk.api.mcp.remove({ server: name }).catch(() => undefined)
      recordRemoved(name)
      await serverSdk.api.config.update({ mcp: { servers: { [name]: null } } }).catch(() => undefined)
      await refetchMcp()
      showToast({ title: language.t("connections.toast.removed"), description: name })
    } catch (error) {
      showToast({
        variant: "error",
        title: language.t("connections.toast.failed"),
        description: formatServerError(error, language.t, language.t("connections.toast.failed")),
      })
    }
  }

  const openAdd = () => dialog.push(() => <DialogAddConnection onSubmit={addMcp} />)

  createEffect(() => {
    if (serverSdk.connection.status() !== "connected") return
    void applyOverlay(serverSdk).then(() => refetchMcp())
  })

  const mcps = createMemo<McpRowItem[]>(() => {
    return (mcpList.latest ?? []).map((server) => ({
      name: server.name,
      enabled: server.status.status === "connected",
    }))
  })

  const handleMcpToggle = (item: McpRowItem, checked: boolean) => {
    if (item.enabled === checked || toggleMcp.isPending) return
    toggleMcp.mutate(item.name)
  }

  const [pluginList] = createResource(
    () => serverSdk.connection.status() === "connected",
    () =>
      serverSdk.api.plugin
        .list()
        .then((result) => result.data)
        .catch(() => []),
    { initialValue: [] },
  )

  const plugins = createMemo<PluginRowItem[]>(() => pluginLabels(pluginList.latest ?? []).map((name) => ({ name })))

  createEffect(() => {
    if (serverSdk.connection.status() !== "connected") return
    void data.location.skill.sync().catch(() => undefined)
  })
  const skills = () => data.location.skill.list() ?? []

  const [configEntries] = createResource(
    () => serverSdk.connection.status() === "connected",
    () => serverSdk.api.config.get().catch(() => []),
    { initialValue: [] },
  )

  // `config.get` is ordered lowest to highest priority with a directory entry
  // closing each root, so the last document before the first directory is the
  // global file that `config.update` writes.
  const resolvePaths = (entries: Awaited<ReturnType<typeof serverSdk.api.config.get>>) => {
    const boundary = entries.findIndex((entry) => entry.type === "directory")
    const global = boundary === -1 ? entries : entries.slice(0, boundary)
    const file = global.flatMap((entry) => (entry.type === "document" && entry.path ? [entry.path] : [])).at(-1)

    const directory =
      file === undefined
        ? entries.flatMap((entry) => (entry.type === "directory" ? [entry.path] : []))[0]
        : dirname(file)

    return {
      file: file ?? (directory === undefined ? undefined : joinPath(directory, "elhadry.jsonc")),
      directory,
    }
  }

  const configPaths = createMemo(() => {
    const entries =
      configEntries.state === "ready" || configEntries.state === "refreshing" ? (configEntries.latest ?? []) : []

    return resolvePaths(entries)
  })

  const refreshSkills = async () => {
    await data.location.skill.sync().catch(() => undefined)
    setTimeout(() => void data.location.skill.sync().catch(() => undefined), 600)
  }

  const openAddSkill = async () => {
    // The config resource can still be loading when the button is pressed, so resolve the path
    // directly instead of failing the click with a stale empty value.
    const directory =
      configPaths().directory ?? resolvePaths(await serverSdk.api.config.get().catch(() => [])).directory

    if (!directory) {
      showToast({
        variant: "error",
        title: language.t("settings.extensions.skill.failed"),
        description: language.t("settings.extensions.skill.noDirectory"),
      })

      return
    }

    dialog.push(() => <DialogAddSkill directory={directory} onSaved={refreshSkills} />)
  }

  return (
    <>
      <div class="settings-tab-header">
        <div class="settings-tab-header-row">
          <div class="flex flex-col gap-1">
            <h2 class="settings-tab-title">{language.t("settings.tab.extensions")}</h2>
            <span class="text-11-regular text-v2-text-text-muted">{language.t("settings.extensions.description")}</span>
          </div>
        </div>
      </div>

      <div class="settings-tab-body">
        <Tabs
          variant="pill"
          value={props.subtab ?? "mcps"}
          onChange={(value) => {
            if (value === "mcps" || value === "plugins" || value === "skills") props.onSubtab(value)
          }}
          class="settings-extensions-tabs settings-subtabs"
        >
          <Tabs.List>
            <Tabs.Trigger value="mcps">{language.t("settings.extensions.tab.mcps")}</Tabs.Trigger>
            <Tabs.Trigger value="plugins">{language.t("settings.extensions.tab.plugins")}</Tabs.Trigger>
            <Tabs.Trigger value="skills">{language.t("settings.extensions.tab.skills")}</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="mcps">
            <div class="settings-section">
              <div class="flex items-center justify-between gap-3">
                <span class="settings-extension-heading text-13-medium">
                  {language.t("settings.extensions.availableAll")}
                </span>
                <Button size="small" variant="neutral" icon="plus" class="connections-primary" onClick={openAdd}>
                  {language.t("connections.add.button")}
                </Button>
              </div>
              <div class="settings-extension-hint">
                <div class="settings-extension-hint-head">
                  <span class="settings-extension-hint-title">{language.t("settings.extensions.manualMcp.title")}</span>
                  <Show when={configPaths().file}>
                    <code class="settings-extension-hint-path" dir="ltr">
                      {configPaths().file}
                    </code>
                  </Show>
                </div>
                <p class="settings-extension-hint-copy">{language.t("settings.extensions.manualMcp.description")}</p>
              </div>
              <SettingsList variant="catalog">
                <For each={mcps()}>
                  {(item) => (
                    <div class="settings-extension-row">
                      <div class="settings-extension-lead">
                        <Icon name="mcp" class="text-v2-icon-icon-muted shrink-0" />
                        <span class="settings-extension-name truncate">{item.name}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <Switch checked={item.enabled} onChange={(checked) => handleMcpToggle(item, checked)} hideLabel>
                          {item.name}
                        </Switch>
                        <IconButton
                          icon={<Icon name="trash" size="small" />}
                          variant="ghost-muted"
                          size="small"
                          aria-label={language.t("connections.remove")}
                          onClick={() => void removeMcp(item.name)}
                        />
                      </div>
                    </div>
                  )}
                </For>
              </SettingsList>
            </div>
          </Tabs.Content>

          <Tabs.Content value="plugins">
            <div class="settings-section">
              <div class="flex items-center justify-between">
                <span class="settings-extension-heading text-13-medium">
                  {language.t("settings.extensions.availableAll")}
                </span>
                <span class="text-13-regular text-v2-text-text-muted">
                  {language.t("settings.extensions.manageConfig")}
                </span>
              </div>
              <SettingsList variant="catalog">
                <For each={plugins()}>
                  {(plugin) => (
                    <div class="settings-extension-row">
                      <div class="settings-extension-lead">
                        <Icon name="cube" class="text-v2-icon-icon-muted shrink-0" />
                        <span class="settings-extension-name truncate">{plugin.name}</span>
                      </div>
                    </div>
                  )}
                </For>
              </SettingsList>
            </div>
          </Tabs.Content>

          <Tabs.Content value="skills">
            <div class="settings-section">
              <div class="flex items-center justify-between">
                <span class="settings-extension-heading text-13-medium">
                  {language.t("settings.extensions.availableAll")}
                </span>
                <Button size="small" variant="neutral" icon="plus" class="connections-primary" onClick={openAddSkill}>
                  {language.t("settings.extensions.addSkill")}
                </Button>
              </div>
              <SettingsList variant="catalog">
                <For each={skills()}>
                  {(skill) => (
                    <div class="settings-extension-row">
                      <div class="settings-extension-lead">
                        <Icon name="post-skill" class="text-v2-icon-icon-muted shrink-0" />
                        <span class="settings-extension-name truncate">{skill.name}</span>
                      </div>
                    </div>
                  )}
                </For>
              </SettingsList>
            </div>
          </Tabs.Content>
        </Tabs>
      </div>
    </>
  )
}

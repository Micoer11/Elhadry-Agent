import { createMemo, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@elhadry/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitleGroup } from "@elhadry/ui/dialog"
import { useDialog } from "@elhadry/ui/context/dialog"
import { Select } from "@elhadry/ui/select"
import { Switch } from "@elhadry/ui/switch"
import { TextField } from "@elhadry/ui/text-field"
import { useLanguage } from "@/runtime/i18n/language"
import { formatServerError } from "@/runtime/server/errors"
import type { McpServerConfig } from "./controller"
import "./connections.css"

type Transport = "remote" | "local"

type Auth = "auto" | "none" | "oauth"

type Protocol = "legacy" | "auto" | "2026-07-28"

type TimeoutConfig = { startup?: number; catalog?: number; execution?: number }

type OAuthDraft = { client_id?: string; client_secret?: string; scope?: string }

type RemoteDraft = {
  type: "remote"
  url: string
  headers?: Record<string, string>
  oauth?: false | OAuthDraft
  disabled?: boolean
  codemode?: boolean
  timeout?: TimeoutConfig
  protocol?: Protocol
}

type LocalDraft = {
  type: "local"
  command: string[]
  cwd?: string
  environment?: Record<string, string>
  disabled?: boolean
  codemode?: boolean
  timeout?: TimeoutConfig
  protocol?: Protocol
}

type FormState = {
  name: string
  transport: Transport
  url: string
  auth: Auth
  clientId: string
  clientSecret: string
  scope: string
  command: string
  cwd: string
  environment: string
  headers: string
  codemode: boolean
  disabled: boolean
  protocol: Protocol
  startup: string
  catalog: string
  execution: string
  error: string
  saving: boolean
}

export function DialogAddConnection(props: {
  onSubmit: (name: string, config: McpServerConfig) => Promise<void>
}) {
  const language = useLanguage()
  const dialog = useDialog()

  const [store, setStore] = createStore<FormState>({
    name: "",
    transport: "remote",
    url: "",
    auth: "auto",
    clientId: "",
    clientSecret: "",
    scope: "",
    command: "",
    cwd: "",
    environment: "",
    headers: "",
    codemode: true,
    disabled: true,
    protocol: "legacy",
    startup: "",
    catalog: "",
    execution: "",
    error: "",
    saving: false,
  })

  const typeOptions = createMemo(() => [
    { value: "remote" as const, label: language.t("connections.form.remote") },
    { value: "local" as const, label: language.t("connections.form.local") },
  ])

  const currentType = createMemo(() => typeOptions().find((item) => item.value === store.transport))

  const authOptions = createMemo(() => [
    { value: "auto" as const, label: language.t("connections.form.auth.auto") },
    { value: "none" as const, label: language.t("connections.form.auth.none") },
    { value: "oauth" as const, label: language.t("connections.form.auth.oauth") },
  ])

  const currentAuth = createMemo(() => authOptions().find((item) => item.value === store.auth))

  const protocolOptions = createMemo(() => [
    { value: "legacy" as const, label: language.t("connections.form.protocol.legacy") },
    { value: "auto" as const, label: language.t("connections.form.protocol.auto") },
    { value: "2026-07-28" as const, label: language.t("connections.form.protocol.next") },
  ])

  const currentProtocol = createMemo(() => protocolOptions().find((item) => item.value === store.protocol))

  const parsePairs = (value: string, separator: string) => {
    const result: Record<string, string> = {}

    for (const line of value.split("\n").map((item) => item.trim()).filter(Boolean)) {
      const at = line.indexOf(separator)

      if (at <= 0) return undefined

      result[line.slice(0, at).trim()] = line.slice(at + separator.length).trim()
    }

    return Object.keys(result).length > 0 ? result : undefined
  }

  const timeouts = () => {
    const result: TimeoutConfig = {}

    for (const [key, raw] of [
      ["startup", store.startup],
      ["catalog", store.catalog],
      ["execution", store.execution],
    ] as const) {
      const value = raw.trim()

      if (!value) continue

      const parsed = Number(value)

      if (!Number.isInteger(parsed) || parsed <= 0) return undefined

      result[key] = parsed
    }

    return result
  }

  const advanced = <T extends RemoteDraft | LocalDraft>(config: T, timeout: TimeoutConfig) => {
    if (!store.codemode) config.codemode = false

    if (store.disabled) config.disabled = true

    if (store.protocol !== "legacy") config.protocol = store.protocol

    if (Object.keys(timeout).length > 0) config.timeout = timeout

    return config
  }

  const build = (): McpServerConfig | undefined => {
    const name = store.name.trim()

    if (!name) {
      setStore("error", language.t("connections.form.nameRequired"))

      return
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
      setStore("error", language.t("connections.form.nameInvalid"))

      return
    }

    const timeout = timeouts()

    if (!timeout) {
      setStore("error", language.t("connections.form.timeoutInvalid"))

      return
    }

    if (store.transport === "local") {
      const command = store.command.trim().split(/\s+/).filter(Boolean)

      if (command.length === 0) {
        setStore("error", language.t("connections.form.commandRequired"))

        return
      }

      const environment = parsePairs(store.environment, "=")

      if (environment === undefined && store.environment.trim()) {
        setStore("error", language.t("connections.form.environmentInvalid"))

        return
      }

      const config: LocalDraft = { type: "local", command }

      if (store.cwd.trim()) config.cwd = store.cwd.trim()

      if (environment) config.environment = environment

      return advanced(config, timeout)
    }

    const url = store.url.trim()

    if (!url) {
      setStore("error", language.t("connections.form.urlRequired"))

      return
    }

    if (!/^https?:\/\/.+/i.test(url)) {
      setStore("error", language.t("connections.form.urlInvalid"))

      return
    }

    const headers = parsePairs(store.headers, ":")

    if (headers === undefined && store.headers.trim()) {
      setStore("error", language.t("connections.form.headersInvalid"))

      return
    }

    const config: RemoteDraft = { type: "remote", url }

    if (headers) config.headers = headers

    if (store.auth === "none") config.oauth = false

    if (store.auth === "oauth") {
      const oauth: OAuthDraft = {}

      if (store.clientId.trim()) oauth.client_id = store.clientId.trim()

      if (store.clientSecret.trim()) oauth.client_secret = store.clientSecret.trim()

      if (store.scope.trim()) oauth.scope = store.scope.trim()

      config.oauth = oauth
    }

    return advanced(config, timeout)
  }

  const submit = async () => {
    if (store.saving) return

    const config = build()

    if (!config) return

    setStore({ saving: true, error: "" })

    try {
      await props.onSubmit(store.name.trim(), config)
      dialog.close()
    } catch (error) {
      setStore({
        saving: false,
        error: formatServerError(error, language.t, language.t("connections.toast.failed")),
      })
    }
  }

  return (
    <Dialog
      size="normal"
      fit
      class="elhadry-surface-dialog [font-family:var(--v2-font-family-sans)]"
      containerClass="!w-[min(calc(100vw-32px),560px)]"
    >
      <DialogHeader>
        <DialogTitleGroup title={language.t("connections.form.title")} />
      </DialogHeader>
      <DialogBody class="flex max-h-[min(70vh,640px)] flex-col gap-4 overflow-y-auto px-5 pb-2 pt-1">
        <p class="connections-form-note">{language.t("connections.form.description")}</p>

        <TextField
          label={language.t("connections.form.name")}
          placeholder={language.t("connections.form.name.placeholder")}
          description={language.t("connections.form.name.hint")}
          value={store.name}
          onChange={(value) => setStore({ name: value, error: "" })}
          spellcheck={false}
        />

        <div class="connections-form-field">
          <span class="connections-form-label">{language.t("connections.form.type")}</span>
          <Select
            options={typeOptions()}
            current={currentType()}
            value={(item) => item.value}
            label={(item) => item.label}
            onSelect={(item) => item && setStore({ transport: item.value, error: "" })}
          />
        </div>

        <Show when={store.transport === "remote"}>
          <TextField
            label={language.t("connections.form.url")}
            placeholder={language.t("connections.form.url.placeholder")}
            value={store.url}
            onChange={(value) => setStore({ url: value, error: "" })}
            spellcheck={false}
          />

          <div class="connections-form-field">
            <span class="connections-form-label">{language.t("connections.form.auth")}</span>
            <Select
              options={authOptions()}
              current={currentAuth()}
              value={(item) => item.value}
              label={(item) => item.label}
              onSelect={(item) => item && setStore({ auth: item.value, error: "" })}
            />
            <span class="connections-form-hint">{language.t("connections.form.auth.hint")}</span>
          </div>

          <Show when={store.auth === "oauth"}>
            <TextField
              label={language.t("connections.form.clientId")}
              value={store.clientId}
              onChange={(value) => setStore({ clientId: value, error: "" })}
              spellcheck={false}
            />
            <TextField
              label={language.t("connections.form.clientSecret")}
              type="password"
              value={store.clientSecret}
              onChange={(value) => setStore({ clientSecret: value, error: "" })}
            />
            <TextField
              label={language.t("connections.form.scope")}
              value={store.scope}
              onChange={(value) => setStore({ scope: value, error: "" })}
              spellcheck={false}
            />
          </Show>

          <TextField
            multiline
            label={language.t("connections.form.headers")}
            description={language.t("connections.form.headers.hint")}
            placeholder={"Authorization: Bearer …"}
            value={store.headers}
            onChange={(value) => setStore({ headers: value, error: "" })}
            class="min-h-20 font-mono"
            spellcheck={false}
          />
        </Show>

        <Show when={store.transport === "local"}>
          <TextField
            label={language.t("connections.form.command")}
            description={language.t("connections.form.command.hint")}
            placeholder={"npx -y @modelcontextprotocol/server-everything"}
            value={store.command}
            onChange={(value) => setStore({ command: value, error: "" })}
            class="font-mono"
            spellcheck={false}
          />
          <TextField
            label={language.t("connections.form.cwd")}
            value={store.cwd}
            onChange={(value) => setStore({ cwd: value, error: "" })}
            spellcheck={false}
          />
          <TextField
            multiline
            label={language.t("connections.form.environment")}
            description={language.t("connections.form.environment.hint")}
            placeholder={"API_KEY=…"}
            value={store.environment}
            onChange={(value) => setStore({ environment: value, error: "" })}
            class="min-h-20 font-mono"
            spellcheck={false}
          />
        </Show>

        <div class="connections-form-advanced">
          <span class="connections-form-label">{language.t("connections.form.advanced")}</span>
          <div class="connections-form-toggles">
            <label class="connections-form-toggle">
              <span>{language.t("connections.form.codemode")}</span>
              <Switch
                checked={store.codemode}
                onChange={(checked) => setStore("codemode", checked)}
                hideLabel
              >
                {language.t("connections.form.codemode")}
              </Switch>
            </label>
            <label class="connections-form-toggle">
              <span>{language.t("connections.form.disabled")}</span>
              <Switch
                checked={store.disabled}
                onChange={(checked) => setStore("disabled", checked)}
                hideLabel
              >
                {language.t("connections.form.disabled")}
              </Switch>
            </label>
          </div>

          <div class="connections-form-field">
            <span class="connections-form-label">{language.t("connections.form.protocol")}</span>
            <Select
              options={protocolOptions()}
              current={currentProtocol()}
              value={(item) => item.value}
              label={(item) => item.label}
              onSelect={(item) => item && setStore({ protocol: item.value, error: "" })}
            />
          </div>

          <div class="connections-form-timeouts">
            <TextField
              type="number"
              label={language.t("connections.form.timeout.startup")}
              value={store.startup}
              onChange={(value) => setStore({ startup: value, error: "" })}
            />
            <TextField
              type="number"
              label={language.t("connections.form.timeout.catalog")}
              value={store.catalog}
              onChange={(value) => setStore({ catalog: value, error: "" })}
            />
            <TextField
              type="number"
              label={language.t("connections.form.timeout.execution")}
              value={store.execution}
              onChange={(value) => setStore({ execution: value, error: "" })}
            />
          </div>
          <span class="connections-form-hint">{language.t("connections.form.timeout.hint")}</span>
        </div>

        <Show when={store.error}>
          <p class="connections-form-error" role="alert">
            {store.error}
          </p>
        </Show>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => dialog.close()}>
          {language.t("common.cancel")}
        </Button>
        <Button
          type="button"
          variant="neutral"
          class="connections-primary"
          disabled={store.saving}
          onClick={() => void submit()}
        >
          {store.saving ? language.t("connections.form.saving") : language.t("connections.form.submit")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

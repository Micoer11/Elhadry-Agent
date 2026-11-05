import { Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@elhadry/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitleGroup } from "@elhadry/ui/dialog"
import { useDialog } from "@elhadry/ui/context/dialog"
import { Switch } from "@elhadry/ui/switch"
import { TextField } from "@elhadry/ui/text-field"
import { useLanguage } from "@/runtime/i18n/language"
import { useServer } from "@/runtime/server/current"
import { authTokenFromCredentials } from "@/runtime/server/api"
import { formatServerError } from "@/runtime/server/errors"
import "@/connections/connections.css"

type FormState = {
  name: string
  id: string
  summary: string
  content: string
  autoinvoke: boolean
  error: string
  saving: boolean
}

const separator = (base: string) => (base.includes("\\") ? "\\" : "/")

const join = (base: string, ...parts: string[]) => [base.replace(/[\\/]+$/, ""), ...parts].join(separator(base))

const slug = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)

const validID = (input: string) => /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(input)

const skillFile = (input: { name: string; description: string; content: string; autoinvoke: boolean }) =>
  [
    "---",
    `name: ${JSON.stringify(input.name)}`,
    `description: ${JSON.stringify(input.description)}`,
    "metadata:",
    `  elhadry/autoinvoke: ${input.autoinvoke}`,
    "---",
    "",
    input.content.trim(),
    "",
  ].join("\n")

export function DialogAddSkill(props: { directory: string; onSaved: () => Promise<void> | void }) {
  const language = useLanguage()
  const dialog = useDialog()
  const server = useServer()

  const [store, setStore] = createStore<FormState>({
    name: "",
    id: "",
    summary: "",
    content: "",
    autoinvoke: true,
    error: "",
    saving: false,
  })

  const target = () => {
    const id = store.id.trim() || slug(store.name) || "skill"

    return join(props.directory, "skills", id, "SKILL.md")
  }

  const write = async (path: string, body: string) => {
    if (!props.directory) throw new Error(language.t("settings.extensions.skill.noDirectory"))

    const url = new URL("/api/experimental/fs/write", server.conn.http.url)
    url.searchParams.set("path", path)
    const password = server.conn.http.password

    const headers = new Headers({ "content-type": "application/octet-stream" })

    if (password) headers.set("authorization", `Basic ${authTokenFromCredentials({ password })}`)

    // A stalled write must not leave the dialog stuck on "Saving" forever.
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) throw new Error(`fs.write failed with status ${response.status}`)
  }

  const submit = async () => {
    if (store.saving) return

    const name = store.name.trim()
    const description = store.summary.trim()
    const id = store.id.trim() || slug(name)

    if (!name) return setStore("error", language.t("settings.extensions.skill.nameRequired"))

    if (!description) return setStore("error", language.t("settings.extensions.skill.descriptionRequired"))

    if (!id) return setStore("error", language.t("settings.extensions.skill.idRequired"))

    if (!validID(id)) return setStore("error", language.t("settings.extensions.skill.idInvalid"))

    setStore({ saving: true, error: "" })

    try {
      await write(
        join(props.directory, "skills", id, "SKILL.md"),
        skillFile({ name, description, content: store.content, autoinvoke: store.autoinvoke }),
      )
      dialog.close()
      await props.onSaved()
    } catch (error) {
      setStore({
        saving: false,
        error: formatServerError(error, language.t, language.t("settings.extensions.skill.failed")),
      })
    }
  }

  return (
    <Dialog
      size="normal"
      fit
      class="elhadry-surface-dialog [font-family:var(--v2-font-family-sans)]"
      containerClass="!w-[min(calc(100vw-32px),600px)]"
    >
      <DialogHeader>
        <DialogTitleGroup title={language.t("settings.extensions.skill.title")} />
      </DialogHeader>
      <DialogBody class="flex max-h-[min(72vh,660px)] flex-col gap-4 overflow-y-auto px-5 pb-2 pt-1">
        <p class="connections-form-note">{language.t("settings.extensions.skill.description")}</p>

        <TextField
          label={language.t("settings.extensions.skill.name")}
          placeholder={language.t("settings.extensions.skill.name.placeholder")}
          value={store.name}
          onChange={(value) => setStore({ name: value, error: "" })}
          spellcheck={false}
        />

        <TextField
          label={language.t("settings.extensions.skill.id")}
          description={language.t("settings.extensions.skill.id.hint")}
          placeholder={slug(store.name) || "my-skill"}
          value={store.id}
          onChange={(value) => setStore({ id: value, error: "" })}
          spellcheck={false}
        />

        <TextField
          multiline
          label={language.t("settings.extensions.skill.summary")}
          description={language.t("settings.extensions.skill.summary.hint")}
          placeholder={language.t("settings.extensions.skill.summary.placeholder")}
          value={store.summary}
          onChange={(value) => setStore({ summary: value, error: "" })}
          class="min-h-16"
        />

        <TextField
          multiline
          label={language.t("settings.extensions.skill.content")}
          description={language.t("settings.extensions.skill.content.hint")}
          placeholder={language.t("settings.extensions.skill.content.placeholder")}
          value={store.content}
          onChange={(value) => setStore({ content: value, error: "" })}
          class="min-h-40 font-mono"
          spellcheck={false}
        />

        <label class="connections-form-toggle">
          <span>{language.t("settings.extensions.skill.autoinvoke")}</span>
          <Switch checked={store.autoinvoke} onChange={(checked) => setStore("autoinvoke", checked)} hideLabel>
            {language.t("settings.extensions.skill.autoinvoke")}
          </Switch>
        </label>

        <div class="connections-form-field">
          <span class="connections-form-label">{language.t("settings.extensions.skill.target")}</span>
          <span class="connections-form-hint break-all font-mono">{target()}</span>
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
          {store.saving
            ? language.t("settings.extensions.skill.saving")
            : language.t("settings.extensions.skill.submit")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

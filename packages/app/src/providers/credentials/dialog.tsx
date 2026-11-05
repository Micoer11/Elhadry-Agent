import { Button } from "@elhadry/ui/button"
import { useDialog } from "@elhadry/ui/context/dialog"
import { Icon } from "@elhadry/ui/icon"
import { IconButton } from "@elhadry/ui/icon-button"
import { Spinner } from "@elhadry/ui/spinner"
import { useMutation } from "@tanstack/solid-query"
import { TextField } from "@elhadry/ui/text-field"
import { showToast } from "@/shell/notifications/toast"
import { batch, createMemo, createSignal, For, Show } from "solid-js"
import { createStore, produce } from "solid-js/store"

import { useData } from "@/runtime/server/current"
import { useServerSDK } from "@/runtime/server/client"
import { useLanguage } from "@/runtime/i18n/language"
import { formatServerError } from "@/runtime/server/errors"
import { type FormState, headerRow, modelRow, validateCustomProvider } from "./form"
import { CustomManagedProviderIcon } from "@/providers/models/provider-group"

export function CustomProviderForm(props: { autofocus?: boolean; directory?: string } = {}) {
  const dialog = useDialog()
  const data = useData()
  const serverSDK = useServerSDK()
  const language = useLanguage()
  // Settings opens this form outside any Location provider; an omitted ref means the server default.
  const ref = () => (props.directory ? { directory: props.directory } : undefined)

  const [form, setForm] = createStore<FormState>({
    providerID: "",
    name: "",
    baseURL: "",
    apiKey: "",
    models: [],
    headers: [headerRow()],
    err: {},
  })

  // One pending model field sits above the list: typing an id is still supported, but the server can
  // enumerate the real ids so a custom provider is mostly a matter of picking from what it serves.
  const [draft, setDraft] = createStore<{ id: string; name: string }>({ id: "", name: "" })

  const [fetched, setFetched] = createStore<{
    loading: boolean
    loaded: boolean
    error?: string
    models: Array<{ id: string; name?: string; checked: boolean }>
  }>({ loading: false, loaded: false, models: [] })

  const added = createMemo(() => new Set(form.models.map((model) => model.id.trim()).filter(Boolean)))

  const [fetchedSearch, setFetchedSearch] = createSignal("")

  const visibleFetched = createMemo(() => {
    const query = fetchedSearch().trim().toLowerCase()

    if (!query) return fetched.models

    return fetched.models.filter(
      (model) => model.id.toLowerCase().includes(query) || (model.name ?? "").toLowerCase().includes(query),
    )
  })

  const selected = createMemo(() => fetched.models.filter((model) => model.checked && !added().has(model.id)))

  const allChecked = createMemo(
    () => fetched.models.length > 0 && fetched.models.every((model) => model.checked || added().has(model.id)),
  )

  const addModel = (id: string, name?: string) => {
    const modelID = id.trim()

    if (!modelID) return

    if (added().has(modelID)) return
    setForm(
      "models",
      produce((rows) => {
        rows.push(modelRow(modelID, name?.trim() ?? ""))
      }),
    )
    setForm("err", "models", undefined)
  }

  const addDraft = () => {
    if (!draft.id.trim()) return
    addModel(draft.id, draft.name)
    setDraft({ id: "", name: "" })
  }

  const removeModel = (index: number) => {
    setForm(
      "models",
      produce((rows) => {
        rows.splice(index, 1)
      }),
    )
  }

  const addSelected = () => {
    for (const model of selected()) addModel(model.id, model.name)
    setFetched({ models: [], loaded: false })
  }

  const toggleAll = () => {
    const next = !allChecked()
    setFetched(
      "models",
      produce((models) => {
        for (const model of models) if (!added().has(model.id)) model.checked = next
      }),
    )
  }

  const addHeader = () => {
    setForm(
      "headers",
      produce((rows) => {
        rows.push(headerRow())
      }),
    )
  }

  const removeHeader = (index: number) => {
    if (form.headers.length <= 1) return
    setForm(
      "headers",
      produce((rows) => {
        rows.splice(index, 1)
      }),
    )
  }

  const setField = (key: "providerID" | "name" | "baseURL" | "apiKey", value: string) => {
    setForm(key, value)

    if (key === "apiKey") return
    setForm("err", key, undefined)
  }

  const setHeader = (index: number, key: "key" | "value", value: string) => {
    batch(() => {
      setForm("headers", index, key, value)
      setForm("headers", index, "err", key, undefined)
    })
  }

  const fetchModels = async () => {
    if (fetched.loading) return
    const baseURL = form.baseURL.trim()

    if (!baseURL) {
      setForm("err", "baseURL", language.t("provider.custom.error.baseURL.required"))

      return
    }

    setForm("err", "baseURL", undefined)
    setFetched({ loading: true, error: undefined })

    const result = await serverSDK.api.provider
      .models({ baseURL, apiKey: form.apiKey.trim() || undefined })
      .then((models) => ({ ok: true as const, models }))
      .catch((error) => ({ ok: false as const, error }))

    if (!result.ok) {
      setFetched({ loading: false, loaded: true, error: formatServerError(result.error, language.t) })

      return
    }

    setFetched({
      loading: false,
      loaded: true,
      models: result.models.map((model) => ({ ...model, checked: true })),
    })

    if (result.models.length === 0) setFetched("error", language.t("provider.custom.models.fetch.empty"))
  }

  const validate = () => {
    const output = validateCustomProvider({
      form,
      t: language.t,
      // TODO: Restore disabled-provider validation when V2 exposes config reads.
      disabledProviders: [],
      existingProviderIDs: new Set((data.location.provider.list(ref()) ?? []).map((provider) => provider.id)),
    })

    batch(() => {
      setForm("err", output.err)
      output.models.forEach((err, index) => setForm("models", index, "err", err))
      output.headers.forEach((err, index) => setForm("headers", index, "err", err))
    })

    return output.result
  }

  const saveMutation = useMutation(() => ({
    mutationFn: async (result: NonNullable<ReturnType<typeof validate>>): Promise<typeof result> => {
      const target = ref()

      // The provider definition and its key are separate stores: the definition lives in config, the
      // key in the credential store. An empty key creates no credential at all, so requests go out
      // without an authorization header instead of carrying an empty one.
      await serverSDK.api.config.update({ providers: { [result.providerID]: result.config } })

      if (result.key) {
        await serverSDK.api.credential.create({
          integrationID: result.providerID,
          value: { type: "key", key: result.key },
        })
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

      return result
    },
    onSuccess: (result) => {
      dialog.close()
      showToast({
        variant: "success",
        icon: "circle-check",
        title: language.t("provider.connect.toast.connected.title", { provider: result.name }),
        description: language.t("provider.connect.toast.connected.description", { provider: result.name }),
      })
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err)
      showToast({ title: language.t("common.requestFailed"), description: message })
    },
  }))

  const save = (e: SubmitEvent) => {
    e.preventDefault()

    if (saveMutation.isPending) return

    const result = validate()

    if (!result) return
    saveMutation.mutate(result)
  }

  return (
    <div class="flex flex-col gap-5 overflow-y-auto px-2.5 pb-3 max-h-[60vh]">
      <div class="flex items-center gap-4 px-2.5">
        <CustomManagedProviderIcon class="size-5 shrink-0" />
        <div class="text-16-medium text-text-strong">{language.t("provider.custom.title")}</div>
      </div>

      <form onSubmit={save} class="flex flex-col gap-5 px-2.5 pb-6">
        <p class="text-14-regular text-text-base">{language.t("provider.custom.description.prefix")}</p>

        <div class="flex flex-col gap-4">
          <TextField
            autofocus={props.autofocus ?? true}
            label={language.t("provider.custom.field.providerID.label")}
            placeholder={language.t("provider.custom.field.providerID.placeholder")}
            description={language.t("provider.custom.field.providerID.description")}
            value={form.providerID}
            onChange={(v) => setField("providerID", v)}
            validationState={form.err.providerID ? "invalid" : undefined}
            error={form.err.providerID}
          />
          <TextField
            label={language.t("provider.custom.field.name.label")}
            placeholder={language.t("provider.custom.field.name.placeholder")}
            value={form.name}
            onChange={(v) => setField("name", v)}
            validationState={form.err.name ? "invalid" : undefined}
            error={form.err.name}
          />
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <TextField
                label={language.t("provider.custom.field.baseURL.label")}
                placeholder={language.t("provider.custom.field.baseURL.placeholder")}
                value={form.baseURL}
                onChange={(v) => setField("baseURL", v)}
                validationState={form.err.baseURL ? "invalid" : undefined}
                error={form.err.baseURL}
              />
            </div>
            <Button
              type="button"
              size="large"
              variant="neutral"
              class="mb-0.5 shrink-0"
              disabled={fetched.loading}
              onClick={() => void fetchModels()}
            >
              <Show when={fetched.loading} fallback={language.t("provider.custom.models.fetch")}>
                <Spinner class="size-4" />
              </Show>
            </Button>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <label class="text-12-medium text-text-weak">{language.t("provider.custom.models.label")}</label>
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <TextField
                label={language.t("provider.custom.models.id.label")}
                hideLabel
                placeholder={language.t("provider.custom.models.id.placeholder")}
                value={draft.id}
                onChange={(v) => setDraft("id", v)}
              />
            </div>
            <div class="flex-1">
              <TextField
                label={language.t("provider.custom.models.name.label")}
                hideLabel
                placeholder={language.t("provider.custom.models.name.placeholder")}
                value={draft.name}
                onChange={(v) => setDraft("name", v)}
              />
            </div>
            <IconButton
              type="button"
              size="large"
              variant="ghost"
              class="mb-0.5 shrink-0"
              icon={<Icon name="plus-small" />}
              onClick={addDraft}
              disabled={!draft.id.trim()}
              aria-label={language.t("provider.custom.models.add")}
            />
          </div>

          <Show when={fetched.error}>
            {(error) => <div class="text-12-regular text-v2-state-fg-danger">{error()}</div>}
          </Show>

          <Show when={fetched.loaded && fetched.models.length > 0}>
            <div class="flex flex-col gap-2 rounded-md border-[0.5px] border-v2-border-border-base p-2">
              <div class="flex items-center justify-between gap-2 px-1">
                <span class="text-12-medium text-v2-text-text-muted">
                  {language.plural("provider.custom.models.fetched", fetched.models.length, {
                    count: fetched.models.length,
                  })}
                </span>
                <Button type="button" size="small" variant="ghost" onClick={toggleAll}>
                  {language.t(allChecked() ? "provider.custom.models.deselectAll" : "provider.custom.models.selectAll")}
                </Button>
              </div>
              <div class="flex items-center gap-2 rounded-sm border-[0.5px] border-v2-border-border-base px-2">
                <Icon name="magnifying-glass" size="small" class="shrink-0 text-v2-icon-icon-muted" />
                <input
                  value={fetchedSearch()}
                  placeholder={language.t("provider.custom.models.search")}
                  aria-label={language.t("provider.custom.models.search")}
                  class="h-8 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[440] leading-5 tracking-[-0.04px] text-v2-text-text-contrast outline-none placeholder:text-v2-text-text-faint"
                  spellcheck={false}
                  autocomplete="off"
                  onInput={(event) => setFetchedSearch(event.currentTarget.value)}
                />
              </div>
              <div class="flex max-h-40 flex-col overflow-y-auto">
                <For each={visibleFetched()}>
                  {(model) => {
                    const index = () => fetched.models.findIndex((item) => item.id === model.id)
                    const disabled = () => added().has(model.id)

                    return (
                      <label
                        class="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1.5 text-13-regular text-v2-text-text-contrast hover:bg-v2-overlay-simple-overlay-hover"
                        classList={{ "opacity-50": disabled() }}
                      >
                        <input
                          type="checkbox"
                          class="size-3.5 accent-current"
                          checked={model.checked || disabled()}
                          disabled={disabled()}
                          onChange={(event) => setFetched("models", index(), "checked", event.currentTarget.checked)}
                        />
                        <span class="min-w-0 flex-1 truncate">{model.name ?? model.id}</span>
                        <Show when={model.name}>
                          <span class="min-w-0 shrink-0 truncate text-11-regular text-v2-text-text-faint">
                            {model.id}
                          </span>
                        </Show>
                      </label>
                    )
                  }}
                </For>
                <Show when={visibleFetched().length === 0}>
                  <div class="px-1 py-2 text-12-regular text-v2-text-text-faint">
                    {language.t("dialog.model.empty")}
                  </div>
                </Show>
              </div>
              <Button
                type="button"
                size="small"
                variant="contrast"
                class="self-start"
                disabled={selected().length === 0}
                onClick={addSelected}
              >
                {language.t("provider.custom.models.addSelected")}
              </Button>
            </div>
          </Show>

          <For each={form.models}>
            {(m, i) => (
              <div class="flex items-center gap-2" data-row={m.row}>
                <span class="min-w-0 flex-1 truncate text-13-regular text-v2-text-text-contrast">{m.name || m.id}</span>
                <Show when={m.name}>
                  <span class="min-w-0 shrink-0 truncate text-11-regular text-v2-text-text-faint">{m.id}</span>
                </Show>
                <IconButton
                  type="button"
                  icon={<Icon name="trash" />}
                  variant="ghost"
                  onClick={() => removeModel(i())}
                  aria-label={language.t("provider.custom.models.remove")}
                />
              </div>
            )}
          </For>
          <Show when={form.err.models}>
            {(error) => <div class="text-12-regular text-v2-state-fg-danger">{error()}</div>}
          </Show>
        </div>

        <div class="flex flex-col gap-3">
          <label class="text-12-medium text-text-weak">{language.t("provider.custom.headers.label")}</label>
          <For each={form.headers}>
            {(h, i) => (
              <div class="flex gap-2 items-start" data-row={h.row}>
                <div class="flex-1">
                  <TextField
                    label={language.t("provider.custom.headers.key.label")}
                    hideLabel
                    placeholder={language.t("provider.custom.headers.key.placeholder")}
                    value={h.key}
                    onChange={(v) => setHeader(i(), "key", v)}
                    validationState={h.err.key ? "invalid" : undefined}
                    error={h.err.key}
                  />
                </div>
                <div class="flex-1">
                  <TextField
                    label={language.t("provider.custom.headers.value.label")}
                    hideLabel
                    placeholder={language.t("provider.custom.headers.value.placeholder")}
                    value={h.value}
                    onChange={(v) => setHeader(i(), "value", v)}
                    validationState={h.err.value ? "invalid" : undefined}
                    error={h.err.value}
                  />
                </div>
                <IconButton
                  type="button"
                  icon={<Icon name="trash" />}
                  variant="ghost"
                  class="mt-1.5"
                  onClick={() => removeHeader(i())}
                  disabled={form.headers.length <= 1}
                  aria-label={language.t("provider.custom.headers.remove")}
                />
              </div>
            )}
          </For>
          <Button type="button" size="small" variant="ghost" icon="plus-small" onClick={addHeader} class="self-start">
            {language.t("provider.custom.headers.add")}
          </Button>
        </div>

        <TextField
          label={language.t("provider.custom.field.apiKey.label")}
          placeholder={language.t("provider.custom.field.apiKey.placeholder")}
          description={language.t("provider.custom.field.apiKey.description")}
          value={form.apiKey}
          onChange={(v) => setField("apiKey", v)}
        />

        <Button
          class="w-auto self-start"
          type="submit"
          size="large"
          variant="contrast"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? language.t("common.saving") : language.t("provider.custom.submit")}
        </Button>
      </form>
    </div>
  )
}

import { Button } from "@elhadry/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitleGroup } from "@elhadry/ui/dialog"
import { Icon } from "@elhadry/ui/icon"
import { Spinner } from "@elhadry/ui/spinner"
import { TextField } from "@elhadry/ui/text-field"
import { useDialog } from "@elhadry/ui/context/dialog"
import { createMemo, createSignal, Show } from "solid-js"
import { useDirectoryPicker } from "@/workspaces/selection/picker"
import { useGlobal } from "@/runtime/server/runtime"
import { useLanguage } from "@/runtime/i18n/language"
import { usePlatform } from "@/runtime/platform/platform"
import { ServerConnection } from "@/runtime/server/registry"
import { showToast } from "@/shell/notifications/toast"
import { formatServerError } from "@/runtime/server/errors"
import { cloneName, cloneTarget } from "./clone"

export function DialogCloneProject(props: { server: ServerConnection.Any; onDone?: (directory: string) => void }) {
  const dialog = useDialog()
  const language = useLanguage()
  const platform = usePlatform()
  const global = useGlobal()
  const pickDirectory = useDirectoryPicker()

  const [state, setState] = createSignal<{
    remote: string
    parent?: string
    name: string
    error?: string
    cloning: boolean
  }>({ remote: "", name: "", cloning: false })

  const directory = createMemo(() => {
    const current = state()
    const parent = current.parent

    if (!parent) return undefined

    return cloneTarget(parent, current.name.trim())
  })

  const choose = () => {
    pickDirectory({
      server: props.server,
      title: language.t("dialog.clone.parent"),
      multiple: false,
      onSelect: (result) => {
        const parent = Array.isArray(result) ? result[0] : result

        if (parent) setState((current) => ({ ...current, parent, error: undefined }))
      },
    })
  }

  const setRemote = (remote: string) => {
    setState((current) => ({
      ...current,
      remote,
      // Keep a name the user already typed; only derive it while the field is untouched.
      name: current.name || (cloneName(remote) ?? ""),
      error: undefined,
    }))
  }

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()

    const current = state()
    const target = directory()

    if (!current.remote.trim()) {
      setState((value) => ({ ...value, error: language.t("dialog.clone.remote.required") }))

      return
    }

    if (!target) {
      setState((value) => ({ ...value, error: language.t("dialog.clone.parent.required") }))

      return
    }

    setState((value) => ({ ...value, cloning: true, error: undefined }))

    try {
      await global.ensureServerCtx(props.server).sdk.api.project.clone({ remote: current.remote, directory: target })
      const context = global.ensureServerCtx(props.server)
      context.projects.open(target)
      context.projects.touch(target)
      void context.sdk.api.location
        .get({ location: { directory: target } })
        .then((value) => context.sync.child(target, { bootstrap: false })[1]("project", value.project.id))
        .catch(() => undefined)
      dialog.close()
      props.onDone?.(target)
    } catch (error) {
      setState((value) => ({
        ...value,
        cloning: false,
        error: formatServerError(error, language.t, language.t("common.requestFailed")),
      }))
      showToast({ title: language.t("common.requestFailed"), description: language.t("dialog.clone.failed") })
    }
  }

  return (
    <Dialog
      size="normal"
      fit
      class="elhadry-surface-dialog [font-family:var(--v2-font-family-sans)]"
      containerClass="!w-[min(calc(100vw-32px),520px)]"
    >
      <DialogHeader>
        <DialogTitleGroup
          title={language.t("dialog.clone.title")}
          description={language.t("dialog.clone.description")}
        />
      </DialogHeader>
      <form onSubmit={submit} class="flex min-h-0 flex-1 flex-col">
        <DialogBody class="flex flex-col gap-4 px-5 pt-1 pb-2">
          <TextField
            autofocus
            label={language.t("dialog.clone.remote")}
            placeholder="https://github.com/owner/repo"
            value={state().remote}
            onChange={setRemote}
            spellcheck={false}
          />
          <div class="flex items-end gap-2">
            <div class="min-w-0 flex-1">
              <TextField
                label={language.t("dialog.clone.parent")}
                placeholder={platform.platform === "desktop" ? undefined : "/"}
                value={state().parent ?? ""}
                onChange={(parent) => setState((value) => ({ ...value, parent, error: undefined }))}
                spellcheck={false}
              />
            </div>
            <Button type="button" size="large" variant="neutral" class="mb-0.5 shrink-0" onClick={choose}>
              <Icon name="folder" size="small" />
            </Button>
          </div>
          <TextField
            label={language.t("dialog.clone.folder")}
            value={state().name}
            onChange={(name) => setState((value) => ({ ...value, name, error: undefined }))}
            spellcheck={false}
          />
          <Show when={directory()}>
            {(target) => (
              <div class="flex min-w-0 items-center gap-1.5 px-0.5 text-12-regular text-v2-text-text-muted">
                <Icon name="folder" size="small" class="shrink-0" />
                <span class="min-w-0 truncate" dir="ltr">
                  {target()}
                </span>
              </div>
            )}
          </Show>
          <Show when={state().error}>
            {(error) => <div class="text-12-regular text-v2-state-fg-danger">{error()}</div>}
          </Show>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </Button>
          <Button type="submit" variant="neutral" disabled={state().cloning}>
            <Show when={state().cloning} fallback={language.t("dialog.clone.submit")}>
              <Spinner class="size-4" />
            </Show>
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

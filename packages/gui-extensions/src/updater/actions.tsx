import { Button } from "@elhadry/ui/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitleGroup } from "@elhadry/ui/dialog"
import { Icon } from "@elhadry/ui/icon"
import { showToast } from "@elhadry/ui/toast"
import type { DialogHandle, IpcClient, SetupContext } from "../sdk"
import type { Updater } from "./contract"
import type definition from "./index"

type Client = IpcClient<typeof Updater.spec>

type Context = SetupContext<typeof definition>

/** Restarts into the staged update. A beta build moving to stable confirms the installer download first. */
export function install(ctx: Context, client: Client) {
  const state = client.state()

  if (state?.status === "ready") {
    const version = state.version

    ctx.dialogs.open(
      (dialog) => <DialogRestart ctx={ctx} dialog={dialog} version={version} run={() => client.install()} />,
      { replace: true },
    )

    return
  }

  if (state?.status !== "download-required") return

  const download = () => client.install().catch((cause: unknown) => requestFailed(ctx, cause))

  ctx.dialogs.open(
    (dialog) => <DialogStableDownload ctx={ctx} dialog={dialog} version={state.version} download={download} />,
    { replace: true },
  )
}

/** Asks before spending bandwidth on the release the background check found. */
export function download(ctx: Context, client: Client) {
  const state = client.state()

  if (state?.status !== "available") return

  ctx.dialogs.open(
    (dialog) => (
      <DialogAvailable
        ctx={ctx}
        dialog={dialog}
        version={state.version}
        download={() => void client.download().catch((cause: unknown) => requestFailed(ctx, cause))}
      />
    ),
    { replace: true },
  )
}

export async function check(ctx: Context, client: Client) {
  const state = await client
    .check({ signal: ctx.signal })
    .catch((cause: unknown) => requestFailed(ctx, cause))

  if (!state || ctx.signal.aborted) return

  if (state.status === "download-required") {
    install(ctx, client)

    return
  }

  if (state.status === "available") {
    download(ctx, client)

    return
  }

  if (state.status === "up-to-date") {
    showToast({
      variant: "success",
      icon: () => <Icon name="circle-check" />,
      title: ctx.t("toast.latest.title"),
      description: ctx.t("toast.latest.description", { version: ctx.build.version }),
    })
  }

  if (state.status === "error") {
    showToast({ title: ctx.t("common.requestFailed"), description: state.message })
  }
}

function requestFailed(ctx: Context, cause: unknown) {
  if (ctx.signal.aborted) return

  showToast({
    title: ctx.t("common.requestFailed"),
    description: cause instanceof Error && cause.message ? cause.message : undefined,
  })
}

function DialogAvailable(props: {
  ctx: Context
  dialog: DialogHandle
  version: string
  download: () => void
}) {
  const ctx = props.ctx

  const download = () => {
    props.dialog.close()
    props.download()
  }

  return (
    <Dialog fit>
      <DialogHeader>
        <DialogTitleGroup
          title={ctx.t("dialog.available.title")}
          description={ctx.t("dialog.available.message", { version: props.version })}
        />
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="neutral" onClick={() => props.dialog.close()}>
          {ctx.t("common.cancel")}
        </Button>
        <Button type="button" variant="contrast" autofocus onClick={download}>
          {ctx.t("dialog.download")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function DialogRestart(props: { ctx: Context; dialog: DialogHandle; version: string; run: () => Promise<void> }) {
  const ctx = props.ctx

  const restart = () => {
    props.dialog.close()
    void props.run().catch((cause: unknown) => requestFailed(ctx, cause))
  }

  return (
    <Dialog fit>
      <DialogHeader>
        <DialogTitleGroup
          title={ctx.t("dialog.ready.title")}
          description={ctx.t("dialog.ready.message", { version: props.version })}
        />
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="neutral" onClick={() => props.dialog.close()}>
          {ctx.t("dialog.later")}
        </Button>
        <Button type="button" variant="contrast" autofocus onClick={restart}>
          {ctx.t("dialog.restart")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function DialogStableDownload(props: {
  ctx: Context
  dialog: DialogHandle
  version: string
  download: () => Promise<void>
}) {
  const ctx = props.ctx

  const download = () => {
    props.dialog.close()
    void props.download()
  }

  return (
    <Dialog fit>
      <DialogHeader>
        <DialogTitleGroup
          title={ctx.t("migration.title")}
          description={ctx.t("migration.description", { version: props.version })}
        />
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="neutral" onClick={() => props.dialog.close()}>
          {ctx.t("common.cancel")}
        </Button>
        <Button type="button" variant="contrast" autofocus onClick={download}>
          {ctx.t("action.download")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

import { Icon } from "@elhadry/ui/icon"
import { showToast } from "@elhadry/ui/toast"
import type { IpcClient, SetupContext } from "../sdk"
import type { Updater } from "./contract"
import type definition from "./index"

type Client = IpcClient<typeof Updater.spec>

type Context = SetupContext<typeof definition>

/** Downloads the offered release, then installs it as soon as staging finishes. */
export function download(ctx: Context, client: Client) {
  if (client.state()?.status !== "available") return

  void stage(ctx, client)
}

/** Installs the staged release, or opens the external installer for a beta migration. */
export function install(ctx: Context, client: Client) {
  const state = client.state()

  if (state?.status !== "ready" && state?.status !== "download-required") return

  void client.install({ signal: ctx.signal }).catch((cause: unknown) => requestFailed(ctx, cause))
}

/** Checks live, then downloads and installs whatever the check finds without another confirmation. */
export async function check(ctx: Context, client: Client) {
  const state = await client.check({ signal: ctx.signal }).catch((cause: unknown) => requestFailed(ctx, cause))

  if (!state || ctx.signal.aborted) return

  if (state.status === "available") {
    await stage(ctx, client)

    return
  }

  if (state.status === "ready" || state.status === "download-required") {
    install(ctx, client)

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

async function stage(ctx: Context, client: Client) {
  const state = await client
    .download({ signal: ctx.signal })
    .catch((cause: unknown) => requestFailed(ctx, cause))

  if (!state || ctx.signal.aborted) return

  if (state.status === "error") {
    showToast({ title: ctx.t("common.requestFailed"), description: state.message })

    return
  }

  if (state.status !== "ready") return

  await client.install({ signal: ctx.signal }).catch((cause: unknown) => requestFailed(ctx, cause))
}

function requestFailed(ctx: Context, cause: unknown) {
  if (ctx.signal.aborted) return

  showToast({
    title: ctx.t("common.requestFailed"),
    description: cause instanceof Error && cause.message ? cause.message : undefined,
  })
}

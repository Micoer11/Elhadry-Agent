import type { SessionMessageInfo } from "@elhadry/client/promise"
import { Tooltip } from "@elhadry/ui/tooltip"
import { For, Show, createEffect, createSignal, onCleanup, onMount, type Accessor } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"
import { useSettings } from "@/settings/model"
import { formatBytes, sessionSize } from "./session-size"

type Size = ReturnType<typeof sessionSize>

const empty: Size = { context: 0, requests: [], sent: 0 }

/** Conversation size and upload estimate for the routed session, refreshed while the agent keeps stepping. */
export function SessionSizeIndicator(props: { messages: Accessor<SessionMessageInfo[]> }) {
  const settings = useSettings()

  return (
    <Show when={settings.general.showSessionSize()}>
      <SessionSizeChip messages={props.messages} />
    </Show>
  )
}

function SessionSizeChip(props: { messages: Accessor<SessionMessageInfo[]> }) {
  const language = useLanguage()

  const [size, setSize] = createSignal(empty, {
    equals: (next, previous) => next.context === previous.context && next.sent === previous.sent,
  })

  const measure = () => setSize(sessionSize(props.messages()))

  createEffect(() => {
    props.messages()
    measure()
  })

  // Steps append to the message being streamed without replacing the list, so poll while the chip is on screen.
  onMount(() => {
    const timer = setInterval(measure, 1000)

    onCleanup(() => clearInterval(timer))
  })

  const detailRows = () => {
    const requests = size().requests
    const shown = requests.slice(-12)
    const offset = requests.length - shown.length

    return shown.map((bytes, index) => ({ index: offset + index + 1, bytes }))
  }

  return (
    <Show when={size().context > 0}>
      <Tooltip
        placement="bottom"
        gutter={6}
        contentClass="flex min-w-[200px] flex-col gap-1.5 text-[13px] leading-[var(--line-height-compact)]"
        value={
          <div class="flex flex-col gap-1.5">
            <span class="text-v2-text-text-base">{language.t("session.size.label")}</span>
            <div class="flex items-center justify-between gap-6">
              <span class="text-v2-text-text-muted">{language.t("session.size.context")}</span>
              <span class="tabular-nums text-v2-text-text-base">{formatBytes(size().context)}</span>
            </div>
            <div class="flex items-center justify-between gap-6">
              <span class="text-v2-text-text-muted">{language.t("session.size.sent")}</span>
              <span class="tabular-nums text-v2-text-text-base">{formatBytes(size().sent)}</span>
            </div>
            <div class="flex items-center justify-between gap-6">
              <span class="text-v2-text-text-muted">{language.t("session.size.requests")}</span>
              <span class="tabular-nums text-v2-text-text-base">{size().requests.length}</span>
            </div>
            <Show when={detailRows().length > 0}>
              <div class="mt-0.5 flex flex-col gap-1 border-t-0.5 border-v2-border-border-base pt-1.5">
                <For each={detailRows()}>
                  {(row) => (
                    <div class="flex items-center justify-between gap-6">
                      <span class="text-v2-text-text-muted">
                        {language.t("session.size.request", { index: row.index })}
                      </span>
                      <span class="tabular-nums text-v2-text-text-muted">{formatBytes(row.bytes)}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
            <span class="text-v2-text-text-faint">{language.t("session.size.estimate")}</span>
          </div>
        }
      >
        <button
          type="button"
          data-slot="session-size"
          class="flex shrink-0 items-center gap-1.5 rounded-[6px] px-1.5 py-1 text-[13px] font-[440] leading-[var(--line-height-compact)] tabular-nums text-v2-text-text-base transition-colors hover:bg-v2-background-bg-layer-02"
          aria-label={language.t("session.size.summary", {
            context: formatBytes(size().context),
            sent: formatBytes(size().sent),
          })}
        >
          <span>{formatBytes(size().context)}</span>
          <span class="text-v2-text-text-faint" aria-hidden>
            ·
          </span>
          <span class="text-v2-text-text-muted">{formatBytes(size().sent)}</span>
        </button>
      </Tooltip>
    </Show>
  )
}

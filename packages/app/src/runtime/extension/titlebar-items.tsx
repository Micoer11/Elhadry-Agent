import { createMemo, For, Show } from "solid-js"
import { Icon } from "@elhadry/ui/icon"
import { TitlebarItem } from "@elhadry/gui-extensions/sdk"
import { useExtensionHost } from "./host"

/** TitlebarItem contributions placed in the titlebar (the default placement). */
export function useTitlebarItems() {
  const host = useExtensionHost()

  const items = createMemo(() =>
    host.list(TitlebarItem).filter((item) => (item.placement ?? "titlebar") === "titlebar"),
  )

  // Keyed by id so a pill keeps its element (and hover state) while its item changes.
  const ids = createMemo(() => items().map((item) => item.id), undefined, {
    equals: (a, b) => a.length === b.length && a.every((id, index) => id === b[index]),
  })

  return {
    all: items,
    ids,
    item: (id: string) => items().find((item) => item.id === id),
  }
}

/** The download progress a titlebar item reports, as a thin bar along the window's top edge. */
export function TitlebarProgress(props: { items: ReturnType<typeof useTitlebarItems> }) {
  const progress = createMemo(() => {
    const item = props.items.all().find((candidate) => candidate.progress !== undefined)

    if (!item) return

    return { value: Math.min(100, Math.max(0, item.progress ?? 0)), label: item.title ?? item.label }
  })

  return (
    <Show when={progress()}>
      {(current) => (
        <div
          data-slot="titlebar-progress"
          data-indeterminate={current().value === 0 ? "true" : "false"}
          class="pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
          role="progressbar"
          aria-label={current().label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={current().value === 0 ? undefined : current().value}
        >
          <div
            data-slot="titlebar-progress-fill"
            class="h-full rounded-e-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={current().value === 0 ? undefined : { width: `${current().value}%` }}
          />
        </div>
      )}
    </Show>
  )
}

export function TitlebarItems(props: { items: ReturnType<typeof useTitlebarItems>; vertical?: boolean }) {
  return (
    <For each={props.items.ids()}>
      {(id) => (
        <Show when={props.items.item(id)}>
          {(item) => <TitlebarItemButton item={item()} vertical={props.vertical} />}
        </Show>
      )}
    </For>
  )
}

function TitlebarItemButton(props: { item: TitlebarItem; vertical?: boolean }) {
  // The label stays visible beside the icon, so the pill always says what it is about to do.
  const label = () => (
    <span class="shrink-0 whitespace-nowrap text-[11px] leading-4 text-v2-text-text-accent [font-weight:530]">
      {props.item.label}
    </span>
  )

  return (
    <div
      data-slot="titlebar-update"
      class="relative shrink-0 rounded-full bg-v2-background-bg-deep"
      classList={{
        "h-7 w-fit max-w-full self-start": props.vertical,
        "me-3 h-5": !props.vertical,
      }}
    >
      <button
        type="button"
        class="flex h-full w-full items-center gap-1 overflow-hidden rounded-full bg-v2-icon-icon-accent/20 text-v2-icon-icon-accent transition-[background-color] duration-150 ease-out hover:bg-[color-mix(in_srgb,var(--v2-icon-icon-accent)_20%,var(--v2-background-bg-deep))] focus-visible:bg-[color-mix(in_srgb,var(--v2-icon-icon-accent)_20%,var(--v2-background-bg-deep))] focus-visible:outline-none disabled:opacity-60 motion-reduce:transition-none [app-region:no-drag]"
        classList={{
          "justify-start ps-1 pe-2": props.vertical,
          "justify-center pe-1.5 ps-1": !props.vertical,
        }}
        onClick={() => props.item.run?.()}
        disabled={!!props.item.busy}
        aria-busy={!!props.item.busy}
        aria-label={props.item.title ?? props.item.label}
        aria-pressed={props.item.pressed}
      >
        <span class="flex size-5 shrink-0 items-center justify-center">
          <Show when={!props.item.busy} fallback={<span data-slot="titlebar-update-loader" aria-hidden="true" />}>
            <Show
              when={props.item.icon}
              fallback={
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 11V3M3.5 7.63128L7 11L10.5 7.63128" stroke="currentColor" />
                </svg>
              }
            >
              {(icon) => <Icon name={icon()} size="small" />}
            </Show>
          </Show>
        </span>
        {label()}
        <Show when={props.item.detail}>
          {(detail) => (
            <span class="shrink-0 whitespace-nowrap text-[11px] leading-4 tabular-nums text-v2-text-text-muted">
              {detail()}
            </span>
          )}
        </Show>
      </button>
    </div>
  )
}

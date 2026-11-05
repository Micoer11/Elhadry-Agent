import { Component, ComponentProps, createEffect, createMemo, For, JSX, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Badge } from "@elhadry/ui/badge"
import { Icon } from "@elhadry/ui/icon"
import { Menu } from "@elhadry/ui/menu"
import { Tooltip } from "@elhadry/ui/tooltip"
import { useLanguage } from "@/runtime/i18n/language"
import { ProviderModelIcon } from "./provider-group"
import { createMenuDismissController } from "@/shell/commands/menu-dismiss"
import { createEventListener } from "@solid-primitives/event-listener"
import { isFreeModel } from "./models"
import "./popover.css"
import type { ModelItem } from "./select-dialog"

type ModelSelectorTriggerProps = Omit<ComponentProps<typeof Menu.Trigger>, "as" | "ref">

export type ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => JSX.Element

const manageKey = "action:manage"

const effortLabel = (value: string | undefined) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "Default")

const surface = "overflow-hidden rounded-[22px] border-0 p-0.5 focus:outline-none"

const row =
  "flex h-8 w-full shrink-0 items-center gap-2 rounded-[10px] px-2 text-start text-[13px] font-[440] leading-compact tracking-[-0.04px] text-v2-text-text-base outline-none transition-colors hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover"

const menuRow =
  "flex h-8 w-full shrink-0 items-center gap-2 rounded-[10px] px-2.5 text-start text-[13px] font-[440] leading-compact tracking-[-0.04px] text-v2-text-text-base outline-none transition-colors hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover"

type View = "root" | "model" | "effort"

export const ModelSelectorPopoverView: Component<{
  trigger: ModelSelectorTrigger
  all: () => ModelItem[]
  models: (search: string) => ModelItem[]
  groups: (models: ModelItem[]) => { category: string; items: ModelItem[] }[]
  current: string | undefined
  auto?: boolean
  onAuto?: (value: boolean) => void
  chatgptPlan?: boolean
  select: (item: ModelItem) => void
  onManage: () => void
  onClose: () => void
  variant?: () => string | undefined
  variants?: () => string[]
  onVariant?: (value: string | undefined) => void
  optionTooltip?: (item: ModelItem) => JSX.Element
  providerIcon?: (group: { category: string; items: ModelItem[] }) => JSX.Element
  providerLabel?: (group: { category: string; items: ModelItem[] }) => string
}> = (props) => {
  const language = useLanguage()
  const [store, setStore] = createStore<{ open: boolean; view: View; search: string; active: string }>({
    open: false,
    view: "root",
    search: "",
    active: "",
  })
  let searchRef: HTMLInputElement | undefined
  let contentRef: HTMLDivElement | undefined
  const dismiss = createMenuDismissController(() => contentRef)

  const models = createMemo(() => props.models(store.search))
  const groups = createMemo(() => props.groups(models()))
  const selected = () => props.all().find((item) => `${item.provider.id}:${item.id}` === props.current)
  const effort = () => props.variant?.()
  const effortOptions = () => ["default", ...(props.variants?.() ?? [])]
  const keys = () => [...models().map(modelKey), manageKey]

  const close = (after?: () => void) => {
    dismiss.preventTriggerRestore()
    setStore({ open: false, view: "root", search: "", active: "" })
    dismiss.afterClose(() => {
      after?.()
      props.onClose()
    })
  }

  const focusSearch = () => {
    setTimeout(() =>
      requestAnimationFrame(() => {
        searchRef?.focus()
        activeItem()?.scrollIntoView({ block: "nearest" })
      }),
    )
  }

  const activeItem = () =>
    store.active ? contentRef?.querySelector<HTMLElement>(`[data-option-key="${CSS.escape(store.active)}"]`) : undefined

  const setView = (view: View) => {
    if (view === "model")
      setStore({
        view,
        search: "",
        active: selected() ? modelKey(selected()!) : models()[0] ? modelKey(models()[0]) : manageKey,
      })
    else setStore({ view, active: "" })

    if (view === "model") focusSearch()
  }

  const setOpen = (open: boolean) => {
    if (!open) {
      setStore({ open: false, view: "root", search: "", active: "" })
      dismiss.afterClose(props.onClose)

      return
    }

    dismiss.allowTriggerRestore()
    setStore({ open: true, view: "root", search: "", active: "" })
  }

  const setSearch = (value: string) => {
    const first = props.models(value)[0]
    setStore({ search: value, active: first ? modelKey(first) : manageKey })
  }

  const moveActive = (delta: number) => {
    const options = keys()

    if (options.length === 0) return

    const index = options.indexOf(store.active)
    const start = index === -1 ? 0 : index
    setStore("active", options[(start + delta + options.length) % options.length])
    queueMicrotask(() => activeItem()?.scrollIntoView({ block: "nearest" }))
  }

  const selectActive = () => {
    const item = models().find((item) => modelKey(item) === store.active)

    if (item) {
      close(() => props.select(item))

      return
    }

    if (store.active === manageKey) close(props.onManage)
  }

  createEffect(() => {
    if (!store.open) return
    createEventListener(
      document,
      "keydown",
      (event: KeyboardEvent) => {
        if (event.key !== "Escape" || event.defaultPrevented) return
        event.preventDefault()

        if (event.target === searchRef) return

        if (store.view !== "root") {
          setStore({ view: "root", search: "", active: "" })

          return
        }

        dismiss.preventTriggerRestore()
        setStore({ open: false, view: "root", search: "", active: "" })
        dismiss.afterClose(props.onClose)
      },
      true,
    )
  })

  return (
    <Menu open={store.open} modal={false} placement="top-end" gutter={8} flip={false} onOpenChange={setOpen}>
      <Menu.Trigger as={props.trigger} />
      <Menu.Portal>
        <Menu.Content
          ref={(element: HTMLDivElement) => (contentRef = element)}
          dir="ltr"
          data-slot="model-selector-menu"
          class={`${surface} shadow-[0_20px_44px_rgba(0,0,0,0.42)] ${
            store.view === "model" ? "w-[264px]" : store.view === "effort" ? "w-[160px]" : "w-[224px]"
          } max-w-[calc(100vw-16px)]`}
          onPointerDownOutside={dismiss.preventTriggerRestore}
          onFocusOutside={dismiss.preventTriggerRestore}
          onCloseAutoFocus={dismiss.onCloseAutoFocus}
        >
          <Show when={store.view === "root"}>
            <div class="flex flex-col">
              <button
                type="button"
                data-slot="model-selector-row"
                data-model-auto=""
                class={menuRow}
                aria-pressed={props.auto ? true : undefined}
                onClick={() => close(() => props.onAuto?.(!props.auto))}
              >
                <span class="w-[52px] shrink-0 text-v2-text-text-faint">{language.t("dialog.model.auto")}</span>
                <span class="min-w-0 flex-1 truncate text-end text-v2-text-text-contrast">
                  {props.auto ? language.t("dialog.model.auto.on") : language.t("dialog.model.auto.off")}
                </span>
                <Show when={props.auto}>
                  <Icon name="check" size="small" class="shrink-0 text-v2-icon-icon-base" />
                </Show>
              </button>
              <button type="button" data-slot="model-selector-row" class={menuRow} onClick={() => setView("model")}>
                <span class="w-[52px] shrink-0 text-v2-text-text-faint">Model</span>
                <span class="min-w-0 flex-1 truncate text-v2-text-text-contrast">
                  {selected()?.name ?? props.current}
                </span>
                <Show when={effort()}>
                  {(value) => (
                    <span class="shrink-0 rounded-[4px] bg-v2-background-bg-layer-03 px-1.5 py-0.5 text-[11px] font-[530] capitalize leading-4 text-v2-text-text-muted">
                      {value()}
                    </span>
                  )}
                </Show>
                <Icon name="chevron-right" size="small" class="shrink-0 text-v2-icon-icon-faint" />
              </button>
              <button type="button" data-slot="model-selector-row" class={menuRow} onClick={() => setView("effort")}>
                <span class="w-[52px] shrink-0 text-v2-text-text-faint">Effort</span>
                <span class="min-w-0 flex-1 truncate text-end text-v2-text-text-contrast">{effortLabel(effort())}</span>
                <Icon name="chevron-right" size="small" class="shrink-0 text-v2-icon-icon-faint" />
              </button>
            </div>
          </Show>

          <Show when={store.view === "model"}>
            <div class="flex flex-col">
              {/* Stays put while the list scrolls: it names the model in use, not whichever row is highlighted. */}
              <div
                data-slot="model-selector-current"
                class="flex h-9 shrink-0 items-center gap-2 border-b-[0.5px] border-v2-border-border-muted px-2.5"
              >
                <Show when={selected()?.provider}>
                  {(provider) => <ProviderModelIcon provider={provider()} class="shrink-0 text-v2-icon-icon-base" />}
                </Show>
                <span class="min-w-0 flex-1 truncate text-[12px] font-[530] leading-4 tracking-[-0.02px] text-v2-text-text-contrast">
                  {selected()?.name ?? props.current}
                </span>
                <Show when={props.auto}>
                  <span class="shrink-0 rounded-[3px] bg-v2-background-bg-layer-03 px-1 py-px text-[10px] font-[530] leading-[12px] text-v2-text-text-muted">
                    {language.t("dialog.model.auto")}
                  </span>
                </Show>
              </div>
              <div class="flex h-8 items-center gap-2 px-2.5 text-v2-icon-icon-muted">
                <Icon name="magnifying-glass" size="small" class="shrink-0" />
                <input
                  ref={(el) => (searchRef = el)}
                  value={store.search}
                  placeholder="Search models..."
                  aria-label="Search models..."
                  class="h-8 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[440] leading-5 tracking-[-0.04px] text-v2-text-text-base outline-none placeholder:text-v2-text-text-faint"
                  spellcheck={false}
                  autocorrect="off"
                  autocomplete="off"
                  autocapitalize="off"
                  onInput={(event) => setSearch(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Tab") return
                    event.stopPropagation()

                    if (event.key === "Escape") {
                      event.preventDefault()
                      setStore({ view: "root", search: "", active: "" })

                      return
                    }

                    if (event.altKey || event.metaKey) return

                    if (event.key === "ArrowDown") {
                      event.preventDefault()
                      moveActive(1)

                      return
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault()
                      moveActive(-1)

                      return
                    }

                    if (event.key === "Enter" && !event.isComposing) {
                      event.preventDefault()
                      selectActive()
                    }
                  }}
                />
                <Show when={store.search.trim()}>
                  <button
                    type="button"
                    class="flex size-5 shrink-0 items-center justify-center rounded-sm bg-transparent text-v2-icon-icon-faint transition-colors hover:text-v2-icon-icon-base"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => setSearch("")}
                    aria-label={language.t("common.clear")}
                  >
                    <Icon name="circle-xmark" />
                  </button>
                </Show>
              </div>
              <div class="my-1 h-px bg-v2-border-border-muted" />
              <div class="flex max-h-[300px] min-h-0 flex-col overflow-auto scroll-pb-[18px] no-scrollbar">
                <Show
                  when={models().length > 0}
                  fallback={
                    <div class="flex h-10 items-center px-2.5 text-[13px] font-[440] leading-5 tracking-[-0.04px] text-v2-text-text-faint">
                      {language.t("dialog.model.empty")}
                    </div>
                  }
                >
                  <For each={groups()}>
                    {(group) => (
                      <>
                        <div class="flex h-6 items-center gap-1.5 px-2.5 text-[11px] font-[530] leading-4 tracking-[0.05px] text-v2-text-text-faint">
                          {props.providerIcon?.(group)}
                          <span class="min-w-0 truncate">
                            {props.providerLabel?.(group) ?? group.items[0].provider.name}
                          </span>
                        </div>
                        <For each={group.items}>
                          {(item) => (
                            <Show when={props.optionTooltip} fallback={<ModelOption {...optionHandlers(item)} />}>
                              {(tooltip) => (
                                <Tooltip
                                  class="w-full"
                                  placement="left-start"
                                  gutter={6}
                                  openDelay={0}
                                  value={tooltip()(item)}
                                >
                                  <ModelOption {...optionHandlers(item)} />
                                </Tooltip>
                              )}
                            </Show>
                          )}
                        </For>
                      </>
                    )}
                  </For>
                </Show>
              </div>
              <div class="my-1 h-px bg-v2-border-border-muted" />
              <button
                type="button"
                data-slot="model-selector-row"
                data-option-key={manageKey}
                class={row}
                classList={{ "bg-v2-overlay-simple-overlay-hover": store.active === manageKey }}
                onMouseEnter={() => setStore("active", manageKey)}
                onClick={() => close(props.onManage)}
              >
                <Icon name="outline-sliders" size="small" />
                <span class="min-w-0 flex-1 truncate text-v2-text-text-contrast">Manage models</span>
              </button>
            </div>
          </Show>

          <Show when={store.view === "effort"}>
            <div class="flex flex-col">
              <For each={effortOptions()}>
                {(item) => {
                  const active = () =>
                    item === "default" ? effort() === undefined : effortLabel(effort()).toLowerCase() === item

                  return (
                    <button
                      type="button"
                      data-slot="model-selector-row"
                      class={row}
                      onClick={() =>
                        close(() => {
                          props.onVariant?.(item === "default" ? undefined : item)
                        })
                      }
                    >
                      <span class="min-w-0 flex-1 truncate capitalize text-v2-text-text-contrast">
                        {effortLabel(item === "default" ? undefined : item)}
                      </span>
                      <Show when={active()}>
                        <Icon name="check" size="small" class="shrink-0 text-v2-icon-icon-base" />
                      </Show>
                    </button>
                  )
                }}
              </For>
            </div>
          </Show>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  )

  function optionHandlers(item: ModelItem) {
    const key = modelKey(item)

    return {
      item,
      active: store.active === key,
      selected: props.current === key,
      onHover: () => setStore("active", key),
      onSelect: () => close(() => props.select(item)),
    }
  }
}

const modelKey = (item: ModelItem) => `${item.provider.id}:${item.id}`

const ModelOption: Component<{
  item: ModelItem
  active: boolean
  selected: boolean
  onHover: () => void
  onSelect: () => void
}> = (props) => {
  const language = useLanguage()

  return (
    <button
      type="button"
      data-slot="model-selector-row"
      data-option-key={modelKey(props.item)}
      data-selected-model={props.selected ? true : undefined}
      class={`${row} scroll-my-6`}
      classList={{ "bg-v2-overlay-simple-overlay-hover": props.active }}
      onMouseEnter={props.onHover}
      onClick={props.onSelect}
    >
      <span class="min-w-0 flex-1 truncate text-v2-text-text-contrast">{props.item.name}</span>
      <Show when={isFreeModel(props.item)}>
        <Badge class="shrink-0">{language.t("model.tag.free")}</Badge>
      </Show>
      <Show when={props.item.latest}>
        <Badge class="shrink-0">{language.t("model.tag.latest")}</Badge>
      </Show>
      <Show when={props.selected}>
        <Icon name="check" size="small" class="shrink-0 text-v2-icon-icon-base" />
      </Show>
    </button>
  )
}

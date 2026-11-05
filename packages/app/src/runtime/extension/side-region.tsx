import { For, Show, createEffect, createMemo, onCleanup, type JSX } from "solid-js"
import { createMediaQuery } from "@solid-primitives/media"
import { createEventListener } from "@solid-primitives/event-listener"
import { DragDropProvider, PointerSensor } from "@dnd-kit/solid"
import { isSortable } from "@dnd-kit/solid/sortable"
import { Accessibility, AutoScroller, Feedback, PointerActivationConstraints } from "@dnd-kit/dom"
import { RestrictToHorizontalAxis } from "@dnd-kit/abstract/modifiers"
import { RestrictToElement } from "@dnd-kit/dom/modifiers"
import { Tabs } from "@elhadry/ui/tabs"
import { IconButton } from "@elhadry/ui/icon-button"
import { Icon } from "@elhadry/ui/icon"
import { ResizeHandle } from "@elhadry/ui/resize-handle"
import { Keybind } from "@elhadry/ui/keybind"
import { Tooltip } from "@elhadry/ui/tooltip"
import { Menu } from "@elhadry/ui/menu"
import {
  MenuItem,
  type MountedSession,
  type SessionScreen,
  type PanelSidebar,
  type SessionPanelMenuItem,
} from "@elhadry/gui-extensions/sdk"
import { useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { useLayout } from "@/shell/state/layout"
import { useSessionLayout } from "@/session/session-layout"
import type { Sizing } from "@/session/helpers"
import { useExtensionHost } from "./host"
import { PanelTrigger } from "./panel-trigger"
import { RegionContent, type Region } from "./panels"
import { ExtensionSlot } from "./render"
import { createTabStripScroll } from "./tab-strip-scroll"

const FILE_TREE_WIDTH_MIN = 240

/** The side region: the tab strip with its "+" menu, the selected panel, and the inner sidebar. */
export function SideRegion(props: {
  view: MountedSession
  screen: SessionScreen
  region: Region
  sidebar: PanelSidebar
  fileTree: boolean
  present?: boolean
  size: Sizing
  stacked?: boolean
}) {
  const layout = useLayout()
  const language = useLanguage()
  const command = useCommand()
  const host = useExtensionHost()
  const { tabs, view, params } = useSessionLayout()

  const isDesktop = createMediaQuery("(min-width: 768px)")
  const tabsOpen = createMemo(() => isDesktop() && view().side.opened())
  const tabsVisible = createMemo(() => tabsOpen() || !!props.present)
  const fileOpen = createMemo(() => isDesktop() && props.fileTree)
  const open = createMemo(() => tabsOpen() || fileOpen())
  const visible = createMemo(() => tabsVisible() || fileOpen())
  // With nothing opened, the region shows the quick actions in the middle instead of the pinned fallback tab.
  const quickStart = createMemo(
    () => !fileOpen() && !props.region.keys().some((key) => !props.region.entry(key)?.tab.pinned),
  )
  const fileTreeWidth = createMemo(() => Math.max(FILE_TREE_WIDTH_MIN, layout.fileTree.width()))

  // Quick action copy and marks. The titles come from each extension so they follow the interface language.
  const quickAction = (item: SessionPanelMenuItem) => {
    if (item.keybind === "browser.open")
      return {
        title: item.title,
        description: language.t("session.panel.quick.browser"),
        icon: "chrome" as const,
        chevron: false,
        keybind: item.keybind,
      }

    if (item.keybind === "terminal.toggle")
      return {
        title: item.title,
        description: language.t("session.panel.quick.terminal"),
        icon: "terminal-prompt" as const,
        chevron: true,
        keybind: item.keybind,
      }

    return {
      title: item.title,
      description: language.t("session.panel.quick.files"),
      icon: item.icon ?? ("folder-open" as const),
      chevron: false,
      keybind: item.keybind,
    }
  }

  const panelWidth = createMemo(() => {
    if (!visible()) return "0px"

    if (tabsVisible()) return "auto"

    return `${fileTreeWidth()}px`
  })

  const treeWidth = createMemo(() => (fileOpen() ? `${fileTreeWidth()}px` : "0px"))

  const menu = createMemo(() =>
    host
      .list(MenuItem)
      .flatMap((item) => (item.menu === "session.panel" ? [item] : []))
      .toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  )

  let root: HTMLElement | undefined
  let tabList: HTMLDivElement | undefined
  let selectionEvent: Event | undefined

  createEffect(() => {
    if (open()) return
    const active = document.activeElement

    if (!(active instanceof HTMLElement)) return

    if (!root?.contains(active)) return
    active.blur()
  })

  return (
    <Show when={isDesktop() && !!params.id}>
      <aside
        ref={root}
        id="review-panel"
        tabIndex={-1}
        aria-label={language.t("session.panel.reviewAndFiles")}
        aria-hidden={!open()}
        inert={!open()}
        class="relative min-w-0 flex overflow-hidden bg-v2-background-bg-base rounded-[10px] shadow-[var(--v2-elevation-raised)] outline-none"
        classList={{
          "h-full shrink-0": !props.stacked,
          "h-full min-h-0": props.stacked,
          "pointer-events-none": !open(),
          "transition-[width] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] motion-reduce:transition-none":
            !props.size.active(),
          "flex-1": tabsVisible(),
        }}
        style={{ width: panelWidth() }}
      >
        <Show when={visible()}>
          <div
            data-slot="session-review-content"
            class="h-full flex shrink-0"
            style={{ width: "var(--session-side-content-width, 100%)" }}
          >
            <Show when={tabsVisible()}>
              <div class="relative min-w-0 h-full flex-1 overflow-hidden bg-v2-background-bg-base">
                <div class="size-full min-w-0 h-full bg-v2-background-bg-base">
                  <DragDropProvider
                    sensors={[
                      PointerSensor.configure({
                        activationConstraints: [new PointerActivationConstraints.Distance({ value: 4 })],
                        preventActivation: (event) =>
                          event.target instanceof Element &&
                          (!!event.target.closest('[data-slot="tabs-trigger-close-button"]') ||
                            !!event.target.closest(".session-review-v2-open-in-app-slot")),
                      }),
                    ]}
                    modifiers={[
                      RestrictToHorizontalAxis,
                      RestrictToElement.configure({ element: () => tabList ?? null }),
                    ]}
                    plugins={(defaults) => [
                      ...defaults.filter((plugin) => plugin !== Accessibility),
                      AutoScroller.configure({ acceleration: 8, threshold: { x: 0.05, y: 0 } }),
                      Feedback.configure({ dropAnimation: null }),
                    ]}
                    onDragEnd={(event) => {
                      const source = event.operation.source

                      if (event.canceled || !isSortable(source) || source.initialIndex === source.index) return
                      tabs().move(source.id.toString(), source.index)
                    }}
                  >
                    <Tabs
                      value={quickStart() ? "empty" : (props.region.active() ?? "empty")}
                      onChange={(value) => {
                        // Kobalte selects the first tab while triggers register, including while the
                        // "+" menu's click is still dispatching. Persist input events on a tab only; the
                        // region owns fallback selection.
                        if (
                          selectionEvent &&
                          selectionEvent.eventPhase !== Event.NONE &&
                          selectionEvent.target instanceof Element &&
                          selectionEvent.target.closest('[role="tab"]')
                        )
                          props.region.select(value)
                      }}
                    >
                      <div class="session-review-v2-tabs-bar sticky top-0 shrink-0 flex items-center">
                        <Tabs.List
                          ref={(el: HTMLDivElement) => {
                            tabList = el
                            createEventListener(
                              el,
                              ["pointerdown", "click", "keydown"],
                              (event) => (selectionEvent = event),
                              { capture: true },
                            )
                            onCleanup(createTabStripScroll({ el, lead: props.region.lead }))
                          }}
                        >
                          <div class="h-full shrink-0 sticky start-0 z-10 flex items-center justify-center bg-v2-background-bg-base">
                            <Show
                              when={menu().length > 1}
                              fallback={<Show when={menu()[0]}>{(item) => <AddButton item={item()} />}</Show>}
                            >
                              <AddMenu items={menu()} />
                            </Show>
                          </div>
                          <For each={props.region.keys()}>
                            {(key) => (
                              <Show when={props.region.entry(key)}>
                                {(entry) => (
                                  <PanelTrigger
                                    value={key}
                                    extension={entry().extension}
                                    tab={entry().tab}
                                    session={props.view}
                                    index={tabs().all().indexOf(key)}
                                    active={props.region.active() === key}
                                    preview={tabs().preview() === key}
                                    onClose={props.region.close}
                                    onPromote={(value) => void tabs().open(value)}
                                  />
                                )}
                              </Show>
                            )}
                          </For>
                        </Tabs.List>
                        <div
                          data-slot="session-side-panel-actions"
                          class="session-review-v2-open-in-app-slot h-[var(--tabs-bar-height)] shrink-0 flex items-center gap-2 pe-3"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ExtensionSlot
                            at="session.panel.end"
                            input={{
                              get session() {
                                return props.view
                              },
                              get screen() {
                                return props.screen
                              },
                            }}
                          />
                          <Show when={tabsVisible()}>
                            <div class="size-7 shrink-0" aria-hidden />
                          </Show>
                        </div>
                      </div>

                      <Show when={props.region.active() === undefined || quickStart()}>
                        <Tabs.Content value="empty" class="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden">
                          <div class="flex h-full w-full flex-1 min-h-0 items-center justify-center overflow-auto px-6 py-6">
                            <div class="flex w-full max-w-[420px] flex-col gap-2.5">
                              <For each={menu()}>
                                {(item) => (
                                  <button
                                    type="button"
                                    data-slot="session-panel-empty-action"
                                    class="group flex w-full shrink-0 items-center gap-3 rounded-[12px] border border-[var(--menu-border)] bg-[var(--menu-surface)] px-4 py-3 text-start transition-colors hover:bg-[var(--menu-hover)] focus-visible:outline-none"
                                    onClick={() => item.run()}
                                  >
                                    <Show when={quickAction(item).icon}>
                                      {(icon) => (
                                        <span class="flex size-5 shrink-0 items-center justify-center">
                                          <Icon name={icon()} size="large" />
                                        </span>
                                      )}
                                    </Show>
                                    <span class="min-w-0 flex flex-1 flex-col gap-0.5 text-start">
                                      <span class="flex min-w-0 items-center gap-1">
                                        <span class="truncate text-[16px] font-[530] leading-compact tracking-[-0.04px] text-white">
                                          {quickAction(item).title}
                                        </span>
                                        <Show when={quickAction(item).chevron}>
                                          <Icon
                                            name="chevron-down"
                                            size="small"
                                            class="shrink-0 text-v2-text-text-muted"
                                          />
                                        </Show>
                                      </span>
                                      <span class="truncate text-[11px] font-[440] leading-compact text-white/55">
                                        {quickAction(item).description}
                                      </span>
                                    </span>
                                    <Show when={item.keybind && command.keybind(item.keybind)}>
                                      {(keybind) => (
                                        <span class="shrink-0 text-[11px] font-[440] text-v2-text-text-faint">
                                          <bdi dir="ltr">{keybind()}</bdi>
                                        </span>
                                      )}
                                    </Show>
                                  </button>
                                )}
                              </For>
                            </div>
                          </div>
                        </Tabs.Content>
                      </Show>
                      <Show when={!quickStart()}>
                        <RegionContent
                          region={props.region}
                          view={props.view}
                          screen={props.screen}
                          frame={{
                            shown: tabsOpen,
                            present: tabsVisible,
                            placement: () => "side",
                            reserve: () => false,
                            animate: () => !props.size.active(),
                            sidebar: props.sidebar,
                          }}
                        />
                      </Show>
                    </Tabs>
                  </DragDropProvider>
                </div>
              </div>
            </Show>

            <Show when={fileOpen()}>
              <div
                id="file-tree-panel"
                class="relative min-w-0 h-full shrink-0 overflow-hidden"
                classList={{
                  "transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] motion-reduce:transition-none":
                    !props.size.active(),
                }}
                style={{ width: treeWidth() }}
              >
                <div
                  class="h-full flex flex-col overflow-hidden group/filetree"
                  classList={{ "border-l border-border-weaker-base": tabsOpen() }}
                >
                  <ExtensionSlot
                    at="session.panel.sidebar"
                    input={{
                      get session() {
                        return props.view
                      },
                      get screen() {
                        return props.screen
                      },
                    }}
                  />
                </div>
                <div onPointerDown={() => props.size.start()}>
                  <ResizeHandle
                    direction="horizontal"
                    edge="start"
                    size={fileTreeWidth()}
                    min={FILE_TREE_WIDTH_MIN}
                    max={480}
                    onResize={(width) => {
                      props.size.touch()
                      layout.fileTree.resize(width)
                    }}
                  />
                </div>
              </div>
            </Show>
          </div>
        </Show>
      </aside>
    </Show>
  )
}

function AddButton(props: { item: SessionPanelMenuItem }): JSX.Element {
  const command = useCommand()
  const keybind = createMemo(() => (props.item.keybind ? command.keybindParts(props.item.keybind) : []))

  return (
    <Tooltip
      value={
        <>
          {props.item.title}
          <Show when={keybind().length > 0}>
            <Keybind keys={keybind()} variant="neutral" />
          </Show>
        </>
      }
      placement="bottom"
      class="flex items-center"
    >
      <IconButton
        icon={<Icon name="plus" />}
        variant="ghost-muted"
        size="large"
        onClick={() => props.item.run()}
        aria-label={props.item.title}
      />
    </Tooltip>
  )
}

function AddMenu(props: { items: readonly SessionPanelMenuItem[] }): JSX.Element {
  const language = useLanguage()
  const command = useCommand()

  return (
    <Tooltip value={language.t("session.tab.add")} placement="bottom" class="flex items-center">
      <Menu modal={false} placement="bottom-end" gutter={4}>
        <Menu.Trigger
          as={IconButton}
          icon={<Icon name="plus" />}
          variant="ghost-muted"
          size="large"
          aria-label={language.t("session.tab.add")}
          // The tablist redirects focus entering it to the selected
          // tab, which counts as focus-outside and closes the menu.
          onPointerDown={(event: PointerEvent) => event.preventDefault()}
        />
        <Menu.Portal>
          <Menu.Content data-menu-glass class="w-[172px] rounded-[18px]">
            <For each={props.items}>
              {(item) => {
                const keybind = createMemo(() => (item.keybind ? command.keybindParts(item.keybind) : []))

                return (
                  <Menu.Item
                    class="!gap-6"
                    onSelect={() => item.run()}
                    shortcut={
                      <Show when={keybind().length > 0}>
                        <Keybind keys={keybind()} variant="neutral" />
                      </Show>
                    }
                  >
                    <div class="flex items-center gap-2">
                      <Show when={item.icon}>{(icon) => <Icon name={icon()} size="small" />}</Show>
                      <span>{item.title}</span>
                    </div>
                  </Menu.Item>
                )
              }}
            </For>
          </Menu.Content>
        </Menu.Portal>
      </Menu>
    </Tooltip>
  )
}

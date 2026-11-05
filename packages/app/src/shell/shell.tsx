import { Show, Suspense, type ParentProps } from "solid-js"
import { createStore } from "solid-js/store"
import { createMediaQuery } from "@solid-primitives/media"
import { Titlebar } from "@/shell/titlebar/titlebar"
import { usePlatform } from "@/runtime/platform/platform"
import { useLanguage } from "@/runtime/i18n/language"
import { ToastRegion } from "@/shell/notifications/toast"
import { UploadToastHost } from "@/composer/attachments/uploads"
import { TitlebarRightProvider } from "@/shell/titlebar/right-slot"
import { useSettingsSurface } from "@/settings/surface"
import { useSettings } from "@/settings/model"
import { ExtensionServerCover } from "@/runtime/extension/server-shell"
import { ExtensionSlot } from "@/runtime/extension/render"

export default function Layout(props: ParentProps) {
  const platform = usePlatform()
  const language = useLanguage()
  const settings = useSettingsSurface()
  const preferences = useSettings()
  const mobile = createMediaQuery("(max-width: 767px)")

  const [state, setState] = createStore<{ tabsMount: HTMLElement | undefined }>({
    tabsMount: undefined,
  })

  // Session tabs always live in the left sidebar on desktop; there is no layout preference.
  const verticalTabs = () => !mobile()
  const sidebarOpen = () => verticalTabs() && !preferences.general.sidebarCollapsed()
  const toggleSidebar = () => preferences.general.setSidebarCollapsed(!preferences.general.sidebarCollapsed())
  // The sidebar is pinned to the physical left edge and always lays out LTR, so Arabic copy
  // keeps its English positions while session content follows the writing direction.
  const bottomTitlebar = () => mobile() && preferences.general.mobileTitlebarPosition() === "bottom"

  return (
    <TitlebarRightProvider>
      <div
        class="relative bg-v2-background-bg-deep flex-1 min-h-0 min-w-0 flex flex-col select-none [&_input]:select-text [&_textarea]:select-text [&_[contenteditable]]:select-text"
        style={{
          // Mobile panels only need clearance for their outer border.
          "--shell-inline-inset": mobile() ? "1px" : "8px",
          // A bottom mobile titlebar leaves main's top edge to the safe area. Native Windows chrome supplies the gap;
          // retain outer-outline clearance.
          "--shell-top-inset": bottomTitlebar()
            ? "0px"
            : platform.platform === "desktop" && platform.os === "windows"
              ? "1px"
              : "8px",
          "--shell-bottom-inset": bottomTitlebar()
            ? "8px"
            : "max(0px, calc(8px - var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))))",
        }}
      >
        <Titlebar
          verticalTabs={verticalTabs() ? { mount: state.tabsMount } : undefined}
          sidebarOpen={sidebarOpen()}
          onToggleSidebar={toggleSidebar}
        />
        {/* LTR pins the sidebar to the physical left in every locale; children still mirror
            individually because each surface sets its own dir. */}
        <div dir="ltr" class="flex flex-1 min-h-0 min-w-0 flex-row">
          <Show when={sidebarOpen()}>
            <aside
              ref={(element) => setState("tabsMount", element)}
              data-slot="vertical-tabs-sidebar"
              dir="ltr"
              class="relative flex h-full min-h-0 shrink-0 flex-col bg-v2-background-bg-deep px-2 pb-[var(--shell-bottom-inset,8px)] pt-[var(--shell-top-inset,8px)]"
              style={{
                width: "268px",
                "padding-bottom": "max(10px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))",
              }}
            ></aside>
          </Show>
          {/* Size containment collapses percentage-height descendants in WebKit. */}
          <main
            dir={language.direction()}
            class="flex-1 min-h-0 min-w-0 overflow-x-hidden flex flex-col items-start contain-content bg-v2-background-bg-base"
            classList={{ "rounded-tl-[14px]": sidebarOpen() }}
            style={{
              "padding-top": bottomTitlebar() ? "env(safe-area-inset-top, 0px)" : "0px",
              "padding-bottom":
                bottomTitlebar() || settings.active()
                  ? "0px"
                  : "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))",
              "--settings-bottom-inset": bottomTitlebar()
                ? "40px"
                : "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <ExtensionServerCover>
              <Suspense>{props.children}</Suspense>
            </ExtensionServerCover>
          </main>
        </div>
        <ExtensionSlot at="window.bottom" input={{}} />
        <ToastRegion />
        <UploadToastHost />
      </div>
    </TitlebarRightProvider>
  )
}

import { Show, createMemo } from "solid-js"
import { createMediaQuery } from "@solid-primitives/media"
import { Button } from "@elhadry/ui/button"
import { Icon } from "@elhadry/ui/icon"
import { Keybind } from "@elhadry/ui/keybind"
import { ProviderModelIcon } from "@/providers/models/provider-group"
import { Tooltip } from "@elhadry/ui/tooltip"
import { ComposerEditor } from "./editor/editor"
import { ModelSelectorPopover } from "@/providers/models/select-dialog"
import { formatKeybind, useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import type { ComposerModel } from "./model"

export function Composer(props: {
  class?: string
  model: ComposerModel
  borderUnderlay?: boolean
  readOnly?: boolean
  suggestionBoundary?: () => HTMLElement | undefined
}) {
  const command = useCommand()
  const language = useLanguage()

  return (
    <div class="flex flex-col gap-3">
      <ComposerEditor
        controller={props.model}
        borderUnderlay={props.borderUnderlay}
        readOnly={props.readOnly}
        class={props.class}
        modelControlsVisible={!props.model.model.loading}
        attachKeybind={command.keybindParts("file.attach")}
        attachShortcut={command.keybind("file.attach")}
        alternateKeybind={[formatKeybind("mod", language.t), "â†µ"]}
        exitShellKeybind={[formatKeybind("esc", language.t)]}
        suggestionBoundary={props.suggestionBoundary}
        modelControl={
          <ComposerModelControl
            loading={props.model.model.loading}
            paid={props.model.model.paid}
            title={language.t("command.model.choose")}
            keybind={command.keybindParts("model.choose")}
            model={props.model.model.selection}
            provider={props.model.model.selection.current()?.provider}
            auto={props.model.model.selection.auto?.current() ?? false}
            modelName={props.model.model.selection.current()?.name ?? language.t("dialog.model.select.title")}
            onClose={props.model.restoreFocus}
          />
        }
      />
    </div>
  )
}

function ComposerModelControl(props: {
  loading: boolean
  paid: boolean
  title: string
  keybind: string[]
  model: ComposerModel["model"]["selection"]
  provider?: { id: string; canonical?: string; name: string }
  auto: boolean
  modelName: string
  onClose: () => void
}) {
  const shouldAnimate = createMemo<boolean>((previous) => previous ?? props.loading)
  const mobile = createMediaQuery("(max-width: 767px)")
  const language = useLanguage()

  const content = () => (
    <>
      <Show when={props.provider}>
        {(provider) => (
          <ProviderModelIcon
            provider={provider()}
            class="shrink-0 opacity-40 transition-opacity duration-150 group-hover:opacity-100"
          />
        )}
      </Show>
      {/* Auto names the mode; the model after it is the one currently answering. */}
      <Show when={props.auto}>
        <span
          data-slot="composer-model-auto"
          class="shrink-0 rounded-[4px] bg-v2-background-bg-layer-03 px-1.5 py-px text-[11px] font-[530] leading-4 text-v2-text-text-contrast"
        >
          {language.t("dialog.model.auto")}
        </span>
      </Show>
      <span class="truncate leading-4 text-v2-text-text-contrast">{props.modelName}</span>
      <Show when={props.model.variant.current()}>
        {(variant) => (
          <span class="shrink-0 rounded-[4px] bg-v2-background-bg-layer-03 px-1.5 py-px text-[11px] font-[530] capitalize leading-4 text-v2-text-text-muted">
            {variant()}
          </span>
        )}
      </Show>

      <span class="-ml-0.5 -mr-1 flex shrink-0">
        <Icon name="chevron-down" />
      </span>
    </>
  )

  return (
    <Show when={!props.loading}>
      <Tooltip
        inactive={mobile()}
        placement="top"
        gutter={4}
        value={
          <>
            {props.title}
            <Keybind keys={props.keybind} variant="neutral" />
          </>
        }
      >
        <ModelSelectorPopover
          model={props.model}
          unpaid={!props.paid}
          trigger={(triggerProps) => (
            <Button
              {...triggerProps}
              variant="ghost-muted"
              size="normal"
              style={{ height: "28px" }}
              class="min-w-0 max-w-[220px] justify-start ![font-weight:440] group"
              classList={{ "animate-in fade-in": shouldAnimate() }}
              data-action="composer-model"
              data-control-type={mobile() ? "drawer" : "popover"}
            >
              {content()}
            </Button>
          )}
          onClose={props.onClose}
        />
      </Tooltip>
    </Show>
  )
}

import { Show, type Component, type JSX } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"

type InputKey = "text" | "image" | "audio" | "video" | "pdf"

type InputMap = Record<InputKey, boolean>

type ModelInfo = {
  id: string
  name: string
  provider: {
    name: string
  }
  capabilities?: {
    reasoning: boolean
    input: InputMap
  }
  modalities?: {
    input: Array<string>
  }
  reasoning?: boolean
  limit: {
    context: number
  }
}

function ModelTooltipRow(props: { name: JSX.Element; value: JSX.Element }) {
  return (
    <div class="flex min-w-0 items-baseline gap-2">
      <span class="shrink-0 text-[11px] font-[440] leading-4 text-v2-text-text-faint">{props.name}</span>
      <span class="ms-auto min-w-0 truncate text-[11px] font-[530] leading-4 text-v2-text-text-base">
        {props.value}
      </span>
    </div>
  )
}

export const ModelTooltip: Component<{ model: ModelInfo; latest?: boolean; free?: boolean; v2?: boolean }> = (
  props,
) => {
  const language = useLanguage()

  const sourceName = (model: ModelInfo) => {
    const value = `${model.id} ${model.name}`.toLowerCase()

    if (/claude|anthropic/.test(value)) return language.t("model.provider.anthropic")

    if (/gpt|o[1-4]|codex|openai/.test(value)) return language.t("model.provider.openai")

    if (/gemini|palm|bard|google/.test(value)) return language.t("model.provider.google")

    if (/grok|xai/.test(value)) return language.t("model.provider.xai")

    if (/llama|meta/.test(value)) return language.t("model.provider.meta")

    return model.provider.name
  }

  const inputLabel = (value: string) => {
    if (value === "text") return language.t("model.input.text")

    if (value === "image") return language.t("model.input.image")

    if (value === "audio") return language.t("model.input.audio")

    if (value === "video") return language.t("model.input.video")

    if (value === "pdf") return language.t("model.input.pdf")

    return value
  }

  const title = () => {
    const tags: Array<string> = []

    if (props.latest) tags.push(language.t("model.tag.latest"))

    if (props.free) tags.push(language.t("model.tag.free"))
    const suffix = tags.length ? ` (${tags.join(", ")})` : ""

    return `${sourceName(props.model)} ${props.model.name}${suffix}`
  }

  const inputs = () => {
    if (props.model.capabilities) {
      const input = props.model.capabilities.input
      const order: Array<InputKey> = ["text", "image", "audio", "video", "pdf"]
      const entries = order.filter((key) => input[key]).map((key) => inputLabel(key))

      return entries.length ? entries.join(", ") : undefined
    }

    const raw = props.model.modalities?.input

    if (!raw) return
    const entries = raw.map((value) => inputLabel(value))

    return entries.length ? entries.join(", ") : undefined
  }

  const reasoning = () => {
    if (props.model.capabilities)
      return props.model.capabilities.reasoning
        ? language.t("model.tooltip.reasoning.allowed")
        : language.t("model.tooltip.reasoning.none")

    return props.model.reasoning
      ? language.t("model.tooltip.reasoning.allowed")
      : language.t("model.tooltip.reasoning.none")
  }

  const context = () => language.t("model.tooltip.context", { limit: props.model.limit.context.toLocaleString() })
  // Model cards read at a glance, so a 1,000,000 token window shows as 1M rather than as seven digits.
  const contextLimit = () => {
    const limit = props.model.limit.context
    const digits =
      limit >= 1_000_000
        ? `${Number((limit / 1_000_000).toFixed(limit % 1_000_000 === 0 ? 0 : 1))}M`
        : limit >= 1_000
          ? `${Number((limit / 1_000).toFixed(limit % 1_000 === 0 ? 0 : 1))}K`
          : limit.toLocaleString(language.intl())

    return digits
  }

  if (props.v2) {
    return (
      <div data-slot="model-tooltip" class="flex w-[184px] flex-col">
        <div class="flex min-w-0 flex-col gap-0.5">
          <div class="flex min-w-0 items-center gap-1">
            <span class="min-w-0 truncate text-[12px] font-[530] leading-text-compact tracking-[-0.02px] text-v2-text-text-contrast">
              {props.model.name}
            </span>
            <Show when={props.free}>
              <span class="shrink-0 rounded-[3px] bg-v2-grey-700 px-1 py-px text-[10px] font-[530] leading-[12px] text-v2-text-text-contrast">
                {language.t("model.tag.free")}
              </span>
            </Show>
            <Show when={props.latest}>
              <span class="shrink-0 rounded-[3px] bg-v2-grey-700 px-1 py-px text-[10px] font-[530] leading-[12px] text-v2-text-text-contrast">
                {language.t("model.tag.latest")}
              </span>
            </Show>
          </div>
          <span class="min-w-0 truncate text-[11px] font-[440] leading-4 text-v2-text-text-faint">
            {props.model.provider.name}
          </span>
        </div>
        <div class="my-2 h-px bg-v2-border-border-base" />
        <div class="flex flex-col gap-1">
          <Show when={inputs()}>
            {(value) => <ModelTooltipRow name={language.t("model.tooltip.inputs")} value={value()} />}
          </Show>
          <ModelTooltipRow name={language.t("model.tooltip.reasoning")} value={reasoning()} />
          <ModelTooltipRow name={language.t("model.tooltip.context.label")} value={contextLimit()} />
        </div>
      </div>
    )
  }

  return (
    <div class="flex flex-col gap-1 py-1">
      <div class="text-13-medium">{title()}</div>
      <Show when={inputs()}>
        {(value) => (
          <div class="text-12-regular text-text-invert-base">
            {language.t("model.tooltip.allows", { inputs: value() })}
          </div>
        )}
      </Show>
      <div class="text-12-regular text-text-invert-base">{reasoning()}</div>
      <div class="text-12-regular text-text-invert-base">{context()}</div>
    </div>
  )
}

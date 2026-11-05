import { RGBA, TextAttributes } from "@opentui/core"
import { For, type JSX } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { tint } from "../theme/color"
import { logo, mark } from "../logo"

export function Logo() {
  const theme = useTheme()
  const dimensions = useTerminalDimensions()

  const renderLine = (line: string, fg: RGBA, bold: boolean): JSX.Element[] => {
    const shadow = tint(theme.background.base, fg, 0.25)
    const attrs = bold ? TextAttributes.BOLD : undefined
    return Array.from(line).map((char) => {
      if (char === "_") {
        return (
          <text fg={fg} bg={shadow} attributes={attrs} selectable={false}>
            {" "}
          </text>
        )
      }
      if (char === "^") {
        return (
          <text fg={fg} bg={shadow} attributes={attrs} selectable={false}>
            ▀
          </text>
        )
      }
      if (char === "~") {
        return (
          <text fg={shadow} attributes={attrs} selectable={false}>
            ▀
          </text>
        )
      }
      if (char === ",") {
        return (
          <text fg={shadow} attributes={attrs} selectable={false}>
            ▄
          </text>
        )
      }
      return (
        <text fg={fg} attributes={attrs} selectable={false}>
          {char}
        </text>
      )
    })
  }

  const leftWidth = logo.left[0].length
  const rightWidth = logo.right[0].length
  const combined = leftWidth + 1 + rightWidth

  return (
    <box>
      {dimensions().height < 12 ? null : dimensions().width < leftWidth ? (
        <For each={mark}>
          {(line) => <box flexDirection="row">{renderLine(line, theme.text.base, true)}</box>}
        </For>
      ) : (
        <box flexDirection="row" gap={2} alignItems="center">
          <box>
            <For each={mark}>
              {(line) => <box flexDirection="row">{renderLine(line, theme.text.action.primary.selected, true)}</box>}
            </For>
          </box>
          <box>
            {dimensions().width < combined ? (
              <For each={logo.left}>
                {(line) => <box flexDirection="row">{renderLine(line, theme.text.base, true)}</box>}
              </For>
            ) : (
              <For each={logo.left}>
                {(line, index) => (
                  <box flexDirection="row" gap={2}>
                    <box flexDirection="row">{renderLine(line, theme.text.muted, false)}</box>
                    <box flexDirection="row">{renderLine(logo.right[index()], theme.text.base, true)}</box>
                  </box>
                )}
              </For>
            )}
          </box>
        </box>
      )}
    </box>
  )
}

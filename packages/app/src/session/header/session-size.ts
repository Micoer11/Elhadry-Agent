import type { SessionMessageInfo } from "@elhadry/client/promise"

type AssistantContent = Extract<SessionMessageInfo, { type: "assistant" }>["content"][number]

/**
 * Characters stand in for UTF-8 bytes: exact for base64 attachment payloads and a slight underestimate for non-ASCII
 * prose, which is close enough for a payload whose bulk is JSON-encoded attachments and tool output.
 */
function textBytes(value: string | undefined) {
  return value?.length ?? 0
}

/** One assistant content part, including the serialized tool state the provider echoes back on the next step. */
function partBytes(part: AssistantContent) {
  if (part.type === "text" || part.type === "reasoning") return textBytes(part.text)

  const state = part.state
  const stateBytes = state.status === "streaming" ? textBytes(state.input) : JSON.stringify(state).length

  return textBytes(part.name) + stateBytes
}

function messageBytes(message: SessionMessageInfo) {
  if (message.type === "assistant") {
    return message.content.reduce((total, part) => total + partBytes(part), 0)
  }

  if (message.type === "user") {
    const files = message.files?.reduce((total, file) => total + textBytes(file.data) + textBytes(file.name), 0) ?? 0

    return textBytes(message.text) + files
  }

  // System, synthetic, skill, shell and idle rows are small; their serialized form is accurate enough to include.
  return JSON.stringify(message).length
}

/**
 * Every step uploads the whole projected conversation, so a reply starts with the payload that preceded it and each
 * tool call inside it forces one more upload of everything produced so far.
 */
export function sessionSize(messages: SessionMessageInfo[]) {
  let context = 0
  const requests: number[] = []

  for (const message of messages) {
    if (message.type !== "assistant") {
      context += messageBytes(message)

      continue
    }

    let produced = 0

    requests.push(context)

    for (const part of message.content) {
      produced += partBytes(part)

      if (part.type === "tool") requests.push(context + produced)
    }

    context += produced
  }

  return { context, requests, sent: requests.reduce((total, bytes) => total + bytes, 0) }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`

  const units = ["KB", "MB", "GB", "TB"]
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length)
  const value = bytes / 1024 ** power

  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[power - 1]}`
}

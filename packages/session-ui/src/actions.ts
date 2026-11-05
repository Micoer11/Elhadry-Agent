import type { PromptFileAttachment } from "@elhadry/client/promise"

export type SessionUserComment =
  | {
      type?: "file"
      path: string
      comment: string
      selection?: {
        startLine: number
        endLine: number
      }
    }
  | {
      /** A comment on something other than file lines, such as an element picked in a page. */
      type: "note"
      comment: string
      label: string
      icon: string
    }

/** An attachment delivered to the model as a path on the server instead of inline bytes. */
export type SessionUserAttachmentReference = {
  name: string
  mime: string
  path: string
}

export type SessionUserActions = {
  openAttachment?: (file: PromptFileAttachment) => void
  revert?: (input: { sessionID: string; messageID: string }) => Promise<void> | void
  /** Permanently deletes a user message together with every message projected in its turn. */
  removeMessage?: (input: { sessionID: string; messageID: string }) => Promise<void> | void
  /** Permanently deletes attachments from a delivered user message by their position in `message.files`. */
  removeAttachments?: (input: { sessionID: string; messageID: string; indexes: number[] }) => Promise<void> | void
  /**
   * An input the server has not delivered yet. Like the TUI, a pending steer can move to the queue or be deleted;
   * it shows as waiting only while `steering` behind delivered work or `stranded` by an execution that ended.
   */
  pending?: {
    status: (messageID: string) => "starting" | "steering" | "stranded" | "queued" | undefined
    queue: (input: { sessionID: string; messageID: string }) => Promise<void>
    remove: (input: { sessionID: string; messageID: string }) => Promise<void>
  }
}

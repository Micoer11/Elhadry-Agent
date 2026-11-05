export * as SessionMessageEdit from "./message-edit.js"

import { and, asc, eq, gte } from "drizzle-orm"
import { Effect } from "effect"
import type { SessionMessage } from "@elhadry/schema/session-message"
import { Bus } from "../bus.js"
import { Database } from "../database/database.js"
import { MessageNotFoundError } from "./error.js"
import { SessionEvent } from "./event.js"
import type { SessionSchema } from "./schema.js"
import { SessionMessageTable } from "./sql.js"

/** Remove one user turn: the user message plus every message projected before the next turn starts. */
export const removeTurn = Effect.fn("SessionMessageEdit.removeTurn")(function* (input: {
  sessionID: SessionSchema.ID
  messageID: SessionMessage.ID
}) {
  const db = (yield* Database.Service).db
  const bus = yield* Bus.Service
  const anchor = yield* db
    .select({ id: SessionMessageTable.id, seq: SessionMessageTable.seq, type: SessionMessageTable.type })
    .from(SessionMessageTable)
    .where(and(eq(SessionMessageTable.session_id, input.sessionID), eq(SessionMessageTable.id, input.messageID)))
    .get()
    .pipe(Effect.orDie)
  if (anchor?.type !== "user") return yield* new MessageNotFoundError(input)
  const rest = yield* db
    .select({ id: SessionMessageTable.id, type: SessionMessageTable.type })
    .from(SessionMessageTable)
    .where(and(eq(SessionMessageTable.session_id, input.sessionID), gte(SessionMessageTable.seq, anchor.seq)))
    .orderBy(asc(SessionMessageTable.seq))
    .all()
    .pipe(Effect.orDie)
  // Idle rows keep the following turn's spacing, so they stay. A user row always opens the next turn.
  const messageIDs = [anchor.id]
  for (const row of rest) {
    if (row.id === anchor.id) continue
    if (row.type === "user" || row.type === "idle") break
    messageIDs.push(row.id)
  }
  yield* bus.publish(SessionEvent.MessageRemoved, { sessionID: input.sessionID, messageIDs })
})

/** Drop attachments from one user message without touching its text, the reply, or the rest of the turn. */
export const removeFiles = Effect.fn("SessionMessageEdit.removeFiles")(function* (input: {
  sessionID: SessionSchema.ID
  messageID: SessionMessage.ID
  indexes: ReadonlyArray<number>
}) {
  const db = (yield* Database.Service).db
  const bus = yield* Bus.Service
  const row = yield* db
    .select({ type: SessionMessageTable.type, data: SessionMessageTable.data })
    .from(SessionMessageTable)
    .where(and(eq(SessionMessageTable.session_id, input.sessionID), eq(SessionMessageTable.id, input.messageID)))
    .get()
    .pipe(Effect.orDie)
  if (!row) return yield* new MessageNotFoundError(input)
  if (row.type !== "user") return
  const files = (row.data as { files?: ReadonlyArray<unknown> }).files
  if (!files || files.length === 0) return
  const indexes = Array.from(new Set(input.indexes))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < files.length)
    .sort((a, b) => a - b)
  if (indexes.length === 0) return
  yield* bus.publish(SessionEvent.MessageFilesRemoved, {
    sessionID: input.sessionID,
    messageID: input.messageID,
    indexes,
  })
})

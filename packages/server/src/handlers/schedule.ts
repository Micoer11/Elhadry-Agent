import { Permission } from "@elhadry/core/permission"
import { Schedule } from "@elhadry/core/schedule"
import type { Session } from "@elhadry/core/session"
import { ForbiddenError, InvalidRequestError, ScheduleNotFoundError } from "@elhadry/protocol/errors"
import type { CreatePayload } from "@elhadry/protocol/groups/schedule"
import { Effect } from "effect"
import { HttpApiSchema } from "effect/http-api"
import { missingSession } from "./session-error"

/** `schedule.*` in the `server.experimental` group. Every route needs experimental.schedules where the Session lives. */
export const makeSchedule = Effect.gen(function* () {
  const schedules = yield* Schedule.Service

  const allowed = (sessionID: Session.ID) =>
    schedules.enabled(sessionID).pipe(
      Effect.mapError(missingSession),
      Effect.flatMap((enabled) => (enabled ? Effect.void : Effect.fail(disabled()))),
    )

  // A schedule whose Session is gone, or whose location has the flag off, reads as missing or forbidden like the rest.
  const find = (id: Schedule.ID) =>
    Effect.gen(function* () {
      const info = yield* schedules.get(id).pipe(Effect.mapError(missingSchedule))
      if (info.sessionID === undefined) return yield* missingSchedule({ scheduleID: id })
      yield* allowed(info.sessionID).pipe(
        Effect.catchTag("SessionNotFoundError", () => Effect.fail(missingSchedule({ scheduleID: id }))),
      )
      return info
    })

  return {
    create: (payload: CreatePayload) =>
      // Stateless HTTP callers have no guaranteed UI listener to answer an interactive ask, so settle asks unattended.
      schedules.create(Schedule.toCreateInput(payload.sessionID, payload)).pipe(
        Effect.provideService(Permission.Unattended, []),
        Effect.map((data) => ({ data })),
        Effect.catchTags({
          "Schedule.InvalidError": (error) =>
            Effect.fail(new InvalidRequestError({ message: error.message, kind: "schedule" })),
          "Schedule.DisabledError": () => Effect.fail(disabled()),
          "Permission.BlockedError": (error) => Effect.fail(new ForbiddenError({ message: error.message })),
          "Permission.CorrectedError": (error) => Effect.fail(new ForbiddenError({ message: error.feedback })),
          "Session.NotFoundError": (error) => Effect.fail(missingSession(error)),
        }),
      ),
    list: (sessionID?: Session.ID) => {
      if (sessionID !== undefined)
        return allowed(sessionID).pipe(
          Effect.andThen(schedules.list({ sessionID })),
          Effect.map((data) => ({ data })),
        )
      // The app lists every schedule at once. A schedule is visible only while its own location still allows schedules.
      return schedules.list().pipe(
        Effect.flatMap((all) =>
          Effect.forEach(all, (info) =>
            info.sessionID === undefined
              ? Effect.succeed(undefined)
              : allowed(info.sessionID).pipe(
                  Effect.as(info),
                  Effect.catch(() => Effect.succeed(undefined)),
                ),
          ),
        ),
        Effect.map((items) => ({
          data: items.filter((item): item is Schedule.Info => item !== undefined),
        })),
      )
    },
    get: (id: Schedule.ID) => find(id).pipe(Effect.map((data) => ({ data }))),
    pause: (id: Schedule.ID) =>
      find(id).pipe(
        Effect.andThen(schedules.pause(id).pipe(Effect.mapError(missingSchedule))),
        Effect.map((data) => ({ data })),
      ),
    resume: (id: Schedule.ID) =>
      find(id).pipe(
        Effect.andThen(schedules.resume(id).pipe(Effect.mapError(missingSchedule))),
        Effect.map((data) => ({ data })),
      ),
    remove: (id: Schedule.ID) =>
      find(id).pipe(
        Effect.andThen(schedules.remove(id).pipe(Effect.mapError(missingSchedule))),
        Effect.as(HttpApiSchema.NoContent.make()),
      ),
  }
})

function missingSchedule(error: { readonly scheduleID: Schedule.ID }) {
  return new ScheduleNotFoundError({ scheduleID: error.scheduleID, message: `Schedule not found: ${error.scheduleID}` })
}

function disabled() {
  return new ForbiddenError({ message: new Schedule.DisabledError().message })
}

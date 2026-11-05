import { Project } from "@elhadry/core/project"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../api"
import { InvalidRequestError, ProjectNotFoundError } from "@elhadry/protocol/errors"

export const ProjectHandler = HttpApiBuilder.group(Api, "server.project", (handlers) =>
  handlers
    .handle("project.list", (ctx) => Project.Service.use((project) => project.list(ctx.query)))
    .handle("project.clone", (ctx) =>
      Project.Service.use((project) =>
        project
          .clone(ctx.payload)
          .pipe(Effect.mapError((error) => new InvalidRequestError({ message: error.message, kind: "clone" }))),
      ),
    )
    .handle("project.update", (ctx) =>
      Project.Service.use((project) =>
        project.update({ ...ctx.payload, projectID: ctx.params.projectID }).pipe(
          Effect.mapError(
            () =>
              new ProjectNotFoundError({
                projectID: ctx.params.projectID,
                message: `Project not found: ${ctx.params.projectID}`,
              }),
          ),
        ),
      ),
    ),
)

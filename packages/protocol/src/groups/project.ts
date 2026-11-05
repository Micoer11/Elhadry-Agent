import { Project } from "@elhadry/schema/project"
import { Schema, SchemaGetter, Struct } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api"
import { InvalidRequestError, ProjectNotFoundError } from "../errors.js"
import { AbsolutePath } from "@elhadry/schema/schema"

const root = "/api/project"
const UpdatePayload = Schema.Struct(Struct.omit(Project.UpdateInput.fields, ["projectID"]))
const ClonePayload = Schema.Struct({
  /** Any Git remote URL, including a GitHub repository page or clone URL. */
  remote: Schema.String,
  /** Absolute destination path; the clone is written directly into it. */
  directory: AbsolutePath,
  branch: Schema.optional(Schema.String),
}).annotate({ identifier: "Project.CloneInput" })
const BooleanFromString = Schema.Literals(["true", "false"]).pipe(
  Schema.decodeTo(Schema.Boolean, {
    decode: SchemaGetter.transform((value) => value === "true"),
    encode: SchemaGetter.transform((value): "true" | "false" => (value ? "true" : "false")),
  }),
)

export const ProjectGroup = HttpApiGroup.make("server.project")
  .add(
    HttpApiEndpoint.get("project.list", root, {
      query: Schema.Struct({ archived: BooleanFromString.pipe(Schema.optional) }),
      success: Schema.Array(Project.Info),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "project.list",
        summary: "List projects",
        description: "List known projects. Archived projects are excluded unless archived=true.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.patch("project.update", `${root}/:projectID`, {
      params: { projectID: Project.ID },
      payload: UpdatePayload,
      success: Project.Info,
      error: ProjectNotFoundError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "project.update",
        summary: "Update project",
        description: "Update the project canonical directory, display metadata, and workspace commands.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("project.clone", "/api/project/clone", {
      payload: ClonePayload,
      success: Project.Info,
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "project.clone",
        summary: "Clone project",
        description: "Clone a Git remote into a new directory and register it as a project.",
      }),
    ),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "project",
      description: "Project routes.",
    }),
  )

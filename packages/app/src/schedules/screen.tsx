import { For, Show } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { Button } from "@elhadry/ui/button"
import { Icon } from "@elhadry/ui/icon"
import { IconButton } from "@elhadry/ui/icon-button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@elhadry/ui/dialog"
import { useDialog } from "@elhadry/ui/context/dialog"
import { Spinner } from "@elhadry/ui/spinner"
import { useLanguage } from "@/runtime/i18n/language"
import { useGlobal } from "@/runtime/server/runtime"
import { ServerConnection } from "@/runtime/server/registry"
import { useLayout } from "@/shell/state/layout"
import { sessionHref } from "@/shell/routes/session"
import { useSchedulesController, type ScheduleEntry } from "./controller"
import { DialogSchedule } from "./dialog"
import { formatDateTime, formatWhen, outcomeKey, scheduleTitle, statusKey } from "./format"
import "./schedules.css"

export function SchedulesScreen() {
  const language = useLanguage()
  const layout = useLayout()
  const global = useGlobal()
  const dialog = useDialog()
  const navigate = useNavigate()
  const controller = useSchedulesController({ global, layout, language })

  const openForm = () => dialog.push(() => <DialogSchedule controller={controller} />)

  const confirmDelete = (entry: ScheduleEntry) => {
    dialog.push(() => <DialogDelete entry={entry} controller={controller} />)
  }

  const openSession = (entry: ScheduleEntry) => {
    const connection = controller.connection()
    if (!connection || !entry.info.sessionID) return
    navigate(sessionHref(ServerConnection.key(connection), entry.info.sessionID))
  }

  const summary = (value: string) =>
    value
      .split(/\n{2,}/)
      .filter(Boolean)
      .at(-1) ?? value

  return (
    <div class="schedules-screen">
      <section class="schedules-panel" aria-labelledby="schedules-title">
        <header class="schedules-header">
          <div class="schedules-heading">
            <h1 id="schedules-title">{language.t("schedules.title")}</h1>
            <div class="schedules-summary">
              <span>{language.t("schedules.taskCount", { count: controller.state.rows.length })}</span>
            </div>
          </div>

          <div class="schedules-header-actions">
            <IconButton
              type="button"
              variant="ghost-muted"
              size="large"
              icon={<Icon name="refresh" size="small" />}
              aria-label={language.t("schedules.refresh")}
              onClick={() => void controller.load(true)}
            />
            <Button icon="plus" variant="neutral" class="schedules-primary" onClick={openForm}>
              {language.t("schedules.new")}
            </Button>
          </div>
        </header>

        <div class="schedules-body">
          <Show when={controller.state.error}>
            {(error) => (
              <div class="schedules-message" role="alert">
                <p>{error()}</p>
                <Button variant="ghost" size="small" onClick={() => void controller.load()}>
                  {language.t("schedules.retry")}
                </Button>
              </div>
            )}
          </Show>

          <Show
            when={!controller.state.loading}
            fallback={
              <div class="schedules-message">
                <Spinner class="size-5" />
                <p>{language.t("schedules.loading")}</p>
              </div>
            }
          >
            <Show
              when={controller.state.rows.length > 0}
              fallback={
                <Show when={!controller.state.error}>
                  <div class="schedules-empty">
                    <span class="schedules-empty-icon">
                      <Icon name="outline-rotate-clockwise" size="large" />
                    </span>
                    <h2>{language.t("schedules.empty.title")}</h2>
                    <p>{language.t("schedules.empty.description")}</p>
                    <Button icon="plus" variant="neutral" class="schedules-primary" onClick={openForm}>
                      {language.t("schedules.empty.action")}
                    </Button>
                  </div>
                </Show>
              }
            >
              <For each={controller.state.rows}>
                {(entry) => (
                  <article class="schedules-card">
                    <div class="schedules-card-top">
                      <div class="schedules-card-title">
                        <span class="schedules-card-icon">
                          <Icon name="outline-rotate-clockwise" size="small" />
                        </span>
                        <span class="truncate">{scheduleTitle(entry.info, language)}</span>
                      </div>
                      <span class="schedules-status" data-status={entry.info.status}>
                        {language.t(statusKey(entry.info.status))}
                      </span>
                    </div>

                    <p class="schedules-card-prompt">{summary(entry.info.action.prompt)}</p>

                    <div class="schedules-card-meta">
                      <span class="schedules-meta-item">{formatWhen(entry.info.when, language)}</span>
                      <Show when={entry.info.nextDueAt}>
                        {(next) => (
                          <span class="schedules-meta-item">
                            {language.t("schedules.next", {
                              time: formatDateTime(next(), language, entry.info.tz),
                            })}
                          </span>
                        )}
                      </Show>
                      <Show when={entry.info.lastFiredAt}>
                        {(last) => (
                          <span class="schedules-meta-item">
                            {language.t("schedules.last", {
                              time: formatDateTime(last(), language, entry.info.tz),
                            })}
                            <Show when={entry.info.lastOutcome}>
                              {(outcome) => <> · {language.t(outcomeKey(outcome()))}</>}
                            </Show>
                          </span>
                        )}
                      </Show>
                      <span class="schedules-meta-item">
                        {language.t("schedules.runs", { count: entry.info.runCount })}
                      </span>
                    </div>

                    <div class="schedules-card-context">
                      <Show when={entry.session}>
                        {(session) => (
                          <>
                            <span>
                              {language.t("schedules.project", {
                                project: controller.projectName(session().location.directory),
                              })}
                            </span>
                            <span dir="auto">
                              {language.t("schedules.session", {
                                session: session().title || language.t("schedules.sessionTitle"),
                              })}
                            </span>
                          </>
                        )}
                      </Show>
                      <Show when={entry.info.action.model}>
                        {(model) => (
                          <span dir="auto">
                            {language.t("schedules.model", { model: controller.modelLabel(model()) })}
                          </span>
                        )}
                      </Show>
                    </div>

                    <div class="schedules-card-actions">
                      <Show when={entry.info.sessionID}>
                        <Button
                          size="small"
                          variant="neutral"
                          icon="fill-triangle-down"
                          onClick={() => void controller.runNow(entry)}
                        >
                          {language.t("schedules.runNow")}
                        </Button>
                      </Show>
                      <Show
                        when={entry.info.status === "paused"}
                        fallback={
                          <Show when={entry.info.status === "active"}>
                            <Button
                              size="small"
                              variant="ghost"
                              icon="archive"
                              onClick={() => void controller.pause(entry)}
                            >
                              {language.t("schedules.pause")}
                            </Button>
                          </Show>
                        }
                      >
                        <Button
                          size="small"
                          variant="ghost"
                          icon="refresh"
                          onClick={() => void controller.resume(entry)}
                        >
                          {language.t("schedules.resume")}
                        </Button>
                      </Show>
                      <Show when={entry.info.sessionID}>
                        <Button
                          size="small"
                          variant="ghost"
                          icon="outline-arrow-up-right"
                          onClick={() => openSession(entry)}
                        >
                          {language.t("schedules.open")}
                        </Button>
                      </Show>
                      <Button
                        size="small"
                        variant="ghost"
                        icon="trash"
                        class="schedules-delete"
                        onClick={() => confirmDelete(entry)}
                      >
                        {language.t("schedules.delete")}
                      </Button>
                    </div>
                  </article>
                )}
              </For>

              <p class="schedules-agent-hint">{language.t("schedules.agentHint")}</p>
            </Show>
          </Show>
        </div>
      </section>
    </div>
  )
}

function DialogDelete(props: { entry: ScheduleEntry; controller: ReturnType<typeof useSchedulesController> }) {
  const language = useLanguage()
  const dialog = useDialog()

  return (
    <Dialog size="normal" fit containerClass="!w-[min(calc(100vw-32px),420px)]">
      <DialogHeader>
        <DialogTitle>{language.t("schedules.delete.title")}</DialogTitle>
      </DialogHeader>
      <DialogBody class="px-5 pb-2 pt-1 text-13-regular text-v2-text-text-muted">
        {language.t("schedules.delete.description")}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => dialog.close()}>
          {language.t("common.cancel")}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            void props.controller.remove(props.entry)
            dialog.close()
          }}
        >
          {language.t("schedules.delete.confirm")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

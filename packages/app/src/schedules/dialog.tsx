import { createEffect, createMemo, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@elhadry/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitleGroup } from "@elhadry/ui/dialog"
import { useDialog } from "@elhadry/ui/context/dialog"
import { Select } from "@elhadry/ui/select"
import { Spinner } from "@elhadry/ui/spinner"
import { TextField } from "@elhadry/ui/text-field"
import { useLanguage } from "@/runtime/i18n/language"
import { formatServerError } from "@/runtime/server/errors"
import { showToast } from "@/shell/notifications/toast"
import type { CreateScheduleInput, useSchedulesController } from "./controller"
import { weekdayName } from "./format"

type Controller = ReturnType<typeof useSchedulesController>

type Repeat = "once" | "daily" | "weekly" | "monthly" | "interval" | "cron"
type IntervalUnit = "minutes" | "hours" | "days"
type EndsMode = "never" | "times" | "date"

const pad = (value: number) => String(value).padStart(2, "0")

function dateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function taskPrompt(name: string, description: string) {
  const title = name.trim()

  return [
    title ? `[Scheduled task: ${title}]` : "[Scheduled task]",
    "You are running a scheduled task. The user may not be present, so do not ask questions or wait for confirmation. Make reasonable assumptions, complete the task end to end, then reply with a short summary of the result.",
    description.trim(),
  ].join("\n\n")
}

export function DialogSchedule(props: { controller: Controller }) {
  const language = useLanguage()
  const dialog = useDialog()

  const [store, setStore] = createStore({
    name: "",
    prompt: "",
    directory: "",
    model: "",
    repeat: "daily" as Repeat,
    date: dateInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    time: "09:00",
    weekday: "1",
    monthDay: "1",
    intervalValue: "1",
    intervalUnit: "hours" as IntervalUnit,
    cron: "0 9 * * 1-5",
    ends: "never" as EndsMode,
    endTimes: "3",
    endDate: dateInput(new Date()),
    endTime: "23:59",
    error: "",
    creating: false,
  })

  createEffect(() => {
    const directory = props.controller.defaultDirectory()
    if (!store.directory && directory) setStore("directory", directory)
  })

  createEffect(() => {
    if (store.directory) void props.controller.loadModels(store.directory)
  })

  createEffect(() => {
    const items = props.controller.modelState.items
    if (props.controller.modelState.directory !== store.directory) return
    if (store.model || items.length === 0) return

    const preferred = props.controller.modelState.preferred
    const key = preferred
      ? `${preferred.providerID}:${preferred.id}`
      : `${items[0].providerID}:${items[0].id}`
    if (items.some((item) => `${item.providerID}:${item.id}` === key)) setStore("model", key)
  })

  const projectOptions = createMemo(() =>
    props.controller.projects().map((project) => ({
      value: project.worktree,
      label: props.controller.projectName(project.worktree),
    })),
  )

  const currentProject = createMemo(() => projectOptions().find((item) => item.value === store.directory))

  const modelOptions = createMemo(() =>
    props.controller.modelState.items.map((model) => ({
      value: `${model.providerID}:${model.id}`,
      label: model.name,
    })),
  )

  const currentModel = createMemo(() => modelOptions().find((item) => item.value === store.model))

  const selectedModel = () => {
    const at = store.model.indexOf(":")
    if (at <= 0) return undefined
    return { providerID: store.model.slice(0, at), id: store.model.slice(at + 1) }
  }

  const repeatOptions = createMemo(() => [
    { value: "once" as const, label: language.t("schedules.form.repeat.once") },
    { value: "daily" as const, label: language.t("schedules.form.repeat.daily") },
    { value: "weekly" as const, label: language.t("schedules.form.repeat.weekly") },
    { value: "monthly" as const, label: language.t("schedules.form.repeat.monthly") },
    { value: "interval" as const, label: language.t("schedules.form.repeat.interval") },
    { value: "cron" as const, label: language.t("schedules.form.repeat.cron") },
  ])

  const currentRepeat = createMemo(() => repeatOptions().find((item) => item.value === store.repeat))

  const weekdayOptions = createMemo(() =>
    Array.from({ length: 7 }, (_, index) => ({
      value: String(index),
      label: weekdayName(index, language.locale()),
    })),
  )

  const currentWeekday = createMemo(() => weekdayOptions().find((item) => item.value === store.weekday))

  const unitOptions = createMemo(() => [
    { value: "minutes" as const, label: language.t("schedules.form.unit.minutes") },
    { value: "hours" as const, label: language.t("schedules.form.unit.hours") },
    { value: "days" as const, label: language.t("schedules.form.unit.days") },
  ])

  const currentUnit = createMemo(() => unitOptions().find((item) => item.value === store.intervalUnit))

  const endsOptions = createMemo(() => [
    { value: "never" as const, label: language.t("schedules.form.ends.never") },
    { value: "times" as const, label: language.t("schedules.form.ends.times") },
    { value: "date" as const, label: language.t("schedules.form.ends.date") },
  ])

  const currentEnds = createMemo(() => endsOptions().find((item) => item.value === store.ends))

  const parseClock = (value: string) => {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return

    const hour = Number(match[1])
    const minute = Number(match[2])
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return
    return { hour, minute, text: `${pad(hour)}:${pad(minute)}` }
  }

  const clock = () => parseClock(store.time)

  const parseDate = (value: string) => {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(year, month - 1, day)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return
    return { date, text: `${match[1]}-${match[2]}-${match[3]}` }
  }

  const build = (): { value?: Omit<CreateScheduleInput, "name" | "prompt" | "directory">; error?: string } => {
    const description = store.prompt.trim()
    if (!description) return { error: language.t("schedules.form.required") }
    if (!store.directory) return { error: language.t("schedules.form.projectRequired") }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const now = Date.now()
    const time = clock()

    if (store.repeat !== "interval" && store.repeat !== "cron" && !time)
      return { error: language.t("schedules.form.dateRequired") }

    let when: NonNullable<CreateScheduleInput["when"]>

    switch (store.repeat) {
      case "once": {
        const date = parseDate(store.date)
        if (!date || !time) return { error: language.t("schedules.form.dateRequired") }
        const at = new Date(`${date.text}T${time.text}`)
        if (Number.isNaN(at.getTime())) return { error: language.t("schedules.form.dateRequired") }
        if (at.getTime() <= now) return { error: language.t("schedules.form.future") }
        when = { at: `${date.text}T${time.text}`, tz }
        break
      }
      case "daily": {
        when = { cron: `${time!.minute} ${time!.hour} * * *`, tz }
        break
      }
      case "weekly": {
        when = { cron: `${time!.minute} ${time!.hour} * * ${store.weekday}`, tz }
        break
      }
      case "monthly": {
        when = { cron: `${time!.minute} ${time!.hour} ${store.monthDay} * *`, tz }
        break
      }
      case "interval": {
        const amount = Number(store.intervalValue)
        if (!Number.isInteger(amount) || amount < 1) return { error: language.t("schedules.form.intervalInvalid") }
        if (store.intervalUnit === "minutes" && amount < 1)
          return { error: language.t("schedules.form.intervalInvalid") }
        const unit = store.intervalUnit.slice(0, -1)
        when = { every: `${amount} ${unit}`, tz }
        break
      }
      case "cron": {
        if (store.cron.trim().split(/\s+/).length !== 5) return { error: language.t("schedules.form.cronInvalid") }
        when = { cron: store.cron.trim(), tz }
        break
      }
    }

    let ends: CreateScheduleInput["ends"]

    if (store.ends === "times") {
      const times = Number(store.endTimes)
      if (!Number.isInteger(times) || times < 1) return { error: language.t("schedules.form.endInvalid") }
      ends = { times }
    }

    if (store.ends === "date") {
      const date = parseDate(store.endDate)
      const time = store.endTime.trim() ? parseClock(store.endTime) : { text: "23:59" }
      if (!date || !time) return { error: language.t("schedules.form.endInvalid") }
      const at = new Date(`${date.text}T${time.text}`)
      if (Number.isNaN(at.getTime()) || at.getTime() <= now) return { error: language.t("schedules.form.endInvalid") }
      ends = { at: `${date.text}T${time.text}` }
    }

    return { value: { when, ends } }
  }

  const submit = async () => {
    const result = build()
    if (!result.value) {
      setStore("error", result.error ?? language.t("schedules.form.required"))
      return
    }

    setStore({ creating: true, error: "" })

    try {
      await props.controller.create({
        name: store.name,
        prompt: taskPrompt(store.name, store.prompt),
        directory: store.directory,
        when: result.value.when,
        ends: result.value.ends,
        model: selectedModel(),
      })
      showToast({
        title: language.t("schedules.toast.created"),
        description: language.t("schedules.toast.created.description"),
      })
      dialog.close()
    } catch (error) {
      setStore({ creating: false, error: formatServerError(error, language.t, language.t("schedules.toast.failed")) })
    }
  }

  return (
    <Dialog
      size="normal"
      fit
      class="elhadry-surface-dialog [font-family:var(--v2-font-family-sans)]"
      containerClass="!w-[min(calc(100vw-32px),560px)]"
    >
      <DialogHeader>
        <DialogTitleGroup title={language.t("schedules.form.title")} />
      </DialogHeader>
      <DialogBody class="flex max-h-[min(70vh,640px)] flex-col gap-4 overflow-y-auto px-5 pb-2 pt-1">
        <TextField
          label={language.t("schedules.form.name")}
          placeholder={language.t("schedules.form.name.placeholder")}
          value={store.name}
          onChange={(value) => setStore({ name: value, error: "" })}
        />
        <TextField
          multiline
          label={language.t("schedules.form.prompt")}
          placeholder={language.t("schedules.form.prompt.placeholder")}
          value={store.prompt}
          onChange={(value) => setStore({ prompt: value, error: "" })}
          class="min-h-24"
        />

        <div class="schedules-form-field">
          <span class="schedules-form-label">{language.t("schedules.form.project")}</span>
          <Select
            options={projectOptions()}
            current={currentProject()}
            value={(item) => item.value}
            label={(item) => item.label}
            placeholder={language.t("schedules.form.projectRequired")}
            onSelect={(item) => item && setStore({ directory: item.value, model: "", error: "" })}
          />
        </div>

        <div class="schedules-form-field">
          <span class="schedules-form-label">{language.t("schedules.form.model")}</span>
          <Select
            options={modelOptions()}
            current={currentModel()}
            value={(item) => item.value}
            label={(item) => item.label}
            placeholder={language.t("schedules.form.model.placeholder")}
            onSelect={(item) => item && setStore({ model: item.value, error: "" })}
          />
          <span class="schedules-form-hint">{language.t("schedules.form.model.hint")}</span>
        </div>

        <div class="schedules-form-grid">
          <div class="schedules-form-field">
            <span class="schedules-form-label">{language.t("schedules.form.repeat")}</span>
            <Select
              options={repeatOptions()}
              current={currentRepeat()}
              value={(item) => item.value}
              label={(item) => item.label}
              onSelect={(item) => item && setStore({ repeat: item.value, error: "" })}
            />
          </div>

          <Show when={store.repeat === "once"}>
            <TextField
              type="text"
              label={language.t("schedules.form.date")}
              description={language.t("schedules.form.date.hint")}
              placeholder="2026-11-02"
              value={store.date}
              onChange={(value) => setStore({ date: value, error: "" })}
              spellcheck={false}
            />
          </Show>

          <Show when={store.repeat === "weekly"}>
            <div class="schedules-form-field">
              <span class="schedules-form-label">{language.t("schedules.form.weekday")}</span>
              <Select
                options={weekdayOptions()}
                current={currentWeekday()}
                value={(item) => item.value}
                label={(item) => item.label}
                onSelect={(item) => item && setStore("weekday", item.value)}
              />
            </div>
          </Show>

          <Show when={store.repeat === "monthly"}>
            <TextField
              type="number"
              min={1}
              max={31}
              label={language.t("schedules.form.monthDay")}
              value={store.monthDay}
              onChange={(value) => setStore("monthDay", value)}
            />
          </Show>

          <Show when={store.repeat !== "interval" && store.repeat !== "cron"}>
            <TextField
              type="text"
              label={language.t("schedules.form.time")}
              description={language.t("schedules.form.time.hint")}
              placeholder="09:00"
              value={store.time}
              onChange={(value) => setStore({ time: value, error: "" })}
              spellcheck={false}
            />
          </Show>

          <Show when={store.repeat === "interval"}>
            <TextField
              type="number"
              min={1}
              label={language.t("schedules.form.every")}
              value={store.intervalValue}
              onChange={(value) => setStore({ intervalValue: value, error: "" })}
            />
            <div class="schedules-form-field">
              <span class="schedules-form-label">{language.t("schedules.form.every")}</span>
              <Select
                options={unitOptions()}
                current={currentUnit()}
                value={(item) => item.value}
                label={(item) => item.label}
                onSelect={(item) => item && setStore("intervalUnit", item.value)}
              />
            </div>
          </Show>

          <Show when={store.repeat === "cron"}>
            <div class="schedules-form-field schedules-form-wide">
              <TextField
                label={language.t("schedules.form.cron")}
                description={language.t("schedules.form.cron.hint")}
                placeholder={language.t("schedules.form.cron.placeholder")}
                value={store.cron}
                onChange={(value) => setStore({ cron: value, error: "" })}
                spellcheck={false}
              />
            </div>
          </Show>
        </div>

        <div class="schedules-form-grid">
          <div class="schedules-form-field">
            <span class="schedules-form-label">{language.t("schedules.form.ends")}</span>
            <Select
              options={endsOptions()}
              current={currentEnds()}
              value={(item) => item.value}
              label={(item) => item.label}
              onSelect={(item) => item && setStore({ ends: item.value, error: "" })}
            />
          </div>

          <Show when={store.ends === "times"}>
            <TextField
              type="number"
              min={1}
              label={language.t("schedules.form.ends.timesField")}
              value={store.endTimes}
              onChange={(value) => setStore({ endTimes: value, error: "" })}
            />
          </Show>

          <Show when={store.ends === "date"}>
            <TextField
              type="text"
              label={language.t("schedules.form.ends.dateField")}
              description={language.t("schedules.form.date.hint")}
              placeholder="2026-11-02"
              value={store.endDate}
              onChange={(value) => setStore({ endDate: value, error: "" })}
              spellcheck={false}
            />
            <TextField
              type="text"
              label={language.t("schedules.form.time")}
              description={language.t("schedules.form.time.hint")}
              placeholder="23:59"
              value={store.endTime}
              onChange={(value) => setStore({ endTime: value, error: "" })}
              spellcheck={false}
            />
          </Show>
        </div>

        <p class="schedules-form-note">{language.t("schedules.form.automation")}</p>
        <p class="schedules-form-note schedules-form-note-muted">{language.t("schedules.form.agentNote")}</p>

        <Show when={store.error}>
          {(error) => <div class="text-12-regular text-v2-state-fg-danger">{error()}</div>}
        </Show>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => dialog.close()}>
          {language.t("common.cancel")}
        </Button>
        <Button type="button" variant="neutral" disabled={store.creating} onClick={() => void submit()}>
          <Show when={store.creating} fallback={language.t("schedules.form.submit")}>
            <Spinner class="size-4" />
          </Show>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

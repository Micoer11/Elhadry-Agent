import type { ScheduleInfo, ScheduleOutcome, ScheduleStatus, ScheduleWhen } from "@elhadry/client/promise"
import type { useLanguage } from "@/runtime/i18n/language"

type Language = ReturnType<typeof useLanguage>

const statusKeys = {
  active: "schedules.status.active",
  paused: "schedules.status.paused",
  done: "schedules.status.done",
} as const

const outcomeKeys = {
  fired: "schedules.outcome.fired",
  late: "schedules.outcome.late",
  checked: "schedules.outcome.checked",
  expired: "schedules.outcome.expired",
  skipped: "schedules.outcome.skipped",
  disabled: "schedules.outcome.disabled",
  failed: "schedules.outcome.failed",
} as const

export function statusKey(status: ScheduleStatus) {
  return statusKeys[status]
}

export function outcomeKey(outcome: ScheduleOutcome) {
  return outcomeKeys[outcome]
}

const durationUnits = {
  second: "seconds",
  minute: "minutes",
  hour: "hours",
  day: "days",
  week: "weeks",
} as const

type DurationUnit = (typeof durationUnits)[keyof typeof durationUnits]
type DurationParts = Partial<Record<DurationUnit, number>>

function durationParts(value: string): DurationParts | undefined {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(second|minute|hour|day|week)s?$/i)
  if (!match) return

  const unit = durationUnits[match[2].toLowerCase() as keyof typeof durationUnits]
  const amount = Number(match[1])

  if (!unit || !Number.isFinite(amount) || amount <= 0) return
  return { [unit]: amount }
}

/** Localizes an Effect duration such as "90 seconds" with the locale's own plural rules. */
export function formatDuration(value: string, locale: string) {
  const parts = durationParts(value)
  if (!parts) return value

  const DurationFormat = (
    Intl as unknown as {
      DurationFormat?: new (
        locale: string,
        options?: { style?: "long" | "short" | "narrow" },
      ) => { format(input: DurationParts): string }
    }
  ).DurationFormat

  if (!DurationFormat) return value
  try {
    return new DurationFormat(locale, { style: "long" }).format(parts)
  } catch {
    return value
  }
}

function formatClock(hour: number, minute: number, locale: string) {
  const date = new Date(2024, 0, 1, Math.min(hour, 23), Math.min(minute, 59))

  return new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(date)
}

export function weekdayName(index: number, locale: string) {
  // 2024-01-07 is a Sunday, which matches cron's day-of-week numbering.
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(2024, 0, 7 + index))
}

function formatCron(cron: string, language: Language) {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return language.t("schedules.when.cron", { cron })

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  const clock =
    /^\d+$/.test(minute) && /^\d+$/.test(hour)
      ? formatClock(Number(hour), Number(minute), language.locale())
      : undefined

  if (clock && dayOfMonth === "*" && month === "*" && dayOfWeek === "*")
    return language.t("schedules.when.daily", { time: clock })

  if (clock && dayOfMonth === "*" && month === "*" && /^\d$/.test(dayOfWeek))
    return language.t("schedules.when.weekly", {
      day: weekdayName(Number(dayOfWeek), language.locale()),
      time: clock,
    })

  if (clock && /^\d+$/.test(dayOfMonth) && month === "*" && dayOfWeek === "*")
    return language.t("schedules.when.monthly", { day: dayOfMonth, time: clock })

  return language.t("schedules.when.cron", { cron })
}

export function formatWhen(when: ScheduleWhen, language: Language) {
  switch (when.type) {
    case "in":
      return language.t("schedules.when.in", { duration: formatDuration(when.in, language.locale()) })
    case "at":
      return language.t("schedules.when.at", { time: formatDateTime(when.at, language, when.tz) })
    case "every":
      return language.t("schedules.when.every", { duration: formatDuration(when.every, language.locale()) })
    case "cron":
      return formatCron(when.cron, language)
  }
}

export function formatDateTime(value: number | string | undefined, language: Language, timeZone?: string) {
  if (value === undefined) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  try {
    return new Intl.DateTimeFormat(language.locale(), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat(language.locale(), { dateStyle: "medium", timeStyle: "short" }).format(date)
  }
}

export function scheduleTitle(info: ScheduleInfo, language: Language) {
  const name = info.name?.trim()
  if (name) return name

  const prompt = info.action.prompt.replace(/\s+/g, " ").trim()
  return prompt.length > 48 ? `${prompt.slice(0, 47)}…` : prompt || language.t("schedules.title")
}

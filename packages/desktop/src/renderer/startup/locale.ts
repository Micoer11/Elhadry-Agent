import { defaultLocale, loadLocaleDict, normalizeLocale, type Locale, type Platform } from "@elhadry/app/desktop"
import { storedLocaleValue } from "./locale-value"

// The stored language lives in the main process's SQLite store, behind the IPC port. A copy of the
// last answer in localStorage lets the shell mount without waiting for the port; the store is still
// asked every launch and the copy refreshed, and the language provider hydrates from the store
// itself, so a stale copy costs one visible switch, not a wrong language.
const cacheKey = "elhadry.desktop.language"

export async function preloadStoredLocale(platform: Platform) {
  const fresh = Promise.resolve(platform.storage?.("elhadry.global.dat").getItem("language")).then(
    (raw) => {
      localStorage.setItem(cacheKey, raw ?? "")

      return raw
    },
    () => undefined,
  )

  const cached = localStorage.getItem(cacheKey)
  // A fresh profile has nothing stored yet: start in the default language rather than waiting for
  // the language provider, so the splash and the first render are already in that language.
  const locale = storedLocale(cached ?? (await fresh)) ?? defaultLocale

  if (locale === "en") return locale

  return loadLocaleDict(locale).then(
    () => locale,
    () => "en" as const,
  )
}

export function storedLocale(raw: string | null | undefined): Locale | undefined {
  const locale = storedLocaleValue(raw)

  if (!locale) return

  return normalizeLocale(locale)
}

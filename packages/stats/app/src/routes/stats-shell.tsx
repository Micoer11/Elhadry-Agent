import opencodeWordmarkDark from "../asset/logo-ornate-dark.svg"
import { query } from "@solidjs/router"
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useI18n } from "../context/i18n"
import { useLanguage } from "../context/language"
import { route, type Locale } from "../lib/language"

export type HeaderLink = { href: string; label: string }

export const githubLink = {
  href: "https://github.com/anomalyco/opencode",
  apiHref: "https://api.github.com/repos/anomalyco/opencode",
  fallbackStars: "220K",
}
export const themePreferences = ["dark", "light", "system"] as const
export const themeStorageKey = "opencode:stats-theme"
export type ThemePreference = (typeof themePreferences)[number]

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 0,
  roundingIncrement: 5,
})

export const getGitHubStars = query(async () => {
  "use server"
  return fetch(githubLink.apiHref, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "opencode-stats",
    },
  })
    .then((response) => (response.ok ? response.json() : undefined))
    .then((body: unknown) =>
      body && typeof body === "object" && "stargazers_count" in body && typeof body.stargazers_count === "number"
        ? compactNumberFormatter.format(body.stargazers_count)
        : githubLink.fallbackStars,
    )
    .catch(() => githubLink.fallbackStars)
}, "getGitHubStars")

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system"
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof document === "undefined") return
  document.documentElement.dataset.statsTheme = preference
  if (preference === "system") {
    document.documentElement.style.removeProperty("color-scheme")
    return
  }
  document.documentElement.style.setProperty("color-scheme", preference)
}

export function Header(props: { githubStars: string; links?: readonly HeaderLink[]; brandHref?: string }) {
  const i18n = useI18n()
  const language = useLanguage()
  const [menuOpen, setMenuOpen] = createSignal(false)
  const [menuViewport, setMenuViewport] = createSignal(false)
  const links = createMemo(
    () =>
      props.links ?? [
        { href: "#top-models", label: i18n.t("nav.topModels") },
        { href: "#leaderboard", label: i18n.t("nav.leaderboard") },
        { href: "#session-cost", label: i18n.t("nav.sessionCost") },
        { href: "#token-cost", label: i18n.t("nav.tokenCost") },
        { href: "#cache-ratio", label: i18n.t("nav.cacheRatio") },
        { href: "#market-share", label: i18n.t("nav.marketShare") },
        { href: "#geo-breakdown", label: i18n.t("nav.geoBreakdown") },
      ],
  )
  const localHref = (href: string) => (href.startsWith("/") ? language.route(href) : href)

  createEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia("(max-width: 89.999rem)")
    const update = () => setMenuViewport(media.matches)
    update()
    media.addEventListener("change", update)
    onCleanup(() => media.removeEventListener("change", update))
  })

  createEffect(() => {
    if (!menuOpen()) return
    if (!menuViewport()) return
    if (typeof document === "undefined") return
    const page = document.querySelector<HTMLElement>('[data-page="stats"]')
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const htmlOverflow = document.documentElement.style.overflow
    const pagePaddingRight = page?.style.paddingRight
    const bodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = "hidden"
    if (scrollbarWidth > 0 && page) page.style.paddingRight = `${scrollbarWidth}px`
    document.body.style.overflow = "hidden"
    onCleanup(() => {
      document.documentElement.style.overflow = htmlOverflow
      if (page && pagePaddingRight !== undefined) page.style.paddingRight = pagePaddingRight
      document.body.style.overflow = bodyOverflow
    })
  })

  return (
    <header data-component="top" data-menu-open={menuOpen() ? "true" : undefined}>
      <div data-slot="header-bar">
        <a
          data-slot="brand"
          href={localHref(props.brandHref ?? import.meta.env.BASE_URL)}
          aria-label={i18n.t("header.brandLabel")}
        >
          <DataWordmark />
        </a>
        <nav data-component="section-nav" aria-label={i18n.t("header.sectionNavLabel")}>
          <ul>
            <For each={links()}>
              {(link) => (
                <li>
                  <a href={localHref(link.href)}>{link.label}</a>
                </li>
              )}
            </For>
          </ul>
        </nav>
        <div data-slot="header-actions">
          <a
            data-slot="header-button"
            data-variant="neutral"
            href={githubLink.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${i18n.t("header.githubAria")} (${props.githubStars} stars)`}
          >
            <strong>{i18n.t("header.github")}</strong>
            <span>[{props.githubStars}]</span>
          </a>
          <a data-slot="header-button" data-variant="contrast" href="https://elhadry.ai/">
            <strong>{i18n.t("header.tryElhadryAgent")}</strong>
          </a>
          <button
            data-slot="menu-button"
            type="button"
            aria-controls="stats-mobile-nav"
            aria-expanded={menuOpen() ? "true" : "false"}
            aria-label={menuOpen() ? i18n.t("header.closeNav") : i18n.t("header.openNav")}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <Show when={menuOpen()} fallback={<path d="M2 4.72H14M2 8.5H14M2 12.28H14" stroke="currentColor" />}>
                <path d="M4.44 4.44L11.56 11.56M11.56 4.44L4.44 11.56" stroke="currentColor" />
              </Show>
            </svg>
          </button>
        </div>
      </div>
      <nav
        id="stats-mobile-nav"
        data-slot="mobile-menu"
        aria-label={i18n.t("header.sectionNavLabel")}
        hidden={!menuOpen()}
      >
        <a
          data-slot="mobile-menu-item"
          data-variant="github"
          href={githubLink.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${i18n.t("header.githubAria")} (${props.githubStars} stars)`}
        >
          <strong>{i18n.t("header.github")}</strong>
          <span>[{props.githubStars}]</span>
        </a>
        <For each={links()}>
          {(link) => (
            <a data-slot="mobile-menu-item" href={localHref(link.href)} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          )}
        </For>
      </nav>
    </header>
  )
}

function DataWordmark() {
  return (
    <svg data-slot="stats-wordmark" width="66" height="20" viewBox="0 0 66 20" fill="none" aria-hidden="true">
      <path opacity="0.2" d="M12 16H4V8H12V16Z" fill="currentColor" />
      <path d="M12 4H4V16H12V4ZM16 20H0V0H16V20Z" fill="currentColor" />
      <path
        d="M63.3543 16L62.5119 12.8711H58.6437L57.8013 16H55.7383L59.2454 4H61.9618L65.4689 16H63.3543ZM61.0678 7.851L60.6896 5.94269H60.4489L60.0707 7.851L59.1595 11.1347H61.9962L61.0678 7.851Z"
        fill="currentColor"
      />
      <path d="M52.5951 5.87392V16H50.4461V5.87392H47.4375V4H55.6209V5.87392H52.5951Z" fill="currentColor" />
      <path
        d="M45.2059 16L44.3635 12.8711H40.4953L39.6529 16H37.5898L41.097 4H43.8133L47.3205 16H45.2059ZM42.9194 7.851L42.5411 5.94269H42.3004L41.9222 7.851L41.011 11.1347H43.8477L42.9194 7.851Z"
        fill="currentColor"
      />
      <path
        d="M28 4H32.0917C32.8138 4 33.4556 4.11461 34.0172 4.34384C34.5903 4.5616 35.0716 4.9169 35.4613 5.40974C35.8625 5.89112 36.1662 6.51003 36.3725 7.26648C36.5788 8.02292 36.6819 8.9341 36.6819 10C36.6819 11.0659 36.5788 11.9771 36.3725 12.7335C36.1662 13.49 35.8625 14.1146 35.4613 14.6075C35.0716 15.0888 34.5903 15.4441 34.0172 15.6734C33.4556 15.8911 32.8138 16 32.0917 16H28V4ZM32.0917 14.1261C32.8252 14.1261 33.3926 13.9026 33.7937 13.4556C34.1948 12.9971 34.3954 12.3152 34.3954 11.4097V8.59026C34.3954 7.68481 34.1948 7.0086 33.7937 6.5616C33.3926 6.10315 32.8252 5.87392 32.0917 5.87392H30.149V14.1261H32.0917Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ElhadryMark() {
  return (
    <svg data-slot="opencode-mark" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M40 40H0V0H40V40Z" fill="var(--stats-logo-bg)" />
      <g transform="translate(6.6 6.6) scale(0.268)">
        <path d="M40.16 17.75C40.05 19.04 40.47 15.92 40.78 14.81C40.47 15.92 41.37 12.58 42.02 11.09C41.37 12.58 43.98 7.03 44.65 5.81C43.98 7.03 45.43 4.55 46.05 3.80C45.43 4.55 47.65 1.94 48.37 1.32C47.65 1.94 49.87 0.28 50.39 0.08C49.87 0.28 51.19 -0.03 51.47 0.08C51.19 -0.03 51.83 -0.28 52.09 0.70C51.83 -0.28 52.53 4.08 53.02 5.97C52.53 4.08 54.32 10.21 55.04 12.02C54.32 10.21 56.49 15.25 57.36 16.82C56.49 15.25 59.12 19.84 60.31 21.47C59.12 19.84 63.10 25.04 64.50 26.59C63.10 25.04 67.11 29.35 68.68 30.78C67.11 29.35 72.02 33.70 73.95 35.12L80.31 39.30L76.74 39.61C78.09 39.35 73.77 40.28 72.25 40.85C73.77 40.28 68.89 42.30 67.60 43.02C68.89 42.30 65.76 45.06 64.50 45.19C65.76 45.06 61.60 44.44 60.00 43.80C61.60 44.44 56.33 42.12 54.88 41.32C56.33 42.12 52.43 39.79 51.32 38.99C52.43 39.79 49.17 37.36 48.22 36.51C49.17 37.36 46.43 34.86 45.58 33.88C46.43 34.86 43.77 31.65 43.10 30.62C43.77 31.65 41.99 28.73 41.55 27.67C41.99 28.73 40.70 25.12 40.47 24.26C40.70 25.12 40.21 23.64 40.16 22.56C40.21 23.64 40.05 19.04 40.16 17.75ZM4.34 48.29C4.26 48.55 3.85 48.14 4.81 47.67C3.85 48.14 7.98 46.51 10.08 45.50C7.98 46.51 14.91 43.13 17.36 41.63C14.91 43.13 22.82 38.01 24.81 36.51C22.82 38.01 28.04 33.80 29.30 32.64C28.04 33.80 31.42 30.59 32.40 29.53C31.42 30.59 34.34 27.36 35.19 26.28L37.52 23.02L38.14 27.05C37.83 25.84 38.86 29.22 39.38 30.31C38.86 29.22 40.54 32.56 41.24 33.57L43.57 36.36L41.71 40.39C42.22 39.38 41.06 41.58 40.47 42.40C41.06 41.58 39.15 44.26 38.14 45.35C39.15 44.26 35.63 47.91 34.42 48.91C35.63 47.91 32.22 50.62 30.85 51.40C32.22 50.62 27.83 53.00 26.20 53.57C27.83 53.00 22.74 54.57 21.09 54.81C22.74 54.57 17.80 55.06 16.28 54.96C17.80 55.06 13.31 54.57 11.94 54.19C13.31 54.57 9.22 53.28 8.06 52.64C9.22 53.28 5.58 50.88 4.96 50.31C5.58 50.88 4.44 49.56 4.34 49.22C4.44 49.56 4.26 48.55 4.34 48.29ZM51.78 63.49C51.58 64.01 52.40 61.83 53.02 60.70C52.40 61.83 54.70 57.83 55.50 56.67C54.70 57.83 56.87 54.78 57.83 53.72C56.87 54.78 59.79 51.52 61.24 50.31C59.79 51.52 64.68 47.55 66.51 46.43C64.68 47.55 70.80 44.26 72.25 43.64C70.80 44.26 74.08 42.97 75.19 42.71C74.08 42.97 77.52 42.20 78.91 42.09C77.52 42.20 82.40 42.04 83.57 42.09C82.40 42.04 84.83 42.14 85.89 42.40C84.83 42.14 88.79 43.20 89.92 43.64C88.79 43.20 91.96 44.60 92.71 45.04C91.96 44.60 93.90 45.79 94.42 46.28C93.90 45.79 95.58 47.49 95.81 47.98C95.58 47.49 95.87 48.94 95.81 49.22C95.87 48.94 96.61 49.20 95.50 49.69C96.61 49.20 91.14 51.29 89.15 52.17C91.14 51.29 85.45 53.90 83.57 54.96C85.45 53.90 79.66 57.26 77.83 58.53C79.66 57.26 73.95 61.42 72.56 62.56C73.95 61.42 70.88 63.93 69.46 65.35C70.88 63.93 65.56 69.33 64.03 71.09C65.56 69.33 61.32 74.50 60.31 75.89L57.98 79.46L57.52 75.43C57.75 76.67 57.11 73.36 56.59 72.02C57.11 73.36 55.22 68.73 54.42 67.36C55.22 68.73 52.22 64.44 51.78 63.80C52.22 64.44 51.58 64.01 51.78 63.49ZM17.83 57.44L21.86 57.29C20.59 57.44 24.32 56.82 25.43 56.51C24.32 56.82 27.44 55.89 28.53 55.43C27.44 55.89 31.29 54.01 31.94 53.72C31.29 54.01 31.19 53.20 32.40 53.72C31.19 53.20 37.52 55.94 39.22 56.82C37.52 55.94 41.58 58.24 42.64 58.99C41.58 58.24 44.55 60.39 45.58 61.32C44.55 60.39 48.01 63.67 48.84 64.57C48.01 63.67 49.92 65.84 50.54 66.74C49.92 65.84 51.91 68.66 52.56 70.00C51.91 68.66 53.98 73.23 54.42 74.81C53.98 73.23 55.06 78.09 55.19 79.46C55.06 78.09 55.35 81.55 55.19 83.02C55.35 81.55 54.70 86.61 54.26 88.29C54.70 86.61 53.20 91.65 52.56 93.10C53.20 91.65 51.14 95.92 50.39 96.98C51.14 95.92 48.58 98.97 48.06 99.46C48.58 98.97 47.57 99.82 47.29 99.92C47.57 99.82 46.67 100.18 46.36 100.08C46.67 100.18 45.71 100.28 45.43 99.30C45.71 100.28 45.12 96.15 44.65 94.19C45.12 96.15 43.46 89.72 42.64 87.52C43.46 89.72 40.75 83.02 39.69 81.01C40.75 83.02 37.65 77.36 36.28 75.43C37.65 77.36 33.13 71.24 31.47 69.38C33.13 71.24 28.63 66.25 26.36 64.26L17.83 57.44Z" fill="var(--stats-logo-stroke)" />
      </g>
    </svg>
  )
}

export function Footer(props: {
  themePreference: ThemePreference
  onThemePreferenceChange: (preference: ThemePreference) => void
  links?: readonly HeaderLink[]
  bridge?: HeaderLink | null
}) {
  const i18n = useI18n()
  const language = useLanguage()
  const [subscribeOpen, setSubscribeOpen] = createSignal(false)
  const localHref = (href: string) => (href.startsWith("/") ? language.route(href) : href)
  const modelStats = props.links ?? [
    { href: "#top-models", label: i18n.t("nav.topModels") },
    { href: "#leaderboard", label: i18n.t("nav.leaderboard") },
    { href: "#session-cost", label: i18n.t("nav.sessionCost") },
    { href: "#token-cost", label: i18n.t("nav.tokenCost") },
    { href: "#cache-ratio", label: i18n.t("nav.cacheRatio") },
    { href: "#market-share", label: i18n.t("nav.marketShare") },
    { href: "#geo-breakdown", label: i18n.t("nav.geoBreakdown") },
    { href: "#methodology", label: i18n.t("methodology.title") },
  ]
  const legal = [
    { href: "https://elhadry.ai/legal/terms-of-service", label: i18n.t("footer.terms") },
    { href: "https://elhadry.ai/legal/privacy-policy", label: i18n.t("footer.privacy") },
  ]
  const connect = [
    { href: "mailto:hello@elhadry.ai", label: i18n.t("footer.contact") },
    { href: "https://elhadry.ai/discord", label: i18n.t("footer.community") },
    { href: "https://x.com/opencode", label: "X" },
    { href: githubLink.href, label: i18n.t("header.github") },
    { href: "https://www.youtube.com/@anomalyco", label: i18n.t("footer.youtube") },
  ]
  const bridge = () =>
    props.bridge === undefined
      ? { href: "#geo-breakdown", label: i18n.t("nav.geoBreakdown").toUpperCase() }
      : props.bridge

  return (
    <footer data-component="footer">
      <Show when={bridge()}>{(link) => <SectionBridge label={link().label} href={link().href} />}</Show>
      <div data-slot="footer-grid">
        <a data-slot="footer-mark" href="https://elhadry.ai" aria-label={i18n.t("footer.homeAria")}>
          <ElhadryMark />
        </a>
        <FooterColumn title={i18n.t("footer.modelData")} links={modelStats} localHref={localHref} />
        <FooterColumn title={i18n.t("footer.legal")} links={legal} localHref={localHref} />
        <FooterColumn title={i18n.t("footer.connect")} links={connect} localHref={localHref} />
        <div data-slot="footer-column">
          <h2>{i18n.t("footer.newsletter")}</h2>
          <p>{i18n.t("footer.newsletterBody")}</p>
          <button data-slot="subscribe-button" type="button" onClick={() => setSubscribeOpen(true)}>
            {i18n.t("footer.subscribe")}
          </button>
        </div>
      </div>
      <div data-slot="footer-pattern" aria-hidden="true" />
      <div data-slot="footer-bottom">
        <div>
          <span>{i18n.t("footer.copyright")}</span>
          <SystemStatusLink />
        </div>
        <div data-slot="footer-controls">
          <FooterLanguageSwitcher />
          <div data-slot="theme-toggle" role="group" aria-label={i18n.t("theme.groupLabel")}>
            <For each={themePreferences}>
              {(preference) => (
                <button
                  data-slot="theme-option"
                  type="button"
                  aria-label={i18n.t(themePreferenceLabelKey(preference))}
                  aria-pressed={props.themePreference === preference ? "true" : "false"}
                  title={i18n.t(themePreferenceLabelKey(preference))}
                  onClick={() => props.onThemePreferenceChange(preference)}
                >
                  <ThemePreferenceIcon preference={preference} />
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
      <Show when={subscribeOpen()}>
        <SubscribeModal onClose={() => setSubscribeOpen(false)} />
      </Show>
    </footer>
  )
}

function FooterLanguageSwitcher() {
  const i18n = useI18n()
  const language = useLanguage()

  return (
    <label data-slot="footer-language">
      <span>{i18n.t("footer.language")}</span>
      <select
        aria-label={i18n.t("footer.language")}
        onChange={(event) => {
          const locale = event.currentTarget.value as Locale
          const url = new URL(window.location.href)
          const current = `${url.pathname}${url.search}${url.hash}`
          const href = `${route(locale, url.pathname)}${url.search}${url.hash}`
          language.setLocale(locale)
          if (href !== current) window.location.assign(href)
        }}
      >
        {/* Mark the option, not the select: SSR ignores a select value and hydration does not apply it. */}
        <For each={language.locales}>
          {(locale) => (
            <option value={locale} selected={locale === language.locale()}>
              {language.label(locale)}
            </option>
          )}
        </For>
      </select>
    </label>
  )
}

const systemStatuses = ["operational", "degraded", "outage", "unknown"] as const
type SystemStatus = (typeof systemStatuses)[number]

function SystemStatusLink() {
  const i18n = useI18n()
  const [status, setStatus] = createSignal<SystemStatus>("unknown")

  onMount(() => {
    fetch("/status/api/summary", { signal: AbortSignal.timeout(10_000) })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((body: unknown) => setStatus(readSystemStatus(body)))
      .catch(() => setStatus("unknown"))
  })

  // The status page lives outside this app and is not localized, so bypass the locale route and client router.
  return (
    <a data-slot="status" data-status={status()} href="/status" rel="external">
      {i18n.t(`footer.status.${status()}`)}
    </a>
  )
}

function readSystemStatus(body: unknown) {
  if (!body || typeof body !== "object" || !("status" in body)) return "unknown"
  return systemStatuses.find((status) => status === body.status) ?? "unknown"
}

function SectionBridge(props: { label: string; href: string }) {
  const i18n = useI18n()
  return (
    <a data-component="section-bridge" href={props.href}>
      <span>{i18n.t("bridge.learnMore")}</span>
      <i />
      <strong>{props.label}</strong>
      <b>▸</b>
    </a>
  )
}

function ThemePreferenceIcon(props: { preference: ThemePreference }) {
  return (
    <svg data-slot="theme-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <Show
        when={props.preference === "dark"}
        fallback={
          <Show
            when={props.preference === "light"}
            fallback={
              <>
                <rect x="1.5552" y="2.4448" width="12.8896" height="8.8888" fill="currentColor" opacity="0.3" />
                <svg
                  x="1.0552"
                  y="1.9446"
                  width="13.8889"
                  height="12.5325"
                  viewBox="0 0 13.8889 12.5325"
                  preserveAspectRatio="none"
                  overflow="visible"
                >
                  <path
                    d="M4.05559 12.0555C4.72936 11.8431 5.72492 11.6111 6.94448 11.6111M6.94448 11.6111C7.65114 11.6111 8.66981 11.6893 9.83336 12.0555M6.94448 11.6111L6.94448 9.38888M13.3889 0.5H0.500102C0.500102 0.5 0.500017 1.29594 0.500017 2.27778V7.61112C0.500017 8.59298 0.500007 9.38889 0.500007 9.38889H13.3889C13.3889 9.38889 13.3889 8.59298 13.3889 7.61112V2.27778C13.3889 1.29594 13.3889 0.5 13.3889 0.5Z"
                    stroke="currentColor"
                  />
                </svg>
              </>
            }
          >
            <svg
              x="0.6102"
              y="0.6102"
              width="14.7778"
              height="14.7778"
              viewBox="0 0 14.7778 14.7778"
              preserveAspectRatio="none"
              overflow="visible"
            >
              <path
                d="M7.38889 0.5V1.38889M12.26 2.51782L11.6315 3.14627M14.2778 7.38892H13.3889M12.26 12.26L11.6315 11.6316M7.38889 14.2778V13.3889M2.51778 12.26L3.14622 11.6316M0.5 7.38892H1.38889M2.51778 2.51782L3.14622 3.14627M7.38888 11.1666C9.47528 11.1666 11.1667 9.47526 11.1667 7.38886C11.1667 5.30245 9.47528 3.61108 7.38888 3.61108C5.30247 3.61108 3.6111 5.30245 3.6111 7.38886C3.6111 9.47526 5.30247 11.1666 7.38888 11.1666Z"
                stroke="currentColor"
                stroke-linecap="square"
              />
            </svg>
          </Show>
        }
      >
        <svg
          x="2.0549"
          y="1.742"
          width="12.3867"
          height="12.3971"
          viewBox="0 0 12.3867 12.3971"
          preserveAspectRatio="none"
          overflow="visible"
        >
          <path
            d="M9.05556 8.39711C6.37067 8.39711 4.19444 6.22089 4.19444 3.536C4.19444 2.48445 4.53122 1.51456 5.09822 0.71889C2.48178 1.20733 0.5 3.49944 0.5 6.25822C0.5 9.37244 3.02467 11.8971 6.13889 11.8971C8.76156 11.8971 10.9596 10.1036 11.5903 7.67844C10.8514 8.13189 9.98578 8.39711 9.05556 8.39711Z"
            stroke="currentColor"
            stroke-linecap="round"
          />
        </svg>
      </Show>
    </svg>
  )
}

function SubscribeModal(props: { onClose: () => void }) {
  const i18n = useI18n()
  const [status, setStatus] = createSignal<"idle" | "pending" | "success" | "error">("idle")
  const [message, setMessage] = createSignal("")
  let input: HTMLInputElement | undefined

  onMount(() => {
    if (typeof document === "undefined") return
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    const htmlOverflow = document.documentElement.style.overflow
    const bodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    const focusTimeout = window.setTimeout(() => input?.focus(), 0)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    onCleanup(() => {
      window.clearTimeout(focusTimeout)
      document.documentElement.style.overflow = htmlOverflow
      document.body.style.overflow = bodyOverflow
      document.removeEventListener("keydown", onKeyDown)
      activeElement?.focus()
    })
  })

  return (
    <div data-component="subscribe-modal" role="dialog" aria-modal="true" aria-labelledby="subscribe-title">
      <div data-slot="modal-scrim" aria-hidden="true" onClick={props.onClose} />
      <div data-slot="modal-panel">
        <div data-slot="modal-brand">
          <img data-slot="modal-logo" src={opencodeWordmarkDark} alt="Elhadry Agent" />
          <button
            data-slot="modal-close"
            type="button"
            aria-label={i18n.t("modal.closeNewsletter")}
            onClick={props.onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4.44 4.44L11.56 11.56M11.56 4.44L4.44 11.56" stroke="currentColor" />
            </svg>
          </button>
        </div>
        <div data-slot="modal-body">
          <div data-slot="modal-intro">
            <h2 id="subscribe-title">{i18n.t("modal.title")}</h2>
            <p>{i18n.t("modal.body")}</p>
          </div>
          <form
            data-slot="subscribe-form"
            method="post"
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              setStatus("pending")
              setMessage("")
              fetch(`${import.meta.env.BASE_URL}api/newsletter`, {
                method: "POST",
                body: new FormData(form),
              }).then(
                async (response) => {
                  if (response.ok) {
                    form.reset()
                    setStatus("success")
                    return
                  }
                  setMessage(await newsletterErrorMessage(response, i18n.t("modal.error")))
                  setStatus("error")
                },
                () => {
                  setMessage(i18n.t("modal.error"))
                  setStatus("error")
                },
              )
            }}
          >
            <input ref={input} type="email" name="email" placeholder={i18n.t("modal.email")} required />
            <button type="submit" disabled={status() === "pending"}>
              <span>{status() === "pending" ? i18n.t("modal.subscribing") : i18n.t("modal.subscribe")}</span>
            </button>
          </form>
          <div data-slot="subscribe-feedback" aria-live="polite">
            <Show when={status() === "success"}>
              <p data-state="success">{i18n.t("modal.success")}</p>
            </Show>
            <Show when={status() === "error"}>
              <p data-state="error">{message()}</p>
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}

function newsletterErrorMessage(response: Response, fallback: string) {
  return response.json().then(
    (body: unknown) =>
      body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : fallback,
    () => fallback,
  )
}

function FooterColumn(props: {
  title: string
  links: readonly { href: string; label: string }[]
  localHref: (href: string) => string
}) {
  return (
    <div data-slot="footer-column">
      <h2>{props.title}</h2>
      <nav aria-label={props.title}>
        <For each={props.links}>
          {(link) => (
            <a
              href={props.localHref(link.href)}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              {link.label}
            </a>
          )}
        </For>
      </nav>
    </div>
  )
}

function themePreferenceLabelKey(preference: ThemePreference) {
  if (preference === "dark") return "theme.dark"
  if (preference === "light") return "theme.light"
  return "theme.system"
}

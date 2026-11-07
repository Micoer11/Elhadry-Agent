import { Option, Schema } from "effect"

/** The newest releases of the public repository; one page holds the latest and every version below it. */
export const RELEASES_API = "https://api.github.com/repos/Micoer11/Elhadry-Agent/releases?per_page=100"

const Asset = Schema.Struct({
  name: Schema.String,
  browser_download_url: Schema.String,
})

const GithubRelease = Schema.Struct({
  tag_name: Schema.String,
  name: Schema.NullOr(Schema.String),
  published_at: Schema.NullOr(Schema.String),
  draft: Schema.Boolean,
  prerelease: Schema.Boolean,
  html_url: Schema.String,
  assets: Schema.Array(Asset),
})

export type GithubRelease = typeof GithubRelease.Type

const GithubReleases = Schema.Array(GithubRelease)

const decode = Schema.decodeUnknownOption(GithubReleases)

/** A published release, as the Updates page lists it: the newest first, then the versions to go back to. */
const Release = Schema.Struct({
  /** The version without its leading `v`, for example `0.1.5`. */
  version: Schema.String,
  /** The release's title, or its tag when it has none. */
  name: Schema.String,
  /** ISO 8601 publication time. */
  publishedAt: Schema.String,
  /** This platform's installer download, or the release page when it publishes none. */
  url: Schema.String,
})

export type UpdateRelease = typeof Release.Type

// electron-builder names the Windows installer after the channel, so the same file serves every release.
const INSTALLER = "elhadry-desktop-windows-x64.exe"

/** The published releases, newest first, read from the public repository. */
export async function fetchReleases(signal: AbortSignal): Promise<ReadonlyArray<UpdateRelease>> {
  const response = await fetch(RELEASES_API, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
  })

  if (!response.ok) throw new Error(`GitHub releases request failed with ${response.status}`)

  const json: typeof Schema.Json.Type = await response.json()

  return toReleases(json)
}

/**
 * The published releases in the order the Updates page shows them, drafts and prereleases left out. A release without
 * a publication time or a usable tag cannot be placed on the page, so it is left out too. The download points at this
 * platform's installer, or at the release page when the release publishes no installer.
 */
export function toReleases(json: typeof Schema.Json.Type): ReadonlyArray<UpdateRelease> {
  const releases = Option.getOrElse(decode(json), () => [])

  return releases.flatMap((release) => {
    if (release.draft || release.prerelease || !release.published_at) return []

    const version = release.tag_name.replace(/^v/i, "").trim()

    if (!version) return []

    const installer =
      release.assets.find((asset) => asset.name === INSTALLER) ??
      release.assets.find((asset) => asset.name.toLowerCase().endsWith(".exe"))

    return [
      {
        version,
        name: release.name?.trim() || release.tag_name,
        publishedAt: release.published_at,
        url: installer?.browser_download_url ?? release.html_url,
      },
    ]
  })
}

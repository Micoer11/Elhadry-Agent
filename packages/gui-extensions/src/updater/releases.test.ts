import { describe, expect, test } from "bun:test"
import { toReleases, type GithubRelease } from "./releases"

describe("toReleases", () => {
  test("maps published releases in order, stripping the tag prefix", () => {
    expect(
      toReleases([
        release({ tag_name: "v0.1.5", name: "Elhadry Agent 0.1.5", published_at: "2026-11-06T05:57:13Z" }),
        release({ tag_name: "v0.1.4", name: "Elhadry Agent 0.1.4", published_at: "2026-11-06T05:37:58Z" }),
      ]),
    ).toEqual([
      {
        version: "0.1.5",
        name: "Elhadry Agent 0.1.5",
        publishedAt: "2026-11-06T05:57:13Z",
        url: "https://github.com/Micoer11/Elhadry-Agent/releases/download/v0.1.5/elhadry-desktop-windows-x64.exe",
      },
      {
        version: "0.1.4",
        name: "Elhadry Agent 0.1.4",
        publishedAt: "2026-11-06T05:37:58Z",
        url: "https://github.com/Micoer11/Elhadry-Agent/releases/download/v0.1.4/elhadry-desktop-windows-x64.exe",
      },
    ])
  })

  test("leaves out drafts, prereleases, undated releases and empty tags", () => {
    expect(
      toReleases([
        release({ draft: true }),
        release({ prerelease: true }),
        release({ published_at: null }),
        release({ tag_name: "v" }),
        release({ tag_name: "v0.1.0" }),
      ]).map((item) => item.version),
    ).toEqual(["0.1.0"])
  })

  test("falls back to another executable, then to the release page", () => {
    const [other, page] = toReleases([
      release({ assets: [{ name: "elhadry-cli-windows-x64.exe", browser_download_url: "https://example.com/cli.exe" }] }),
      release({ tag_name: "v0.0.9", assets: [] }),
    ])

    expect(other.url).toBe("https://example.com/cli.exe")
    expect(page.url).toBe("https://github.com/Micoer11/Elhadry-Agent/releases/tag/v0.0.9")
  })

  test("uses the tag when the release has no title", () => {
    const [item] = toReleases([release({ tag_name: "v0.1.0", name: null })])

    expect(item.name).toBe("v0.1.0")
  })

  test("reads anything that is not a list as no releases", () => {
    expect(toReleases({ message: "Not Found" })).toEqual([])
    expect(toReleases(null)).toEqual([])
  })
})

function release(overrides: Partial<GithubRelease> = {}): GithubRelease {
  const tag = overrides.tag_name ?? "v0.1.5"

  return {
    tag_name: tag,
    name: "Elhadry Agent",
    published_at: "2026-11-06T05:57:13Z",
    draft: false,
    prerelease: false,
    html_url: `https://github.com/Micoer11/Elhadry-Agent/releases/tag/${tag}`,
    assets: [
      {
        name: "elhadry-cli-windows-x64.exe",
        browser_download_url: "https://example.com/cli.exe",
      },
      {
        name: "elhadry-desktop-windows-x64.exe",
        browser_download_url: `https://github.com/Micoer11/Elhadry-Agent/releases/download/${tag}/elhadry-desktop-windows-x64.exe`,
      },
    ],
    ...overrides,
  }
}

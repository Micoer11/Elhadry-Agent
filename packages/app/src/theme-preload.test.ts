import { beforeEach, describe, expect, test } from "bun:test"

const src = await Bun.file(new URL("../public/oc-theme-preload.js", import.meta.url)).text()

const run = () => Function(src)()

beforeEach(() => {
  document.head.innerHTML = ""
  document.documentElement.removeAttribute("data-theme")
  document.documentElement.removeAttribute("data-color-scheme")
  document.documentElement.style.removeProperty("background-color")
  localStorage.clear()
})

describe("theme preload", () => {
  test("paints the fixed dark theme regardless of stored preferences", () => {
    localStorage.setItem("opencode-theme-id", "nightowl")
    localStorage.setItem("opencode-color-scheme", "light")

    run()

    expect(document.documentElement.dataset.theme).toBe("oc-2")
    expect(document.documentElement.dataset.colorScheme).toBe("dark")
    expect(document.documentElement.style.backgroundColor).toBe("#151517")
    expect(document.getElementById("oc-theme-preload")).toBeNull()
  })
})

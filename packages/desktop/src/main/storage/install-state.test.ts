import { describe, expect, test } from "bun:test"
import { hasExistingAppState } from "./install-state"

const file = (name: string) => ({ name, directory: false })

const directory = (name: string) => ({ name, directory: true })

describe("hasExistingAppState", () => {
  test("recognizes state from an earlier Elhadry Agent launch but not files Electron creates on a fresh install", () => {
    expect(hasExistingAppState([])).toBe(false)
    expect(hasExistingAppState([file("Local State"), directory("Crashpad")])).toBe(false)
    expect(hasExistingAppState([file("elhadry.settings")])).toBe(true)
    expect(hasExistingAppState([file("elhadry.global.dat")])).toBe(true)
    expect(hasExistingAppState([file("drafts.sqlite")])).toBe(true)
    expect(hasExistingAppState([file("window-state-abc.json")])).toBe(true)
    expect(hasExistingAppState([directory("elhadry")])).toBe(true)
  })

  test("does not claim another app's profile as this app's state", () => {
    // A profile this app never wrote (for example OpenCode's own userData) must not be adopted.
    expect(hasExistingAppState([file("opencode.settings"), file("opencode.global.dat")])).toBe(false)
    expect(hasExistingAppState([directory("opencode")])).toBe(false)
  })
})

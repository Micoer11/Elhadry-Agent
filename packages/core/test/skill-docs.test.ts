import { describe, expect, test } from "bun:test"
import { DocsContent, DocsRoot } from "../src/plugin/skill"
import { DocsFiles, DocsIndex } from "../src/plugin/skill/docs.generated"
import { Effect, Layer } from "effect"
import { NodeFileSystem, NodePath } from "@effect/platform-node"
import { Global } from "@elhadry/util/global"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"

// The packed CLI is one executable, so the guides live in the bundle and are unpacked on first use.
const unpack = async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "elhadry-docs-"))
  const global = Global.make({ data: root })
  const directory = await Effect.runPromise(
    DocsRoot().pipe(
      Effect.provide(Layer.mergeAll(NodeFileSystem.layer, NodePath.layer)),
      Effect.provideService(Global.Service, global),
    ),
  )
  return { root, directory }
}

describe("offline documentation", () => {
  test("ships a guide for every indexed file", () => {
    // The index is the only route the model has to a guide, so a missing entry is a dead end.
    expect(DocsIndex.length).toBeGreaterThan(50)
    for (const entry of DocsIndex) expect(DocsFiles[entry.file]).toBeString()
  })

  test("names an absolute path for every index entry", async () => {
    const { root, directory } = await unpack()

    try {
      const content = DocsContent(directory)
      expect(content).not.toContain("{root}")

      const entries = [...content.matchAll(/`([^`]+\.md)`/g)].map((match) => match[1]).filter((entry) => path.isAbsolute(entry))
      expect(entries.length).toBe(DocsIndex.length)
      for (const entry of entries) expect(readFileSync(entry, "utf8").length).toBeGreaterThan(0)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("rewrites app paths while keeping real identifiers intact", async () => {
    const { root, directory } = await unpack()

    try {
      const skills = readFileSync(path.join(directory, "configure/skills.md"), "utf8")
      expect(skills).toContain(".config/elhadry/skills")
      expect(skills).not.toContain(".config/opencode/skills")

      // These are identifiers, not paths on this machine, so they must survive the rewrite.
      expect(readFileSync(path.join(directory, "configure/providers.md"), "utf8")).toContain("@elhadry/")
      expect(readFileSync(path.join(directory, "cli/config.md"), "utf8")).toMatch(/OPENCODE_|opencode\.ai/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

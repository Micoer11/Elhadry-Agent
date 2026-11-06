// Regenerates the embedded offline documentation and the index the built-in `docs` skill points at.
//
// The guides are embedded in the build because the packaged CLI is a single executable: a directory
// next to the sources never reaches an installed app. At runtime they are written to the data
// directory once per version so the model can open them with the `read` tool. Run from packages/core:
//   bun run script/generate-docs.ts
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"

const sources = path.resolve(import.meta.dirname, "../../../services/www/src/docs/content")
const guide = path.resolve(import.meta.dirname, "../src/plugin/skill/docs.md")
const output = path.resolve(import.meta.dirname, "../src/plugin/skill/docs.generated.ts")

// Subdirectories copied verbatim, with the heading the index groups them under.
const sections = [
  { directory: "build", label: "Build" },
  { directory: "cli", label: "CLI" },
  { directory: "console", label: "Console" },
] as const

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return entry.endsWith(".mdx") ? [full] : []
  })
}

// The upstream guides describe a different product layout. This app keeps the behaviour under its
// own names and paths, so rewrite everything the model could copy verbatim. Real identifiers
// (package names, environment variables, and schema URLs) stay as they are.
const protectedTokens = [
  ["opencode.ai", "\u0000URL\u0000"],
  ["OPENCODE_", "\u0000ENV\u0000"],
  ["opencode-ai", "\u0000PKGAI2\u0000"],
] as const

function rewrite(text: string) {
  let result = text
  for (const [from, to] of protectedTokens) result = result.split(from).join(to)
  result = result
    .replace(/\.opencode\//g, ".elhadry/")
    .replace(/\.config\/opencode/g, ".config/elhadry")
    .replace(/opencode\.jsonc/g, "elhadry.jsonc")
    .replace(/opencode\.json/g, "elhadry.json")
    // The Console provider keeps its real integration ID, so model references stay `opencode/<model>`.
    .replace(/opencode\//g, "\u0000PROVIDER\u0000")
    .replace(/\bopencode\b/g, "elhadry")
    .replace(/\bopencode_/g, "elhadry_")
    .replace(/\u0000PROVIDER\u0000/g, "opencode/")
  for (const [from, to] of protectedTokens) result = result.split(to).join(from)
  return stripDocLinks(renameProduct(result))
}

// Product names in prose. Fenced and inline code keep real identifiers such as the `OpenCode` client
// class, so examples stay correct while the surrounding text describes this app.
function renameProduct(text: string) {
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part) => {
      if (part.startsWith("`")) return part
      return part
        .replace(/\bOpenCode Console\b/g, "\u0000CONSOLE\u0000")
        .replace(/\bOpenCode\b/g, "Elhadry Agent")
        .replace(/\u0000CONSOLE\u0000/g, "OpenCode Console")
    })
    .join("")
}

// The guides must not send the model to the documentation website: the same content ships here, and
// the site describes Elhadry Agent's own layout. Keep schema URLs, which are not documentation links.
function stripDocLinks(text: string) {
  return text
    // The configuration schema identifier is needed for editor validation, but it is not a guide link.
    .replace(/\[([^\]]+)\]\((https:\/\/(?:opencode|elhadry)\.ai[^)]*config\.json)\)/g, "`$2`")
    .replace(/\[([^\]]+)\]\(https:\/\/(?:opencode|elhadry)\.ai(?![^)]*config\.json)[^)]*\)/g, "$1")
    .replace(/<(https:\/\/(?:opencode|elhadry)\.ai(?![^>]*config\.json)[^>]*)>/g, "")
    .replace(/https:\/\/(?:opencode|elhadry)\.ai(?!\S*config\.json)[^\s)"'`\]]*/g, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/[ \t]{2,}(?=\n)/g, "")
}

// MDX frontmatter is not markdown: turn its title into a heading and drop the rest.
function normalize(text: string) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!match) return rewrite(text.trim())
  const title = match[1].match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? ""
  const body = rewrite(text.slice(match[0].length).trim())
  return title ? `# ${title}\n\n${body}` : body
}

const entries: Array<{ section: string; file: string; title: string; content: string }> = []

// Loose files at the docs root are the "Configure" section; its subdirectories are handled below.
for (const entry of readdirSync(sources)) {
  const full = path.join(sources, entry)
  if (!entry.endsWith(".mdx") || !statSync(full).isFile()) continue
  const file = `configure/${entry.replace(/\.mdx$/, ".md")}`
  const content = normalize(readFileSync(full, "utf8"))
  entries.push({ section: "Configure", file, title: content.match(/^# (.*)$/m)?.[1] ?? file, content })
}

for (const section of sections) {
  const root = path.join(sources, section.directory)
  for (const source of walk(root)) {
    const file = `${section.directory}/${path.relative(root, source).replace(/\.mdx$/, ".md").split(path.sep).join("/")}`
    const content = normalize(readFileSync(source, "utf8"))
    entries.push({
      section: section.label,
      file,
      title: content.match(/^# (.*)$/m)?.[1] ?? path.basename(source, ".mdx"),
      content,
    })
  }
}

entries.sort((a, b) => a.section.localeCompare(b.section) || a.file.localeCompare(b.file))

const files = Object.fromEntries(entries.map((entry) => [entry.file, entry.content]))
const index = entries.map(({ section, file, title }) => ({ section, file, title }))

mkdirSync(path.dirname(output), { recursive: true })
writeFileSync(
  output,
  [
    "// Generated by script/generate-docs.ts. Do not edit by hand.",
    "",
    `export const DocsFiles: Readonly<Record<string, string>> = ${JSON.stringify(files)}`,
    "",
    `export const DocsIndex: ReadonlyArray<{ readonly section: string; readonly file: string; readonly title: string }> = ${JSON.stringify(index)}`,
    "",
  ].join("\n"),
  "utf8",
)

const table = [
  "| Section | Guide | File |",
  "| --- | --- | --- |",
  ...index.map((entry) => `| ${entry.section} | ${entry.title} | \`{root}/${entry.file}\` |`),
].join("\n")

const template = readFileSync(guide, "utf8")
writeFileSync(guide, template.replace(/\| Section \| Guide \| File \|\n[\s\S]*$/, `${table}\n`), "utf8")

console.log(`${entries.length} guides embedded in ${output}`)
console.log(`index rewritten in ${guide}`)

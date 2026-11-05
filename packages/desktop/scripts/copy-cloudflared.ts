// Puts cloudflared in the packaged app so publishing a link never depends on a first-run download.
// The CLI looks for `cloudflared/<asset>` beside its own executable, which is this resources directory.
import { $ } from "bun"
import { mkdir, rename } from "node:fs/promises"
import path from "node:path"

// Mirrors the asset names in `packages/core/src/tunnel.ts`; the binary there and here must agree.
const name =
  process.platform === "win32"
    ? process.arch === "arm64"
      ? "cloudflared-windows-arm64.exe"
      : "cloudflared-windows-amd64.exe"
    : process.platform === "darwin"
      ? process.arch === "arm64"
        ? "cloudflared-darwin-arm64.tgz"
        : "cloudflared-darwin-amd64.tgz"
      : process.platform === "linux"
        ? process.arch === "arm64"
          ? "cloudflared-linux-arm64"
          : process.arch === "arm"
            ? "cloudflared-linux-arm"
            : "cloudflared-linux-amd64"
        : undefined

if (!name) throw new Error(`cloudflared has no release asset for ${process.platform}/${process.arch}`)

const directory = "resources/cloudflared"
const file = path.join(directory, name.replace(/\.tgz$/, ""))

if (await Bun.file(file).exists()) {
  console.log(`cloudflared already present at ${file}`)
  process.exit(0)
}

await mkdir(directory, { recursive: true })

const response = await fetch(`https://github.com/cloudflare/cloudflared/releases/latest/download/${name}`, {
  redirect: "follow",
})
if (!response.ok) throw new Error(`Could not download cloudflared: ${response.status} ${response.statusText}`)

if (!name.endsWith(".tgz")) {
  await Bun.write(file, response)
} else {
  const archive = `${file}.tgz`
  await Bun.write(archive, response)
  await $`tar -xzf ${archive} -C ${directory}`
  await rename(path.join(directory, "cloudflared"), file)
  await $`rm -f ${archive}`
}

if (process.platform !== "win32") await $`chmod +x ${file}`

console.log(`Added ${file} (${(await Bun.file(file).size).toLocaleString()} bytes)`)

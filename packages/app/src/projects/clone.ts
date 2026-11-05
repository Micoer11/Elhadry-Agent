/** The folder a clone writes into: the parent the user picked plus the repository name. */
export function cloneTarget(parent: string, name: string) {
  const trimmed = parent.replace(/[\\/]+$/, "")
  const separator = trimmed.includes("\\") && !trimmed.includes("/") ? "\\" : "/"

  return `${trimmed}${separator}${name}`
}

/** A folder name derived from what the user pasted, or undefined when the URL has no usable name. */
export function cloneName(remote: string) {
  const value = remote.trim().replace(/[\\/]+$/, "")

  if (!value) return undefined

  const segment = value
    .replace(/\.git$/, "")
    .split(/[\\/:]/)
    .filter(Boolean)
    .at(-1)

  return segment ? segment.replace(/[^\w.-]+/g, "-") : undefined
}

import { Config } from "effect"

// Every environment variable the CLI reads, in one place. Consumers yield
// these instead of touching process.env so the full surface stays visible,
// typed, and redacted where secret.

// The Elhadry Agent server password: sent by clients connecting to an explicit
// --server, and adopted by a manually run or standalone server. The legacy
// name is still honored.
export const password = Config.Redacted("OPENCODE_PASSWORD").pipe(
  Config.orElse(() => Config.Redacted("OPENCODE_SERVER_PASSWORD")),
  Config.withDefault(undefined),
)

const credential = /^(?:ELHADRY|OPENCODE)_(?:SERVER_)?PASSWORD$/

/**
 * `ELHADRY_*` is the public prefix; the code still reads `OPENCODE_*`. Mirror every `ELHADRY_*`
 * name onto its legacy twin so both work, and let the new prefix win when both are set.
 */
export function alias() {
  Object.entries(process.env)
    .filter((entry): entry is [string, string] => entry[1] !== undefined && entry[0].startsWith("ELHADRY_"))
    .forEach(([name, value]) => {
      process.env[`OPENCODE_${name.slice("ELHADRY_".length)}`] = value
    })
}

export function session() {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined && !credential.test(entry[0]),
    ),
  )
}

export * as Env from "./env"

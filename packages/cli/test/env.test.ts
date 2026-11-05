import { expect, test } from "bun:test"
import { Env } from "../src/env"

test("session environment omits server credentials", () => {
  const previousPassword = process.env.OPENCODE_PASSWORD
  const previousLegacyPassword = process.env.OPENCODE_SERVER_PASSWORD
  const previousForkPassword = process.env.ELHADRY_PASSWORD
  const previousValue = process.env.OPENCODE_SESSION_ENV_TEST
  process.env.OPENCODE_PASSWORD = "password"
  process.env.OPENCODE_SERVER_PASSWORD = "legacy"
  process.env.ELHADRY_PASSWORD = "fork"
  process.env.OPENCODE_SESSION_ENV_TEST = "included"

  const environment = Env.session()

  if (previousPassword === undefined) delete process.env.OPENCODE_PASSWORD
  else process.env.OPENCODE_PASSWORD = previousPassword
  if (previousLegacyPassword === undefined) delete process.env.OPENCODE_SERVER_PASSWORD
  else process.env.OPENCODE_SERVER_PASSWORD = previousLegacyPassword
  if (previousForkPassword === undefined) delete process.env.ELHADRY_PASSWORD
  else process.env.ELHADRY_PASSWORD = previousForkPassword
  if (previousValue === undefined) delete process.env.OPENCODE_SESSION_ENV_TEST
  else process.env.OPENCODE_SESSION_ENV_TEST = previousValue

  expect(environment.OPENCODE_PASSWORD).toBeUndefined()
  expect(environment.OPENCODE_SERVER_PASSWORD).toBeUndefined()
  expect(environment.ELHADRY_PASSWORD).toBeUndefined()
  expect(environment.OPENCODE_SESSION_ENV_TEST).toBe("included")
})

test("mirrors ELHADRY_ variables onto their OPENCODE_ names, with the new prefix winning", () => {
  const previousLegacy = process.env.OPENCODE_ALIAS_TEST
  const previousFork = process.env.ELHADRY_ALIAS_TEST
  const previousNew = process.env.OPENCODE_NEW_ALIAS_TEST
  process.env.OPENCODE_ALIAS_TEST = "legacy"
  process.env.ELHADRY_ALIAS_TEST = "fork"
  process.env.ELHADRY_NEW_ALIAS_TEST = "fork-only"

  Env.alias()

  const legacy = process.env.OPENCODE_ALIAS_TEST
  const forkOnly = process.env.OPENCODE_NEW_ALIAS_TEST

  if (previousLegacy === undefined) delete process.env.OPENCODE_ALIAS_TEST
  else process.env.OPENCODE_ALIAS_TEST = previousLegacy
  if (previousFork === undefined) delete process.env.ELHADRY_ALIAS_TEST
  else process.env.ELHADRY_ALIAS_TEST = previousFork
  if (previousNew === undefined) delete process.env.OPENCODE_NEW_ALIAS_TEST
  else process.env.OPENCODE_NEW_ALIAS_TEST = previousNew

  expect(legacy).toBe("fork")
  expect(forkOnly).toBe("fork-only")
})

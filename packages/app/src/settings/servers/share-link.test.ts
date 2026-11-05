import { expect, test } from "bun:test"
import { shareLink } from "./share-link"

test.each([
  "https://quiet-river.trycloudflare.com",
  "http://127.0.0.1:4096/",
])("shareLink(%p) shares the address exactly as it is", (url) => {
  // A credential in the address would be read by the app at startup and skip the password prompt entirely.
  expect(shareLink(url)).toBe(url)
})

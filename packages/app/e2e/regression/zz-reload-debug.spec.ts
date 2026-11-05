import { expect, test } from "@playwright/test"
import { fileDiff, openSession } from "../utils/workspace"

test.use({ viewport: { width: 1440, height: 900 } })

test("debug reload with terminal", async ({ page }) => {
  const a = { id: "ses_side_a", title: "Alpha session" }
  const b = { id: "ses_side_b", title: "Beta session" }
  const errors: string[] = []
  const calls: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith("/api/")) calls.push(`${request.method()} ${url.pathname}${url.search}`)
  })
  page.on("response", (response) => {
    const url = new URL(response.url())
    if (url.pathname.startsWith("/api/session")) calls.push(`  <- ${response.status()} ${url.pathname}${url.search}`)
  })

  await openSession(page, {
    name: "SidePanels",
    sessions: [a, b],
    pty: {},
    vcsDiff: Array.from({ length: 4 }, (_, index) => fileDiff(`src/generated-${index}.ts`)),
    seed: { locale: "en", panes: { [a.id]: { sessionWidth: 580 }, [b.id]: { sessionWidth: 520 } } },
  })

  calls.length = 0
  await page.reload()
  await page.waitForTimeout(5000)
  console.log("RELOAD heading:", await page.getByRole("heading", { name: a.title }).count())
  console.log("RELOAD errors:", JSON.stringify(errors))
  console.log("RELOAD calls:", JSON.stringify(calls, null, 1))
  console.log("RELOAD storage tabs:", await page.evaluate(() => localStorage.getItem("elhadry.window.browser.dat:tabs")))
  console.log("RELOAD storage panes:", await page.evaluate(() => localStorage.getItem("elhadry.window.browser.dat:tabs.panes")))
})

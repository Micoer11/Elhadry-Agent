import { expect, test } from "@playwright/test"
import { tabKey } from "../utils/app"
import { fileDiff, openSession } from "../utils/workspace"
import { expectSessionTitle } from "../utils/waits"

test.use({ viewport: { width: 1440, height: 900 } })

test("opens the terminal as a side tab beside review and keeps it fitted", async ({ page }) => {
  const a = { id: "ses_side_a", title: "Alpha session" }
  const b = { id: "ses_side_b", title: "Beta session" }

  const { directory, pty } = await openSession(page, {
    name: "SidePanels",
    sessions: [a, b],
    pty: {},
    vcsDiff: Array.from({ length: 2_740 }, (_, index) =>
      fileDiff(`src/generated-${String(index).padStart(4, "0")}.ts`),
    ),
    seed: { locale: "en", panes: { [a.id]: { sessionWidth: 580 }, [b.id]: { sessionWidth: 520 } } },
  })

  const panel = page.locator("#review-panel")
  const chat = page.locator('[data-slot="session-chat-panel"]')
  const review = panel.locator('[data-component="session-review-v2"]')
  const terminal = panel.locator('[data-component="terminal"]')
  const terminalTab = panel.getByRole("tab", { name: "Terminal", exact: true })
  const reviewTab = panel.locator("#session-side-panel-review-tab")

  // Desktop session tabs live in the sidebar, inside the project row that starts collapsed.
  const project = page.locator('[data-action="sidebar-project-toggle"]')
  await project.click()
  await expect(project).toHaveAttribute("aria-expanded", "true")

  const switchTab = async (title: string) => {
    await page.locator('[data-action="sidebar-project-session"]').filter({ hasText: title }).click()
    await expectSessionTitle(page, title)
  }

  // The rendered terminal box is the contract: a zero-sized container renders no content after a remount.
  const fitted = async () => {
    const box = await terminal.boundingBox()

    return box && { width: Math.round(box.width), height: Math.round(box.height) }
  }

  await page.keyboard.press("Control+Backquote")
  await expect(terminalTab).toHaveAttribute("aria-selected", "true")
  await expect(terminal).toBeVisible()
  await expect(chat).toHaveCSS("width", "580px")
  await expect.poll(() => pty.sockets.length).toBe(1)
  expect(pty.sockets[0]!.url.searchParams.get("location[directory]")).toBe(directory)
  expect(pty.sockets[0]!.url.searchParams.get("ticket")).toBe("e2e-ticket")
  expect(pty.tokens[0]?.headers["x-opencode-ticket"]).toBe("1")

  const open = await fitted()
  expect(open!.width).toBeGreaterThan(80)
  expect(open!.height).toBeGreaterThan(48)

  // The side strip already names the terminal, so a single terminal adds no strip of its own.
  await expect(terminalTab).toHaveCount(1)
  await expect(panel.getByRole("tab", { name: /^Terminal \d+$/ })).toHaveCount(0)
  pty.send("ready")
  await expect(terminal).toHaveCSS("opacity", "1")

  // Review shares the same strip; the terminal restores its screen and size when the tab is chosen again.
  await reviewTab.click()
  await expect(reviewTab).toHaveAttribute("aria-selected", "true")
  await expect(review).toBeVisible()
  await expect(terminal).toHaveCount(0)
  await terminalTab.click()
  await expect(terminalTab).toHaveAttribute("aria-selected", "true")
  await expect(terminal).toBeVisible()
  await expect(terminal).toHaveCSS("opacity", "1")
  await expect.poll(fitted).toEqual(open)

  // The side region belongs to its session: another session opens closed with its own width.
  await switchTab(b.title)
  await expect(panel).toBeHidden()
  // A closed side region returns the width to the conversation; the stored width returns with it.
  await page.keyboard.press("Control+Backquote")
  await expect(terminalTab).toHaveAttribute("aria-selected", "true")
  await expect(terminal).toBeVisible()
  await expect(chat).toHaveCSS("width", "520px")
  // The terminal is per workspace, so the second session reuses it instead of creating another pty.
  expect(pty.created).toHaveLength(1)

  await switchTab(a.title)
  await expect(terminalTab).toHaveAttribute("aria-selected", "true")
  await expect(terminal).toBeVisible()
  await expect(chat).toHaveCSS("width", "580px")
  await expect.poll(fitted).toEqual(open)

  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem("elhadry.window.browser.dat:tabs.panes") ?? "{}")[key]?.review,
        tabKey(a.id),
      ),
    )
    .toBe(true)
  await page.reload()
  await expectSessionTitle(page, a.title)
  await expect(terminalTab).toHaveAttribute("aria-selected", "true")
  await expect(terminal).toBeVisible()
  await expect(chat).toHaveCSS("width", "580px")
  await expect.poll(fitted).toEqual(open)

  // The review tab survived the reload beside the terminal and its virtualized tree still loads.
  await reviewTab.click()
  await expect(review).toBeVisible()
  const tree = panel.locator('[data-component="file-tree-v2"]')
  await expect(tree.getByRole("button", { name: "generated-0000.ts" })).toBeVisible()
  expect(await tree.locator('[data-slot="file-tree-v2-row"]').count()).toBeLessThanOrEqual(60)
  const viewport = panel.locator('[data-slot="session-review-v2-sidebar-tree"] .scroll-view__viewport')
  await viewport.hover()
  await page.mouse.wheel(0, 100_000)
  await expect(tree.getByRole("button", { name: "generated-2739.ts" })).toBeVisible()
})

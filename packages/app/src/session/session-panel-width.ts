// The review pane has no width of its own: it takes whatever the chat panel
// leaves behind. Instead of capping the chat panel at a fraction of the window
// (which forces the review pane to grow with the monitor), reserve a fixed
// minimum for the review pane and let the chat panel take everything else.
//
// The chat panel would rather keep its 450px minimum, but on a small window
// that leaves the side pane a sliver. Below that point the chat panel gives way
// down to its floor, so both panes stay usable while the window is wide enough
// for the split layout at all.
export const SESSION_PANEL_WIDTH_MIN = 450

export const SESSION_PANEL_WIDTH_FLOOR = 320

const REVIEW_PANE_WIDTH_MIN = 360

const REVIEW_PANE_WIDTH_MIN_SPLIT = 520

export function sessionPanelWidthMax(input: { available: number; split: boolean }) {
  const pane = input.split ? REVIEW_PANE_WIDTH_MIN_SPLIT : REVIEW_PANE_WIDTH_MIN

  return Math.max(SESSION_PANEL_WIDTH_FLOOR, input.available - pane)
}

// `available` is undefined until the layout row is first measured; render the
// stored width untouched until then to avoid a first-frame snap.
export function clampSessionPanelWidth(input: { width: number; available: number | undefined; split: boolean }) {
  if (input.available === undefined) return input.width

  return Math.min(input.width, sessionPanelWidthMax({ available: input.available, split: input.split }))
}

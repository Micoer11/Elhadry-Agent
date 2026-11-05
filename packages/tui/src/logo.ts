// The TUI wordmark. Each glyph is a 3-row block letter; the layout joins them with
// a single space so `left` and `right` read as "ELHADRY AGENT".
const glyphs = {
  E: ["█▀▀▀", "█▀▀ ", "▀▀▀▀"],
  L: ["█   ", "█   ", "▀▀▀▀"],
  H: ["█  █", "█▀▀█", "█  █"],
  A: ["▄▀▀▄", "█▀▀█", "█  █"],
  D: ["█▀▀▄", "█  █", "▀▀▀▀"],
  R: ["█▀▀▄", "█▀▀ ", "█  █"],
  Y: ["█   █", " ▀▀▀ ", "  █  "],
  G: ["▄▀▀▀", "█ ▀█", "▀▀▀▀"],
  N: ["█  █", "█▄▄█", "█  █"],
  T: ["▀▀▀▀", " █  ", " █  "],
} as const

type Glyph = keyof typeof glyphs

const word = (text: string) =>
  [0, 1, 2].map((row) =>
    Array.from(text)
      .map((letter) => glyphs[letter as Glyph][row])
      .join(" "),
  )

export const logo = {
  left: word("ELHADRY"),
  right: word("AGENT"),
}

// The app mark: a four-point star drawn with block glyphs so every terminal renders it,
// including the ones that lack the Unicode star characters.
export const mark = [" ▄▄▄ ", "▄█ █▄", " ▀▀▀ "]

// Single-cell fallback for one-line surfaces such as the status bar.
export const starGlyph = "*"

// Compact monogram used by surfaces that predate `mark` and read `go.right.slice(1)`.
export const go = {
  left: ["    "],
  right: ["    ", ...mark],
}

// A password someone reads off a link and may type by hand: no lookalike characters.
const alphabet = "abcdefghijkmnopqrstuvwxyz23456789"

/** A fresh password for a new link, so a tunnel is never published without one. */
export function suggestPassword() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => alphabet[byte % alphabet.length]).join("")
}

/**
 * The address someone else opens.
 *
 * It carries no password and no token: a link that signs its bearer in would let anyone who later sees the
 * address — in a chat, a screenshot, a browser history — open the server without ever knowing the password.
 * The visitor gets the password separately and has to type it.
 */
export function shareLink(url: string) {
  return url.trim()
}

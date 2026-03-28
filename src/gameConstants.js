/** Keep in sync with server defaults (wordValidator.js). */
export const WORD_LEN_MIN = 3
export const WORD_LEN_MAX = 20

export function clampWordLength(n) {
  const x = Math.round(Number(n)) || 5
  return Math.min(WORD_LEN_MAX, Math.max(WORD_LEN_MIN, x))
}

/** Parse a loose string from the number field (default 5 if empty/invalid). */
export function parseWordLengthInput(s) {
  const n = parseInt(String(s).trim(), 10)
  if (Number.isNaN(n)) return 5
  return clampWordLength(n)
}

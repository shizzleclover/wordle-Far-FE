export const TOKEN_KEY = 'wordle-duel-token'

/** API + Socket.IO base (no trailing slash). Override with VITE_API_URL. */
function apiBase() {
  const raw = import.meta.env.VITE_API_URL
  if (raw) return String(raw).replace(/\/$/, '')
  return 'http://localhost:3001'
}

export function getSocketUrl() {
  return apiBase()
}

export function apiUrl(path) {
  const base = apiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

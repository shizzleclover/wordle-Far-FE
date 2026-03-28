/** API calls use same-origin /api (Vite proxy in dev). Socket needs full URL. */
export const TOKEN_KEY = 'wordle-duel-token'

export function getSocketUrl() {
  const fromEnv = import.meta.env.VITE_SERVER_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3001`
  }
  return 'http://localhost:3001'
}

export function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL || ''
  if (base) return `${base.replace(/\/$/, '')}${path}`
  return path
}

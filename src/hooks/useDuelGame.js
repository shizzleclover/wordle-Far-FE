import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { TOKEN_KEY, apiUrl, getSocketUrl } from '../config'

function mapPhaseToUi(serverPhase, playerCount) {
  if (serverPhase === 'waiting') return playerCount >= 2 ? 'setup' : 'lobby'
  if (serverPhase === 'setup') return 'setup'
  if (serverPhase === 'playing') return 'playing'
  if (serverPhase === 'finished') return 'gameover'
  return 'lobby'
}

export function useDuelGame() {
  const socketRef = useRef(null)
  const lastGameOverRef = useRef(null)

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(!!localStorage.getItem(TOKEN_KEY))
  const [socketConnected, setSocketConnected] = useState(false)

  const [toast, setToast] = useState(null)
  const [uiPhase, setUiPhase] = useState('lobby')
  const [roomCode, setRoomCode] = useState(null)
  const [wordLength, setWordLength] = useState(5)
  const [playerCount, setPlayerCount] = useState(0)
  const [players, setPlayers] = useState([])
  const [opponentName, setOpponentName] = useState('')
  const [yourTurn, setYourTurn] = useState(false)
  const [guesses, setGuesses] = useState([])
  const [draftGuess, setDraftGuess] = useState('')
  const [secretDraft, setSecretDraft] = useState('')
  const [hasSetWord, setHasSetWord] = useState(false)
  const [opponentGuessCount, setOpponentGuessCount] = useState(0)
  const [gameOver, setGameOver] = useState(null)
  const [rematchRequestedBy, setRematchRequestedBy] = useState(null)
  const [rematchPending, setRematchPending] = useState(false)
  const [disconnectBanner, setDisconnectBanner] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsOpen, setStatsOpen] = useState(false)

  const showToast = useCallback((msg) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  const resetLobby = useCallback(() => {
    setUiPhase('lobby')
    setRoomCode(null)
    setPlayerCount(0)
    setPlayers([])
    setOpponentName('')
    setYourTurn(false)
    setGuesses([])
    setDraftGuess('')
    setSecretDraft('')
    setHasSetWord(false)
    setOpponentGuessCount(0)
    setGameOver(null)
    lastGameOverRef.current = null
    setRematchRequestedBy(null)
    setRematchPending(false)
    setDisconnectBanner(null)
  }, [])

  const applyRoomState = useCallback(
    (s) => {
      if (!s) return
      setRoomCode(s.roomCode)
      setWordLength(s.wordLength)
      setPlayers(s.players || [])
      const oc = s.players?.length || 0
      setPlayerCount(oc)
      const opp = s.opponent
      setOpponentName(opp?.username || '')
      setYourTurn(Boolean(s.yourTurn))
      setGuesses(Array.isArray(s.you?.guesses) ? s.you.guesses : [])
      setHasSetWord(Boolean(s.you?.hasSetWord))
      setDraftGuess('')
      setOpponentGuessCount(opp?.guessCount ?? 0)
      setUiPhase(mapPhaseToUi(s.phase, oc))
      if (s.phase === 'finished' && lastGameOverRef.current) {
        setGameOver(lastGameOverRef.current)
      }
      if (s.phase !== 'finished') {
        setGameOver(null)
        lastGameOverRef.current = null
      }
    },
    []
  )

  useEffect(() => {
    if (!token) {
      setUser(null)
      setAuthLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Session expired')
        const data = await res.json()
        if (!cancelled) setUser(data.user)
      } catch {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
          setUser(null)
          showToast('Session expired. Sign in again.')
        }
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, showToast])

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setSocketConnected(false)
      return
    }

    const socket = io(getSocketUrl(), {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    const onConnect = () => {
      setSocketConnected(true)
      socket.emit('request-room-state')
    }
    const onDisconnect = () => setSocketConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', (err) => {
      showToast(err.message || 'Could not connect to game server')
    })

    socket.on('room-state', applyRoomState)

    socket.on('room-created', ({ code, wordLength: wl }) => {
      setRoomCode(code)
      setWordLength(wl)
      setPlayerCount(1)
      setPlayers([{ username: user.username, ready: false, disconnected: false }])
      setUiPhase('lobby')
      showToast(`Room ${code} created — share the code`)
    })

    socket.on('player-joined', ({ players: pl, playerCount: pc, wordLength: wl, phase }) => {
      setPlayers(pl || [])
      setPlayerCount(pc ?? pl?.length ?? 0)
      if (wl) setWordLength(wl)
      setUiPhase(mapPhaseToUi(phase, pc ?? pl?.length ?? 0))
    })

    socket.on('word-set', () => {
      setSecretDraft('')
      setHasSetWord(true)
    })

    socket.on('opponent-ready', () => showToast('Opponent is ready'))

    socket.on('game-start', ({ yourTurn: yt, opponentName: on, wordLength: wl }) => {
      if (wl) setWordLength(wl)
      setOpponentName(on || '')
      setYourTurn(yt)
      setGuesses([])
      setDraftGuess('')
      setUiPhase('playing')
      setDisconnectBanner(null)
    })

    socket.on('guess-result', ({ word, feedback }) => {
      setGuesses((g) => [...g, { word, feedback }])
      setDraftGuess('')
    })

    socket.on('turn-update', ({ yourTurn: yt, opponentGuessCount: ogc }) => {
      setYourTurn(yt)
      if (typeof ogc === 'number') setOpponentGuessCount(ogc)
    })

    socket.on('game-over', (payload) => {
      lastGameOverRef.current = payload
      setGameOver(payload)
      setUiPhase('gameover')
      setRematchRequestedBy(null)
      setRematchPending(false)
      setDisconnectBanner(null)
    })

    socket.on('rematch-start', ({ wordLength: wl }) => {
      if (wl) setWordLength(wl)
      setGuesses([])
      setDraftGuess('')
      setSecretDraft('')
      setHasSetWord(false)
      setRematchRequestedBy(null)
      setRematchPending(false)
      setGameOver(null)
      lastGameOverRef.current = null
      setUiPhase('setup')
    })

    socket.on('rematch-requested', ({ by }) => {
      setRematchRequestedBy(by)
      showToast(`${by} wants a rematch`)
    })

    socket.on('setup-abandoned', ({ by }) => {
      showToast(`${by} left during setup`)
      resetLobby()
      socket.emit('request-room-state')
    })

    socket.on('opponent-disconnected', ({ username, graceMs, graceEndsAt }) => {
      setDisconnectBanner({
        username,
        graceMs,
        graceEndsAt,
      })
    })

    socket.on('opponent-reconnected', ({ username }) => {
      setDisconnectBanner(null)
      showToast(`${username} is back`)
    })

    socket.on('player-left', ({ name }) => {
      showToast(`${name} left`)
    })

    socket.on('error', (payload) => {
      const msg =
        typeof payload === 'string'
          ? payload
          : payload?.message || 'Something went wrong'
      showToast(msg)
    })

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      setSocketConnected(false)
    }
  }, [token, user, applyRoomState, resetLobby, showToast])

  const login = useCallback(async (username, password) => {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Login failed')
    localStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (username, password) => {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Register failed')
    localStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    resetLobby()
  }, [resetLobby])

  const fetchStats = useCallback(async () => {
    if (!token) return
    const res = await fetch(apiUrl('/api/stats'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    setStats(data)
  }, [token])

  const createRoom = useCallback(
    (wl) => {
      socketRef.current?.emit('create-room', { wordLength: wl })
    },
    []
  )

  const joinRoom = useCallback((code) => {
    const c = code.trim().toUpperCase()
    setRoomCode(c)
    socketRef.current?.emit('join-room', { code: c })
  }, [])

  const submitSecretWord = useCallback((word) => {
    socketRef.current?.emit('set-word', { word })
  }, [])

  const submitGuess = useCallback((word) => {
    socketRef.current?.emit('make-guess', { word })
  }, [])

  const requestRematch = useCallback(() => {
    setRematchPending(true)
    socketRef.current?.emit('request-rematch')
  }, [])

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave-room')
    resetLobby()
  }, [resetLobby])

  return {
    token,
    user,
    authLoading,
    socketConnected,
    toast,
    uiPhase,
    roomCode,
    wordLength,
    playerCount,
    players,
    opponentName,
    yourTurn,
    guesses,
    draftGuess,
    setDraftGuess,
    secretDraft,
    setSecretDraft,
    hasSetWord,
    opponentGuessCount,
    gameOver,
    rematchRequestedBy,
    rematchPending,
    disconnectBanner,
    stats,
    statsOpen,
    setStatsOpen,
    login,
    register,
    logout,
    fetchStats,
    createRoom,
    joinRoom,
    submitSecretWord,
    submitGuess,
    requestRematch,
    leaveRoom,
    showToast,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDuelGame } from './hooks/useDuelGame'
import { DuelKeyboard } from './components/DuelKeyboard'
import { WordleBoard } from './components/WordleBoard'
import { HowToPlayFab, HowToPlayModal } from './components/HowToPlayModal'
import { letterKeyStates } from './utils/wordleTiles'
import { WORD_LEN_MAX, WORD_LEN_MIN, parseWordLengthInput } from './gameConstants'

const QUICK_LENGTHS = [4, 5, 6, 7]
const DARK_KEY = 'wordle-duel-theme'

function PillNav({ active, onPlay, onStats }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
      <button
        type="button"
        onClick={onPlay}
        className={[
          'rounded-full border-2 px-4 py-1.5 transition',
          active === 'play'
            ? 'border-foreground bg-secondary text-secondary-foreground shadow-[var(--shadow-xs)]'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        ].join(' ')}
      >
        Play
      </button>
      <button
        type="button"
        onClick={onStats}
        className={[
          'rounded-full border-2 px-4 py-1.5 transition',
          active === 'stats'
            ? 'border-foreground bg-secondary text-secondary-foreground shadow-[var(--shadow-xs)]'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        ].join(' ')}
      >
        Stats
      </button>
    </nav>
  )
}

function AuthCard({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      if (mode === 'login') await onLogin(username, password)
      else await onRegister(username, password)
    } catch (er) {
      setErr(er.message || 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border-2 border-border bg-popover p-6 shadow-[var(--shadow-md)] sm:p-8">
      <div className="mb-6 flex gap-2 rounded-lg border-2 border-border bg-card p-1 shadow-[var(--shadow-xs)]">
        {['login', 'register'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setErr('')
            }}
            className={[
              'flex-1 rounded-md border-2 py-2 text-sm font-semibold capitalize transition',
              mode === m
                ? 'border-primary bg-popover text-foreground shadow-[var(--shadow-xs)]'
                : 'border-transparent text-muted-foreground',
            ].join(' ')}
          >
            {m}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="block text-left text-sm font-medium text-foreground">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-lg border-2 border-border bg-input px-3 py-2 font-sans text-foreground shadow-[var(--shadow-xs)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="block text-left text-sm font-medium text-foreground">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="mt-1 w-full rounded-lg border-2 border-border bg-input px-3 py-2 font-sans text-foreground shadow-[var(--shadow-xs)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {err ? (
          <p className="rounded-lg border-2 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border-2 border-foreground bg-primary py-3 font-semibold text-primary-foreground shadow-[var(--shadow-md)] transition hover:brightness-105 disabled:opacity-60"
        >
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const [nav, setNav] = useState('play')
  const [joinCode, setJoinCode] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem(DARK_KEY) === '1')
  const [helpOpen, setHelpOpen] = useState(false)
  const [lengthInput, setLengthInput] = useState('5')

  const game = useDuelGame()

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem(DARK_KEY, dark ? '1' : '0')
  }, [dark])

  useEffect(() => {
    if (game.statsOpen && game.token) void game.fetchStats()
  }, [game.statsOpen, game.token, game.fetchStats])

  const letterStates = letterKeyStates(game.guesses)

  const draftRef = useRef(game.draftGuess)
  const secretRef = useRef(game.secretDraft)

  useEffect(() => {
    draftRef.current = game.draftGuess
  }, [game.draftGuess])

  useEffect(() => {
    secretRef.current = game.secretDraft
  }, [game.secretDraft])

  /* eslint-disable react-hooks/exhaustive-deps -- game setters + slice of game state */
  const typeLetter = useCallback(
    (L) => {
      if (game.uiPhase === 'playing' && game.yourTurn) {
        game.setDraftGuess((d) => (d.length < game.wordLength ? d + L : d))
        return
      }
      if (game.uiPhase === 'setup' && !game.hasSetWord) {
        game.setSecretDraft((d) => (d.length < game.wordLength ? d + L : d))
      }
    },
    [
      game.uiPhase,
      game.yourTurn,
      game.hasSetWord,
      game.wordLength,
      game.setDraftGuess,
      game.setSecretDraft,
    ]
  )
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const active =
        (game.uiPhase === 'playing' && game.yourTurn) ||
        (game.uiPhase === 'setup' && !game.hasSetWord)
      if (!active) return
      if (e.key === 'Backspace') {
        e.preventDefault()
        if (game.uiPhase === 'playing') game.setDraftGuess((d) => d.slice(0, -1))
        else game.setSecretDraft((d) => d.slice(0, -1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (game.uiPhase === 'playing') {
          const w = draftRef.current
          if (w.length === game.wordLength) game.submitGuess(w.toLowerCase())
        } else {
          const w = secretRef.current
          if (w.length === game.wordLength) game.submitSecretWord(w.toLowerCase())
        }
        return
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault()
        typeLetter(e.key.toUpperCase())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs track latest draft strings for Enter
  }, [
    game.uiPhase,
    game.yourTurn,
    game.hasSetWord,
    game.wordLength,
    game.setDraftGuess,
    game.setSecretDraft,
    game.submitGuess,
    game.submitSecretWord,
    typeLetter,
  ])

  const closeHelp = useCallback(() => setHelpOpen(false), [])

  const copyCode = () => {
    if (!game.roomCode) return
    void navigator.clipboard.writeText(game.roomCode)
    game.showToast('Room code copied')
  }

  const openStats = () => {
    setNav('stats')
    game.setStatsOpen(true)
  }

  if (game.authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background font-sans text-foreground">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background font-sans text-foreground">
      <HowToPlayModal open={helpOpen} onClose={closeHelp} />
      {!helpOpen ? <HowToPlayFab onClick={() => setHelpOpen(true)} /> : null}

      {game.toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-50 max-w-[min(90vw,24rem)] -translate-x-1/2 rounded-lg border-2 border-border bg-card px-4 py-3 text-center text-sm font-medium text-card-foreground shadow-[var(--shadow-lg)]"
          role="status"
        >
          {game.toast}
        </div>
      ) : null}

      <header className="border-b-2 border-border bg-sidebar/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Wordle Duel
            </span>
            {game.user ? <PillNav active={nav} onPlay={() => setNav('play')} onStats={openStats} /> : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-border bg-popover text-lg shadow-[var(--shadow-xs)]"
              aria-label={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? '☀' : '☾'}
            </button>
            {game.user ? (
              <div className="flex items-center gap-2 rounded-lg border-2 border-border bg-popover px-3 py-1.5 shadow-[var(--shadow-xs)]">
                <span className="max-w-[8rem] truncate text-sm font-medium">{game.user.username}</span>
                <button
                  type="button"
                  onClick={game.logout}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {game.user ? (
        <div className="border-b-2 border-border bg-secondary py-3">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground/80">
              Quick join
            </p>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="Room code (6 chars)"
                className="min-w-[12rem] flex-1 rounded-lg border-2 border-primary bg-popover px-3 py-2 font-mono text-sm font-semibold tracking-widest text-foreground shadow-[var(--shadow-xs)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => {
                  if (joinCode.length === 6) {
                    game.joinRoom(joinCode)
                    setJoinCode('')
                  }
                }}
                disabled={joinCode.length !== 6 || !game.socketConnected}
                className="rounded-lg border-2 border-foreground bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-sm)] disabled:opacity-50"
              >
                Join
              </button>
            </div>
            <span
              className={`text-xs font-medium ${game.socketConnected ? 'text-secondary-foreground' : 'text-destructive'}`}
            >
              {game.socketConnected ? '● Live' : '○ Offline'}
            </span>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {!game.user ? (
          <div className="mx-auto max-w-md">
            <AuthCard onLogin={game.login} onRegister={game.register} />
          </div>
        ) : (
          <>
            <section className="mb-10 text-center">
              <div className="mb-6 flex justify-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-secondary text-2xl shadow-[var(--shadow-md)] sm:h-24 sm:w-24">
                  ⚔
                </div>
                <div className="flex items-center text-2xl font-bold text-muted-foreground">×</div>
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-secondary text-2xl shadow-[var(--shadow-md)] sm:h-24 sm:w-24">
                  ✦
                </div>
              </div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Guess their word first
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
                <span className="font-semibold text-foreground">1.</span> Create or join a room.{' '}
                <span className="font-semibold text-foreground">2.</span> Pick a secret word — then take turns
                guessing on a shared board. Words are{' '}
                <span className="rounded-md border border-primary bg-secondary px-1.5 py-0.5 font-mono text-xs text-secondary-foreground">
                  {WORD_LEN_MIN}–{WORD_LEN_MAX} letters
                </span>
                .
              </p>
            </section>

            <div className="rounded-xl border-2 border-border bg-card p-5 shadow-[var(--shadow-md)] sm:p-8">
              {nav === 'stats' ? (
                <div>
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h2 className="font-serif text-2xl font-semibold">Your stats</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setNav('play')
                        game.setStatsOpen(false)
                      }}
                      className="rounded-lg border-2 border-border bg-popover px-3 py-1.5 text-sm font-semibold shadow-[var(--shadow-xs)]"
                    >
                      Back to play
                    </button>
                  </div>
                  {game.stats ? (
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {[
                        ['Games', game.stats.gamesPlayed],
                        ['Wins', game.stats.wins],
                        ['Losses', game.stats.losses],
                        ['Win rate', `${game.stats.winRate}%`],
                        ['Avg guesses', game.stats.avgGuessesPerGame],
                        ['Best streak', game.stats.bestStreak],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="rounded-lg border-2 border-border bg-popover p-4 shadow-[var(--shadow-xs)]"
                        >
                          <dt className="text-xs font-medium uppercase text-muted-foreground">{k}</dt>
                          <dd className="mt-1 font-mono text-xl font-semibold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-muted-foreground">No stats yet.</p>
                  )}
                </div>
              ) : (
                <>
                  {game.disconnectBanner ? (
                    <div className="mb-4 rounded-lg border-2 border-primary bg-secondary/60 px-4 py-3 text-sm font-medium text-secondary-foreground shadow-[var(--shadow-xs)]">
                      {game.disconnectBanner.username} disconnected — waiting up to{' '}
                      {Math.ceil((game.disconnectBanner.graceMs || 0) / 1000)}s for reconnect…
                    </div>
                  ) : null}

                  {game.uiPhase === 'lobby' && !game.roomCode ? (
                    <div className="flex flex-col gap-6">
                      <h2 className="font-serif text-2xl font-semibold">Start a match</h2>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-muted-foreground" htmlFor="word-len">
                          Word length ({WORD_LEN_MIN}–{WORD_LEN_MAX} letters)
                        </label>
                        <div className="flex flex-wrap items-end gap-3">
                          <input
                            id="word-len"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={2}
                            value={lengthInput}
                            onChange={(e) =>
                              setLengthInput(e.target.value.replace(/\D/g, '').slice(0, 2))
                            }
                            onBlur={() => {
                              const n = parseWordLengthInput(lengthInput)
                              setLengthInput(String(n))
                            }}
                            className="w-24 rounded-lg border-2 border-primary bg-popover px-3 py-2 font-mono text-lg font-bold text-foreground shadow-[var(--shadow-xs)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-describedby="word-len-hint"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const n = parseWordLengthInput(lengthInput)
                              setLengthInput(String(n))
                              game.createRoom(n)
                            }}
                            disabled={!game.socketConnected}
                            className="rounded-lg border-2 border-foreground bg-primary px-5 py-2 font-semibold text-primary-foreground shadow-[var(--shadow-md)] disabled:opacity-50"
                          >
                            Create room
                          </button>
                        </div>
                        <p id="word-len-hint" className="mt-2 text-xs text-muted-foreground">
                          Pick how many letters both secret words and guesses will use. Use any letters you like — no
                          dictionary required.
                        </p>
                        <p className="mb-2 mt-4 text-sm font-medium text-muted-foreground">Quick picks</p>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_LENGTHS.map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => {
                                setLengthInput(String(n))
                                game.createRoom(n)
                              }}
                              disabled={!game.socketConnected}
                              className="rounded-lg border-2 border-border bg-popover px-4 py-2 font-mono font-semibold shadow-[var(--shadow-xs)] transition hover:border-primary disabled:opacity-50"
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Or use <strong className="text-foreground">Quick join</strong> above with a friend&apos;s
                        code.
                      </p>
                    </div>
                  ) : null}

                  {game.uiPhase === 'lobby' && game.roomCode ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <h2 className="font-serif text-2xl font-semibold">Waiting for opponent</h2>
                      <p className="text-muted-foreground">Share this code:</p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <code className="rounded-lg border-2 border-primary bg-popover px-4 py-3 font-mono text-2xl font-bold tracking-[0.2em] shadow-[var(--shadow-md)]">
                          {game.roomCode}
                        </code>
                        <button
                          type="button"
                          onClick={copyCode}
                          className="rounded-lg border-2 border-border bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground shadow-[var(--shadow-sm)]"
                        >
                          Copy
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={game.leaveRoom}
                        className="mt-2 text-sm font-semibold text-destructive underline-offset-2 hover:underline"
                      >
                        Cancel room
                      </button>
                    </div>
                  ) : null}

                  {game.uiPhase === 'setup' ? (
                    <div className="mx-auto max-w-lg">
                      <h2 className="mb-2 font-serif text-2xl font-semibold">Pick your secret word</h2>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {game.wordLength} letters — your opponent will try to guess it.{' '}
                        {game.hasSetWord ? (
                          <span className="font-semibold text-primary">Locked in. Waiting for the other player…</span>
                        ) : null}
                      </p>
                      {!game.hasSetWord ? (
                        <>
                          <WordleBoard
                            wordLength={game.wordLength}
                            guesses={[]}
                            currentDraft={game.secretDraft}
                          />
                          <DuelKeyboard
                            letterStates={{}}
                            onKey={typeLetter}
                            onBackspace={() => game.setSecretDraft((d) => d.slice(0, -1))}
                            onEnter={() => {
                              if (game.secretDraft.length === game.wordLength) {
                                game.submitSecretWord(game.secretDraft.toLowerCase())
                              }
                            }}
                            enterDisabled={game.secretDraft.length !== game.wordLength}
                          />
                        </>
                      ) : (
                        <WordleBoard wordLength={game.wordLength} guesses={[]} currentDraft={null} />
                      )}
                    </div>
                  ) : null}

                  {game.uiPhase === 'playing' ? (
                    <div className="mx-auto max-w-lg">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-serif text-xl font-semibold sm:text-2xl">
                          vs {game.opponentName || 'Opponent'}
                        </h2>
                        <span
                          className={[
                            'rounded-full border-2 px-3 py-1 text-xs font-bold uppercase',
                            game.yourTurn
                              ? 'border-primary bg-secondary text-secondary-foreground'
                              : 'border-border bg-muted text-muted-foreground',
                          ].join(' ')}
                        >
                          {game.yourTurn ? 'Your turn' : 'Their turn'}
                        </span>
                      </div>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Their guesses so far:{' '}
                        <span className="font-mono font-semibold text-foreground">{game.opponentGuessCount}</span>
                      </p>
                      <WordleBoard
                        wordLength={game.wordLength}
                        guesses={game.guesses}
                        currentDraft={game.yourTurn ? game.draftGuess : null}
                      />
                      {game.yourTurn ? (
                        <DuelKeyboard
                          letterStates={letterStates}
                          onKey={typeLetter}
                          onBackspace={() => game.setDraftGuess((d) => d.slice(0, -1))}
                          onEnter={() => {
                            if (game.draftGuess.length === game.wordLength) {
                              game.submitGuess(game.draftGuess.toLowerCase())
                            }
                          }}
                          enterDisabled={game.draftGuess.length !== game.wordLength}
                        />
                      ) : (
                        <p className="mt-4 text-center text-sm text-muted-foreground">
                          Watch the board — it&apos;s their turn to guess.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {game.uiPhase === 'gameover' && game.gameOver ? (
                    <div className="mx-auto max-w-md text-center">
                      <h2 className="mb-2 font-serif text-3xl font-semibold">
                        {game.gameOver.result === 'win' ? 'You won!' : 'You lost'}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Winner: <span className="font-semibold text-foreground">{game.gameOver.winner}</span>
                        {game.gameOver.endReason === 'disconnect' ? (
                          <span className="block mt-1 text-xs">(opponent disconnected)</span>
                        ) : null}
                      </p>
                      <div className="mt-6 rounded-lg border-2 border-border bg-popover p-4 text-left text-sm shadow-[var(--shadow-xs)]">
                        <p>
                          <span className="text-muted-foreground">Your word:</span>{' '}
                          <span className="font-mono font-bold">{game.gameOver.yourWord}</span>
                        </p>
                        <p className="mt-2">
                          <span className="text-muted-foreground">Their word:</span>{' '}
                          <span className="font-mono font-bold">{game.gameOver.opponentWord}</span>
                        </p>
                        <p className="mt-2 text-muted-foreground">
                          Guesses — you: {game.gameOver.yourGuesses}, them: {game.gameOver.opponentGuesses}
                          {game.gameOver.duration != null ? ` · ${game.gameOver.duration}s` : ''}
                        </p>
                      </div>
                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                          type="button"
                          onClick={game.requestRematch}
                          className="rounded-lg border-2 border-foreground bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[var(--shadow-md)]"
                        >
                          Rematch
                        </button>
                        <button
                          type="button"
                          onClick={game.leaveRoom}
                          className="rounded-lg border-2 border-border bg-popover px-6 py-3 font-semibold shadow-[var(--shadow-xs)]"
                        >
                          Leave room
                        </button>
                      </div>
                      {game.rematchPending || game.rematchRequestedBy ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Waiting for opponent to accept rematch…
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {game.uiPhase === 'gameover' && !game.gameOver ? (
                    <div className="text-center">
                      <p className="text-muted-foreground">Game finished. Use rematch or leave from the menu.</p>
                      <button
                        type="button"
                        onClick={game.leaveRoom}
                        className="mt-4 rounded-lg border-2 border-border bg-popover px-4 py-2 text-sm font-semibold"
                      >
                        Leave room
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

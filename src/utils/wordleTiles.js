const rank = { correct: 3, present: 2, absent: 1 }

export function letterKeyStates(guesses) {
  const best = {}
  for (const g of guesses) {
    if (!g.feedback) continue
    const letters = g.word.toUpperCase().split('')
    g.feedback.forEach((fb, i) => {
      const L = letters[i]
      const r = rank[fb] || 0
      if (!best[L] || r > rank[best[L]]) best[L] = fb
    })
  }
  return best
}

export function keyCapClass(state) {
  if (state === 'correct') return 'bg-tile-correct text-primary-foreground border-foreground'
  if (state === 'present') return 'bg-tile-present text-foreground border-foreground'
  if (state === 'absent') return 'bg-tile-absent text-primary-foreground/90 border-foreground/30'
  return 'bg-secondary text-secondary-foreground border-border hover:brightness-95'
}

function cellClass(fb) {
  if (fb === 'correct') return 'bg-tile-correct text-primary-foreground border-foreground'
  if (fb === 'present') return 'bg-tile-present text-foreground border-foreground'
  if (fb === 'absent') return 'bg-tile-absent text-primary-foreground border-foreground/40'
  return 'bg-popover text-foreground border-border'
}

function sizeClasses(wordLength) {
  if (wordLength > 12) {
    return {
      cell: 'h-7 w-7 text-xs sm:h-8 sm:w-8 sm:text-sm',
      colGap: 'gap-y-0.5 sm:gap-y-1',
      rowGap: 'gap-0.5 sm:gap-1',
    }
  }
  if (wordLength > 8) {
    return {
      cell: 'h-9 w-9 text-sm sm:h-10 sm:w-10 sm:text-base',
      colGap: 'gap-y-1 sm:gap-y-1.5',
      rowGap: 'gap-1 sm:gap-1.5',
    }
  }
  return {
    cell: 'h-12 w-12 text-lg sm:h-14 sm:w-14 sm:text-xl',
    colGap: 'gap-y-1.5 sm:gap-y-2',
    rowGap: 'gap-1.5 sm:gap-2',
  }
}

export function WordleBoard({ wordLength, guesses, currentDraft }) {
  const { cell, colGap, rowGap } = sizeClasses(wordLength)
  const minRows = 6
  const rows = []

  for (const g of guesses) {
    const letters = g.word.toUpperCase().split('')
    const fb = g.feedback || []
    rows.push({ letters, feedback: fb, draft: false })
  }

  if (currentDraft !== undefined && currentDraft !== null) {
    const letters = []
    for (let i = 0; i < wordLength; i++) {
      letters.push((currentDraft[i] || ' ').toUpperCase())
    }
    rows.push({ letters, feedback: null, draft: true })
  }

  while (rows.length < minRows) {
    rows.push({
      letters: Array(wordLength).fill(''),
      feedback: null,
      draft: false,
      empty: true,
    })
  }

  return (
    <div className={`flex flex-col ${colGap}`} role="grid" aria-label="Guess grid">
      {rows.map((row, ri) => (
        <div key={ri} className={`flex justify-center ${rowGap}`} role="row">
          {Array.from({ length: wordLength }, (_, i) => {
            const ch = row.letters[i]
            const fb = row.feedback?.[i]
            const isEmpty = !ch || ch === ' '
            return (
              <div
                key={i}
                role="gridcell"
                className={[
                  'flex items-center justify-center rounded-lg border-2 font-semibold uppercase',
                  cell,
                  row.empty
                    ? 'border-border/50 bg-popover/40'
                    : row.draft && isEmpty
                      ? 'border-border bg-popover'
                      : row.draft
                        ? 'border-primary bg-popover shadow-[var(--shadow-xs)]'
                        : cellClass(fb),
                ].join(' ')}
              >
                {!row.empty && !isEmpty ? ch : ''}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

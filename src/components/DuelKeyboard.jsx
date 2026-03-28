import { keyCapClass } from '../utils/wordleTiles'

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

export function DuelKeyboard({ letterStates, onKey, onBackspace, onEnter, enterDisabled }) {
  return (
    <div className="mt-4 flex w-full max-w-xl flex-col gap-2">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1">
          {ri === 2 && (
            <button
              type="button"
              className="h-10 rounded-md border-2 border-border bg-accent px-2 text-xs font-semibold text-accent-foreground shadow-[var(--shadow-xs)] sm:px-3 sm:text-sm"
              onClick={onEnter}
              disabled={enterDisabled}
            >
              Enter
            </button>
          )}
          {row.map((k) => (
            <button
              key={k}
              type="button"
              className={[
                'h-10 min-w-[2rem] rounded-md border-2 px-1 text-sm font-semibold shadow-[var(--shadow-xs)] sm:min-w-[2.25rem] sm:px-2',
                keyCapClass(letterStates[k]),
              ].join(' ')}
              onClick={() => onKey(k)}
            >
              {k}
            </button>
          ))}
          {ri === 2 && (
            <button
              type="button"
              className="h-10 rounded-md border-2 border-border bg-muted px-2 text-xs font-semibold text-muted-foreground shadow-[var(--shadow-xs)] sm:px-3 sm:text-sm"
              onClick={onBackspace}
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

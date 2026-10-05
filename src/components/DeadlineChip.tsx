import { useState } from 'react'
import { relativeDeadline } from '../lib/deadline'

const pad = (n: number) => String(n).padStart(2, '0')
export function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  date: Date
  now: Date
  muted?: boolean
  onChange: (d: Date | null) => void
}

/** Small date chip; click to change the date or remove it. */
export function DeadlineChip({ date, now, muted, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const overdue = !muted && date < now
  const label = date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.getHours() === 23 && date.getMinutes() === 59 ? {} : { hour: '2-digit', minute: '2-digit' }),
  })
  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  if (!open) {
    return (
      <button
        type="button"
        className={'chip' + (overdue ? ' overdue' : '')}
        title={relativeDeadline(date, now)}
        onClick={(e) => {
          stop(e)
          setOpen(true)
        }}
      >
        {label}
      </button>
    )
  }
  return (
    <span className="chip-edit" onClick={stop}>
      <input
        type="datetime-local"
        aria-label="Deadline"
        defaultValue={toLocalInput(date)}
        onChange={(e) => {
          const d = new Date(e.target.value)
          if (!Number.isNaN(d.getTime())) {
            onChange(d)
            setOpen(false)
          }
        }}
      />
      <button
        type="button"
        onClick={(e) => {
          stop(e)
          onChange(null)
          setOpen(false)
        }}
      >
        Remove
      </button>
      <button
        type="button"
        onClick={(e) => {
          stop(e)
          setOpen(false)
        }}
      >
        ✕
      </button>
    </span>
  )
}

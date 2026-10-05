import { useEffect, useRef, useState } from 'react'
import { suggestTags, tagBeingTyped } from '../lib/tags'
import { appendToList, isOpenList, listTagOf } from '../lib/checklist'
import type { Note } from '../lib/types'

const DRAFT_KEY = 'necro.draft'

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}
function writeDraft(v: string) {
  try {
    if (v) localStorage.setItem(DRAFT_KEY, v)
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* drafts are best-effort */
  }
}

interface Props {
  notes: Note[]
  knownTags: string[]
  onCreate: (body: string) => Promise<unknown>
  onAppend: (id: string, body: string) => Promise<unknown>
}

export function Capture({ notes, knownTags, onCreate, onAppend }: Props) {
  const [text, setText] = useState(readDraft)
  const [caret, setCaret] = useState(0)
  const [offer, setOffer] = useState<Note | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => ref.current?.focus(), [])
  useEffect(() => writeDraft(text), [text])

  const typing = tagBeingTyped(text, caret)
  const suggestions = typing ? suggestTags(knownTags, typing.prefix) : []

  function accept(tag: string) {
    if (!typing) return
    const next = text.slice(0, typing.start) + '#' + tag + ' ' + text.slice(caret)
    setText(next)
    const pos = typing.start + tag.length + 2
    setCaret(pos)
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(pos, pos)
    })
  }

  async function finish(body: string, target?: Note) {
    if (target) await onAppend(target.id, appendToList(target.body, body, new Date()))
    else await onCreate(body)
    setText('')
    setOffer(null)
    ref.current?.focus()
  }

  function submit() {
    if (!text.trim()) return
    if (listTagOf(text) === 'groc') {
      const existing = notes.find((n) => isOpenList(n.body, 'groc'))
      if (existing) {
        setOffer(existing)
        return
      }
    }
    void finish(text)
  }

  return (
    <section className="capture">
      <textarea
        ref={ref}
        value={text}
        placeholder="Feed it. (#todo, #groc, #read …)"
        aria-label="New note"
        rows={3}
        onChange={(e) => {
          setText(e.target.value)
          setCaret(e.target.selectionStart)
          setOffer(null)
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            submit()
          } else if (e.key === 'Tab' && suggestions.length) {
            e.preventDefault()
            accept(suggestions[0])
          }
        }}
      />
      {suggestions.length > 0 && (
        <div className="suggest" role="listbox" aria-label="Tag suggestions">
          {suggestions.map((t) => (
            <button key={t} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => accept(t)}>
              #{t}
            </button>
          ))}
        </div>
      )}
      {offer && (
        <div className="offer" role="alert">
          <span>You already have an open #groc list. Add these items to it?</span>
          <button type="button" onClick={() => finish(text, offer)}>Append to it</button>
          <button type="button" onClick={() => finish(text)}>Create new</button>
          <button type="button" onClick={() => setOffer(null)}>Cancel</button>
        </div>
      )}
      <div className="capture-bar">
        <span className="hint">Ctrl+Enter to save</span>
        <button type="button" className="save" onClick={submit} disabled={!text.trim()}>
          Save
        </button>
      </div>
    </section>
  )
}

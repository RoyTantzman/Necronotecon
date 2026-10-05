import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import App from '../App'
import { LocalAdapter, type NoteAdapter } from '../lib/storage'
import { SyncedAdapter } from '../lib/sync'
import { SupabaseAdapter } from '../lib/supabase'

/** Email + password sign-in (no sign-up: the single user is created in the Supabase dashboard). */
export function AuthGate({ client }: { client: SupabaseClient }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    void client.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = client.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [client])

  const userId = session?.user.id
  const adapter: NoteAdapter | null = useMemo(
    () =>
      userId
        ? new SyncedAdapter(new LocalAdapter(`necronotecon-${userId}`), new SupabaseAdapter(client), {
            onSignOut: async () => void (await client.auth.signOut()),
          })
        : null,
    [client, userId],
  )

  if (session === undefined) return null
  if (!adapter) return <Login client={client} />
  return <App adapter={adapter} />
}

function Login({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="app login">
      <h1>Necronotecon</h1>
      <form onSubmit={submit}>
        <label>
          Email
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="save" disabled={busy}>Sign in</button>
      </form>
    </div>
  )
}

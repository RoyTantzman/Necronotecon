import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LocalAdapter } from './lib/storage'
import './styles.css'

async function boot() {
  const root = createRoot(document.getElementById('root')!)
  let ui
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    // Loaded on demand so the local-only build stays small.
    const [{ makeClient }, { AuthGate }] = await Promise.all([import('./lib/supabaseClient'), import('./components/AuthGate')])
    ui = <AuthGate client={makeClient()} />
  } else {
    ui = <App adapter={new LocalAdapter()} />
  }
  root.render(<StrictMode>{ui}</StrictMode>)

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {})
    })
  }
}

void boot()

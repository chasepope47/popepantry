import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { ensureHousehold } from './lib/household'
import type { Session } from '@supabase/supabase-js'
import AuthPage from './pages/AuthPage'
import PantryPage from './pages/PantryPage'
import ShoppingListPage from './pages/ShoppingListPage'
import HistoryPage from './pages/HistoryPage'
import HouseholdPage from './pages/HouseholdPage'

type Tab = 'pantry' | 'shopping' | 'history' | 'home'

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, () => setDark(d => !d)] as const
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [householdError, setHouseholdError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pantry')
  const [dark, toggleDark] = useDarkMode()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) { setHouseholdId(null); setHouseholdError(null); return }
    setHouseholdError(null)
    ensureHousehold(session.user.id, session.user.email ?? '')
      .then(setHouseholdId)
      .catch((err) => {
        console.error(err)
        setHouseholdError(err?.message ?? 'Failed to load household')
      })
  }, [session])

  if (session === undefined || (session && !householdId && !householdError)) {
    return <div className="min-h-dvh flex items-center justify-center text-stone-400 dark:bg-stone-950">Loading…</div>
  }

  if (householdError) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-4 bg-[#f8f5f0] dark:bg-stone-950">
        <div className="text-4xl">⚠️</div>
        <p className="font-semibold text-stone-800 dark:text-stone-100">Setup incomplete</p>
        <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs">
          The database tables aren't set up yet. Please run the SQL setup in your Supabase SQL Editor, then reload.
        </p>
        <p className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl max-w-xs break-all">{householdError}</p>
        <button onClick={() => window.location.reload()}
          className="mt-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold">Reload</button>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-stone-400 underline">Sign out</button>
      </div>
    )
  }

  if (!session) return <AuthPage />

  const tabs: { id: Tab; emoji: string; label: string }[] = [
    { id: 'pantry', emoji: '🥫', label: 'Pantry' },
    { id: 'shopping', emoji: '🛒', label: 'Shopping' },
    { id: 'history', emoji: '🕐', label: 'History' },
    { id: 'home', emoji: '🏠', label: 'Home' },
  ]

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex-1">
        {tab === 'pantry' && (
          <PantryPage householdId={householdId!} onNavigateToShopping={() => setTab('shopping')} />
        )}
        {tab === 'shopping' && <ShoppingListPage householdId={householdId!} />}
        {tab === 'history' && <HistoryPage householdId={householdId!} />}
        {tab === 'home' && (
          <HouseholdPage
            householdId={householdId!}
            onHouseholdChanged={newId => { setHouseholdId(newId); setTab('pantry') }}
          />
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700 flex z-30">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
              tab === t.id ? 'text-amber-500' : 'text-stone-400 dark:text-stone-500'
            }`}
          >
            <span className="text-xl">{t.emoji}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
        <button
          onClick={toggleDark}
          className="flex flex-col items-center gap-1 py-2.5 px-4 text-stone-400 dark:text-stone-500 transition-colors"
          aria-label="Toggle dark mode"
        >
          <span className="text-xl">{dark ? '☀️' : '🌙'}</span>
          <span className="text-[10px] font-medium">{dark ? 'Light' : 'Dark'}</span>
        </button>
      </nav>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { ensureHousehold } from './lib/household'
import type { Session } from '@supabase/supabase-js'
import AuthPage from './pages/AuthPage'
import PantryPage from './pages/PantryPage'
import ShoppingListPage from './pages/ShoppingListPage'
import HouseholdPage from './pages/HouseholdPage'

type Tab = 'pantry' | 'shopping' | 'home'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pantry')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) { setHouseholdId(null); return }
    ensureHousehold(session.user.id, session.user.email ?? '')
      .then(setHouseholdId)
      .catch(console.error)
  }, [session])

  if (session === undefined || (session && !householdId)) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-stone-400">
        Loading…
      </div>
    )
  }

  if (!session) return <AuthPage />

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex-1">
        {tab === 'pantry' && (
          <PantryPage
            householdId={householdId!}
            onNavigateToShopping={() => setTab('shopping')}
          />
        )}
        {tab === 'shopping' && <ShoppingListPage householdId={householdId!} />}
        {tab === 'home' && (
          <HouseholdPage
            householdId={householdId!}
            onHouseholdChanged={newId => { setHouseholdId(newId); setTab('pantry') }}
          />
        )}
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex z-30">
        <button
          onClick={() => setTab('pantry')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${tab === 'pantry' ? 'text-amber-500' : 'text-stone-400'}`}
        >
          <span className="text-xl">🥫</span>
          <span className="text-xs font-medium">Pantry</span>
        </button>
        <button
          onClick={() => setTab('shopping')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${tab === 'shopping' ? 'text-amber-500' : 'text-stone-400'}`}
        >
          <span className="text-xl">🛒</span>
          <span className="text-xs font-medium">Shopping</span>
        </button>
        <button
          onClick={() => setTab('home')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${tab === 'home' ? 'text-amber-500' : 'text-stone-400'}`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-xs font-medium">Home</span>
        </button>
      </nav>
    </div>
  )
}

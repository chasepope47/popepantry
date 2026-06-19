import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import AuthPage from './pages/AuthPage'
import PantryPage from './pages/PantryPage'
import ShoppingListPage from './pages/ShoppingListPage'

type Tab = 'pantry' | 'shopping'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('pantry')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
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
        {tab === 'pantry' ? (
          <PantryPage onNavigateToShopping={() => setTab('shopping')} />
        ) : (
          <ShoppingListPage />
        )}
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex z-30 safe-area-pb">
        <button
          onClick={() => setTab('pantry')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            tab === 'pantry' ? 'text-amber-500' : 'text-stone-400'
          }`}
        >
          <span className="text-xl">🥫</span>
          <span className="text-xs font-medium">Pantry</span>
        </button>
        <button
          onClick={() => setTab('shopping')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            tab === 'shopping' ? 'text-amber-500' : 'text-stone-400'
          }`}
        >
          <span className="text-xl">🛒</span>
          <span className="text-xs font-medium">Shopping</span>
        </button>
      </nav>
    </div>
  )
}

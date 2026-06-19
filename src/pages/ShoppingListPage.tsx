import { useEffect, useState, useCallback } from 'react'
import { ShoppingCart, Trash2, RefreshCw } from 'lucide-react'
import { supabase, CATEGORIES, type ShoppingSuggestion } from '../lib/supabase'

type Props = { householdId: string }

export default function ShoppingListPage({ householdId }: Props) {
  const [suggestions, setSuggestions] = useState<ShoppingSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('shopping_suggestions')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
    setSuggestions(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSuggestions() }, [fetchSuggestions])

  async function syncExpiring() {
    setSyncing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSyncing(false); return }

    const { data: items } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('household_id', householdId)
      .not('expiration_date', 'is', null)

    if (items) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const expiring = items.filter(item => {
        const exp = new Date(item.expiration_date + 'T00:00:00')
        const diffDays = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays <= 3
      })

      for (const item of expiring) {
        // avoid duplicates
        const { data: existing } = await supabase
          .from('shopping_suggestions')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', item.name)
          .eq('reason', 'expiring_soon')
          .limit(1)

        if (!existing || existing.length === 0) {
          await supabase.from('shopping_suggestions').insert({
            user_id: user.id,
            household_id: householdId,
            name: item.name,
            category: item.category,
            last_price: item.price,
            reason: 'expiring_soon',
          })
        }
      }
    }

    await fetchSuggestions()
    setSyncing(false)
  }

  async function dismiss(id: string) {
    await supabase.from('shopping_suggestions').delete().eq('id', id)
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  async function dismissAll() {
    await supabase.from('shopping_suggestions').delete().eq('household_id', householdId)
    setSuggestions([])
  }

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: suggestions.filter(s => s.category === cat.label),
  })).filter(g => g.items.length > 0)

  const uncategorized = suggestions.filter(
    s => !s.category || !CATEGORIES.find(c => c.label === s.category)
  )

  return (
    <div className="flex flex-col bg-[#f8f5f0] min-h-dvh">
      <header className="bg-white border-b border-stone-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛒</span>
          <h1 className="text-xl font-bold text-stone-900">Shopping List</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={syncExpiring}
            disabled={syncing}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors"
            title="Check for expiring items"
          >
            <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
          </button>
          {suggestions.length > 0 && (
            <button
              onClick={dismissAll}
              className="text-xs text-stone-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full pb-32">
        {/* Legend */}
        <div className="flex gap-3 mb-4 text-xs">
          <span className="flex items-center gap-1 text-stone-500">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Expiring soon
          </span>
          <span className="flex items-center gap-1 text-stone-500">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Used up
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-stone-400">Loading…</div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingCart size={48} className="text-stone-300 mb-4" />
            <p className="text-stone-500 font-medium">Your shopping list is empty</p>
            <p className="text-stone-400 text-sm mt-1 max-w-xs">
              Items will appear here when they expire soon or when you finish them in your pantry
            </p>
            <button
              onClick={syncExpiring}
              disabled={syncing}
              className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              Check for expiring items
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-base">{group.emoji}</span>
                  <span className="text-sm font-semibold text-stone-600 uppercase tracking-wide">
                    {group.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map(s => (
                    <SuggestionRow key={s.id} suggestion={s} onDismiss={() => dismiss(s.id)} />
                  ))}
                </div>
              </div>
            ))}
            {uncategorized.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-base">📦</span>
                  <span className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Other</span>
                </div>
                <div className="space-y-2">
                  {uncategorized.map(s => (
                    <SuggestionRow key={s.id} suggestion={s} onDismiss={() => dismiss(s.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function SuggestionRow({ suggestion, onDismiss }: { suggestion: ShoppingSuggestion; onDismiss: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center gap-3">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${suggestion.reason === 'expiring_soon' ? 'bg-red-400' : 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-stone-900 truncate">{suggestion.name}</p>
        <p className="text-xs text-stone-400 mt-0.5">
          {suggestion.reason === 'expiring_soon' ? 'Expiring soon' : 'Used up'}
          {suggestion.last_price ? ` · Last price $${suggestion.last_price.toFixed(2)}` : ''}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="p-2 rounded-xl text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

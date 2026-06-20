import { useEffect, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { supabase, CATEGORIES } from '../lib/supabase'

type CategoryEntry = { label: string; emoji: string; total: number }
type StoreEntry = { name: string; total: number; categories: CategoryEntry[] }

export default function SpendingReport({ householdId }: { householdId: string }) {
  const [stores, setStores] = useState<StoreEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [drillStore, setDrillStore] = useState<StoreEntry | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('pantry_items')
        .select('store, category, price, quantity')
        .eq('household_id', householdId)

      if (!data) { setLoading(false); return }

      const storeMap = new Map<string, Map<string, number>>()

      for (const item of data) {
        const storeName = item.store?.trim() || 'No Store'
        const catLabel = item.category || 'Other'
        const value = (item.price ?? 0) * (item.quantity ?? 1)
        if (!storeMap.has(storeName)) storeMap.set(storeName, new Map())
        const catMap = storeMap.get(storeName)!
        catMap.set(catLabel, (catMap.get(catLabel) ?? 0) + value)
      }

      const result: StoreEntry[] = []
      for (const [storeName, catMap] of storeMap) {
        const categories: CategoryEntry[] = []
        for (const [label, total] of catMap) {
          const def = CATEGORIES.find(c => c.label === label)
          categories.push({ label, emoji: def?.emoji ?? '📦', total })
        }
        categories.sort((a, b) => b.total - a.total)
        result.push({ name: storeName, total: categories.reduce((s, c) => s + c.total, 0), categories })
      }

      result.sort((a, b) => {
        if (a.name === 'No Store') return 1
        if (b.name === 'No Store') return -1
        return b.total - a.total
      })

      setStores(result)
      setLoading(false)
    }
    load()
  }, [householdId])

  if (loading) {
    return <div className="py-6 text-center text-stone-400 dark:text-stone-500 text-sm">Loading…</div>
  }

  if (stores.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-stone-400 dark:text-stone-500 text-sm">No pantry data yet</p>
        <p className="text-stone-400 dark:text-stone-600 text-xs mt-1">Add items to see your spending breakdown</p>
      </div>
    )
  }

  const grandTotal = stores.reduce((s, st) => s + st.total, 0)

  // Drill-down: category breakdown for a selected store
  if (drillStore) {
    return (
      <div>
        <button
          onClick={() => setDrillStore(null)}
          className="flex items-center gap-1 text-sm font-medium text-amber-500 mb-4"
        >
          <ChevronLeft size={16} />
          All stores
        </button>

        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span>🏪</span>{drillStore.name}
          </p>
          <p className="text-sm font-bold text-amber-500">${drillStore.total.toFixed(2)}</p>
        </div>

        <div className="space-y-4">
          {drillStore.categories.map(cat => {
            const pct = (cat.total / drillStore.total) * 100
            return (
              <div key={cat.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <span>{cat.emoji}</span>{cat.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 dark:text-stone-500">{pct.toFixed(0)}%</span>
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">${cat.total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Top-level: store list
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-stone-400 dark:text-stone-500">Tap a store to see category breakdown</p>
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Total: ${grandTotal.toFixed(2)}</p>
      </div>

      <div className="space-y-4">
        {stores.map(store => {
          const pct = (store.total / grandTotal) * 100
          return (
            <button
              key={store.name}
              onClick={() => setDrillStore(store)}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <span>🏪</span>{store.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">${store.total.toFixed(2)}</span>
                  <ChevronRight size={14} className="text-stone-300 dark:text-stone-600 group-hover:text-amber-400 transition-colors" />
                </div>
              </div>
              <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{pct.toFixed(0)}% of total spend</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

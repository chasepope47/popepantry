import { useEffect, useState, useCallback } from 'react'
import { Clock, Trash2, RotateCcw } from 'lucide-react'
import { supabase, type ItemHistory, type PantryItem } from '../lib/supabase'

type Props = { householdId: string }

export default function HistoryPage({ householdId }: Props) {
  const [history, setHistory] = useState<ItemHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [readdingId, setReaddingId] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('item_history')
      .select('*')
      .eq('household_id', householdId)
      .order('deleted_at', { ascending: false })
      .limit(100)
    setHistory(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  async function readd(entry: ItemHistory) {
    setReaddingId(entry.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const item: Omit<PantryItem, 'id' | 'created_at'> = {
        user_id: user.id,
        household_id: householdId,
        name: entry.name,
        category: (entry.category as PantryItem['category']) ?? 'Other',
        store: entry.store,
        quantity: entry.quantity ?? 1,
        price: entry.price ?? 0,
        barcode: entry.barcode,
        expiration_date: null, // don't re-use old expiry
      }
      await supabase.from('pantry_items').insert(item)
      await supabase.from('item_history').delete().eq('id', entry.id)
      setHistory(prev => prev.filter(h => h.id !== entry.id))
    }
    setReaddingId(null)
  }

  async function removeEntry(id: string) {
    await supabase.from('item_history').delete().eq('id', id)
    setHistory(prev => prev.filter(h => h.id !== id))
  }

  async function clearAll() {
    await supabase.from('item_history').delete().eq('household_id', householdId)
    setHistory([])
  }

  // Group by date
  const grouped = history.reduce<Record<string, ItemHistory[]>>((acc, h) => {
    const date = new Date(h.deleted_at)
    const key = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(h)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped)

  return (
    <div className="flex flex-col bg-[#f8f5f0] min-h-dvh">
      <header className="bg-white border-b border-stone-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🕐</span>
          <h1 className="text-xl font-bold text-stone-900">History</h1>
        </div>
        {history.length > 0 && (
          <button onClick={clearAll} className="text-xs text-stone-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
            Clear all
          </button>
        )}
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full pb-32">
        {loading ? (
          <div className="flex justify-center py-16 text-stone-400">Loading…</div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Clock size={48} className="text-stone-300 mb-4" />
            <p className="text-stone-500 font-medium">No history yet</p>
            <p className="text-stone-400 text-sm mt-1 max-w-xs">
              Items you remove from the pantry will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {sortedDates.map(date => (
              <div key={date}>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2 px-1">{date}</p>
                <div className="space-y-2">
                  {grouped[date].map(entry => (
                    <div key={entry.id} className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900 truncate">{entry.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-stone-400">
                          {entry.category && <span>{entry.category}</span>}
                          {entry.store && <><span>·</span><span>{entry.store}</span></>}
                          {entry.price != null && <><span>·</span><span>${entry.price.toFixed(2)}</span></>}
                          {entry.quantity != null && <><span>·</span><span>Qty {entry.quantity}</span></>}
                          <span>·</span>
                          <span className={entry.reason === 'used_up' ? 'text-amber-500' : 'text-stone-400'}>
                            {entry.reason === 'used_up' ? 'Used up' : 'Removed'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => readd(entry)}
                        disabled={readdingId === entry.id}
                        className="p-2 rounded-xl text-stone-300 hover:text-amber-500 hover:bg-amber-50 transition-colors flex-shrink-0 disabled:opacity-40"
                        title="Re-add to pantry"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button onClick={() => removeEntry(entry.id)}
                        className="p-2 rounded-xl text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

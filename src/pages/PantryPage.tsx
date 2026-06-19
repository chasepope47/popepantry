import { useEffect, useState, useCallback } from 'react'
import { Plus, LogOut, Trash2, Search, Package } from 'lucide-react'
import { supabase, type PantryItem } from '../lib/supabase'
import AddItemSheet from '../components/AddItemSheet'

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pantry_items')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function addItem(item: Omit<PantryItem, 'id' | 'user_id' | 'created_at'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('pantry_items').insert({ ...item, user_id: user.id })
    await fetchItems()
  }

  async function deleteItem(id: string) {
    setDeleting(id)
    await supabase.from('pantry_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleting(null)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = filtered.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <div className="min-h-dvh flex flex-col bg-[#f8f5f0]">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥫</span>
          <h1 className="text-xl font-bold text-stone-900">Pope Pantry</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors"
          title="Sign out"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pantry…"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Stats bar */}
        {items.length > 0 && (
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-white rounded-xl border border-stone-200 px-4 py-3">
              <p className="text-xs text-stone-500">Items</p>
              <p className="text-xl font-bold text-stone-900">{filtered.length}</p>
            </div>
            <div className="flex-1 bg-white rounded-xl border border-stone-200 px-4 py-3">
              <p className="text-xs text-stone-500">Total units</p>
              <p className="text-xl font-bold text-stone-900">
                {filtered.reduce((s, i) => s + i.quantity, 0)}
              </p>
            </div>
            <div className="flex-1 bg-white rounded-xl border border-stone-200 px-4 py-3">
              <p className="text-xs text-stone-500">Value</p>
              <p className="text-xl font-bold text-stone-900">${totalValue.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16 text-stone-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package size={48} className="text-stone-300 mb-4" />
            <p className="text-stone-500 font-medium">
              {search ? 'No items match your search' : 'Your pantry is empty'}
            </p>
            {!search && (
              <p className="text-stone-400 text-sm mt-1">
                Tap + to add your first item
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-stone-200 px-4 py-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 truncate">{item.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-stone-500">
                      Qty: <span className="font-semibold text-stone-700">{item.quantity}</span>
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-sm text-stone-500">
                      ${item.price.toFixed(2)} each
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-sm font-semibold text-amber-600">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  disabled={deleting === item.id}
                  className="p-2 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <Plus size={26} />
      </button>

      {showAdd && (
        <AddItemSheet onAdd={addItem} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}

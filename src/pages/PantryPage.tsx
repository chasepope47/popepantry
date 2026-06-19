import { useEffect, useState, useCallback } from 'react'
import { Plus, LogOut, Search, Package } from 'lucide-react'
import { supabase, CATEGORIES, type PantryItem, type ShoppingSuggestion, type Category } from '../lib/supabase'
import AddItemSheet from '../components/AddItemSheet'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { getExpirationStatus, formatExpirationLabel, expirationBadgeClasses } from '../lib/expiration'

type Props = {
  onNavigateToShopping: () => void
}

export default function PantryPage({ onNavigateToShopping }: Props) {
  const [items, setItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState(''  )
  const [pendingDelete, setPendingDelete] = useState<PantryItem | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pantry_items')
      .select('*')
      .order('expiration_date', { ascending: true, nullsFirst: false })
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

  async function deleteItem(item: PantryItem, addToShopping: boolean) {
    if (addToShopping) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const suggestion: Omit<ShoppingSuggestion, 'id' | 'created_at'> = {
          user_id: user.id,
          name: item.name,
          category: item.category,
          last_price: item.price,
          reason: 'used_up',
        }
        await supabase.from('shopping_suggestions').insert(suggestion)
      }
    }
    await supabase.from('pantry_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setPendingDelete(null)
    if (addToShopping) onNavigateToShopping()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = filtered.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalUnits = filtered.reduce((s, i) => s + i.quantity, 0)
  const expiringSoon = filtered.filter(i => {
    const s = getExpirationStatus(i.expiration_date)
    return s === 'critical' || s === 'expired'
  }).length

  // Group by category in CATEGORIES order
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(i => i.category === cat.label),
  })).filter(g => g.items.length > 0)

  // Items with no matching category fall under Other
  const uncategorized = filtered.filter(
    i => !CATEGORIES.find(c => c.label === i.category)
  )

  return (
    <div className="flex flex-col bg-[#f8f5f0] min-h-dvh">
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

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full pb-32">
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

        {/* Stats */}
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white rounded-xl border border-stone-200 px-3 py-3">
              <p className="text-xs text-stone-500">Items</p>
              <p className="text-xl font-bold text-stone-900">{filtered.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 px-3 py-3">
              <p className="text-xs text-stone-500">Units</p>
              <p className="text-xl font-bold text-stone-900">{totalUnits}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 px-3 py-3">
              <p className="text-xs text-stone-500">Value</p>
              <p className="text-xl font-bold text-stone-900">${totalValue.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Expiring soon alert */}
        {expiringSoon > 0 && (
          <button
            onClick={onNavigateToShopping}
            className="w-full mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-left"
          >
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-700">
                {expiringSoon} item{expiringSoon > 1 ? 's' : ''} expiring or expired
              </p>
              <p className="text-xs text-red-500">Tap to view shopping suggestions →</p>
            </div>
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-stone-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package size={48} className="text-stone-300 mb-4" />
            <p className="text-stone-500 font-medium">
              {search ? 'No items match your search' : 'Your pantry is empty'}
            </p>
            {!search && (
              <p className="text-stone-400 text-sm mt-1">Tap + to add your first item</p>
            )}
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
                  <span className="text-xs text-stone-400 ml-auto">
                    ${group.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <PantryItemRow
                      key={item.id}
                      item={item}
                      onDelete={() => setPendingDelete(item)}
                    />
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
                  {uncategorized.map(item => (
                    <PantryItemRow key={item.id} item={item} onDelete={() => setPendingDelete(item)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-20"
      >
        <Plus size={26} />
      </button>

      {showAdd && <AddItemSheet onAdd={addItem} onClose={() => setShowAdd(false)} />}

      {pendingDelete && (
        <DeleteConfirmModal
          item={pendingDelete}
          onUsedUp={() => deleteItem(pendingDelete, true)}
          onJustDelete={() => deleteItem(pendingDelete, false)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}

function PantryItemRow({ item, onDelete }: { item: PantryItem; onDelete: () => void }) {
  const status = getExpirationStatus(item.expiration_date)
  const label = formatExpirationLabel(item.expiration_date)
  const badgeClass = expirationBadgeClasses[status]

  return (
    <div className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-stone-900 truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-sm text-stone-500">
            Qty: <span className="font-semibold text-stone-700">{item.quantity}</span>
          </span>
          <span className="text-stone-300">·</span>
          <span className="text-sm text-stone-500">${item.price.toFixed(2)}</span>
          <span className="text-stone-300">·</span>
          <span className="text-sm font-semibold text-amber-600">
            ${(item.price * item.quantity).toFixed(2)}
          </span>
          {label && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
              {label}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="p-2 rounded-xl text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
      >
        <span className="text-lg">🗑</span>
      </button>
    </div>
  )
}

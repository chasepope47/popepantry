import { useEffect, useState, useCallback } from 'react'
import { Plus, LogOut, Search, Package } from 'lucide-react'
import { supabase, CATEGORIES, type PantryItem, type ShoppingSuggestion, type ItemHistory } from '../lib/supabase'
import AddItemSheet from '../components/AddItemSheet'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { getExpirationStatus, formatExpirationLabel, expirationBadgeClasses } from '../lib/expiration'

type Props = {
  householdId: string
  onNavigateToShopping: () => void
}

type ItemFields = Omit<PantryItem, 'id' | 'user_id' | 'household_id' | 'created_at'>

export default function PantryPage({ householdId, onNavigateToShopping }: Props) {
  const [items, setItems] = useState<PantryItem[]>([])
  const [householdName, setHouseholdName] = useState('My Pantry')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null)
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PantryItem | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const [{ data: itemData }, { data: hh }] = await Promise.all([
      supabase.from('pantry_items').select('*').eq('household_id', householdId)
        .order('expiration_date', { ascending: true, nullsFirst: false }),
      supabase.from('households').select('name').eq('id', householdId).single(),
    ])
    setItems(itemData ?? [])
    if (hh?.name) setHouseholdName(hh.name)
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function addItem(fields: ItemFields) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('pantry_items').insert({ ...fields, user_id: user.id, household_id: householdId })
    await fetchItems()
  }

  async function updateItem(fields: ItemFields) {
    if (!editingItem) return
    await supabase.from('pantry_items').update(fields).eq('id', editingItem.id)
    await fetchItems()
  }

  async function deleteItem(item: PantryItem, addToShopping: boolean) {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const historyEntry: Omit<ItemHistory, 'id'> = {
        household_id: householdId,
        user_id: user.id,
        name: item.name,
        category: item.category,
        store: item.store,
        quantity: item.quantity,
        price: item.price,
        barcode: item.barcode,
        expiration_date: item.expiration_date,
        reason: addToShopping ? 'used_up' : 'removed',
        deleted_at: new Date().toISOString(),
      }
      await supabase.from('item_history').insert(historyEntry)
    }

    if (addToShopping && user) {
      const suggestion: Omit<ShoppingSuggestion, 'id' | 'created_at'> = {
        user_id: user.id,
        household_id: householdId,
        name: item.name,
        category: item.category,
        store: item.store,
        last_price: item.price,
        reason: 'used_up',
      }
      await supabase.from('shopping_suggestions').insert(suggestion)
    }

    await supabase.from('pantry_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setPendingDelete(null)
    if (addToShopping) onNavigateToShopping()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  const totalValue = filtered.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalUnits = filtered.reduce((s, i) => s + i.quantity, 0)
  const expiringSoon = filtered.filter(i => {
    const s = getExpirationStatus(i.expiration_date)
    return s === 'critical' || s === 'expired'
  }).length

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(i => i.category === cat.label),
  })).filter(g => g.items.length > 0)

  const uncategorized = filtered.filter(i => !CATEGORIES.find(c => c.label === i.category))

  return (
    <div className="flex flex-col bg-[#f8f5f0] dark:bg-stone-950 min-h-dvh">
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥫</span>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">{householdName}</h1>
        </div>
        <button onClick={handleSignOut} className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full pb-32">
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pantry…"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3">
              <p className="text-xs text-stone-500 dark:text-stone-400">Items</p>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">{filtered.length}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3">
              <p className="text-xs text-stone-500 dark:text-stone-400">Units</p>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">{totalUnits}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3">
              <p className="text-xs text-stone-500 dark:text-stone-400">Value</p>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">${totalValue.toFixed(2)}</p>
            </div>
          </div>
        )}

        {expiringSoon > 0 && (
          <button onClick={onNavigateToShopping}
            className="w-full mb-4 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-left">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">{expiringSoon} item{expiringSoon > 1 ? 's' : ''} expiring or expired</p>
              <p className="text-xs text-red-500 dark:text-red-500">Tap to view shopping suggestions →</p>
            </div>
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-stone-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package size={48} className="text-stone-300 dark:text-stone-600 mb-4" />
            <p className="text-stone-500 dark:text-stone-400 font-medium">{search ? 'No items match your search' : 'Your pantry is empty'}</p>
            {!search && <p className="text-stone-400 dark:text-stone-500 text-sm mt-1">Tap + to add your first item</p>}
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-base">{group.emoji}</span>
                  <span className="text-sm font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide">{group.label}</span>
                  <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto">
                    ${group.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <PantryItemRow key={item.id} item={item}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => setPendingDelete(item)} />
                  ))}
                </div>
              </div>
            ))}
            {uncategorized.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-base">📦</span>
                  <span className="text-sm font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide">Other</span>
                </div>
                <div className="space-y-2">
                  {uncategorized.map(item => (
                    <PantryItemRow key={item.id} item={item}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => setPendingDelete(item)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-20">
        <Plus size={26} />
      </button>

      {showAdd && (
        <AddItemSheet mode="add" onSave={addItem} onClose={() => setShowAdd(false)} />
      )}

      {editingItem && (
        <AddItemSheet
          mode="edit"
          initialValues={editingItem}
          onSave={updateItem}
          onClose={() => setEditingItem(null)}
        />
      )}

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

function PantryItemRow({ item, onEdit, onDelete }: { item: PantryItem; onEdit: () => void; onDelete: () => void }) {
  const status = getExpirationStatus(item.expiration_date)
  const label = formatExpirationLabel(item.expiration_date)
  const badgeClass = expirationBadgeClasses[status]

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-stone-900 dark:text-stone-100 truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-sm text-stone-500 dark:text-stone-400">Qty: <span className="font-semibold text-stone-700 dark:text-stone-300">{item.quantity}</span></span>
          <span className="text-stone-300 dark:text-stone-600">·</span>
          <span className="text-sm text-stone-500 dark:text-stone-400">${item.price.toFixed(2)}</span>
          <span className="text-stone-300 dark:text-stone-600">·</span>
          <span className="text-sm font-semibold text-amber-600">${(item.price * item.quantity).toFixed(2)}</span>
          {item.store && (
            <>
              <span className="text-stone-300 dark:text-stone-600">·</span>
              <span className="text-xs text-stone-400 dark:text-stone-500">{item.store}</span>
            </>
          )}
          {label && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>{label}</span>
          )}
        </div>
      </div>
      <button onClick={onEdit} className="p-2 rounded-xl text-stone-300 dark:text-stone-600 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex-shrink-0">
        <span className="text-base">✏️</span>
      </button>
      <button onClick={onDelete} className="p-2 rounded-xl text-stone-300 dark:text-stone-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
        <span className="text-base">🗑</span>
      </button>
    </div>
  )
}

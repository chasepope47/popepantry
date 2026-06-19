import { X } from 'lucide-react'
import type { PantryItem } from '../lib/supabase'

type Props = {
  item: PantryItem
  onUsedUp: () => void
  onJustDelete: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({ item, onUsedUp, onJustDelete, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-stone-900 text-base pr-4">Remove "{item.name}"?</h3>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-stone-500 mb-5">Did you use this item up? We'll add it to your shopping list so you can restock.</p>
        <div className="space-y-2">
          <button
            onClick={onUsedUp}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors"
          >
            Yes, I used it up — add to list
          </button>
          <button
            onClick={onJustDelete}
            className="w-full py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors"
          >
            No, just remove it
          </button>
        </div>
      </div>
    </div>
  )
}

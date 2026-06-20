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
        className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-sm p-6 shadow-xl border border-transparent dark:border-stone-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base pr-4">Remove "{item.name}"?</h3>
          <button onClick={onCancel} className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">Did you use this item up? We'll add it to your shopping list so you can restock.</p>
        <div className="space-y-2">
          <button
            onClick={onUsedUp}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors"
          >
            Yes, I used it up — add to list
          </button>
          <button
            onClick={onJustDelete}
            className="w-full py-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium transition-colors"
          >
            No, just remove it
          </button>
        </div>
      </div>
    </div>
  )
}

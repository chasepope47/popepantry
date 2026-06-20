import { useState, useRef } from 'react'
import { Minus, Plus, Scan, ChevronDown, ArrowLeft } from 'lucide-react'
import { lookupBarcode } from '../lib/barcodeApi'
import BarcodeScanner from './BarcodeScanner'
import { CATEGORIES, type PantryItem, type Category } from '../lib/supabase'

type Props = {
  onAdd: (item: Omit<PantryItem, 'id' | 'user_id' | 'household_id' | 'created_at'>) => Promise<void>
  onClose: () => void
}

export default function AddItemSheet({ onAdd, onClose }: Props) {
  const [scanning, setScanning] = useState(false)
  const [barcode, setBarcode] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<Category>('Other')
  const [expirationDate, setExpirationDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [looking, setLooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Block any interaction briefly after scanning to let touch events clear
  const blockRef = useRef(false)

  async function handleScan(code: string) {
    blockRef.current = true
    setScanning(false)
    setBarcode(code)
    setLooking(true)
    const product = await lookupBarcode(code)
    setLooking(false)
    blockRef.current = false
    if (product) {
      setName(product.name + (product.brand ? ` – ${product.brand}` : ''))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter a product name.'); return }
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) { setError('Please enter a valid price.'); return }
    setError(null)
    setLoading(true)
    await onAdd({
      barcode,
      name: name.trim(),
      quantity,
      price: parsedPrice,
      category,
      expiration_date: expirationDate || null,
    })
    setLoading(false)
    onClose()
  }

  // Full-screen scanner page
  if (scanning) {
    return <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />
  }

  // Full-screen add item page — no backdrop, no z-index tricks
  return (
    <div className="fixed inset-0 z-40 bg-[#f8f5f0] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-bold text-stone-900">Add Item</h2>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          {/* Scan button */}
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-amber-400 text-amber-600 font-semibold hover:bg-amber-50 transition-colors"
          >
            <Scan size={22} />
            {barcode ? `Scanned: ${barcode}` : 'Scan Barcode'}
          </button>

          {looking && (
            <p className="text-sm text-stone-500 text-center py-1">Looking up product…</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Product Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Organic Pasta"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Expiration Date */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Expiration Date <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Quantity</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors text-stone-700 text-xl font-bold"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-center px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 font-bold text-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white hover:bg-amber-600 transition-colors text-xl font-bold"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Price ($)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-medium">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Add to Pantry'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

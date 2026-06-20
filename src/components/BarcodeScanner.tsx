import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'

type Props = {
  onScan: (barcode: string) => void
  onClose: () => void
}

const CONTAINER_ID = 'barcode-scanner-container'

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  // Keep latest callbacks in refs so the effect never needs to re-run
  const onScanRef = useRef(onScan)
  const onCloseRef = useRef(onClose)
  onScanRef.current = onScan
  onCloseRef.current = onClose

  useEffect(() => {
    let destroyed = false
    const scanner = new Html5Qrcode(CONTAINER_ID)

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 15,
          // Wide box is better for 1D grocery barcodes (EAN-13, UPC-A)
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.7778,
        },
        (code) => {
          if (destroyed) return
          destroyed = true
          scanner.stop().catch(() => {}).finally(() => onScanRef.current(code))
        },
        () => {} // suppress per-frame decode errors
      )
      .then(() => { if (!destroyed) setScanning(true) })
      .catch((err: unknown) => {
        const msg = String(err).toLowerCase()
        if (msg.includes('permission') || msg.includes('notallowed')) {
          setError('Camera permission denied. Tap the camera icon in your browser address bar and allow access, then try again.')
        } else if (msg.includes('notfound') || msg.includes('no camera')) {
          setError('No camera found on this device.')
        } else {
          setError('Could not start the camera. Try refreshing the page.')
        }
      })

    return () => {
      destroyed = true
      scanner.stop().catch(() => {})
    }
  }, []) // intentionally empty — callbacks are accessed via refs

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 text-white">
        <span className="font-semibold text-lg">Scan Barcode</span>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 active:bg-white/20">
          <X size={24} />
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center px-8 text-center">
          <div>
            <div className="text-5xl mb-4">📷</div>
            <p className="text-white/80 text-sm leading-relaxed">{error}</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-3 bg-amber-500 rounded-xl text-white font-medium"
            >
              Go Back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Scanner element */}
          <div id={CONTAINER_ID} className="w-full max-w-sm overflow-hidden rounded-xl" />

          {/* Aim guide overlay */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-amber-400 rounded-lg w-72 h-28 opacity-60" />
            </div>
          )}

          <p className="text-white/60 text-sm mt-8 px-8 text-center">
            Line up the barcode inside the box
          </p>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'

type Props = {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerId = 'qr-reader-container'

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          scanner.stop().catch(() => {})
          onScan(decodedText)
        },
        () => {}
      )
      .catch((err) => {
        setError(
          typeof err === 'string'
            ? err
            : 'Camera permission denied. Please allow camera access and try again.'
        )
      })

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 text-white">
        <span className="font-semibold text-lg">Scan Barcode</span>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
          <X size={24} />
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center px-8 text-center">
          <div>
            <div className="text-4xl mb-4">📷</div>
            <p className="text-white/80 text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-3 bg-amber-500 rounded-xl text-white font-medium"
            >
              Go Back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div id={containerId} className="w-full max-w-sm" />
          <p className="text-white/60 text-sm mt-6 px-8 text-center">
            Point your camera at a product barcode
          </p>
        </div>
      )}
    </div>
  )
}

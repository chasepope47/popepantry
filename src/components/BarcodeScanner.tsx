import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import { X } from 'lucide-react'

type Props = {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  function stopCamera() {
    try {
      controlsRef.current?.stop()
    } catch { /* ignore */ }
    // Explicitly kill all tracks so iOS releases the camera layer
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let done = false

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current!,
        (result, err) => {
          if (done || !result) return
          if (err) return // per-frame errors are normal — ignore
          done = true
          stopCamera()
          onScanRef.current(result.getText())
        }
      )
      .then(controls => {
        controlsRef.current = controls
        if (!done) setReady(true)
      })
      .catch((err: unknown) => {
        const msg = String(err).toLowerCase()
        if (msg.includes('permission') || msg.includes('notallowed')) {
          setError('Camera permission denied. Allow camera access in your browser settings and try again.')
        } else if (msg.includes('notfound') || msg.includes('devicenotfound')) {
          setError('No camera found on this device.')
        } else {
          setError('Could not start the camera. Try refreshing the page.')
        }
      })

    return () => {
      done = true
      stopCamera()
    }
  }, [])

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 text-white">
          <span className="font-semibold text-lg">Scan Barcode</span>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-8 text-center">
          <div>
            <div className="text-5xl mb-4">📷</div>
            <p className="text-white/80 text-sm leading-relaxed">{error}</p>
            <button onClick={onClose} className="mt-6 px-6 py-3 bg-amber-500 rounded-xl text-white font-medium">
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 text-white">
        <span className="font-semibold text-lg">Scan Barcode</span>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 active:bg-white/20">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* The video element we fully control */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Aim guide */}
        {ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-amber-400 rounded-lg w-72 h-28 opacity-80 shadow-lg" />
          </div>
        )}

        <div className="absolute bottom-12 left-0 right-0 text-center pointer-events-none">
          <p className="text-white/70 text-sm px-8">
            {ready ? 'Line up the barcode inside the box' : 'Starting camera…'}
          </p>
        </div>
      </div>
    </div>
  )
}

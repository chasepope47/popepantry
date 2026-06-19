export type ExpirationStatus = 'expired' | 'critical' | 'soon' | 'ok' | 'none'

export function getExpirationStatus(dateStr: string | null): ExpirationStatus {
  if (!dateStr) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'expired'
  if (diffDays <= 2) return 'critical'
  if (diffDays <= 7) return 'soon'
  return 'ok'
}

export function formatExpirationLabel(dateStr: string | null): string {
  if (!dateStr) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Expired'
  if (diffDays === 0) return 'Expires today'
  if (diffDays === 1) return 'Expires tomorrow'
  if (diffDays <= 7) return `${diffDays}d left`
  return `Exp ${exp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export const expirationBadgeClasses: Record<ExpirationStatus, string> = {
  expired: 'bg-red-100 text-red-700',
  critical: 'bg-red-100 text-red-700',
  soon: 'bg-amber-100 text-amber-700',
  ok: 'bg-green-100 text-green-700',
  none: '',
}

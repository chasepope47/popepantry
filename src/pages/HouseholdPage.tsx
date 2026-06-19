import { useEffect, useState, useCallback } from 'react'
import { Copy, Check, LogOut, Users, UserPlus, Hash } from 'lucide-react'
import { supabase, type HouseholdMember, type Household } from '../lib/supabase'
import { createInviteCode, joinByCode, type JoinResult } from '../lib/household'

type Props = {
  householdId: string
  onHouseholdChanged: (newId: string) => void
}

export default function HouseholdPage({ householdId, onHouseholdChanged }: Props) {
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinStatus, setJoinStatus] = useState<JoinResult | 'loading' | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  const load = useCallback(async () => {
    const [{ data: hh }, { data: mems }, { data: { user } }] = await Promise.all([
      supabase.from('households').select('*').eq('id', householdId).single(),
      supabase.from('household_members').select('*').eq('household_id', householdId).order('joined_at'),
      supabase.auth.getUser(),
    ])
    setHousehold(hh)
    setMembers(mems ?? [])
    setCurrentUserId(user?.id ?? null)
  }, [householdId])

  useEffect(() => { load() }, [load])

  async function handleGenerateCode() {
    setGeneratingCode(true)
    setInviteCode(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const code = await createInviteCode(householdId, user.id)
    setInviteCode(code)
    setGeneratingCode(false)
  }

  async function handleCopy() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setJoinStatus('loading')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const email = user.email ?? ''
    const result = await joinByCode(joinCode, user.id, email)
    setJoinStatus(result)
    if (result === 'ok') {
      // Re-fetch household membership to get new household id
      const { data } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single()
      if (data) onHouseholdChanged(data.household_id)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const joinStatusMessages: Record<string, { text: string; color: string }> = {
    invalid: { text: 'Code not found. Double-check and try again.', color: 'text-red-600' },
    expired: { text: 'This invite code has expired. Ask for a new one.', color: 'text-red-600' },
    already_member: { text: "You're already in this household.", color: 'text-amber-600' },
    ok: { text: "You've joined! Your pantry is now synced.", color: 'text-green-600' },
  }

  return (
    <div className="flex flex-col bg-[#f8f5f0] min-h-dvh">
      <header className="bg-white border-b border-stone-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <h1 className="text-xl font-bold text-stone-900">
            {household?.name ?? 'My Home'}
          </h1>
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full pb-32 space-y-4">

        {/* Members */}
        <section className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100">
            <Users size={16} className="text-stone-400" />
            <span className="text-sm font-semibold text-stone-700">Household Members</span>
            <span className="ml-auto text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
              {members.length}
            </span>
          </div>
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-stone-50 last:border-0">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                {(m.email ?? '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{m.email ?? 'Unknown'}</p>
                <p className="text-xs text-stone-400 capitalize">{m.role}</p>
              </div>
              {m.user_id === currentUserId && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">You</span>
              )}
            </div>
          ))}
        </section>

        {/* Invite */}
        <section className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={16} className="text-stone-400" />
            <span className="text-sm font-semibold text-stone-700">Invite Someone</span>
          </div>
          <p className="text-xs text-stone-500 mb-3">
            Generate a 6-letter code and share it with your household member. They'll enter it in their app to join and sync your pantry.
          </p>
          <button
            onClick={handleGenerateCode}
            disabled={generatingCode}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {generatingCode ? 'Generating…' : 'Generate Invite Code'}
          </button>

          {inviteCode && (
            <div className="mt-4 bg-stone-50 rounded-xl border border-stone-200 p-4 text-center">
              <p className="text-xs text-stone-500 mb-2">Share this code — expires in 7 days</p>
              <p className="text-4xl font-bold tracking-[0.2em] text-stone-900 mb-3">{inviteCode}</p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          )}
        </section>

        {/* Join */}
        <section className="bg-white rounded-2xl border border-stone-200 p-4">
          <button
            onClick={() => setShowJoin(v => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Hash size={16} className="text-stone-400" />
            <span className="text-sm font-semibold text-stone-700">Join a Home with a Code</span>
            <span className="ml-auto text-stone-400 text-xs">{showJoin ? '▲' : '▼'}</span>
          </button>

          {showJoin && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-stone-500">
                Enter a code shared by someone already in their household.
              </p>
              <input
                type="text"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinStatus(null) }}
                placeholder="ABC123"
                maxLength={6}
                className="w-full text-center text-2xl font-bold tracking-[0.2em] px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-300 uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {joinStatus && joinStatus !== 'loading' && (
                <p className={`text-sm text-center ${joinStatusMessages[joinStatus]?.color}`}>
                  {joinStatusMessages[joinStatus]?.text}
                </p>
              )}
              <button
                onClick={handleJoin}
                disabled={joinCode.length < 6 || joinStatus === 'loading'}
                className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-700 text-white font-semibold transition-colors disabled:opacity-40"
              >
                {joinStatus === 'loading' ? 'Joining…' : 'Join Household'}
              </button>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}

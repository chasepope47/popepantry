import { useEffect, useState, useCallback } from 'react'
import { Copy, Check, LogOut, Users, UserPlus, Hash, Pencil } from 'lucide-react'
import { supabase, type HouseholdMember, type Household } from '../lib/supabase'
import { createInviteCode, joinByCode, type JoinResult } from '../lib/household'

type Props = {
  householdId: string
  onHouseholdChanged: (newId: string) => void
  dark: boolean
  onToggleDark: () => void
}

export default function HouseholdPage({ householdId, onHouseholdChanged, dark, onToggleDark }: Props) {
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
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

  async function saveName() {
    if (!nameInput.trim() || !household) return
    setSavingName(true)
    await supabase.from('households').update({ name: nameInput.trim() }).eq('id', householdId)
    setHousehold({ ...household, name: nameInput.trim() })
    setEditingName(false)
    setSavingName(false)
  }

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
    invalid: { text: 'Code not found. Double-check and try again.', color: 'text-red-600 dark:text-red-400' },
    expired: { text: 'This invite code has expired. Ask for a new one.', color: 'text-red-600 dark:text-red-400' },
    already_member: { text: "You're already in this household.", color: 'text-amber-600 dark:text-amber-400' },
    ok: { text: "You've joined! Your pantry is now synced.", color: 'text-green-600 dark:text-green-400' },
  }

  return (
    <div className="flex flex-col bg-[#f8f5f0] dark:bg-stone-950 min-h-dvh">
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">🏠</span>
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="flex-1 text-xl font-bold text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white font-semibold disabled:opacity-50"
                >
                  {savingName ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditingName(false)} className="text-xs px-2 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 truncate">
                  {household?.name ?? 'My Home'}
                </h1>
                <button
                  onClick={() => { setNameInput(household?.name ?? ''); setEditingName(true) }}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex-shrink-0"
                >
                  <Pencil size={15} />
                </button>
              </div>
            )}
          </div>
          {!editingName && (
            <button onClick={handleSignOut} className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors flex-shrink-0">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full pb-32 space-y-4">

        {/* Members */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100 dark:border-stone-800">
            <Users size={16} className="text-stone-400 dark:text-stone-500" />
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Household Members</span>
            <span className="ml-auto text-xs text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
              {members.length}
            </span>
          </div>
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-stone-50 dark:border-stone-800 last:border-0">
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-sm flex-shrink-0">
                {(m.email ?? '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{m.email ?? 'Unknown'}</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 capitalize">{m.role}</p>
              </div>
              {m.user_id === currentUserId && (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full font-medium">You</span>
              )}
            </div>
          ))}
        </section>

        {/* Invite */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={16} className="text-stone-400 dark:text-stone-500" />
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Invite Someone</span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
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
            <div className="mt-4 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center">
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">Share this code — expires in 7 days</p>
              <p className="text-4xl font-bold tracking-[0.2em] text-stone-900 dark:text-stone-100 mb-3">{inviteCode}</p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors"
              >
                {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          )}
        </section>

        {/* Join */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
          <button
            onClick={() => setShowJoin(v => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Hash size={16} className="text-stone-400 dark:text-stone-500" />
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Join a Home with a Code</span>
            <span className="ml-auto text-stone-400 dark:text-stone-500 text-xs">{showJoin ? '▲' : '▼'}</span>
          </button>

          {showJoin && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Enter a code shared by someone already in their household.
              </p>
              <input
                type="text"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinStatus(null) }}
                placeholder="ABC123"
                maxLength={6}
                className="w-full text-center text-2xl font-bold tracking-[0.2em] px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-300 dark:placeholder-stone-600 uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {joinStatus && joinStatus !== 'loading' && (
                <p className={`text-sm text-center ${joinStatusMessages[joinStatus]?.color}`}>
                  {joinStatusMessages[joinStatus]?.text}
                </p>
              )}
              <button
                onClick={handleJoin}
                disabled={joinCode.length < 6 || joinStatus === 'loading'}
                className="w-full py-3 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-700 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-semibold transition-colors disabled:opacity-40"
              >
                {joinStatus === 'loading' ? 'Joining…' : 'Join Household'}
              </button>
            </div>
          )}
        </section>

        {/* Appearance */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100 dark:border-stone-800">
            <span className="text-stone-400 dark:text-stone-500 text-base">🎨</span>
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Appearance</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Dark Mode</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{dark ? 'On' : 'Off'}</p>
            </div>
            <button
              onClick={onToggleDark}
              className={`relative w-12 h-6 rounded-full transition-colors ${dark ? 'bg-amber-500' : 'bg-stone-200 dark:bg-stone-700'}`}
              aria-label="Toggle dark mode"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dark ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </section>

      </main>
    </div>
  )
}

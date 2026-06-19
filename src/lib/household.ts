import { supabase } from './supabase'

function generateCode(): string {
  // Unambiguous characters (no 0/O, 1/I/L)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function ensureHousehold(userId: string, email: string): Promise<string> {
  const { data: existing } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    // Migrate any un-assigned items to this household
    await supabase.from('pantry_items')
      .update({ household_id: existing.household_id })
      .eq('user_id', userId)
      .is('household_id', null)
    await supabase.from('shopping_suggestions')
      .update({ household_id: existing.household_id })
      .eq('user_id', userId)
      .is('household_id', null)
    return existing.household_id
  }

  // Create a new household
  const { data: household, error } = await supabase
    .from('households')
    .insert({ name: 'My Home', created_by: userId })
    .select()
    .single()

  if (error || !household) throw new Error('Failed to create household')

  await supabase.from('household_members').insert({
    household_id: household.id,
    user_id: userId,
    email,
    role: 'owner',
  })

  // Migrate existing items
  await supabase.from('pantry_items')
    .update({ household_id: household.id })
    .eq('user_id', userId)
  await supabase.from('shopping_suggestions')
    .update({ household_id: household.id })
    .eq('user_id', userId)

  return household.id
}

export async function createInviteCode(householdId: string, userId: string): Promise<string> {
  // Deactivate any previous unused codes for this household
  await supabase.from('household_invites')
    .delete()
    .eq('household_id', householdId)
    .is('used_by', null)

  const code = generateCode()
  const { error } = await supabase.from('household_invites').insert({
    household_id: householdId,
    invited_by: userId,
    code,
  })
  if (error) throw new Error('Failed to create invite')
  return code
}

export type JoinResult = 'ok' | 'invalid' | 'expired' | 'already_member'

export async function joinByCode(
  code: string,
  userId: string,
  email: string,
): Promise<JoinResult> {
  const { data: invite } = await supabase
    .from('household_invites')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .is('used_by', null)
    .single()

  if (!invite) return 'invalid'
  if (new Date(invite.expires_at) < new Date()) return 'expired'

  // Check if already a member of this household
  const { data: alreadyMember } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', invite.household_id)
    .eq('user_id', userId)
    .single()

  if (alreadyMember) return 'already_member'

  // Leave current solo household (if any) and delete it if empty
  const { data: currentMembership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single()

  if (currentMembership) {
    const { count } = await supabase
      .from('household_members')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', currentMembership.household_id)

    await supabase.from('household_members')
      .delete()
      .eq('household_id', currentMembership.household_id)
      .eq('user_id', userId)

    if ((count ?? 0) <= 1) {
      await supabase.from('households').delete().eq('id', currentMembership.household_id)
    }
  }

  // Migrate items to the new household
  await supabase.from('pantry_items')
    .update({ household_id: invite.household_id })
    .eq('user_id', userId)
  await supabase.from('shopping_suggestions')
    .update({ household_id: invite.household_id })
    .eq('user_id', userId)

  // Join the new household
  await supabase.from('household_members').insert({
    household_id: invite.household_id,
    user_id: userId,
    email,
    role: 'member',
  })

  // Mark invite as used
  await supabase.from('household_invites')
    .update({ used_by: userId })
    .eq('id', invite.id)

  return 'ok'
}

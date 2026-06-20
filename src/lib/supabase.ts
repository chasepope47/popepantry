import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const CATEGORIES = [
  { label: 'Produce', emoji: '🥦' },
  { label: 'Dairy', emoji: '🥛' },
  { label: 'Meat & Seafood', emoji: '🥩' },
  { label: 'Frozen', emoji: '❄️' },
  { label: 'Canned & Jarred', emoji: '🥫' },
  { label: 'Grains & Pasta', emoji: '🌾' },
  { label: 'Snacks', emoji: '🍿' },
  { label: 'Beverages', emoji: '🥤' },
  { label: 'Condiments', emoji: '🍯' },
  { label: 'Spices', emoji: '🧂' },
  { label: 'Baking', emoji: '🧁' },
  { label: 'Other', emoji: '📦' },
] as const

export type Category = typeof CATEGORIES[number]['label']

export type PantryItem = {
  id: string
  user_id: string
  household_id: string
  barcode: string | null
  name: string
  quantity: number
  price: number
  category: Category
  store: string | null
  expiration_date: string | null
  created_at: string
}

export type ShoppingSuggestion = {
  id: string
  user_id: string
  household_id: string
  name: string
  category: Category | null
  store: string | null
  last_price: number | null
  reason: 'expiring_soon' | 'used_up'
  created_at: string
}

export type ItemHistory = {
  id: string
  household_id: string
  user_id: string
  name: string
  category: string | null
  store: string | null
  quantity: number | null
  price: number | null
  barcode: string | null
  expiration_date: string | null
  reason: 'used_up' | 'removed'
  deleted_at: string
}

export type Household = {
  id: string
  name: string
  created_by: string
  created_at: string
}

export type HouseholdMember = {
  id: string
  household_id: string
  user_id: string
  email: string | null
  role: 'owner' | 'member'
  joined_at: string
}

export type HouseholdInvite = {
  id: string
  household_id: string
  invited_by: string
  code: string
  used_by: string | null
  expires_at: string
  created_at: string
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigError: string | null = (() => {
  if (!supabaseUrl?.trim()) {
    return '缺少環境變數 VITE_SUPABASE_URL。請在專案根目錄建立 .env 並設定 Supabase 連線資訊。'
  }
  if (!supabaseAnonKey?.trim()) {
    return '缺少環境變數 VITE_SUPABASE_ANON_KEY。請在專案根目錄建立 .env 並設定 Supabase 連線資訊。'
  }
  return null
})()

export const isSupabaseConfigured = supabaseConfigError === null

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase 尚未設定')
  }
  return supabase
}

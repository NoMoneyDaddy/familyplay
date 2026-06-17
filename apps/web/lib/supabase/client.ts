'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './config'

export function createClient() {
  const env = getSupabaseEnv()
  if (!env) throw new Error('Supabase 環境變數未設定')
  return createBrowserClient(env.url, env.anonKey)
}

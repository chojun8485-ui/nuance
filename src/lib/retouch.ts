import { supabase } from './supabase'

export const RETOUCH_MIN_DAYS = 45
export const RETOUCH_MAX_DAYS = 60

export interface RetouchClient {
  clientId: string
  name: string
  lastTreatedAt: string
  daysSince: number
  menu: string | null
}

export async function fetchRetouchClients(): Promise<RetouchClient[]> {
  const { data: { user } } = await supabase.auth.getUser()
  const designerId = user?.id
  if (!designerId) return []

  const { data: clients, error: ce } = await supabase
    .from('clients')
    .select('id, name')
    .eq('designer_id', designerId)
  if (ce) throw ce

  const clientList = (clients ?? []) as Array<{ id: string; name: string }>
  if (clientList.length === 0) return []

  const nameById = new Map(clientList.map((c) => [c.id, c.name]))
  const ids = clientList.map((c) => c.id)

  const { data: treatments, error } = await supabase
    .from('treatments')
    .select('client_id, menu, treated_at, created_at')
    .in('client_id', ids)
    .order('treated_at', { ascending: false })
  if (error) throw error

  const latest = new Map<string, { date: string; menu: string | null }>()
  for (const r of (treatments ?? []) as Array<{
    client_id: string
    menu: string | null
    treated_at: string | null
    created_at: string
  }>) {
    if (!latest.has(r.client_id)) {
      latest.set(r.client_id, {
        date: r.treated_at ?? r.created_at,
        menu: r.menu ?? null,
      })
    }
  }

  const now = Date.now()
  const result: RetouchClient[] = []
  for (const [clientId, v] of latest) {
    const days = Math.floor((now - new Date(v.date).getTime()) / 86_400_000)
    if (days >= RETOUCH_MIN_DAYS) {
      result.push({
        clientId,
        name: nameById.get(clientId) ?? '이름 없음',
        lastTreatedAt: v.date,
        daysSince: days,
        menu: v.menu,
      })
    }
  }

  result.sort((a, b) => b.daysSince - a.daysSince)
  return result
}
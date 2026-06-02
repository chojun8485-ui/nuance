import { supabase } from './supabase'

export interface MonthlyStats {
  treatmentCount: number
  topMenus: Array<{ menu: string; count: number }>
}

function startOfMonthISO(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function parseMenu(raw: string | null): string {
  if (!raw) return '기타'
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed) as string[]
      return arr.join(' · ') || '기타'
    } catch {
      return trimmed || '기타'
    }
  }
  return trimmed || '기타'
}

export async function fetchMonthlyStats(): Promise<MonthlyStats> {
  const { data: { user } } = await supabase.auth.getUser()
  const designerId = user?.id
  if (!designerId) return { treatmentCount: 0, topMenus: [] }

  const { data: clients, error: ce } = await supabase
    .from('clients')
    .select('id')
    .eq('designer_id', designerId)
  if (ce) throw ce

  const ids = ((clients ?? []) as Array<{ id: string }>).map((c) => c.id)
  if (ids.length === 0) return { treatmentCount: 0, topMenus: [] }

  const since = startOfMonthISO()

  const { data, error } = await supabase
    .from('treatments')
    .select('menu, treated_at, created_at')
    .in('client_id', ids)
  if (error) throw error

  const rows = (data ?? []) as Array<{
    menu: string | null
    treated_at: string | null
    created_at: string
  }>

  const thisMonth = rows.filter((r) => {
    const date = r.treated_at ?? r.created_at
    return date >= since
  })

  const counts = new Map<string, number>()
  for (const r of thisMonth) {
    const m = parseMenu(r.menu)
    counts.set(m, (counts.get(m) ?? 0) + 1)
  }

  const topMenus = [...counts.entries()]
    .map(([menu, count]) => ({ menu, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return { treatmentCount: thisMonth.length, topMenus }
}

import type { Client } from '../types/client'

export type RetouchStatus = 'overdue' | 'soon' | 'ok' | 'none'

export type ClientFilter = 'all' | 'retouch' | 'regular' | 'new'

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function getDaysSinceLastVisit(lastVisit: string | null): number | null {
  if (!lastVisit) return null
  const last = new Date(lastVisit)
  const today = new Date()
  last.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - last.getTime()) / MS_PER_DAY)
}

export function getRetouchDday(client: Client): number | null {
  const daysSince = getDaysSinceLastVisit(client.last_visit_at ?? null)
  if (daysSince === null) return null
  return (client.retouch_cycle_days ?? 42) - daysSince
}

export function getRetouchStatus(client: Client): RetouchStatus {
  const dday = getRetouchDday(client)
  if (dday === null) return 'none'
  if (dday < 0) return 'overdue'
  if (dday <= 7) return 'soon'
  return 'ok'
}

export function isRetouchNeeded(client: Client): boolean {
  const status = getRetouchStatus(client)
  return status === 'overdue' || status === 'soon'
}

export function isRegularClient(client: Client): boolean {
  return (client.visit_count ?? 0) >= 3
}

export function isNewClient(client: Client): boolean {
  const created = new Date(client.created_at)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return created >= thirtyDaysAgo || (client.visit_count ?? 0) <= 1
}

export function matchesFilter(client: Client, filter: ClientFilter): boolean {
  switch (filter) {
    case 'retouch':
      return isRetouchNeeded(client)
    case 'regular':
      return isRegularClient(client)
    case 'new':
      return isNewClient(client)
    default:
      return true
  }
}

export function formatDateKo(dateStr: string): string {
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}. ${m}. ${d}.`
}

const WEEKDAYS_KO = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
] as const

export function formatTodayKo(date = new Date()): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}. ${m}. ${d}. ${WEEKDAYS_KO[date.getDay()]}`
}

export function sortByRetouchUrgency(a: Client, b: Client): number {
  const ddayA = getRetouchDday(a) ?? 999
  const ddayB = getRetouchDday(b) ?? 999
  return ddayA - ddayB
}

export const RETOUCH_MESSAGE =
  '안녕하세요 고객님 🌸 뿌리 시술 주기가 되어 연락드렸어요! 편하신 날 말씀해주시면 바로 잡아드릴게요 😊'

export const retouchDotClass: Record<RetouchStatus, string> = {
  overdue: 'bg-red-500',
  soon: 'bg-amber-400',
  ok: 'bg-emerald-500',
  none: 'bg-border',
}

export const retouchBannerClass: Record<RetouchStatus, string> = {
  overdue: 'border-red-200 bg-red-50 text-red-800',
  soon: 'border-amber-200 bg-amber-50 text-amber-900',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  none: 'border-border bg-[#FAF8F5] text-subtext',
}

export function getRetouchBannerText(client: Client): string {
  const dday = getRetouchDday(client)
  if (dday === null) return '아직 방문 기록이 없어요'
  if (dday < 0) return `리터치 D+${Math.abs(dday)} · 연락이 필요해요`
  if (dday === 0) return '리터치 D-Day · 오늘이 딱 좋아요'
  return `리터치 D-${dday} · ${dday}일 후 예정`
}

/** Supabase may return JSON arrays as strings or parsed arrays. */
export function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      /* invalid json */
    }
  }
  return []
}

/** Supabase jsonb fields may arrive as strings or parsed arrays. */
export function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

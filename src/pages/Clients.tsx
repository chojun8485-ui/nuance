import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import AddClientModal from '../components/AddClientModal'
import {
  formatDateKo,
  getDaysSinceLastVisit,
  getRetouchStatus,
  matchesFilter,
  parseStringArray,
  retouchDotClass,
  type ClientFilter,
} from '../lib/clientUtils'
import { getClients, getCurrentUser, supabase } from '../lib/supabase'
import type { Client } from '../types/client'

const filters: { key: ClientFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'retouch', label: '리터치 필요' },
  { key: 'regular', label: '단골' },
  { key: 'new', label: '신규' },
]

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchIndex, setSearchIndex] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ClientFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [designerId, setDesignerId] = useState<string | null>(null)

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      if (!user) return
      setDesignerId(user.id)
      const data = await getClients(user.id)
      setClients(data)

      // 시술 기록에서 컬러태그·메뉴를 모아 검색 색인 만들기
      const { data: treatmentRows } = await supabase
        .from('treatments')
        .select('client_id, menu, color_tags, clients!inner(designer_id)')
        .eq('clients.designer_id', user.id)
        .not('client_id', 'is', null)

      const index: Record<string, string> = {}
      for (const row of treatmentRows ?? []) {
        const r = row as {
          client_id: string | null
          menu: string[] | string | null
          color_tags: string[] | string | null
        }
        if (!r.client_id) continue
        const terms = [
          ...parseStringArray(r.menu),
          ...parseStringArray(r.color_tags),
        ]
          .join(' ')
          .toLowerCase()
        index[r.client_id] = `${index[r.client_id] ?? ''} ${terms}`
      }
      setSearchIndex(index)
    } catch {
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase()
    return clients.filter((client) => {
      if (!matchesFilter(client, filter)) return false
      if (!query) return true
      return (
        client.name.toLowerCase().includes(query) ||
        (client.phone?.includes(query) ?? false) ||
        (client.instagram?.toLowerCase().includes(query) ?? false) ||
        (searchIndex[client.id]?.includes(query) ?? false)
      )
    })
  }, [clients, filter, search, searchIndex])

  const openAddModal = () => setModalOpen(true)

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">고객</h1>
        <button
          type="button"
          onClick={openAddModal}
          disabled={!designerId}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-50"
          aria-label="고객 추가"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </header>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtext"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 · 컬러 · 메뉴 검색"
          className="w-full rounded-xl border border-border bg-cream py-3 pl-10 pr-4 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary focus:bg-surface"
        />
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="고객 필터"
      >
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-primary text-white'
                : 'border border-border bg-background text-subtext'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-subtext">불러오는 중...</p>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-subtext">
            {clients.length === 0
              ? '아직 등록된 고객이 없어요'
              : '검색 결과가 없어요'}
          </p>
          {clients.length === 0 && (
            <button
              type="button"
              onClick={openAddModal}
              disabled={!designerId}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            >
              고객 추가하기
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </ul>
      )}

      {designerId && (
        <AddClientModal
          open={modalOpen}
          designerId={designerId}
          onClose={() => setModalOpen(false)}
          onSaved={loadClients}
        />
      )}
    </section>
  )
}

function ClientCard({ client }: { client: Client }) {
  const daysSince = getDaysSinceLastVisit(client.last_visit_at ?? null)
  const status = getRetouchStatus(client)

  return (
    <li>
      <Link
        to={`/clients/${client.id}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors active:bg-cream"
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${retouchDotClass[status]}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text">{client.name}</p>
          <p className="mt-0.5 text-xs text-subtext">
            {client.last_visit_at
              ? `마지막 방문 ${formatDateKo(client.last_visit_at)}`
              : '방문 기록 없음'}
            {daysSince !== null && ` · ${daysSince}일 전`}
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-subtext" />
      </Link>
    </li>
  )
}
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  formatDateKo,
  formatTodayKo,
  getDaysSinceLastVisit,
  getRetouchDday,
  getRetouchStatus,
  isRetouchNeeded,
  parseStringArray,
  retouchDotClass,
  sortByRetouchUrgency,
} from '../lib/clientUtils'
import { getClients, getCurrentUser, getRecentTreatments } from '../lib/supabase'
import type { Client, TreatmentWithClient } from '../types/client'
import MessagePicker from '../components/MessagePicker'
import MessageTemplatesPage from '../components/MessageTemplatesPage'

export default function Home() {
  const [clients, setClients] = useState<Client[]>([])
  const [recentTreatments, setRecentTreatments] = useState<TreatmentWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)

  const loadHome = useCallback(async () => {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      if (!user) return
      const [clientsData, treatmentsData] = await Promise.all([
        getClients(user.id),
        getRecentTreatments(user.id),
      ])
      setClients(clientsData)
      setRecentTreatments(treatmentsData)
    } catch {
      setClients([])
      setRecentTreatments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHome()
  }, [loadHome])

  const retouchClients = useMemo(
    () => clients.filter(isRetouchNeeded).sort(sortByRetouchUrgency),
    [clients],
  )

  return (
    <div className="pb-2">
      <header className="space-y-4 pb-2">
        <p className="text-[10px] font-medium uppercase tracking-label text-subtext/90">
          {formatTodayKo()}
        </p>
        <div className="space-y-2.5">
          <h1 className="font-display text-[2.75rem] leading-[1.05] tracking-tight text-primary">
            Nuance
          </h1>
          <p className="text-[15px] leading-relaxed text-subtext">
            오늘도 좋은 컬러 작업 되세요
          </p>
        </div>
      </header>

      <div className="my-9 h-px bg-border" aria-hidden />

      {loading ? (
        <p className="py-16 text-center text-sm text-subtext">불러오는 중...</p>
      ) : (
        <div className="space-y-11">
          <section className="space-y-4">
            <SectionTitle>리터치 알림</SectionTitle>
            {retouchClients.length === 0 ? (
              <EmptyState message="곧 리터치가 필요한 고객이 없어요" />
            ) : (
              <ul className="space-y-2.5">
                {retouchClients.map((client) => (
                  <RetouchCard
                    key={client.id}
                    client={client}
                    onCopyMessage={() => setPickerOpen(true)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <SectionTitle>최근 작업</SectionTitle>
            {recentTreatments.length === 0 ? (
              <EmptyState message="아직 기록된 작업이 없어요" />
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-surface">
                {recentTreatments.map((treatment) => (
                  <RecentTreatmentRow key={treatment.id} treatment={treatment} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <MessagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        defaultCategory="retouch"
        onManage={() => { setPickerOpen(false); setManageOpen(true) }}
      />
      <MessageTemplatesPage
        open={manageOpen}
        onClose={() => setManageOpen(false)}
      />
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="font-display text-xl tracking-tight text-text">{children}</h2>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-border bg-cream/60 px-5 py-10 text-center">
      <p className="text-sm leading-relaxed text-subtext">{message}</p>
    </div>
  )
}

function RetouchCard({
  client,
  onCopyMessage,
}: {
  client: Client
  onCopyMessage: () => void
}) {
  const daysSince = getDaysSinceLastVisit(client.last_visit_at ?? null)
  const status = getRetouchStatus(client)
  const dday = getRetouchDday(client)

  const statusLabel =
    dday !== null && dday < 0
      ? `마지막 방문 ${daysSince ?? 0}일 전 · D+${Math.abs(dday)}`
      : daysSince !== null
        ? `마지막 방문 ${daysSince}일 전`
        : '방문 기록 없음'

  return (
    <li>
      <div className="flex items-center gap-3.5 rounded-[18px] border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(42,37,32,0.03)]">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${retouchDotClass[status]}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <Link
            to={`/clients/${client.id}`}
            className="block truncate font-medium text-text"
          >
            {client.name}
          </Link>
          <p className="mt-0.5 text-xs tracking-wide text-subtext">{statusLabel}</p>
        </div>
        <button
          type="button"
          onClick={onCopyMessage}
          className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-cream/50 px-3 py-1.5 text-[11px] font-medium tracking-wide text-subtext transition-colors active:bg-cream"
        >
          멘트 복사
        </button>
      </div>
    </li>
  )
}

function RecentTreatmentRow({ treatment }: { treatment: TreatmentWithClient }) {
  const dateStr = treatment.treated_at ?? treatment.created_at
  const menuItems = parseStringArray(treatment.menu)
  const menuLabel = menuItems.length > 0 ? menuItems.join(' · ') : '시술'
  const photoUrls = parseStringArray(treatment.photo_urls)
  const thumbUrl = photoUrls[0]

  if (!treatment.client_id) return null

  return (
    <li>
      <Link
        to={`/clients/${treatment.client_id}`}
        className="flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-cream/40"
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div
            className="h-11 w-11 shrink-0 rounded-xl border border-border bg-cream"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-text">
            {treatment.client_name}
          </p>
          <p className="mt-0.5 truncate text-xs text-subtext">{menuLabel}</p>
        </div>
        <time
          dateTime={dateStr}
          className="shrink-0 text-[11px] tracking-wide text-subtext/80"
        >
          {formatDateKo(dateStr)}
        </time>
      </Link>
    </li>
  )
}
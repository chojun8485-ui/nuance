import { useEffect, useState } from 'react'
import { fetchRetouchClients, type RetouchClient, RETOUCH_MAX_DAYS } from '../lib/retouch'
import MessagePicker from './MessagePicker'

const ACCENT = '#C8A882'
const TEXT = '#2A2520'
const BORDER = '#E8E2D8'
const MUTED = '#9A9183'

interface Props {
  onManageTemplates?: () => void
}

export default function RetouchAlerts({ onManageTemplates }: Props) {
  const [clients, setClients] = useState<RetouchClient[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    fetchRetouchClients()
      .then(setClients)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <h2 className="mb-3 text-2xl" style={{ fontFamily: "'DM Serif Display', serif", color: TEXT }}>
        리터치 알림
      </h2>
      {loading ? (
        <div className="rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: BORDER }}>
          <p className="text-sm" style={{ color: MUTED }}>확인 중…</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: BORDER }}>
          <p className="text-sm" style={{ color: MUTED }}>곧 리터치가 필요한 고객이 없어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => {
            const overdue = c.daysSince > RETOUCH_MAX_DAYS
            return (
              <div key={c.clientId} className="rounded-2xl border bg-white p-4" style={{ borderColor: overdue ? '#E0B5A0' : BORDER }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-medium" style={{ color: TEXT }}>{c.name}</p>
                    <p className="mt-0.5 text-xs" style={{ color: overdue ? '#C25B4E' : MUTED }}>
                      마지막 시술 {c.daysSince}일 전{c.menu ? ` · ${c.menu}` : ''}{overdue ? ' · 두 달 지남' : ''}
                    </p>
                  </div>
                  <button onClick={() => setPickerOpen(true)}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-white"
                    style={{ background: ACCENT }}>
                    멘트 복사
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <MessagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        defaultCategory="retouch"
        onManage={onManageTemplates ? () => { setPickerOpen(false); onManageTemplates() } : undefined}
      />
    </section>
  )
}
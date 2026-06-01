import { useEffect, useState } from 'react'
import { fetchMonthlyStats, type MonthlyStats } from '../lib/stats'
import { fetchRetouchClients, type RetouchClient } from '../lib/retouch'

const ACCENT = '#C8A882'
const TEXT = '#2A2520'
const BORDER = '#E8E2D8'
const MUTED = '#9A9183'

export default function Stats() {
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [retouch, setRetouch] = useState<RetouchClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchMonthlyStats(), fetchRetouchClients()])
      .then(([s, r]) => { setStats(s); setRetouch(r) })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  const monthLabel = `${new Date().getMonth() + 1}월`

  return (
    <div className="space-y-7 px-5 py-6">
      <div>
        <h1 className="text-3xl" style={{ fontFamily: "'DM Serif Display', serif", color: TEXT }}>통계</h1>
        <p className="mt-1 text-sm" style={{ color: '#7A7164' }}>이번 달 작업 흐름을 한눈에 확인하세요.</p>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm" style={{ color: MUTED }}>불러오는 중…</p>
      ) : (
        <>
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
            <p className="text-sm" style={{ color: '#7A7164' }}>{monthLabel} 시술 건수</p>
            <p className="mt-1 text-4xl" style={{ fontFamily: "'DM Serif Display', serif", color: ACCENT }}>
              {stats?.treatmentCount ?? 0}
              <span className="ml-1 text-lg" style={{ color: TEXT }}>건</span>
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold" style={{ color: TEXT }}>인기 시술 메뉴</h2>
            {stats && stats.topMenus.length > 0 ? (
              <div className="space-y-2">
                {stats.topMenus.map((m, i) => (
                  <div key={m.menu} className="flex items-center justify-between rounded-2xl border bg-white p-4" style={{ borderColor: BORDER }}>
                    <span className="text-sm" style={{ color: TEXT }}>
                      <span className="mr-2" style={{ color: ACCENT }}>{i + 1}</span>{m.menu}
                    </span>
                    <span className="text-sm" style={{ color: '#7A7164' }}>{m.count}건</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: MUTED }}>이번 달 시술 기록이 아직 없어요</p>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold" style={{ color: TEXT }}>
              리터치 대기 고객 <span className="text-sm font-normal" style={{ color: MUTED }}>({retouch.length}명)</span>
            </h2>
            {retouch.length > 0 ? (
              <div className="space-y-2">
                {retouch.map((c) => (
                  <div key={c.clientId} className="flex items-center justify-between rounded-2xl border bg-white p-4" style={{ borderColor: BORDER }}>
                    <span className="text-sm" style={{ color: TEXT }}>{c.name}</span>
                    <span className="text-xs" style={{ color: MUTED }}>{c.daysSince}일 전 시술</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: MUTED }}>리터치 시기가 된 고객이 없어요</p>
            )}
          </div>

          <p className="pt-2 text-center text-xs" style={{ color: '#B5AD9E' }}>
            매출 흐름은 시술 가격을 기록하면 표시할 수 있어요
          </p>
        </>
      )}
    </div>
  )
}
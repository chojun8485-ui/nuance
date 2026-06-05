import { useEffect, useState } from 'react'
import { fetchMonthlyStats, type MonthlyStats } from '../lib/stats'
import { fetchRetouchClients, type RetouchClient } from '../lib/retouch'
import { getCurrentUser, supabase } from '../lib/supabase'

const ACCENT = '#C8A882'
const TEXT = '#2A2520'
const BORDER = '#E8E2D8'
const MUTED = '#9A9183'

type MonthRevenue = { key: string; label: string; revenue: number }

function buildLast6Months(): MonthRevenue[] {
  const now = new Date()
  const months: MonthRevenue[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: `${d.getMonth() + 1}월`,
      revenue: 0,
    })
  }
  return months
}

async function fetchMonthlyRevenue(): Promise<MonthRevenue[]> {
  const months = buildLast6Months()
  const user = await getCurrentUser()
  if (!user) return months

  const { data, error } = await supabase
    .from('treatments')
    .select('price, treated_at, created_at, clients!inner(designer_id)')
    .eq('clients.designer_id', user.id)
    .not('client_id', 'is', null)

  if (error) {
    console.error(error)
    return months
  }

  for (const row of data ?? []) {
    const r = row as {
      price: number | null
      treated_at: string | null
      created_at: string
    }
    if (r.price == null) continue
    const d = new Date(r.treated_at ?? r.created_at)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    const m = months.find((x) => x.key === key)
    if (m) m.revenue += r.price
  }
  return months
}

export default function Stats() {
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [retouch, setRetouch] = useState<RetouchClient[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthRevenue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchMonthlyStats(),
      fetchRetouchClients(),
      fetchMonthlyRevenue(),
    ])
      .then(([s, r, rev]) => {
        setStats(s)
        setRetouch(r)
        setMonthlyRevenue(rev)
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  const monthLabel = `${new Date().getMonth() + 1}월`
  const thisMonthRevenue =
    monthlyRevenue[monthlyRevenue.length - 1]?.revenue ?? 0

  return (
    <div className="space-y-7 px-5 py-6">
      <div>
        <h1 className="text-3xl" style={{ fontFamily: "'DM Serif Display', serif", color: TEXT }}>
          통계
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#7A7164' }}>
          이번 달 작업 흐름과 정산을 한눈에 확인하세요.
        </p>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm" style={{ color: MUTED }}>
          불러오는 중…
        </p>
      ) : (
        <>
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
            <p className="text-sm" style={{ color: '#7A7164' }}>{monthLabel} 시술 건수</p>
            <p className="mt-1 text-4xl" style={{ fontFamily: "'DM Serif Display', serif", color: ACCENT }}>
              {stats?.treatmentCount ?? 0}
              <span className="ml-1 text-lg" style={{ color: TEXT }}>건</span>
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
            <p className="text-sm" style={{ color: '#7A7164' }}>{monthLabel} 매출</p>
            <p className="mt-1 text-3xl" style={{ fontFamily: "'DM Serif Display', serif", color: ACCENT }}>
              {thisMonthRevenue.toLocaleString('ko-KR')}
              <span className="ml-1 text-base" style={{ color: TEXT }}>원</span>
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: TEXT }}>월별 매출</h2>
            {(() => {
              const max = Math.max(...monthlyRevenue.map((m) => m.revenue), 1)
              const hasAny = monthlyRevenue.some((m) => m.revenue > 0)
              if (!hasAny) {
                return (
                  <p className="py-6 text-center text-sm" style={{ color: MUTED }}>
                    아직 매출 기록이 없어요
                  </p>
                )
              }
              return (
                <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
                  {monthlyRevenue.map((m) => {
                    const barH =
                      m.revenue > 0
                        ? Math.max(Math.round((m.revenue / max) * 110), 6)
                        : 0
                    return (
                      <div
                        key={m.key}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                      >
                        {m.revenue > 0 && (
                          <span className="whitespace-nowrap text-[10px]" style={{ color: MUTED }}>
                            {Math.round(m.revenue / 10000)}만
                          </span>
                        )}
                        <div
                          style={{
                            height: barH,
                            width: '68%',
                            maxWidth: 34,
                            background: ACCENT,
                            borderRadius: '8px 8px 0 0',
                          }}
                        />
                        <span className="text-xs" style={{ color: '#7A7164' }}>{m.label}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
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

          <IncentiveCalculator />
        </>
      )}
    </div>
  )
}

function IncentiveCalculator() {
  const [amountRaw, setAmountRaw] = useState('')
  const [cardFee, setCardFee] = useState(
    () => localStorage.getItem('nuance_card_fee') ?? '2.5',
  )
  const [incentive, setIncentive] = useState(
    () => localStorage.getItem('nuance_incentive') ?? '35',
  )

  useEffect(() => {
    localStorage.setItem('nuance_card_fee', cardFee)
  }, [cardFee])
  useEffect(() => {
    localStorage.setItem('nuance_incentive', incentive)
  }, [incentive])

  const amt = Number(amountRaw) || 0
  const feeRate = Number(cardFee) || 0
  const incRate = Number(incentive) || 0

  const feeAmount = Math.round((amt * feeRate) / 100)
  const netSales = amt - feeAmount
  const designerCut = Math.round((netSales * incRate) / 100)
  const ownerCut = netSales - designerCut

  const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold" style={{ color: TEXT }}>
        인센티브 계산기
      </h2>

      <div className="space-y-4 rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
        {/* 시술 금액 */}
        <div>
          <label className="mb-1.5 block text-xs" style={{ color: '#7A7164' }}>시술 금액</label>
          <div className="relative">
            <input
              inputMode="numeric"
              value={amt ? amt.toLocaleString('ko-KR') : ''}
              onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              className="w-full rounded-xl border bg-[#FAF8F4] px-4 py-3 pr-8 text-right text-base font-medium outline-none"
              style={{ borderColor: BORDER, color: TEXT }}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: MUTED }}>원</span>
          </div>
        </div>

        {/* 수수료율 / 인센티브율 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs" style={{ color: '#7A7164' }}>카드 수수료율</label>
            <div className="relative">
              <input
                inputMode="decimal"
                value={cardFee}
                onChange={(e) => setCardFee(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full rounded-xl border bg-[#FAF8F4] px-4 py-3 pr-8 text-right text-base outline-none"
                style={{ borderColor: BORDER, color: TEXT }}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: MUTED }}>%</span>
            </div>
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs" style={{ color: '#7A7164' }}>인센티브율</label>
            <div className="relative">
              <input
                inputMode="decimal"
                value={incentive}
                onChange={(e) => setIncentive(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full rounded-xl border bg-[#FAF8F4] px-4 py-3 pr-8 text-right text-base outline-none"
                style={{ borderColor: BORDER, color: TEXT }}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: MUTED }}>%</span>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="space-y-2 border-t pt-4" style={{ borderColor: BORDER }}>
          <Row label="카드 수수료" value={`- ${won(feeAmount)}`} muted />
          <Row label="실매출 (수수료 뗀 금액)" value={won(netSales)} muted />

          <div className="my-2 rounded-xl px-4 py-3" style={{ background: '#F5EFE6' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: TEXT }}>디자이너 실수령</span>
              <span className="text-xl font-bold" style={{ color: ACCENT }}>{won(designerCut)}</span>
            </div>
          </div>

          <Row label="원장 몫" value={won(ownerCut)} />
        </div>

        <p className="text-center text-xs" style={{ color: '#B5AD9E' }}>
          수수료율·인센티브율은 자동 저장돼요
        </p>
      </div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: muted ? '#7A7164' : TEXT }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: muted ? MUTED : TEXT }}>{value}</span>
    </div>
  )
}
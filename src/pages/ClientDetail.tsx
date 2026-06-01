import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Copy, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  formatDateKo,
  getRetouchBannerText,
  getRetouchStatus,
  parseJsonArray,
  parseStringArray,
  retouchBannerClass,
} from '../lib/clientUtils'
import {
  deleteTreatment,
  getClientById,
  getTreatmentsByClient,
  updateClient,
} from '../lib/supabase'
import type { Client, Formula, StainSection, Treatment } from '../types/client'
import MessagePicker from '../components/MessagePicker'
import MessageTemplatesPage from '../components/MessageTemplatesPage'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [loading, setLoading] = useState(true)
  const [personalityNotes, setPersonalityNotes] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadClient = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [clientData, treatmentsData] = await Promise.all([
        getClientById(id),
        getTreatmentsByClient(id),
      ])
      setClient(clientData)
      setTreatments(treatmentsData)
      setPersonalityNotes(clientData?.personality_notes ?? '')
    } catch {
      setClient(null)
      setTreatments([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadClient()
  }, [loadClient])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const handlePersonalityNotesChange = (value: string) => {
    setPersonalityNotes(value)
    if (!id) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await updateClient(id, {
          personality_notes: value.trim() || null,
        })
        setClient((prev) =>
          prev ? { ...prev, personality_notes: value.trim() || null } : prev,
        )
      } catch {
        /* keep local draft */
      }
    }, 600)
  }

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-subtext">불러오는 중...</p>
    )
  }

  if (!client) {
    return (
      <section className="space-y-4">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1 text-sm text-subtext"
        >
          <ArrowLeft size={18} />
          고객 목록
        </Link>
        <p className="text-sm text-subtext">고객 정보를 찾을 수 없어요.</p>
      </section>
    )
  }

  const retouchStatus = getRetouchStatus(client)

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-3">
        <Link
          to="/clients"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-subtext transition-colors active:bg-[#FAF8F5]"
          aria-label="뒤로"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="truncate text-xl font-semibold text-text">
          {client.name}
        </h1>
      </header>

      <div
        className={`rounded-xl border px-4 py-3 text-sm font-medium ${retouchBannerClass[retouchStatus]}`}
      >
        {getRetouchBannerText(client)}
      </div>

      <div className="space-y-3 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-text">기본 정보</h2>
        <dl className="space-y-2.5 text-sm">
          <InfoRow label="이름" value={client.name} />
          <InfoRow label="전화번호" value={client.phone ?? '—'} />
          <InfoRow label="인스타그램" value={client.instagram ?? '—'} />
        </dl>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="client-notes-edit"
          className="text-sm font-semibold text-text"
        >
          성향
        </label>
        <textarea
          id="client-notes-edit"
          rows={4}
          value={personalityNotes}
          onChange={(e) => handlePersonalityNotesChange(e.target.value)}
          placeholder="선호 스타일, 알레르기, 대화 스타일 등"
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
        />
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-[#FAF8F5] px-4 py-3.5 text-sm font-medium text-text transition-colors active:bg-border/40"
      >
        <Copy size={18} className="text-primary" />
        리터치 메시지 복사
      </button>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text">시술 기록</h2>
        {treatments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-subtext">
            아직 시술 기록이 없어요
          </p>
        ) : (
          <ul className="space-y-2">
            {treatments.map((treatment) => (
              <TreatmentCard
                key={treatment.id}
                treatment={treatment}
                onDeleted={loadClient}
              />
            ))}
          </ul>
        )}
      </div>

      <MessagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        
        onManage={() => {
          setPickerOpen(false)
          setManageOpen(true)
        }}
      />
      <MessageTemplatesPage
        open={manageOpen}
        onClose={() => setManageOpen(false)}
      />
    </section>
  )
}

// ── 얼룩 구간 색상 (레벨 1=가장 어두움 → 19=가장 밝음) ──
function stainLevelColor(level: number | null | undefined): string {
  if (level == null) return '#ECE5D8'
  const t = Math.min(Math.max((level - 1) / 18, 0), 1)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `rgb(${lerp(0x24, 0xfa)}, ${lerp(0x14, 0xf3)}, ${lerp(0x05, 0xe6)})`
}

const HAIR_W = 300
const HAIR_TOP = 18
const HAIR_H = 52

function StainDiagram({
  sections,
  uid,
}: {
  sections: StainSection[]
  uid: string
}) {
  const n = sections.length
  if (n === 0) return null

  const segW = HAIR_W / n
  const clipId = `stain-clip-${uid}`
  const bottom = HAIR_TOP + HAIR_H
  const midY = HAIR_TOP + HAIR_H / 2
  const tipX = HAIR_W - 2
  const taperX = HAIR_W - 44

  const hairPath = `M 14 ${HAIR_TOP} L ${taperX} ${HAIR_TOP} Q ${tipX} ${midY} ${taperX} ${bottom} L 14 ${bottom} Q 2 ${bottom} 2 ${midY} Q 2 ${HAIR_TOP} 14 ${HAIR_TOP} Z`

  return (
    <svg viewBox={`0 0 ${HAIR_W} ${bottom + 2}`} className="w-full" role="img">
      <defs>
        <clipPath id={clipId}>
          <path d={hairPath} />
        </clipPath>
      </defs>

      {sections.map((s, i) => (
        <text
          key={`lbl-${i}`}
          x={Math.min((i + 0.5) * segW, taperX - 6)}
          y={12}
          textAnchor="middle"
          fontSize="10.5"
          fill="#9A9183"
        >
          {s.label}
        </text>
      ))}

      <path d={hairPath} fill="#ECE5D8" />

      <g clipPath={`url(#${clipId})`}>
        {sections.map((s, i) => (
          <rect
            key={`seg-${i}`}
            x={i * segW}
            y={HAIR_TOP}
            width={segW + 0.5}
            height={HAIR_H}
            fill={stainLevelColor(s.level)}
          />
        ))}
        {sections.slice(0, -1).map((_, i) => (
          <line
            key={`div-${i}`}
            x1={(i + 1) * segW}
            y1={HAIR_TOP}
            x2={(i + 1) * segW}
            y2={bottom}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.5"
          />
        ))}
      </g>

      <path d={hairPath} fill="none" stroke="#C9BCA4" strokeWidth="1.5" />

      {sections.map((s, i) => {
        if (s.level == null) return null
        const cx = Math.min((i + 0.5) * segW, taperX - 8)
        const light = s.level >= 10
        return (
          <text
            key={`lv-${i}`}
            x={cx}
            y={midY + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill={light ? '#5B4636' : '#F6ECD9'}
          >
            {s.level}lv
          </text>
        )
      })}
    </svg>
  )
}

function TreatmentCard({
  treatment,
  onDeleted,
}: {
  treatment: Treatment
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const dateStr = treatment.treated_at ?? treatment.created_at
  const menuItems = parseStringArray(treatment.menu)
  const colorTags = parseStringArray(treatment.color_tags)
  const photoUrls = parseStringArray(treatment.photo_urls)
  const stainSections = parseJsonArray<StainSection>(treatment.stain_sections)
  const formulas = parseJsonArray<Formula>(treatment.formulas)

  const handleDelete = async () => {
    if (!window.confirm('이 시술 기록을 삭제할까요?')) return
    setDeleting(true)
    try {
      await deleteTreatment(treatment.id)
      onDeleted()
    } catch {
      window.alert('삭제에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <li className="relative space-y-3 rounded-xl border border-border px-4 py-3 pr-10">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="absolute right-2 top-2 rounded-full p-1.5 text-subtext/70 transition-colors hover:text-subtext active:bg-[#FAF8F5] disabled:opacity-50"
        aria-label="시술 기록 삭제"
      >
        <Trash2 size={15} />
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {menuItems.length > 0 ? (
            <p className="font-medium text-text">{menuItems.join(' · ')}</p>
          ) : (
            <p className="font-medium text-text">시술 기록</p>
          )}
        </div>
        <p className="shrink-0 text-xs text-subtext">{formatDateKo(dateStr)}</p>
      </div>

      {colorTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {colorTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#FAF8F5] px-2.5 py-0.5 text-xs text-text"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {formulas.length > 0 && (
        <ul className="space-y-2 text-sm">
          {formulas.map((formula, index) => (
            <li
              key={index}
              className="rounded-lg bg-[#FAF8F5] px-3 py-2 text-subtext"
            >
              {formula.title && (
                <p className="font-medium text-text">{formula.title}</p>
              )}
              <p>
                {[formula.dye, formula.developer, formula.ratio]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}

      {stainSections.length > 0 && (
        <div className="rounded-lg bg-[#FAF8F5] px-3 py-3">
          <StainDiagram sections={stainSections} uid={treatment.id} />
        </div>
      )}

      {photoUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {photoUrls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {treatment.notes && (
        <p className="text-sm text-subtext">{treatment.notes}</p>
      )}
    </li>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-subtext">{label}</dt>
      <dd className="truncate text-right text-text">{value}</dd>
    </div>
  )
}
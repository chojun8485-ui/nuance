import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Copy, Pencil, Trash2 } from 'lucide-react'
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
import TreatmentEditModal from '../components/TreatmentEditModal'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [loading, setLoading] = useState(true)
  const [personalityNotes, setPersonalityNotes] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(
    null,
  )
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
        멘트 복사
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
                onEdit={() => setEditingTreatment(treatment)}
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
      <TreatmentEditModal
        treatment={editingTreatment}
        open={editingTreatment !== null}
        onClose={() => setEditingTreatment(null)}
        onSaved={loadClient}
      />
    </section>
  )
}

// ── 레벨 → 색상 ─────────────────────────────────────────────
function stainLevelColor(level: number | null | undefined): string {
  if (level == null) return '#ECE5D8'
  const t = Math.max(0, Math.min(1, (level - 1) / 18))
  const stops: [number, number, number, number][] = [
    [0, 26, 26, 26],
    [0.35, 75, 52, 42],
    [0.5, 160, 105, 58],
    [0.65, 195, 155, 105],
    [0.82, 225, 210, 175],
    [1, 253, 252, 245],
  ]
  let i = 0
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++
  const [, r0, g0, b0] = stops[i]
  const [t1, r1, g1, b1] = stops[i + 1]
  const [t0] = stops[i]
  const u = t1 === t0 ? 0 : (t - t0) / (t1 - t0)
  return `rgb(${Math.round(r0 + (r1 - r0) * u)}, ${Math.round(g0 + (g1 - g0) * u)}, ${Math.round(b0 + (b1 - b0) * u)})`
}

const STRAND_LEFT = 28
const STRAND_BODY_RIGHT = 338
const STRAND_TIP_RIGHT = 392
const STRAND_BODY_WIDTH = STRAND_BODY_RIGHT - STRAND_LEFT
const STRAND_CENTER_Y = 44
const STRAND_BODY_TOP = 18
const STRAND_VIEW_HEIGHT = 70

const HAIR_PATH = `M 14 ${STRAND_BODY_TOP} L ${STRAND_BODY_RIGHT - 44} ${STRAND_BODY_TOP} Q ${STRAND_TIP_RIGHT - 2} ${STRAND_CENTER_Y} ${STRAND_BODY_RIGHT - 44} ${STRAND_VIEW_HEIGHT - 2} L 14 ${STRAND_VIEW_HEIGHT - 2} Q 2 ${STRAND_VIEW_HEIGHT - 2} 2 ${STRAND_CENTER_Y} Q 2 ${STRAND_BODY_TOP} 14 ${STRAND_BODY_TOP} Z`

function StainDiagram({
  sections,
  uid,
}: {
  sections: StainSection[]
  uid: string
}) {
  const n = sections.length
  if (n === 0) return null

  const widths = sections.map((s) => s.width ?? 1)
  const total = widths.reduce((a, b) => a + b, 0) || 1
  const clipId = `stain-clip-${uid}`
  const bottom = STRAND_VIEW_HEIGHT - 2
  const midY = STRAND_CENTER_Y
  const taperX = STRAND_BODY_RIGHT - 44

  type Bound = { x: number; bodyEndX: number; fillEndX: number; fillW: number }
  const bounds: Bound[] = []
  let acc = 0
  for (let i = 0; i < n; i++) {
    const startFrac = acc / total
    acc += widths[i]
    const endFrac = acc / total
    // 첫 구간은 왼쪽 끝까지 채워서 흰 여백 제거
    const x = i === 0 ? 0 : STRAND_LEFT + startFrac * STRAND_BODY_WIDTH
    const bodyEndX = STRAND_LEFT + endFrac * STRAND_BODY_WIDTH
    const isLast = i === n - 1
    const fillEndX = isLast ? STRAND_TIP_RIGHT - 2 : bodyEndX
    bounds.push({ x, bodyEndX, fillEndX, fillW: fillEndX - x })
  }

  return (
    <svg
      viewBox={`0 0 ${STRAND_TIP_RIGHT} ${STRAND_VIEW_HEIGHT}`}
      className="w-full"
      role="img"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={HAIR_PATH} />
        </clipPath>
      </defs>

      {bounds.map((b, i) => (
        <text
          key={`lbl-${i}`}
          x={Math.min((b.x + b.bodyEndX) / 2, taperX - 6)}
          y={12}
          textAnchor="middle"
          fontSize="10.5"
          fill="#9A9183"
        >
          {sections[i].label}
        </text>
      ))}

      <path d={HAIR_PATH} fill="#ECE5D8" />

      <g clipPath={`url(#${clipId})`}>
        {bounds.map((b, i) => (
          <rect
            key={`seg-${i}`}
            x={b.x}
            y={0}
            width={b.fillW + 0.5}
            height={STRAND_VIEW_HEIGHT}
            fill={stainLevelColor(sections[i].level)}
          />
        ))}
        {bounds.slice(1).map((b, i) => (
          <line
            key={`div-${i}`}
            x1={b.x}
            y1={STRAND_BODY_TOP}
            x2={b.x}
            y2={bottom}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.5"
          />
        ))}
      </g>

      <path d={HAIR_PATH} fill="none" stroke="#C9BCA4" strokeWidth="1.5" />

      {bounds.map((b, i) => {
        const level = sections[i].level
        if (level == null) return null
        const cx = Math.min((b.x + b.bodyEndX) / 2, taperX - 8)
        return (
          <text
            key={`lv-${i}`}
            x={cx}
            y={midY + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill={level >= 10 ? '#5B4636' : '#F6ECD9'}
          >
            {level}lv
          </text>
        )
      })}
    </svg>
  )
}

function TreatmentCard({
  treatment,
  onDeleted,
  onEdit,
}: {
  treatment: Treatment
  onDeleted: () => void
  onEdit: () => void
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
    <li className="relative space-y-3 rounded-xl border border-border px-4 py-3 pr-20">
      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full p-1.5 text-subtext/70 transition-colors hover:text-primary active:bg-[#FAF8F5]"
          aria-label="시술 기록 수정"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full p-1.5 text-subtext/70 transition-colors hover:text-subtext active:bg-[#FAF8F5] disabled:opacity-50"
          aria-label="시술 기록 삭제"
        >
          <Trash2 size={15} />
        </button>
      </div>

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
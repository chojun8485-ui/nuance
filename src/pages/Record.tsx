import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Camera, Check, Plus, Search, X } from 'lucide-react'
import {
  addTreatment,
  getClients,
  getCurrentUser,
  uploadPhoto,
} from '../lib/supabase'
import type { Client, Formula, StainSection } from '../types/client'

const TREATMENT_MENUS = [
  '염색',
  '염색2회',
  '뿌리염색',
  '블랙빼기',
  '탈색',
  '뿌리탈색',
] as const

const LEAVE_TIMES = [10, 15, 20, 25, 30, 35, 40, 45, 50] as const

const RATIO_PRESETS = ['1배', '1.25배', '1.5배', '2배'] as const

const DEVELOPER_PRESETS = [
  '1.5%',
  '3%',
  '4.5%',
  '6%',
  '7.5%',
  '9%',
  '10.5%',
  '12%',
] as const

const DEFAULT_SECTION_LABELS = ['A1(뿌리)', 'A', 'B', 'C'] as const
const MAX_STAIN_SECTIONS = 6

const STRAND_LEFT = 28
const STRAND_BODY_RIGHT = 338
const STRAND_TIP_RIGHT = 392
const STRAND_BODY_WIDTH = STRAND_BODY_RIGHT - STRAND_LEFT
const STRAND_CENTER_Y = 44
const STRAND_BODY_TOP = 12
const STRAND_BODY_BOTTOM = 76
const STRAND_VIEW_HEIGHT = 88

/** Smooth lozenge: rounded root, flat body, pointed tip. */
const HAIR_STRAND_PATH = `M ${STRAND_LEFT} ${STRAND_CENTER_Y} C ${STRAND_LEFT} ${STRAND_BODY_TOP}, ${STRAND_LEFT} ${STRAND_BODY_TOP}, 72 ${STRAND_BODY_TOP} L ${STRAND_BODY_RIGHT} ${STRAND_BODY_TOP} L ${STRAND_TIP_RIGHT} ${STRAND_CENTER_Y} L ${STRAND_BODY_RIGHT} ${STRAND_BODY_BOTTOM} C 72 ${STRAND_BODY_BOTTOM}, ${STRAND_LEFT} ${STRAND_BODY_BOTTOM}, ${STRAND_LEFT} ${STRAND_CENTER_Y} Z`

function segmentDividerX(index: number, sectionCount: number): number {
  return STRAND_LEFT + index * (STRAND_BODY_WIDTH / sectionCount)
}

function segmentFillBounds(
  index: number,
  sectionCount: number,
): { x: number; width: number } {
  const x = segmentDividerX(index, sectionCount)
  const isLast = index === sectionCount - 1
  const width = isLast
    ? STRAND_TIP_RIGHT - x
    : STRAND_BODY_WIDTH / sectionCount
  return { x, width }
}

/** Label center: body-only dividers; last segment excludes the tip wedge. */
function segmentLabelCenter(
  index: number,
  sectionCount: number,
): { x: number; y: number } {
  const leftX = segmentDividerX(index, sectionCount)
  const rightX =
    index === sectionCount - 1
      ? STRAND_BODY_RIGHT
      : segmentDividerX(index + 1, sectionCount)
  return { x: (leftX + rightX) / 2, y: STRAND_CENTER_Y }
}

type PhotoPreview = {
  id: string
  file: File
  url: string
}

function emptyFormula(): Formula {
  return { title: '', dye: '', developer: '', ratio: '' }
}

function defaultStainSections(count = 4): StainSection[] {
  return Array.from({ length: count }, (_, i) => ({
    label: DEFAULT_SECTION_LABELS[i] ?? `구간${i + 1}`,
    level: null,
  }))
}

function levelToColor(level: number): string {
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
  const r = Math.round(r0 + (r1 - r0) * u)
  const g = Math.round(g0 + (g1 - g0) * u)
  const b = Math.round(b0 + (b1 - b0) * u)
  return `rgb(${r}, ${g}, ${b})`
}

function levelTextColor(level: number): string {
  return level <= 9 ? '#fdfcf5' : '#1a1a1a'
}

function levelLabelFilter(level: number): string {
  return level <= 9
    ? 'url(#level-text-shadow-dark)'
    : 'url(#level-text-shadow-light)'
}

function StepCard({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-xs font-semibold text-primary">
          {step}
        </span>
        <h2 className="text-sm font-semibold text-text">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function ChipButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
        selected
          ? 'bg-primary text-white'
          : 'border border-border bg-[#FAF8F5] text-subtext'
      }`}
    >
      {children}
    </button>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-subtext">
      {children}
    </label>
  )
}

function FormulaGroupCard({
  formula,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  formula: Formula
  index: number
  canRemove: boolean
  onChange: (next: Formula) => void
  onRemove: () => void
}) {
  return (
    <div className="relative rounded-xl border border-border bg-[#FAF8F5] p-3.5">
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 rounded-full p-1 text-subtext transition-colors active:bg-border/40"
          aria-label={`약제 ${index + 1} 삭제`}
        >
          <X size={16} />
        </button>
      )}
      <div className="space-y-3 pr-6">
        <div>
          <FieldLabel>제목</FieldLabel>
          <input
            type="text"
            value={formula.title}
            onChange={(e) => onChange({ ...formula, title: e.target.value })}
            placeholder="예: 뿌리탈색, 염색, 토닝"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
          />
        </div>
        <div>
          <FieldLabel>염모제</FieldLabel>
          <input
            type="text"
            value={formula.dye}
            onChange={(e) => onChange({ ...formula, dye: e.target.value })}
            placeholder='예: 7NB + 7코발트블루 20%'
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
          />
        </div>
        <div>
          <FieldLabel>산화제</FieldLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            {DEVELOPER_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ ...formula, developer: preset })}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  formula.developer === preset
                    ? 'bg-primary text-white'
                    : 'border border-border bg-background text-subtext'
                }`}
              >
                {preset}
              </button>
            ))}
            <input
              type="text"
              value={
                DEVELOPER_PRESETS.includes(
                  formula.developer as (typeof DEVELOPER_PRESETS)[number],
                )
                  ? ''
                  : formula.developer
              }
              onChange={(e) =>
                onChange({ ...formula, developer: e.target.value })
              }
              placeholder="직접 입력"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
            />
          </div>
        </div>
        <div>
          <FieldLabel>비율</FieldLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            {RATIO_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ ...formula, ratio: preset })}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  formula.ratio === preset
                    ? 'bg-primary text-white'
                    : 'border border-border bg-background text-subtext'
                }`}
              >
                {preset}
              </button>
            ))}
            <input
              type="text"
              value={formula.ratio}
              onChange={(e) => onChange({ ...formula, ratio: e.target.value })}
              placeholder="직접 입력"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function HairStrandVisualizer({
  sections,
  onSectionsChange,
}: {
  sections: StainSection[]
  onSectionsChange: (next: StainSection[]) => void
}) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)
  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(
    null,
  )

  const setCount = (count: number) => {
    const next = Array.from({ length: count }, (_, i) => {
      if (sections[i]) return sections[i]
      return {
        label: DEFAULT_SECTION_LABELS[i] ?? `구간${i + 1}`,
        level: null,
      }
    })
    onSectionsChange(next)
    setPickerIndex(null)
    setEditingLabelIndex(null)
  }

  const addSection = () => {
    if (sections.length >= MAX_STAIN_SECTIONS) return
    onSectionsChange([
      ...sections,
      { label: `구간${sections.length + 1}`, level: null },
    ])
  }

  const updateSection = (index: number, patch: Partial<StainSection>) => {
    onSectionsChange(
      sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    )
  }

  const selectLevel = (index: number, level: number) => {
    updateSection(index, { level })
    const nextIndex = index + 1
    setPickerIndex(nextIndex < sections.length ? nextIndex : null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-subtext">구간 개수</span>
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              sections.length === n
                ? 'bg-primary text-white'
                : 'border border-border bg-[#FAF8F5] text-subtext'
            }`}
          >
            {n}
          </button>
        ))}
        {sections.length < MAX_STAIN_SECTIONS && (
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/50 px-3 py-1.5 text-xs font-medium text-primary transition-colors active:bg-[#FAF8F5]"
          >
            <Plus size={14} />
            구간 추가
          </button>
        )}
      </div>

      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))`,
        }}
      >
        {sections.map((section, i) =>
          editingLabelIndex === i ? (
            <input
              key={i}
              type="text"
              autoFocus
              value={section.label}
              onChange={(e) => updateSection(i, { label: e.target.value })}
              onBlur={() => setEditingLabelIndex(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingLabelIndex(null)
              }}
              className="rounded-lg border border-primary bg-background px-1 py-0.5 text-center text-xs text-text outline-none"
            />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => setEditingLabelIndex(i)}
              className="truncate rounded-lg px-1 py-0.5 text-center text-xs font-medium text-subtext transition-colors hover:bg-[#FAF8F5] hover:text-text"
              title="탭하여 이름 변경"
            >
              {section.label}
            </button>
          ),
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 420 ${STRAND_VIEW_HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="머리카락 얼룩 구간"
        >
          <defs>
            <clipPath id="hair-strand-clip">
              <path d={HAIR_STRAND_PATH} />
            </clipPath>
            <filter
              id="level-text-shadow-dark"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="0"
                dy="0.5"
                stdDeviation="0.9"
                floodColor="#1a1a1a"
                floodOpacity="0.45"
              />
            </filter>
            <filter
              id="level-text-shadow-light"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="0"
                dy="0.5"
                stdDeviation="0.7"
                floodColor="#fdfcf5"
                floodOpacity="0.35"
              />
            </filter>
          </defs>

          <path
            d={HAIR_STRAND_PATH}
            fill="#EDE8E0"
            stroke="#C8A882"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          <g clipPath="url(#hair-strand-clip)">
            {sections.map((section, i) => {
              const { x, width } = segmentFillBounds(i, sections.length)
              const fill =
                section.level !== null
                  ? levelToColor(section.level)
                  : '#E8E4DC'
              const dividerX = segmentDividerX(i, sections.length)

              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={0}
                    width={width}
                    height={STRAND_VIEW_HEIGHT}
                    fill={fill}
                    className="cursor-pointer"
                    onClick={() =>
                      setPickerIndex(pickerIndex === i ? null : i)
                    }
                  />
                  {i > 0 && (
                    <line
                      x1={dividerX}
                      y1={STRAND_BODY_TOP + 2}
                      x2={dividerX}
                      y2={STRAND_BODY_BOTTOM - 2}
                      stroke="#C8A882"
                      strokeWidth="0.75"
                      strokeOpacity="0.45"
                    />
                  )}
                </g>
              )
            })}

            {sections.map((section, i) => {
              if (section.level === null) return null
              const { x, y } = segmentLabelCenter(i, sections.length)
              const textFill = levelTextColor(section.level)

              return (
                <text
                  key={`label-${i}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={textFill}
                  fontSize="13"
                  fontWeight="700"
                  filter={levelLabelFilter(section.level)}
                  className="pointer-events-none select-none"
                >
                  {section.level}
                </text>
              )
            })}
          </g>
        </svg>

        {pickerIndex !== null && (
          <div className="absolute inset-x-0 top-full z-10 mt-2 rounded-xl border border-border bg-background p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-text">
                {sections[pickerIndex]?.label} — 레벨 선택
              </p>
              <button
                type="button"
                onClick={() => setPickerIndex(null)}
                className="rounded-full p-0.5 text-subtext"
                aria-label="레벨 선택 닫기"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {Array.from({ length: 19 }, (_, n) => {
                const level = n + 1
                const bg = levelToColor(level)
                const fg = levelTextColor(level)
                const selected = sections[pickerIndex]?.level === level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => selectLevel(pickerIndex, level)}
                    className={`flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition-transform active:scale-95 ${
                      selected ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    {level}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-subtext">
        구간을 탭하여 레벨(1~19)을 선택하세요 · 1이 가장 어두움
      </p>
    </div>
  )
}

export default function Record() {
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [designerId, setDesignerId] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [menus, setMenus] = useState<string[]>([])
  const [formulas, setFormulas] = useState<Formula[]>([emptyFormula()])
  const [leaveTime, setLeaveTime] = useState<number | null>(null)
  const [stainSections, setStainSections] = useState<StainSection[]>(() =>
    defaultStainSections(4),
  )
  const [colorTagInput, setColorTagInput] = useState('')
  const [colorTags, setColorTags] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadClients = useCallback(async () => {
    setLoadingClients(true)
    try {
      const user = await getCurrentUser()
      if (!user) return
      setDesignerId(user.id)
      const data = await getClients(user.id)
      setClients(data)
    } catch {
      setClients([])
    } finally {
      setLoadingClients(false)
    }
  }, [])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.url))
    }
  }, [photos])

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase()
    if (!query) return clients
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        (client.instagram?.toLowerCase().includes(query) ?? false),
    )
  }, [clients, clientSearch])

  const toggleMenu = (menu: string) => {
    setMenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu],
    )
  }

  const addColorTag = () => {
    const tag = colorTagInput.trim()
    if (!tag || colorTags.includes(tag)) return
    setColorTags((prev) => [...prev, tag])
    setColorTagInput('')
  }

  const removeColorTag = (tag: string) => {
    setColorTags((prev) => prev.filter((t) => t !== tag))
  }

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const newPhotos = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...newPhotos])
    e.target.value = ''
  }

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  const resetForm = () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url))
    setSelectedClient(null)
    setClientSearch('')
    setMenus([])
    setFormulas([emptyFormula()])
    setLeaveTime(null)
    setStainSections(defaultStainSections(4))
    setColorTagInput('')
    setColorTags([])
    setMemo('')
    setPhotos([])
    setError(null)
    setSaved(false)
  }

  const handleSave = async () => {
    if (saving) return

    setSaving(true)
    setError(null)

    try {
      const user = designerId ? { id: designerId } : await getCurrentUser()
      if (!user) {
        setError('로그인이 필요해요.')
        return
      }

      const photoUrls: string[] = []
      for (const photo of photos) {
        const url = await uploadPhoto(photo.file, user.id)
        photoUrls.push(url)
      }

      const filledFormulas = formulas.filter(
        (f) =>
          f.title.trim() ||
          f.dye.trim() ||
          f.developer.trim() ||
          f.ratio.trim(),
      )

      await addTreatment({
        client_id: selectedClient?.id ?? null,
        menu_items: menus,
        leave_time_minutes: leaveTime,
        formulas: filledFormulas,
        stain_sections: stainSections,
        color_tags: colorTags,
        notes: memo.trim() || null,
        photo_urls: photoUrls,
      })

      setSaved(true)
      setTimeout(resetForm, 2000)
    } catch {
      setError('저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const formatInstagram = (handle: string) =>
    handle.startsWith('@') ? handle : `@${handle}`

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-text">시술 기록</h1>
        <p className="mt-1 text-sm text-subtext">
          시술 내용을 단계별로 기록해 두세요.
        </p>
      </header>

      <div className="space-y-4">
        <StepCard step={1} title="고객 선택">
          {selectedClient ? (
            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-[#FAF8F5] px-4 py-3">
              <div>
                <p className="font-semibold text-text">{selectedClient.name}</p>
                {selectedClient.instagram && (
                  <p className="mt-0.5 text-xs text-subtext">
                    {formatInstagram(selectedClient.instagram)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="rounded-full p-1.5 text-subtext transition-colors active:bg-border/40"
                aria-label="고객 선택 해제"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtext"
                />
                <input
                  type="search"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="고객 이름 검색"
                  className="w-full rounded-xl border border-border bg-[#FAF8F5] py-3 pl-10 pr-4 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary focus:bg-background"
                />
              </div>
              {loadingClients ? (
                <p className="py-4 text-center text-sm text-subtext">
                  불러오는 중...
                </p>
              ) : filteredClients.length === 0 ? (
                <p className="py-4 text-center text-sm text-subtext">
                  {clients.length === 0
                    ? '등록된 고객이 없어요'
                    : '검색 결과가 없어요'}
                </p>
              ) : (
                <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                  {filteredClients.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(client)
                          setClientSearch('')
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left transition-colors active:bg-[#FAF8F5]"
                      >
                        <span className="font-medium text-text">
                          {client.name}
                        </span>
                        {client.instagram && (
                          <span className="text-xs text-subtext">
                            {formatInstagram(client.instagram)}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </StepCard>

        <StepCard step={2} title="시술 메뉴">
          <div className="flex flex-wrap gap-2">
            {TREATMENT_MENUS.map((menu) => (
              <ChipButton
                key={menu}
                selected={menus.includes(menu)}
                onClick={() => toggleMenu(menu)}
              >
                {menu}
              </ChipButton>
            ))}
          </div>
        </StepCard>

        <StepCard step={3} title="약제 비율">
          <div className="space-y-3">
            {formulas.map((formula, index) => (
              <FormulaGroupCard
                key={index}
                index={index}
                formula={formula}
                canRemove={formulas.length > 1}
                onChange={(next) =>
                  setFormulas((prev) =>
                    prev.map((f, i) => (i === index ? next : f)),
                  )
                }
                onRemove={() =>
                  setFormulas((prev) => prev.filter((_, i) => i !== index))
                }
              />
            ))}
            <button
              type="button"
              onClick={() => setFormulas((prev) => [...prev, emptyFormula()])}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/50 py-2.5 text-sm font-medium text-primary transition-colors active:bg-[#FAF8F5]"
            >
              <Plus size={16} />
              약제 추가
            </button>
          </div>
        </StepCard>

        <StepCard step={4} title="자연방치 시간">
          <div className="flex flex-wrap gap-2">
            {LEAVE_TIMES.map((minutes) => (
              <ChipButton
                key={minutes}
                selected={leaveTime === minutes}
                onClick={() => setLeaveTime(minutes)}
              >
                {minutes}분
              </ChipButton>
            ))}
          </div>
        </StepCard>

        <StepCard step={5} title="얼룩 구간">
          <HairStrandVisualizer
            sections={stainSections}
            onSectionsChange={setStainSections}
          />
        </StepCard>

        <StepCard step={6} title="컬러 태그">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={colorTagInput}
                onChange={(e) => setColorTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addColorTag()
                  }
                }}
                placeholder="예: 백금발, 애쉬브라운, 매트브라운"
                className="min-w-0 flex-1 rounded-xl border border-border bg-[#FAF8F5] px-4 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary focus:bg-background"
              />
              <button
                type="button"
                onClick={addColorTag}
                disabled={!colorTagInput.trim()}
                className="shrink-0 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-text transition-opacity disabled:opacity-50"
              >
                추가
              </button>
            </div>
            {colorTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {colorTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] px-3 py-1.5 text-sm text-text"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeColorTag(tag)}
                      className="rounded-full p-0.5 text-subtext transition-colors active:bg-border/40"
                      aria-label={`${tag} 삭제`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </StepCard>

        <StepCard step={7} title="메모">
          <textarea
            rows={4}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="시술 중 특이사항, 고객 요청 등"
            className="w-full resize-none rounded-xl border border-border bg-[#FAF8F5] px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary focus:bg-background"
          />
        </StepCard>

        <StepCard step={8} title="사진 업로드">
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-[#FAF8F5] px-4 py-8 text-sm font-medium text-subtext transition-colors active:bg-border/30"
            >
              <Camera size={20} className="text-primary" />
              사진 선택
            </button>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={photo.url}
                      alt="시술 사진 미리보기"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                      aria-label="사진 삭제"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </StepCard>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-opacity"
      >
        {saved ? (
          <>
            <Check size={18} />
            저장 완료
          </>
        ) : saving ? (
          '저장 중...'
        ) : (
          '저장'
        )}
      </button>
    </section>
  )
}

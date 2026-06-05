import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { X } from 'lucide-react'
import type { StainSection } from '../types/client'

export const DEFAULT_SECTION_LABELS = ['A1(뿌리)', 'A', 'B', 'C'] as const
export const MAX_STAIN_SECTIONS = 6

const STRAND_LEFT = 28
const STRAND_BODY_RIGHT = 338
const STRAND_TIP_RIGHT = 392
const STRAND_BODY_WIDTH = STRAND_BODY_RIGHT - STRAND_LEFT
const STRAND_CENTER_Y = 44
const STRAND_BODY_TOP = 12
const STRAND_BODY_BOTTOM = 76
const STRAND_VIEW_HEIGHT = 88

const HAIR_STRAND_PATH = `M ${STRAND_LEFT} ${STRAND_CENTER_Y} C ${STRAND_LEFT} ${STRAND_BODY_TOP}, ${STRAND_LEFT} ${STRAND_BODY_TOP}, 72 ${STRAND_BODY_TOP} L ${STRAND_BODY_RIGHT} ${STRAND_BODY_TOP} L ${STRAND_TIP_RIGHT} ${STRAND_CENTER_Y} L ${STRAND_BODY_RIGHT} ${STRAND_BODY_BOTTOM} C 72 ${STRAND_BODY_BOTTOM}, ${STRAND_LEFT} ${STRAND_BODY_BOTTOM}, ${STRAND_LEFT} ${STRAND_CENTER_Y} Z`

type SectionBound = {
  x: number
  bodyEndX: number
  fillEndX: number
  width: number
  isLast: boolean
}

function computeBounds(sections: StainSection[]): SectionBound[] {
  const widths = sections.map((s) => s.width ?? 1)
  const total = widths.reduce((a, b) => a + b, 0) || 1
  let acc = 0
  return sections.map((_, i) => {
    const startFrac = acc / total
    acc += widths[i]
    const endFrac = acc / total
    const x = STRAND_LEFT + startFrac * STRAND_BODY_WIDTH
    const bodyEndX = STRAND_LEFT + endFrac * STRAND_BODY_WIDTH
    const isLast = i === sections.length - 1
    const fillEndX = isLast ? STRAND_TIP_RIGHT : bodyEndX
    return { x, bodyEndX, fillEndX, width: fillEndX - x, isLast }
  })
}

export function defaultStainSections(count = 4): StainSection[] {
  return Array.from({ length: count }, (_, i) => ({
    label: DEFAULT_SECTION_LABELS[i] ?? `구간${i + 1}`,
    level: null,
    width: 1,
  }))
}

export function levelToColor(level: number): string {
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

export default function HairStrandVisualizer({
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
  const svgRef = useRef<SVGSVGElement>(null)
  const sectionsRef = useRef(sections)
  sectionsRef.current = sections
  const draggingRef = useRef<number | null>(null)

  const bounds = useMemo(() => computeBounds(sections), [sections])

  const setCount = (count: number) => {
    const next = Array.from({ length: count }, (_, i) => ({
      label: sections[i]?.label ?? DEFAULT_SECTION_LABELS[i] ?? `구간${i + 1}`,
      level: sections[i]?.level ?? null,
      width: 1,
    }))
    onSectionsChange(next)
    setPickerIndex(null)
    setEditingLabelIndex(null)
  }

  const addSection = () => {
    if (sections.length >= MAX_STAIN_SECTIONS) return
    onSectionsChange([
      ...sections,
      { label: `구간${sections.length + 1}`, level: null, width: 1 },
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

  const moveDivider = (dividerIndex: number, svgX: number) => {
    const secs = sectionsRef.current
    const widths = secs.map((s) => s.width ?? 1)
    const total = widths.reduce((a, b) => a + b, 0) || 1
    const MIN = total * 0.07
    const before = widths.slice(0, dividerIndex - 1).reduce((a, b) => a + b, 0)
    const pair = widths[dividerIndex - 1] + widths[dividerIndex]
    const frac = Math.max(
      0,
      Math.min(1, (svgX - STRAND_LEFT) / STRAND_BODY_WIDTH),
    )
    let leftW = frac * total - before
    leftW = Math.max(MIN, Math.min(pair - MIN, leftW))
    const newWidths = [...widths]
    newWidths[dividerIndex - 1] = leftW
    newWidths[dividerIndex] = pair - leftW
    onSectionsChange(secs.map((s, i) => ({ ...s, width: newWidths[i] })))
  }

  const startDrag = (dividerIndex: number) => (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPickerIndex(null)
    draggingRef.current = dividerIndex
    const onMove = (ev: PointerEvent) => {
      const svg = svgRef.current
      if (!svg || draggingRef.current === null) return
      const rect = svg.getBoundingClientRect()
      const svgX = ((ev.clientX - rect.left) / rect.width) * 420
      moveDivider(draggingRef.current, svgX)
    }
    const onUp = () => {
      draggingRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
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
          ref={svgRef}
          viewBox={`0 0 420 ${STRAND_VIEW_HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="머리카락 얼룩 구간"
          style={{ touchAction: 'none' }}
        >
          <defs>
            <clipPath id="hair-strand-clip">
              <path d={HAIR_STRAND_PATH} />
            </clipPath>
            <filter id="level-text-shadow-dark" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0.5" stdDeviation="0.9" floodColor="#1a1a1a" floodOpacity="0.45" />
            </filter>
            <filter id="level-text-shadow-light" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0.5" stdDeviation="0.7" floodColor="#fdfcf5" floodOpacity="0.35" />
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
            {bounds.map((b, i) => {
              const section = sections[i]
              const fill =
                section.level !== null ? levelToColor(section.level) : '#E8E4DC'
              return (
                <g key={i}>
                  <rect
                    x={b.x}
                    y={0}
                    width={b.width}
                    height={STRAND_VIEW_HEIGHT}
                    fill={fill}
                    className="cursor-pointer"
                    onClick={() => setPickerIndex(pickerIndex === i ? null : i)}
                  />
                  {i > 0 && (
                    <line
                      x1={b.x}
                      y1={STRAND_BODY_TOP + 2}
                      x2={b.x}
                      y2={STRAND_BODY_BOTTOM - 2}
                      stroke="#C8A882"
                      strokeWidth="0.75"
                      strokeOpacity="0.45"
                    />
                  )}
                </g>
              )
            })}

            {bounds.map((b, i) => {
              const section = sections[i]
              if (section.level === null) return null
              const cx = (b.x + b.bodyEndX) / 2
              return (
                <text
                  key={`label-${i}`}
                  x={cx}
                  y={STRAND_CENTER_Y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={levelTextColor(section.level)}
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

          {bounds.slice(1).map((b, idx) => {
            const dividerIndex = idx + 1
            const x = b.x
            return (
              <g
                key={`handle-${dividerIndex}`}
                onPointerDown={startDrag(dividerIndex)}
                style={{ cursor: 'ew-resize', touchAction: 'none' }}
              >
                <rect x={x - 14} y={0} width={28} height={STRAND_VIEW_HEIGHT} fill="transparent" />
                <circle cx={x} cy={STRAND_CENTER_Y} r="8" fill="#fff" stroke="#C8A882" strokeWidth="1.5" />
                <path d={`M ${x - 2} ${STRAND_CENTER_Y - 3.5} L ${x - 5} ${STRAND_CENTER_Y} L ${x - 2} ${STRAND_CENTER_Y + 3.5}`} fill="none" stroke="#C8A882" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d={`M ${x + 2} ${STRAND_CENTER_Y - 3.5} L ${x + 5} ${STRAND_CENTER_Y} L ${x + 2} ${STRAND_CENTER_Y + 3.5}`} fill="none" stroke="#C8A882" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )
          })}
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
        구간을 탭해 레벨(1~19) 선택 · 손잡이를 드래그해 길이 조절
      </p>
    </div>
  )
}
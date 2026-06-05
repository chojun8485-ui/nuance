import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Camera, Plus, X } from 'lucide-react'
import { getCurrentUser, updateTreatment, uploadPhoto } from '../lib/supabase'
import { parseJsonArray, parseStringArray } from '../lib/clientUtils'
import type { Formula, StainSection, Treatment } from '../types/client'
import HairStrandVisualizer, {
  defaultStainSections,
} from './HairStrandVisualizer'

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

function emptyFormula(): Formula {
  return { title: '', dye: '', developer: '', ratio: '' }
}

type NewPhoto = { id: string; file: File; url: string }

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-subtext">
      {children}
    </label>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-text">{children}</h3>
}

interface Props {
  treatment: Treatment | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function TreatmentEditModal({
  treatment,
  open,
  onClose,
  onSaved,
}: Props) {
  const [menus, setMenus] = useState<string[]>([])
  const [price, setPrice] = useState('')
  const [formulas, setFormulas] = useState<Formula[]>([emptyFormula()])
  const [leaveTime, setLeaveTime] = useState<number | null>(null)
  const [stainSections, setStainSections] = useState<StainSection[]>(() =>
    defaultStainSections(4),
  )
  const [colorTagInput, setColorTagInput] = useState('')
  const [colorTags, setColorTags] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !treatment) return
    setMenus(parseStringArray(treatment.menu))
    setPrice(treatment.price != null ? String(treatment.price) : '')
    const f = parseJsonArray<Formula>(treatment.formulas)
    setFormulas(f.length > 0 ? f : [emptyFormula()])
    setLeaveTime(treatment.processing_time ?? null)
    const s = parseJsonArray<StainSection>(treatment.stain_sections)
    setStainSections(s.length > 0 ? s : defaultStainSections(4))
    setColorTags(parseStringArray(treatment.color_tags))
    setMemo(treatment.notes ?? '')
    setExistingPhotos(parseStringArray(treatment.photo_urls))
    setNewPhotos([])
    setColorTagInput('')
    setError(null)
  }, [open, treatment])

  useEffect(() => {
    return () => {
      newPhotos.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [newPhotos])

  if (!open || !treatment) return null

  const toggleMenu = (menu: string) =>
    setMenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu],
    )

  const updateFormula = (index: number, next: Formula) =>
    setFormulas((prev) => prev.map((f, i) => (i === index ? next : f)))

  const addColorTag = () => {
    const tag = colorTagInput.trim()
    if (!tag || colorTags.includes(tag)) return
    setColorTags((prev) => [...prev, tag])
    setColorTagInput('')
  }

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const added = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }))
    setNewPhotos((prev) => [...prev, ...added])
    e.target.value = ''
  }

  const removeNewPhoto = (id: string) =>
    setNewPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('로그인이 필요해요.')
        return
      }
      const uploaded: string[] = []
      for (const p of newPhotos) {
        const url = await uploadPhoto(p.file, user.id)
        uploaded.push(url)
      }
      const filledFormulas = formulas.filter(
        (f) =>
          f.title.trim() ||
          f.dye.trim() ||
          f.developer.trim() ||
          f.ratio.trim(),
      )
      await updateTreatment(treatment.id, {
        menu_items: menus,
        leave_time_minutes: leaveTime,
        formulas: filledFormulas,
        stain_sections: stainSections,
        color_tags: colorTags,
        notes: memo.trim() || null,
        photo_urls: [...existingPhotos, ...uploaded],
        price: price ? Number(price) : null,
      })
      onSaved()
      onClose()
    } catch {
      setError('저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/30">
      <div className="flex h-full w-full max-w-[390px] flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-text">시술 기록 수정</h2>
          <button onClick={onClose} className="text-sm text-subtext">
            닫기
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* 시술 메뉴 */}
          <div className="space-y-2">
            <SectionTitle>시술 메뉴</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {TREATMENT_MENUS.map((menu) => (
                <button
                  key={menu}
                  type="button"
                  onClick={() => toggleMenu(menu)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    menus.includes(menu)
                      ? 'bg-primary text-white'
                      : 'border border-border bg-[#FAF8F5] text-subtext'
                  }`}
                >
                  {menu}
                </button>
              ))}
            </div>
          </div>

          {/* 가격 */}
          <div className="space-y-2">
            <SectionTitle>가격</SectionTitle>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={price ? Number(price).toLocaleString() : ''}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="시술 금액"
                className="w-full rounded-xl border border-border bg-[#FAF8F5] px-4 py-3 pr-10 text-sm text-text outline-none focus:border-primary focus:bg-background"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-subtext">
                원
              </span>
            </div>
          </div>

          {/* 약제 비율 */}
          <div className="space-y-2">
            <SectionTitle>약제 비율</SectionTitle>
            <div className="space-y-3">
              {formulas.map((formula, index) => (
                <div
                  key={index}
                  className="relative rounded-xl border border-border bg-[#FAF8F5] p-3.5"
                >
                  {formulas.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormulas((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="absolute right-2 top-2 rounded-full p-1 text-subtext active:bg-border/40"
                      aria-label="약제 삭제"
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
                        onChange={(e) =>
                          updateFormula(index, {
                            ...formula,
                            title: e.target.value,
                          })
                        }
                        placeholder="예: 뿌리탈색, 염색, 토닝"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none placeholder:text-subtext/60 focus:border-primary"
                      />
                    </div>
                    <div>
                      <FieldLabel>염모제</FieldLabel>
                      <input
                        type="text"
                        value={formula.dye}
                        onChange={(e) =>
                          updateFormula(index, {
                            ...formula,
                            dye: e.target.value,
                          })
                        }
                        placeholder="예: 7NB + 7코발트블루 20%"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none placeholder:text-subtext/60 focus:border-primary"
                      />
                    </div>
                    <div>
                      <FieldLabel>산화제</FieldLabel>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {DEVELOPER_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() =>
                              updateFormula(index, {
                                ...formula,
                                developer: preset,
                              })
                            }
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
                            updateFormula(index, {
                              ...formula,
                              developer: e.target.value,
                            })
                          }
                          placeholder="직접 입력"
                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-text outline-none placeholder:text-subtext/60 focus:border-primary"
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
                            onClick={() =>
                              updateFormula(index, {
                                ...formula,
                                ratio: preset,
                              })
                            }
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
                          onChange={(e) =>
                            updateFormula(index, {
                              ...formula,
                              ratio: e.target.value,
                            })
                          }
                          placeholder="직접 입력"
                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-text outline-none placeholder:text-subtext/60 focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormulas((prev) => [...prev, emptyFormula()])}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/50 py-2.5 text-sm font-medium text-primary active:bg-[#FAF8F5]"
              >
                <Plus size={16} />
                약제 추가
              </button>
            </div>
          </div>

          {/* 자연방치 시간 */}
          <div className="space-y-2">
            <SectionTitle>자연방치 시간</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {LEAVE_TIMES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setLeaveTime(minutes)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    leaveTime === minutes
                      ? 'bg-primary text-white'
                      : 'border border-border bg-[#FAF8F5] text-subtext'
                  }`}
                >
                  {minutes}분
                </button>
              ))}
            </div>
          </div>

          {/* 얼룩 구간 */}
          <div className="space-y-2">
            <SectionTitle>얼룩 구간</SectionTitle>
            <HairStrandVisualizer
              sections={stainSections}
              onSectionsChange={setStainSections}
            />
          </div>

          {/* 컬러 태그 */}
          <div className="space-y-2">
            <SectionTitle>컬러 태그</SectionTitle>
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
                placeholder="예: 백금발, 애쉬브라운"
                className="min-w-0 flex-1 rounded-xl border border-border bg-[#FAF8F5] px-4 py-2.5 text-sm text-text outline-none placeholder:text-subtext/60 focus:border-primary focus:bg-background"
              />
              <button
                type="button"
                onClick={addColorTag}
                disabled={!colorTagInput.trim()}
                className="shrink-0 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-text disabled:opacity-50"
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
                      onClick={() =>
                        setColorTags((prev) => prev.filter((t) => t !== tag))
                      }
                      className="rounded-full p-0.5 text-subtext active:bg-border/40"
                      aria-label={`${tag} 삭제`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <SectionTitle>메모</SectionTitle>
            <textarea
              rows={4}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="시술 중 특이사항, 고객 요청 등"
              className="w-full resize-none rounded-xl border border-border bg-[#FAF8F5] px-4 py-3 text-sm text-text outline-none placeholder:text-subtext/60 focus:border-primary focus:bg-background"
            />
          </div>

          {/* 사진 */}
          <div className="space-y-2">
            <SectionTitle>사진</SectionTitle>
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
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-[#FAF8F5] px-4 py-6 text-sm font-medium text-subtext active:bg-border/30"
            >
              <Camera size={20} className="text-primary" />
              사진 추가
            </button>
            {(existingPhotos.length > 0 || newPhotos.length > 0) && (
              <div className="grid grid-cols-3 gap-2">
                {existingPhotos.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setExistingPhotos((prev) =>
                          prev.filter((u) => u !== url),
                        )
                      }
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                      aria-label="사진 삭제"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {newPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={photo.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(photo.id)}
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
        </div>

        <div className="border-t border-border px-5 py-4">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-text"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
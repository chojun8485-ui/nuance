import { useEffect, useState } from 'react'
import {
  type MessageTemplate,
  type TemplateCategory,
  CATEGORY_LABELS,
  EXAMPLE_TEMPLATES,
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  copyText,
} from '../lib/messageTemplates'

const ACCENT = '#C8A882'
const TEXT = '#2A2520'
const BORDER = '#E8E2D8'
const MUTED = '#9A9183'
const CATEGORY_ORDER: TemplateCategory[] = ['after_treatment', 'retouch', 'etc']

interface Props {
  open: boolean
  onClose: () => void
}

export default function MessageTemplatesPage({ open, onClose }: Props) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [editing, setEditing] = useState<MessageTemplate | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<{
    title: string
    content: string
    category: TemplateCategory
  }>({ title: '', content: '', category: 'after_treatment' })

  useEffect(() => {
    if (open) load()
  }, [open])

  async function load() {
    setLoading(true)
    try {
      setTemplates(await fetchTemplates())
    } catch (e) {
      console.error(e)
      flash('멘트를 불러오지 못했어요')
    } finally {
      setLoading(false)
    }
  }

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 1500)
  }

  async function handleCopy(content: string) {
    flash((await copyText(content)) ? '복사됐어요!' : '복사에 실패했어요')
  }

  function openNew(prefill?: Partial<typeof draft>) {
    setEditing(null)
    setDraft({ title: '', content: '', category: 'after_treatment', ...prefill })
    setShowForm(true)
  }

  function openEdit(t: MessageTemplate) {
    setEditing(t)
    setDraft({ title: t.title, content: t.content, category: t.category })
    setShowForm(true)
  }

  async function handleSave() {
    if (!draft.title.trim() || !draft.content.trim()) {
      flash('제목과 내용을 입력해주세요')
      return
    }
    try {
      if (editing) await updateTemplate(editing.id, draft)
      else await createTemplate(draft)
      setShowForm(false)
      await load()
      flash('저장됐어요')
    } catch (e) {
      console.error(e)
      flash('저장에 실패했어요')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 멘트를 삭제할까요?')) return
    try {
      await deleteTemplate(id)
      await load()
      flash('삭제했어요')
    } catch (e) {
      console.error(e)
      flash('삭제에 실패했어요')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/30">
      <div className="flex h-full w-full max-w-[390px] flex-col bg-[#FAF8F4]">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <h2 className="text-xl" style={{ fontFamily: "'DM Serif Display', serif", color: TEXT }}>
            멘트 보관함
          </h2>
          <button onClick={onClose} className="text-sm" style={{ color: TEXT }}>닫기</button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {loading && (
            <p className="py-10 text-center text-sm" style={{ color: MUTED }}>불러오는 중…</p>
          )}

          {!loading && (
            <>
              {templates.length === 0 ? (
                <p className="text-sm leading-relaxed" style={{ color: '#7A7164' }}>
                  아직 저장한 멘트가 없어요. 아래 <b>예시 멘트</b>를 "내 멘트로 가져오기"
                  해서 나만의 멘트로 바꿔보세요 :)
                </p>
              ) : (
                CATEGORY_ORDER.map((cat) => {
                  const items = templates.filter((t) => t.category === cat)
                  if (items.length === 0) return null
                  return (
                    <div key={cat}>
                      <h3 className="mb-2 text-sm font-semibold" style={{ color: ACCENT }}>
                        {CATEGORY_LABELS[cat]}
                      </h3>
                      <div className="space-y-3">
                        {items.map((t) => (
                          <div key={t.id} className="rounded-2xl border bg-white p-4" style={{ borderColor: BORDER }}>
                            <p className="mb-1 text-sm font-medium" style={{ color: TEXT }}>{t.title}</p>
                            <p className="mb-3 whitespace-pre-wrap text-sm" style={{ color: '#5A5247' }}>{t.content}</p>
                            <div className="flex gap-2">
                              <button onClick={() => handleCopy(t.content)} className="flex-1 rounded-xl py-2 text-sm font-medium text-white" style={{ background: ACCENT }}>복사</button>
                              <button onClick={() => openEdit(t)} className="rounded-xl border px-4 py-2 text-sm" style={{ borderColor: BORDER, color: TEXT }}>수정</button>
                              <button onClick={() => handleDelete(t.id)} className="rounded-xl px-4 py-2 text-sm" style={{ color: '#C25B4E' }}>삭제</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}

              <div className="border-t pt-5" style={{ borderColor: BORDER }}>
                <h3 className="mb-1 text-sm font-semibold" style={{ color: MUTED }}>예시 멘트</h3>
                <p className="mb-3 text-xs leading-relaxed" style={{ color: '#9A9183' }}>
                  가져와서 나만의 멘트로 수정해보세요
                </p>
                <div className="space-y-3">
                  {EXAMPLE_TEMPLATES.map((ex, i) => (
                    <div key={i} className="rounded-2xl border border-dashed bg-cream/40 p-4" style={{ borderColor: BORDER }}>
                      <span className="mb-2 inline-block rounded-full px-2 py-0.5 text-xs" style={{ background: '#F0EAE0', color: ACCENT }}>
                        {CATEGORY_LABELS[ex.category]}
                      </span>
                      <p className="mb-1 text-sm font-medium" style={{ color: TEXT }}>{ex.title}</p>
                      <p className="mb-3 whitespace-pre-wrap text-sm" style={{ color: '#5A5247' }}>{ex.content}</p>
                      <button
                        onClick={() =>
                          openNew({
                            ...ex,
                            title: ex.title.replace(/\s*\(예시\)\s*$/, ''),
                          })
                        }
                        className="w-full rounded-xl border py-2 text-sm font-medium"
                        style={{ borderColor: ACCENT, color: ACCENT }}
                      >
                        내 멘트로 가져오기
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t px-5 py-4" style={{ borderColor: BORDER }}>
          <button onClick={() => openNew()} className="w-full rounded-2xl py-3 text-sm font-semibold text-white" style={{ background: ACCENT }}>
            + 멘트 추가
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-[390px] space-y-3 rounded-t-3xl bg-[#FAF8F4] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg" style={{ fontFamily: "'DM Serif Display', serif", color: TEXT }}>
              {editing ? '멘트 수정' : '멘트 추가'}
            </h3>
            <div className="flex gap-2">
              {CATEGORY_ORDER.map((cat) => {
                const on = draft.category === cat
                return (
                  <button key={cat} onClick={() => setDraft((d) => ({ ...d, category: cat }))}
                    className="flex-1 rounded-xl border py-2 text-sm"
                    style={{ borderColor: on ? ACCENT : BORDER, background: on ? ACCENT : 'white', color: on ? 'white' : TEXT }}>
                    {CATEGORY_LABELS[cat]}
                  </button>
                )
              })}
            </div>
            <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="멘트 제목 (예: 시술 직후 인사)"
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              style={{ borderColor: BORDER, color: TEXT }} />
            <textarea value={draft.content} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
              placeholder="고객님께 보낼 멘트를 입력하세요"
              rows={6}
              className="w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm"
              style={{ borderColor: BORDER, color: TEXT }} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-2xl border py-3 text-sm" style={{ borderColor: BORDER, color: TEXT }}>취소</button>
              <button onClick={handleSave} className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white" style={{ background: ACCENT }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full px-4 py-2 text-sm text-white" style={{ background: '#2A2520' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
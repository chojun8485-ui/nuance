import { useEffect, useState } from 'react'
import {
  type MessageTemplate,
  type TemplateCategory,
  CATEGORY_LABELS,
  fetchTemplates,
  copyText,
} from '../lib/messageTemplates'

const ACCENT = '#C8A882'
const TEXT = '#2A2520'
const BORDER = '#E8E2D8'
const MUTED = '#9A9183'

interface Props {
  open: boolean
  onClose: () => void
  defaultCategory?: TemplateCategory
  onManage?: () => void
}

export default function MessagePicker({ open, onClose, defaultCategory, onManage }: Props) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchTemplates()
      .then(setTemplates)
      .catch((e) => { console.error(e); setToast('불러오지 못했어요') })
      .finally(() => setLoading(false))
  }, [open])

  async function handleCopy(content: string) {
    setToast((await copyText(content)) ? '복사됐어요!' : '복사에 실패했어요')
    setTimeout(() => setToast(null), 1500)
  }

  if (!open) return null
  const list = defaultCategory ? templates.filter((t) => t.category === defaultCategory) : templates

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-[390px] flex-col rounded-t-3xl bg-[#FAF8F4]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <h3 className="text-lg" style={{ fontFamily: "'DM Serif Display', serif", color: TEXT }}>멘트 복사</h3>
          <button onClick={onClose} className="text-sm" style={{ color: TEXT }}>닫기</button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading && <p className="py-8 text-center text-sm" style={{ color: MUTED }}>불러오는 중…</p>}
          {!loading && list.length === 0 && (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm" style={{ color: '#7A7164' }}>저장된 멘트가 없어요</p>
              {onManage && (
                <button onClick={onManage} className="rounded-xl px-4 py-2 text-sm font-medium text-white" style={{ background: ACCENT }}>
                  멘트 만들러 가기
                </button>
              )}
            </div>
          )}
          {!loading && list.map((t) => (
            <button key={t.id} onClick={() => handleCopy(t.content)}
              className="w-full rounded-2xl border bg-white p-4 text-left active:opacity-70"
              style={{ borderColor: BORDER }}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: TEXT }}>{t.title}</span>
                <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: '#F0EAE0', color: ACCENT }}>
                  {CATEGORY_LABELS[t.category]}
                </span>
              </div>
              <p className="line-clamp-3 whitespace-pre-wrap text-sm" style={{ color: '#5A5247' }}>{t.content}</p>
              <span className="mt-2 inline-block text-xs" style={{ color: ACCENT }}>탭하면 복사</span>
            </button>
          ))}
        </div>
        {onManage && !loading && list.length > 0 && (
          <div className="border-t px-5 py-3" style={{ borderColor: BORDER }}>
            <button onClick={onManage} className="w-full py-2 text-sm" style={{ color: ACCENT }}>멘트 보관함 관리 →</button>
          </div>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full px-4 py-2 text-sm text-white" style={{ background: '#2A2520' }}>
          {toast}
        </div>
      )}
    </div>
  )
}  
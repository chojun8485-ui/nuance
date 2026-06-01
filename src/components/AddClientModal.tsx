import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { addClient } from '../lib/supabase'
import type { ClientInsert } from '../types/client'

type AddClientModalProps = {
  open: boolean
  designerId: string
  onClose: () => void
  onSaved: () => void
}

export default function AddClientModal({
  open,
  designerId,
  onClose,
  onSaved,
}: AddClientModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [personalityNotes, setPersonalityNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setPhone('')
    setInstagram('')
    setPersonalityNotes('')
    setError(null)
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const payload: ClientInsert = {
        designer_id: designerId,
        name: name.trim(),
        phone: phone.trim() || null,
        instagram: instagram.trim() || null,
        personality_notes: personalityNotes.trim() || null,
      }
      await addClient(payload)
      onSaved()
      onClose()
    } catch {
      setError('고객 저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-client-title"
        className="relative z-10 w-full max-w-mobile rounded-t-2xl border border-border bg-background px-5 pb-8 pt-5 shadow-lg"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="add-client-title" className="text-lg font-semibold text-text">
            고객 추가
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-subtext transition-colors hover:bg-[#FAF8F5]"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="client-name" className="text-sm font-medium text-text">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="client-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="고객 이름"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="client-phone" className="text-sm font-medium text-text">
              전화번호
            </label>
            <input
              id="client-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="client-instagram"
              className="text-sm font-medium text-text"
            >
              인스타그램
            </label>
            <input
              id="client-instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@username"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="client-notes" className="text-sm font-medium text-text">
              성향 메모
            </label>
            <textarea
              id="client-notes"
              rows={3}
              value={personalityNotes}
              onChange={(e) => setPersonalityNotes(e.target.value)}
              placeholder="선호 스타일, 알레르기, 대화 스타일 등"
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
            />
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
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>
    </div>
  )
}

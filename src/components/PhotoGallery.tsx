import { useState } from 'react'
import { X } from 'lucide-react'
import { formatDateKo, parseStringArray } from '../lib/clientUtils'
import type { Treatment } from '../types/client'

interface Props {
  treatments: Treatment[]
  open: boolean
  onClose: () => void
}

export default function PhotoGallery({ treatments, open, onClose }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  if (!open) return null

  const groups = treatments
    .map((t) => ({
      date: t.treated_at ?? t.created_at,
      photos: parseStringArray(t.photo_urls),
    }))
    .filter((g) => g.photos.length > 0)

  const totalPhotos = groups.reduce((sum, g) => sum + g.photos.length, 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/30">
      <div className="flex h-full w-full max-w-[390px] flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-text">
            사진 모아보기{' '}
            <span className="text-sm font-normal text-subtext">
              ({totalPhotos})
            </span>
          </h2>
          <button onClick={onClose} className="text-sm text-subtext">
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {groups.length === 0 ? (
            <p className="py-12 text-center text-sm text-subtext">
              아직 사진이 없어요
            </p>
          ) : (
            <div className="space-y-5">
              {groups.map((g, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-xs font-medium text-subtext">
                    {formatDateKo(g.date)}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {g.photos.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setLightbox(url)}
                        className="aspect-square overflow-hidden rounded-xl border border-border"
                      >
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            aria-label="닫기"
          >
            <X size={22} />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  )
}
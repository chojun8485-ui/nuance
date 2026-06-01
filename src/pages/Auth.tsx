import { useState } from 'react'
import type { FormEvent } from 'react'
import { signIn, signUp } from '../lib/supabase'

type AuthTab = 'login' | 'signup'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('invalid login credentials')) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.'
    }
    if (msg.includes('user already registered')) {
      return '이미 가입된 이메일입니다.'
    }
    if (msg.includes('password')) {
      return '비밀번호는 6자 이상이어야 합니다.'
    }
    if (msg.includes('valid email')) {
      return '올바른 이메일 주소를 입력해 주세요.'
    }
    return error.message
  }
  return '오류가 발생했습니다. 다시 시도해 주세요.'
}

export default function Auth() {
  const [tab, setTab] = useState<AuthTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const switchTab = (next: AuthTab) => {
    setTab(next)
    setError(null)
    setInfo(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    try {
      if (tab === 'login') {
        await signIn(email.trim(), password)
      } else {
        const { user } = await signUp(email.trim(), password)
        if (user && !user.confirmed_at) {
          setInfo('가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.')
          setTab('login')
          setPassword('')
        }
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="font-display text-4xl tracking-wide text-primary">
          Nuance
        </h1>
        <p className="mt-2 text-sm text-subtext">
          {tab === 'login' ? '다시 만나서 반가워요' : '새로운 시작을 함께해요'}
        </p>
      </header>

      <div
        className="mb-8 flex rounded-full border border-border bg-[#FAF8F5] p-1"
        role="tablist"
        aria-label="인증 방식"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'login'}
          onClick={() => switchTab('login')}
          className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
            tab === 'login'
              ? 'bg-background text-text shadow-sm'
              : 'text-subtext'
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'signup'}
          onClick={() => switchTab('signup')}
          className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
            tab === 'signup'
              ? 'bg-background text-text shadow-sm'
              : 'text-subtext'
          }`}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-text">
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-text">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-subtext/60 focus:border-primary"
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

        {info && (
          <p
            role="status"
            className="rounded-xl border border-primary/30 bg-[#FAF8F5] px-4 py-3 text-sm text-text"
          >
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {loading
            ? '처리 중...'
            : tab === 'login'
              ? '로그인'
              : '회원가입'}
        </button>
      </form>
    </div>
  )
}

import { supabase } from './supabase'

export type TemplateCategory = 'after_treatment' | 'retouch' | 'etc'

export interface MessageTemplate {
  id: string
  designer_id: string
  title: string
  content: string
  category: TemplateCategory
  sort_order: number
  created_at: string
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  after_treatment: '시술 직후',
  retouch: '리터치 안내',
  etc: '기타',
}

export const EXAMPLE_TEMPLATES: Array<{
  title: string
  content: string
  category: TemplateCategory
}> = [
  {
    category: 'after_treatment',
    title: '시술 직후 인사 (예시)',
    content: `안녕하세요! 오늘 시술 도와드린 OOO 디자이너입니다 :)
지내시다 궁금한 점 있으시면 편하게 DM 주세요!

· 뿌리 탈색 주기: 한 달 반 ~ 두 달
· 약산성 클리닉 샴푸 사용 추천
· 고데기 온도는 150도 이하
· 드라이 전 젤·크림 타입 에센스 사용`,
  },
  {
    category: 'retouch',
    title: '마무리 인사 (예시)',
    content: `오늘도 방문해 주셔서 감사합니다!
한 달 반 ~ 두 달 뒤에 다시 뵐게요. 예쁜 머리 많이 해드릴게요 :)`,
  },
  {
    category: 'retouch',
    title: '리터치 안내 (예시)',
    content: `안녕하세요 OOO님, OOO 디자이너입니다 :)
지난 시술 후 한 달 반 정도 지났어요. 슬슬 리터치 시기가 다가오는데
편하신 날짜로 예약 도와드릴까요?`,
  },
]

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export async function fetchTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as MessageTemplate[]
}

export async function createTemplate(input: {
  title: string
  content: string
  category: TemplateCategory
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해요')
  const { error } = await supabase
    .from('message_templates')
    .insert({ ...input, designer_id: user.id })
  if (error) throw error
}

export async function updateTemplate(
  id: string,
  input: { title: string; content: string; category: TemplateCategory }
): Promise<void> {
  const { error } = await supabase
    .from('message_templates')
    .update(input)
    .eq('id', id)
  if (error) throw error
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('message_templates').delete().eq('id', id)
  if (error) throw error
}
export type Client = {
  id: string
  designer_id: string
  name: string
  phone: string | null
  instagram: string | null
  personality_notes: string | null
  created_at: string
  retouch_cycle_days?: number
  last_visit_at?: string | null
  visit_count?: number
}

export type Formula = {
  title: string
  dye: string
  developer: string
  ratio: string
}

export type StainSection = {
  label: string
  level: number | null
  width?: number
}

export type Treatment = {
  id: string
  client_id: string | null
  menu: string[] | null
  formulas: Formula[] | null
  processing_time: number | null
  color_tags: string[] | null
  stain_sections: StainSection[] | null
  notes: string | null
  photo_urls: string[] | null
  price: number | null
  treated_at: string | null
  created_at: string
}

export type TreatmentInsert = {
  client_id?: string | null
  menu_items?: string[]
  leave_time_minutes?: number | null
  formulas?: Formula[]
  stain_sections?: StainSection[]
  color_tags?: string[]
  notes?: string | null
  photo_urls?: string[]
  price?: number | null
  treated_at?: string | null
}

export type ClientWithTreatments = Client & {
  treatments: Treatment[]
}

export type TreatmentWithClient = Treatment & {
  client_name: string
}

export type ClientInsert = {
  designer_id: string
  name: string
  phone?: string | null
  instagram?: string | null
  personality_notes?: string | null
}

export type ClientUpdate = Partial
  Pick<Client, 'name' | 'phone' | 'instagram' | 'personality_notes'>
>
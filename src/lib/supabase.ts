import { createClient } from '@supabase/supabase-js'
import type {
  Client,
  ClientInsert,
  ClientUpdate,
  ClientWithTreatments,
  Treatment,
  TreatmentInsert,
  TreatmentWithClient,
} from '../types/client'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

const CLIENT_COLUMNS =
  'id, designer_id, name, phone, instagram, personality_notes, created_at'

export async function getClients(designerId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('designer_id', designerId)
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Client[]
}

export async function addClient(clientData: ClientInsert): Promise<Client> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const insertData = {
    ...clientData,
    designer_id: user.id,
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(insertData)
    .select(CLIENT_COLUMNS)
    .single()

  if (error) {
    console.log('addClient error:', error.message, error)
    throw error
  }
  return data as Client
}

export async function getClientById(
  clientId: string,
): Promise<ClientWithTreatments | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    .eq('id', clientId)
    .eq('designer_id', user.id)
    .maybeSingle()

  if (clientError) throw clientError
  if (!client) return null

  const { data: treatments, error: treatmentsError } = await supabase
    .from('treatments')
    .select(TREATMENT_COLUMNS)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (treatmentsError) {
    console.error('getClientById treatments error:', treatmentsError)
  }

  return {
    ...(client as Client),
    treatments: treatments ?? [],
  }
}

export async function updateClient(
  clientId: string,
  data: ClientUpdate,
): Promise<Client> {
  const { data: updated, error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', clientId)
    .select(CLIENT_COLUMNS)
    .single()

  if (error) throw error
  return updated as Client
}

const TREATMENT_COLUMNS =
  'id, client_id, menu, formulas, processing_time, color_tags, stain_sections, notes, photo_urls, treated_at, created_at'

export async function addTreatment(
  treatmentData: TreatmentInsert,
): Promise<Treatment> {
  const insertData = {
    client_id: treatmentData.client_id ?? null,
    menu: treatmentData.menu_items?.length ? treatmentData.menu_items : null,
    formulas: treatmentData.formulas?.length ? treatmentData.formulas : null,
    processing_time: treatmentData.leave_time_minutes ?? null,
    color_tags: treatmentData.color_tags?.length ? treatmentData.color_tags : null,
    stain_sections: treatmentData.stain_sections?.length
      ? treatmentData.stain_sections
      : null,
    notes: treatmentData.notes ?? null,
    photo_urls: treatmentData.photo_urls?.length ? treatmentData.photo_urls : null,
    treated_at: treatmentData.treated_at ?? null,
  }

  console.log('addTreatment insertData:', insertData)

  const { data, error } = await supabase
    .from('treatments')
    .insert(insertData)
    .select(TREATMENT_COLUMNS)
    .single()

  if (error) {
    console.log('addTreatment error:', error.message, error)
    throw error
  }
  return data as Treatment
}

function sanitizeAsciiFilename(name: string): string {
  return name.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_')
}

function getSafeExtension(file: File): string {
  const fromName = sanitizeAsciiFilename(file.name.split('.').pop() ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
  if (fromName) return fromName

  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return mimeToExt[file.type] ?? 'jpg'
}

function buildPhotoStoragePath(userId: string, file: File): string {
  const ext = getSafeExtension(file)
  const randomId = Math.random().toString(36).slice(2, 8)
  return `${userId}/${Date.now()}_${randomId}.${ext}`
}

export async function uploadPhoto(file: File, userId: string): Promise<string> {
  const path = buildPhotoStoragePath(userId, file)
  const { data, error } = await supabase.storage
    .from('treatment-photos')
    .upload(path, file, { upsert: false })

  if (error) {
    console.log('uploadPhoto error:', error.message, error)
    throw error
  }

  const { data: urlData } = supabase.storage
    .from('treatment-photos')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

export async function getRecentTreatments(
  designerId: string,
  limit = 8,
): Promise<TreatmentWithClient[]> {
  const { data, error } = await supabase
    .from('treatments')
    .select(`${TREATMENT_COLUMNS}, clients!inner(name)`)
    .eq('clients.designer_id', designerId)
    .not('client_id', 'is', null)
    .limit(limit * 3)

  if (error) throw error

  return (data ?? [])
    .map((row) => {
      const record = row as Treatment & {
        clients: { name: string } | { name: string }[] | null
      }
      const clientRef = record.clients
      const clientName = Array.isArray(clientRef)
        ? clientRef[0]?.name
        : clientRef?.name
      if (!clientName) return null
      const { clients: _clients, ...treatment } = record
      return {
        ...(treatment as Treatment),
        client_name: clientName,
      }
    })
    .filter((row): row is TreatmentWithClient => row !== null)
    .sort((a, b) => {
      const timeA = new Date(a.treated_at ?? a.created_at).getTime()
      const timeB = new Date(b.treated_at ?? b.created_at).getTime()
      return timeB - timeA
    })
    .slice(0, limit)
}

export async function getTreatmentsByClient(
  clientId: string,
): Promise<Treatment[]> {
  const { data, error } = await supabase
    .from('treatments')
    .select(TREATMENT_COLUMNS)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Treatment[]
}

export async function deleteTreatment(treatmentId: string): Promise<void> {
  const { error } = await supabase
    .from('treatments')
    .delete()
    .eq('id', treatmentId)

  if (error) throw error
}

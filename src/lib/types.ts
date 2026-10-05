export interface Note {
  id: string
  body: string
  created_at: string
  updated_at: string
  pinned: boolean
  deleted_at: string | null
}

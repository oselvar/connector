export type TodoistSection = Readonly<{
  id: string
  project_id: string
  order: number
  name: string
}>

export type TodoistTask = Readonly<{
  id: string
  project_id: string
  section_id: string | null
  content: string
  is_completed: boolean
  created_at: string
  completed_at: string | null
  url: string
}>

export type TodoistActivityEvent = Readonly<{
  id: string
  object_type: string
  object_id: string
  event_type: string
  event_date: string
  parent_project_id: string
  extra_data: Readonly<{
    section_id?: string
    last_section_id?: string
    content?: string
  }>
}>

export type TodoistActivityPage = Readonly<{
  events: readonly TodoistActivityEvent[]
  count: number
  has_more?: boolean
}>

import { getProjectWebhookEvents, getWorkspaceById, getWorkspaceProjects, isWorkspaceMember } from '$lib/server/db'
import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  const db = platform?.env?.DB
  if (!db || !locals.user) {
    error(401, 'Not authenticated')
  }

  const workspace = await getWorkspaceById(db, params.id)
  if (!workspace) {
    error(404, 'Workspace not found')
  }

  const isMember = await isWorkspaceMember(db, workspace.id, locals.user.id)
  if (!isMember) {
    error(403, 'Not a member of this workspace')
  }

  const projects = await getWorkspaceProjects(db, workspace.id)

  // Collect all webhook events from all projects
  const allEvents: Array<{ project_name: string; event_name: string; event_data: string; received_at: string }> = []
  for (const project of projects) {
    const events = await getProjectWebhookEvents(db, project.id)
    for (const event of events) {
      allEvents.push({
        project_name: project.todoist_project_name,
        event_name: event.event_name,
        event_data: event.event_data,
        received_at: event.received_at,
      })
    }
  }

  // Generate CSV
  const headers = ['project_name', 'event_name', 'event_data', 'received_at']
  const csvRows = [headers.join(',')]

  for (const event of allEvents) {
    const row = headers.map((header) => {
      const value = event[header as keyof typeof event]
      // Escape CSV values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvRows.push(row.join(','))
  }

  const csv = csvRows.join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${workspace.name.replace(/[^a-z0-9]/gi, '_')}_export.csv"`,
    },
  })
}

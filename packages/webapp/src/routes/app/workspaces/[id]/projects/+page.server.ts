import {
  createProject,
  generateId,
  getProjectByTodoistId,
  getUserById,
  getWorkspaceById,
  isWorkspaceMember,
} from '$lib/server/db'
import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, platform, locals }) => {
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

  // Get user's Todoist token
  const user = await getUserById(db, locals.user.id)
  const hasTodoistConnected = !!user?.todoist_access_token

  // Fetch Todoist projects if connected
  let todoistProjects: Array<{ id: string; name: string }> = []
  if (user?.todoist_access_token) {
    try {
      const response = await fetch('https://api.todoist.com/rest/v2/projects', {
        headers: {
          Authorization: `Bearer ${user.todoist_access_token}`,
        },
      })
      if (response.ok) {
        todoistProjects = (await response.json()) as Array<{ id: string; name: string }>
      }
    } catch (e) {
      console.error('Failed to fetch Todoist projects:', e)
    }
  }

  return {
    workspace,
    hasTodoistConnected,
    todoistProjects,
  }
}

export const actions: Actions = {
  default: async ({ request, params, platform, locals }) => {
    const db = platform?.env?.DB
    if (!db || !locals.user) {
      return fail(401, { error: 'Not authenticated' })
    }

    const workspace = await getWorkspaceById(db, params.id)
    if (!workspace) {
      return fail(404, { error: 'Workspace not found' })
    }

    const isMember = await isWorkspaceMember(db, workspace.id, locals.user.id)
    if (!isMember) {
      return fail(403, { error: 'Not a member of this workspace' })
    }

    const formData = await request.formData()
    const todoistProjectId = formData.get('todoist_project_id')?.toString()
    const todoistProjectName = formData.get('todoist_project_name')?.toString()

    if (!todoistProjectId || !todoistProjectName) {
      return fail(400, { error: 'Project selection required' })
    }

    // Check if already added
    const existing = await getProjectByTodoistId(db, workspace.id, todoistProjectId)
    if (existing) {
      return fail(400, { error: 'Project already added to this workspace' })
    }

    await createProject(db, {
      id: generateId(),
      workspace_id: workspace.id,
      todoist_project_id: todoistProjectId,
      todoist_project_name: todoistProjectName,
      webhook_registered_at: null,
    })

    redirect(303, `/app/workspaces/${workspace.id}`)
  },
}

import { getWorkspaceById, getWorkspaceProjects, isWorkspaceMember } from '$lib/server/db'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, platform, locals, url }) => {
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
  const shareUrl = `${url.origin}/join/${workspace.share_token}`

  return {
    workspace,
    projects,
    shareUrl,
  }
}

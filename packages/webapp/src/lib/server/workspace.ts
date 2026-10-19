/// <reference types="@cloudflare/workers-types" />

import { error } from '@sveltejs/kit'
import { type DbWorkspace, getWorkspaceById, isWorkspaceMember } from './db'

/**
 * Loads a workspace, failing unless the current user is a member of it.
 */
export async function requireWorkspaceMember(
  platform: App.Platform | undefined,
  locals: App.Locals,
  workspaceId: string
): Promise<{
  db: D1Database
  env: App.Platform['env']
  user: NonNullable<App.Locals['user']>
  workspace: DbWorkspace
}> {
  const db = platform?.env?.DB
  if (!platform || !db || !locals.user) {
    error(401, 'Not authenticated')
  }

  const workspace = await getWorkspaceById(db, workspaceId)
  if (!workspace) {
    error(404, 'Workspace not found')
  }

  if (!(await isWorkspaceMember(db, workspace.id, locals.user.id))) {
    error(403, 'Not a member of this workspace')
  }

  return { db, env: platform.env, user: locals.user, workspace }
}

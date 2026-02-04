import { addWorkspaceMember, getWorkspaceByShareToken, isWorkspaceMember } from '$lib/server/db'
import { error, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const db = platform?.env?.DB
  if (!db) {
    error(500, 'Database not available')
  }

  const workspace = await getWorkspaceByShareToken(db, params.shareToken)
  if (!workspace) {
    error(404, 'Invalid share link')
  }

  return {
    workspace,
    isAuthenticated: !!locals.user,
  }
}

export const actions: Actions = {
  default: async ({ params, platform, locals }) => {
    const db = platform?.env?.DB
    if (!db) {
      error(500, 'Database not available')
    }

    if (!locals.user) {
      redirect(302, `/login?redirect=/join/${params.shareToken}`)
    }

    const workspace = await getWorkspaceByShareToken(db, params.shareToken)
    if (!workspace) {
      error(404, 'Invalid share link')
    }

    const alreadyMember = await isWorkspaceMember(db, workspace.id, locals.user.id)
    if (!alreadyMember) {
      await addWorkspaceMember(db, workspace.id, locals.user.id, 'member')
    }

    redirect(303, `/app/workspaces/${workspace.id}`)
  },
}

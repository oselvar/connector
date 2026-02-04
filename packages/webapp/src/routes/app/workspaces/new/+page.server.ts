import { addWorkspaceMember, createWorkspace, generateId, generateShareToken } from '$lib/server/db'
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  return {}
}

export const actions: Actions = {
  default: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB
    if (!db || !locals.user) {
      return fail(400, { error: 'Not authenticated' })
    }

    const formData = await request.formData()
    const name = formData.get('name')?.toString().trim()

    if (!name || name.length === 0) {
      return fail(400, { error: 'Name is required' })
    }

    if (name.length > 100) {
      return fail(400, { error: 'Name is too long' })
    }

    const workspaceId = generateId()
    const shareToken = generateShareToken()

    await createWorkspace(db, {
      id: workspaceId,
      name,
      share_token: shareToken,
      created_at: new Date().toISOString(),
    })

    await addWorkspaceMember(db, workspaceId, locals.user.id, 'owner')

    redirect(303, `/app/workspaces/${workspaceId}`)
  },
}

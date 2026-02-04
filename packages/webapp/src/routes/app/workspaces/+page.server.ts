import { getUserWorkspaces } from '$lib/server/db'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, platform }) => {
  const db = platform?.env?.DB
  if (!db || !locals.user) {
    return { workspaces: [] }
  }

  const workspaces = await getUserWorkspaces(db, locals.user.id)

  return {
    workspaces,
  }
}

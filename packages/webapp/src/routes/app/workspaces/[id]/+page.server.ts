import { deleteTeam, getWorkspaceTeams } from '$lib/server/db'
import { requireWorkspaceMember } from '$lib/server/workspace'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, platform, locals, url }) => {
  const { db, workspace } = await requireWorkspaceMember(platform, locals, params.id)

  const teams = await getWorkspaceTeams(db, workspace.id)
  const shareUrl = `${url.origin}/join/${workspace.share_token}`

  return {
    workspace,
    teams,
    shareUrl,
  }
}

export const actions: Actions = {
  removeTeam: async ({ params, platform, locals, request }) => {
    const { db, workspace } = await requireWorkspaceMember(platform, locals, params.id)
    const teamId = (await request.formData()).get('team_id')?.toString()
    if (teamId) {
      await deleteTeam(db, workspace.id, teamId)
    }
  },
}

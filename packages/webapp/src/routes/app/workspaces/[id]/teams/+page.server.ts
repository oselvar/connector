import { loginProviders } from '$lib/server/auth'
import { createTeam, generateId, getWorkspaceTeams } from '$lib/server/db'
import { getLinearAccessToken } from '$lib/server/linear'
import { requireWorkspaceMember } from '$lib/server/workspace'
import { fetchTeams } from '@oselvar/linear'
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const { db, env, user, workspace } = await requireWorkspaceMember(platform, locals, params.id)

  const token = await getLinearAccessToken(db, env, user.id)
  if (!token) {
    return { workspace, linearConnected: false, linearAvailable: loginProviders(env).linear, teams: [] }
  }

  const [linearTeams, addedTeams] = await Promise.all([fetchTeams(token), getWorkspaceTeams(db, workspace.id)])
  const addedIds = new Set(addedTeams.map((team) => team.linear_team_id))

  return {
    workspace,
    linearConnected: true,
    linearAvailable: true,
    teams: linearTeams.map((team) => ({ ...team, added: addedIds.has(team.id) })),
  }
}

export const actions: Actions = {
  default: async ({ params, platform, locals, request }) => {
    const { db, env, user, workspace } = await requireWorkspaceMember(platform, locals, params.id)

    const token = await getLinearAccessToken(db, env, user.id)
    if (!token) {
      return fail(400, { error: 'Connect Linear first' })
    }

    const formData = await request.formData()
    const linearTeamId = formData.get('linear_team_id')?.toString()

    // Only allow teams the user can see in Linear
    const team = (await fetchTeams(token)).find((t) => t.id === linearTeamId)
    if (!team) {
      return fail(400, { error: 'Team not found' })
    }

    await createTeam(db, {
      id: generateId(),
      workspace_id: workspace.id,
      added_by_user_id: user.id,
      linear_team_id: team.id,
      linear_team_key: team.key,
      linear_team_name: team.name,
    })

    redirect(303, `/app/workspaces/${workspace.id}`)
  },
}

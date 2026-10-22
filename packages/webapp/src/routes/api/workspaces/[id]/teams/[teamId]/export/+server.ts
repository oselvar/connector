import { getWorkspaceTeam } from '$lib/server/db'
import { openTeam } from '$lib/server/linear'
import { requireWorkspaceMember } from '$lib/server/workspace'
import { makeMapFromString, orderedMapValues } from '@oselvar/core'
import { createLinearIssueStream, formatLinearFlowCsv, readAll } from '@oselvar/linear'
import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

/**
 * A team's issues as flow CSV, fetched live from Linear, in the layout Actionable Agile and
 * Nave import, with each issue's level, parent and PRs in extra columns.
 * Optional ?stages= overrides the default stages (all non-canceled workflow states).
 */
export const GET: RequestHandler = async ({ params, platform, locals, url }) => {
  const { db, env, workspace } = await requireWorkspaceMember(platform, locals, params.id)

  const team = await getWorkspaceTeam(db, workspace.id, params.teamId)
  if (!team) {
    error(404, 'Team not found')
  }

  const { client, states, defaultStageMap } = await openTeam(db, env, team)
  const stagesParam = url.searchParams.get('stages')
  const stageMap = stagesParam ? makeMapFromString(stagesParam) : defaultStageMap
  const stages = orderedMapValues(stageMap)

  // Parents are rolled up from their sub-issues, so every issue has to be in before writing
  const issues = await readAll(createLinearIssueStream(client, states, stageMap))

  // A parent starts when its first piece of work reaches the first started state
  const started = states.find((state) => state.type === 'started' && stageMap.has(state.name))
  const startStage = (started && stageMap.get(started.name)) ?? stages[1] ?? stages[0]

  return new Response(formatLinearFlowCsv(issues, stages, startStage), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${team.linear_team_key}.csv"`,
    },
  })
}

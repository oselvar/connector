import { getWorkspaceTeam } from '$lib/server/db'
import { openTeam } from '$lib/server/linear'
import { requireWorkspaceMember } from '$lib/server/workspace'
import { makeCsvTransform, makeMapFromString, orderedMapValues } from '@oselvar/core'
import { createLinearWorkItemStream } from '@oselvar/linear'
import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

/**
 * Streams a team's issues as Oselvar CSV, fetched live from Linear.
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

  const csv = createLinearWorkItemStream(client, states, stageMap)
    .pipeThrough(makeCsvTransform(orderedMapValues(stageMap)))
    .pipeThrough(new TextEncoderStream())

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${team.linear_team_key}.csv"`,
    },
  })
}

import { getWorkspaceTeam } from '$lib/server/db'
import { openTeam } from '$lib/server/linear'
import { requireWorkspaceMember } from '$lib/server/workspace'
import { orderedMapValues } from '@oselvar/core'
import { type LinearWorkItem, createLinearIssueStream } from '@oselvar/linear'
import { error } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

// Shared by the team's chart tabs, so switching tabs doesn't fetch from Linear again
export const load: LayoutServerLoad = async ({ params, platform, locals }) => {
  const { db, env, workspace } = await requireWorkspaceMember(platform, locals, params.id)

  const team = await getWorkspaceTeam(db, workspace.id, params.teamId)
  if (!team) {
    error(404, 'Team not found')
  }

  const { client, states, defaultStageMap } = await openTeam(db, env, team)
  const teamSize = await client.fetchMemberCount()
  const stages = orderedMapValues(defaultStageMap)
  const stateTypes = new Map(states.map((state) => [state.name, state.type]))

  // States Linear itself marks as not started. Names differ between teams, but these types don't.
  const notStartedStages = stages.filter((stage) =>
    ['triage', 'backlog', 'unstarted'].includes(stateTypes.get(stage) ?? '')
  )

  // The left handle is where work waits: the state just before the first "started" one.
  // The right handle is where work is finished: the first "completed" state.
  const firstStarted = stages.findIndex((stage) => stateTypes.get(stage) === 'started')
  const firstCompleted = stages.findIndex((stage) => stateTypes.get(stage) === 'completed')
  const defaultTo = firstCompleted >= 2 ? firstCompleted : stages.length - 1
  const defaultFrom = Math.min(Math.max(firstStarted - 1, 0), Math.max(defaultTo - 2, 0))

  return {
    workspace,
    team,
    stages,
    defaultFrom,
    defaultTo,
    notStartedStages,
    teamSize,
    // Streamed, so the page renders while issues load from Linear
    issues: collect(createLinearIssueStream(client, states, defaultStageMap)),
  }
}

async function collect(stream: ReadableStream<LinearWorkItem>): Promise<LinearWorkItem[]> {
  const items: LinearWorkItem[] = []
  const reader = stream.getReader()
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    items.push(next.value)
  }
  return items
}

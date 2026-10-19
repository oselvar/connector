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
  const stages = orderedMapValues(defaultStageMap)
  const stateTypes = new Map(states.map((state) => [state.name, state.type]))

  // Start at the first "started" state and end at the first "completed" one
  const defaultFrom = Math.max(
    stages.findIndex((stage) => stateTypes.get(stage) === 'started'),
    0
  )
  const firstCompleted = stages.findIndex((stage) => stateTypes.get(stage) === 'completed')
  const defaultTo = firstCompleted > defaultFrom ? firstCompleted : stages.length - 1

  return {
    workspace,
    team,
    stages,
    defaultFrom,
    defaultTo,
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

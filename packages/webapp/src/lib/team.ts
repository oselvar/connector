import { getContext, setContext } from 'svelte'

/** What every page of a team's charts needs to know about the team */
export type TeamContext = {
  workspaceId: string
  teamId: string
  stages: readonly string[]
  /** Where work counts as started, if the workflow has such a stage */
  commitmentStage: string | undefined
}

const key = Symbol('team')

export function setTeam(team: TeamContext) {
  setContext(key, team)
}

export function getTeam(): TeamContext {
  return getContext<TeamContext>(key)
}

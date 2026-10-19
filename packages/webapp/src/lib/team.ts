import { getContext, setContext } from 'svelte'

/** What every page of a team's charts needs to know about the team */
export type TeamContext = {
  workspaceId: string
  teamId: string
  stages: readonly string[]
  /** States the workflow itself marks as not started */
  notStartedStages: readonly string[]
  /** How many active people are on the team */
  teamSize: number
}

const key = Symbol('team')

export function setTeam(team: TeamContext) {
  setContext(key, team)
}

export function getTeam(): TeamContext {
  return getContext<TeamContext>(key)
}

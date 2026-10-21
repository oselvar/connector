/// <reference types="@cloudflare/workers-types" />

import { LinearClient, type LinearWorkflowState, makeDefaultStageMap } from '@oselvar/linear'
import { error } from '@sveltejs/kit'
import { OAuth2Client, type OAuth2Tokens } from 'arctic'
import { type DbTeam, type LinearTokens, getUserById, updateUserLinearTokens } from './db'

const TOKEN_ENDPOINT = 'https://api.linear.app/oauth/token'

// Refresh a little before expiry so a long export doesn't run with a token that's about to expire
const REFRESH_MARGIN_MS = 10 * 60 * 1000

export function toLinearTokens(tokens: OAuth2Tokens): LinearTokens {
  return {
    accessToken: tokens.accessToken(),
    // OAuth apps created before Linear introduced refresh tokens get long-lived tokens without one
    refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : '',
    expiresAt: tokens.accessTokenExpiresAt(),
  }
}

/**
 * Returns a valid Linear access token for the user, refreshing it if it's about to expire.
 * Returns null if the user hasn't connected Linear.
 */
export async function getLinearAccessToken(
  db: D1Database,
  env: App.Platform['env'],
  userId: string
): Promise<string | null> {
  const user = await getUserById(db, userId)
  if (!user?.linear_access_token) return null

  const expiresAt = user.linear_token_expires_at ?? 0
  const { LINEAR_CLIENT_ID: clientId, LINEAR_CLIENT_SECRET: clientSecret } = env
  // Refreshing needs the Linear app's credentials; without them, use the token as it is
  if (expiresAt - REFRESH_MARGIN_MS > Date.now() || !user.linear_refresh_token || !clientId || !clientSecret) {
    return user.linear_access_token
  }

  const client = new OAuth2Client(clientId, clientSecret, null)
  const tokens = toLinearTokens(await client.refreshAccessToken(TOKEN_ENDPOINT, user.linear_refresh_token, []))
  await updateUserLinearTokens(db, userId, tokens)
  return tokens.accessToken
}

/**
 * Opens a workspace team's data in Linear, using the token of whoever added the team
 * so all workspace members can see it. The stage map defaults to the team's
 * non-canceled workflow states, in workflow order.
 */
export async function openTeam(
  db: D1Database,
  env: App.Platform['env'],
  team: DbTeam
): Promise<{ client: LinearClient; states: LinearWorkflowState[]; defaultStageMap: Map<string, string> }> {
  const token = await getLinearAccessToken(db, env, team.added_by_user_id)
  if (!token) {
    error(409, 'The person who added this team has disconnected Linear')
  }

  const client = new LinearClient(team.linear_team_key, token)
  const states = await client.fetchWorkflowStates()
  return { client, states, defaultStageMap: makeDefaultStageMap(states) }
}

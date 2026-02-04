import { createGitHubClient } from '$lib/server/auth'
import { redirect } from '@sveltejs/kit'
import { generateState } from 'arctic'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ cookies, url, platform }) => {
  const clientId = platform?.env?.GITHUB_CLIENT_ID
  const clientSecret = platform?.env?.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth not configured')
  }

  const github = createGitHubClient(clientId, clientSecret)
  const state = generateState()
  const authUrl = github.createAuthorizationURL(state, ['read:user', 'user:email'])

  cookies.set('github_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    maxAge: 60 * 10, // 10 minutes
    sameSite: 'lax',
  })

  redirect(302, authUrl.toString())
}

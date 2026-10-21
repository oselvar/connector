import { createLinearClient } from '$lib/server/auth'
import { error, redirect } from '@sveltejs/kit'
import { generateState } from 'arctic'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ cookies, url, platform }) => {
  const clientId = platform?.env?.LINEAR_CLIENT_ID
  const clientSecret = platform?.env?.LINEAR_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    error(404, 'Sign-in with Linear is not set up')
  }

  const linear = createLinearClient(clientId, clientSecret, `${url.origin}/login/linear/callback`)
  const state = generateState()
  const authUrl = linear.createAuthorizationURL(state, ['read'])

  cookies.set('linear_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    maxAge: 60 * 10, // 10 minutes
    sameSite: 'lax',
  })

  redirect(302, authUrl.toString())
}

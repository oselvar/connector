import { createTodoistClient } from '$lib/server/auth'
import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

function generateState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const GET: RequestHandler = async ({ cookies, url, platform }) => {
  const clientId = platform?.env?.TODOIST_CLIENT_ID
  const clientSecret = platform?.env?.TODOIST_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Todoist OAuth not configured')
  }

  const redirectUri = `${url.origin}/login/todoist/callback`
  const todoist = createTodoistClient(clientId, clientSecret, redirectUri)
  const state = generateState()
  const authUrl = todoist.createAuthorizationURL(state, ['data:read', 'data:read_write'])

  cookies.set('todoist_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    maxAge: 60 * 10, // 10 minutes
    sameSite: 'lax',
  })

  redirect(302, authUrl.toString())
}

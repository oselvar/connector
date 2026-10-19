import { createLinearClient, initializeLucia } from '$lib/server/auth'
import { createUser, generateId, getUserByLinearId, updateUserLinear } from '$lib/server/db'
import { toLinearTokens } from '$lib/server/linear'
import { fetchViewer } from '@oselvar/linear'
import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, cookies, platform, locals }) => {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const storedState = cookies.get('linear_oauth_state')

  if (!code || !state || state !== storedState) {
    redirect(302, '/login?error=invalid_state')
  }

  const db = platform?.env?.DB
  if (!db) {
    throw new Error('Database not available')
  }

  const clientId = platform?.env?.LINEAR_CLIENT_ID
  const clientSecret = platform?.env?.LINEAR_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Linear OAuth not configured')
  }

  const linear = createLinearClient(clientId, clientSecret, `${url.origin}/login/linear/callback`)

  try {
    const tokens = toLinearTokens(await linear.validateAuthorizationCode(code))
    const viewer = await fetchViewer(tokens.accessToken)

    // Check if user exists
    let userId: string
    const existingUser = await getUserByLinearId(db, viewer.id)

    if (existingUser) {
      // Update tokens
      await updateUserLinear(db, existingUser.id, viewer.id, tokens)
      userId = existingUser.id
    } else if (locals.user) {
      // Link to existing logged-in user
      await updateUserLinear(db, locals.user.id, viewer.id, tokens)
      userId = locals.user.id
    } else {
      // Create new user
      userId = generateId()
      await createUser(db, {
        id: userId,
        linear_id: viewer.id,
        linear_access_token: tokens.accessToken,
        linear_refresh_token: tokens.refreshToken,
        linear_token_expires_at: tokens.expiresAt.getTime(),
      })
    }

    // Create session
    const lucia = initializeLucia(db)
    const session = await lucia.createSession(userId, {})
    const sessionCookie = lucia.createSessionCookie(session.id)

    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes,
    })
  } catch (error) {
    console.error('Linear OAuth error:', error)
    redirect(302, '/login?error=oauth_failed')
  }

  cookies.delete('linear_oauth_state', { path: '/' })
  redirect(302, '/app')
}

import { createTodoistClient, initializeLucia } from '$lib/server/auth'
import { createUser, generateId, getUserByTodoistId, updateUserTodoist } from '$lib/server/db'
import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, cookies, platform, locals }) => {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const storedState = cookies.get('todoist_oauth_state')

  if (!code || !state || state !== storedState) {
    redirect(302, '/login?error=invalid_state')
  }

  const db = platform?.env?.DB
  if (!db) {
    throw new Error('Database not available')
  }

  const clientId = platform?.env?.TODOIST_CLIENT_ID
  const clientSecret = platform?.env?.TODOIST_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Todoist OAuth not configured')
  }

  const redirectUri = `${url.origin}/login/todoist/callback`
  const todoist = createTodoistClient(clientId, clientSecret, redirectUri)

  try {
    const { accessToken } = await todoist.validateAuthorizationCode(code)

    // Get Todoist user info
    const todoistUserResponse = await fetch('https://api.todoist.com/sync/v9/sync', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        sync_token: '*',
        resource_types: '["user"]',
      }),
    })

    if (!todoistUserResponse.ok) {
      throw new Error('Failed to get Todoist user')
    }

    const syncData = (await todoistUserResponse.json()) as { user: { id: string; email: string } }
    const todoistId = syncData.user.id

    // Check if user exists
    let userId: string
    const existingUser = await getUserByTodoistId(db, todoistId)

    if (existingUser) {
      // Update access token
      await updateUserTodoist(db, existingUser.id, todoistId, accessToken)
      userId = existingUser.id
    } else if (locals.user) {
      // Link to existing logged-in user
      await updateUserTodoist(db, locals.user.id, todoistId, accessToken)
      userId = locals.user.id
    } else {
      // Create new user
      userId = generateId()
      await createUser(db, {
        id: userId,
        todoist_id: todoistId,
        todoist_access_token: accessToken,
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
    console.error('Todoist OAuth error:', error)
    redirect(302, '/login?error=oauth_failed')
  }

  cookies.delete('todoist_oauth_state', { path: '/' })
  redirect(302, '/app')
}

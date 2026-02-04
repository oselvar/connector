import { createGitHubClient, initializeLucia } from '$lib/server/auth'
import { createUser, generateId, getUserByGithubId, updateUserGithub } from '$lib/server/db'
import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, cookies, platform, locals }) => {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const storedState = cookies.get('github_oauth_state')

  if (!code || !state || state !== storedState) {
    redirect(302, '/login?error=invalid_state')
  }

  const db = platform?.env?.DB
  if (!db) {
    throw new Error('Database not available')
  }

  const clientId = platform?.env?.GITHUB_CLIENT_ID
  const clientSecret = platform?.env?.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth not configured')
  }

  const github = createGitHubClient(clientId, clientSecret)

  try {
    const tokens = await github.validateAuthorizationCode(code)
    const accessToken = tokens.accessToken()

    // Get GitHub user info
    const githubUserResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Oselvar-Webapp',
      },
    })

    if (!githubUserResponse.ok) {
      throw new Error('Failed to get GitHub user')
    }

    const githubUser = (await githubUserResponse.json()) as { id: number; login: string }
    const githubId = String(githubUser.id)

    // Check if user exists
    let userId: string
    const existingUser = await getUserByGithubId(db, githubId)

    if (existingUser) {
      // Update access token
      await updateUserGithub(db, existingUser.id, githubId, accessToken)
      userId = existingUser.id
    } else if (locals.user) {
      // Link to existing logged-in user
      await updateUserGithub(db, locals.user.id, githubId, accessToken)
      userId = locals.user.id
    } else {
      // Create new user
      userId = generateId()
      await createUser(db, {
        id: userId,
        github_id: githubId,
        github_access_token: accessToken,
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
    console.error('GitHub OAuth error:', error)
    redirect(302, '/login?error=oauth_failed')
  }

  cookies.delete('github_oauth_state', { path: '/' })
  redirect(302, '/app')
}

import { initializeLucia } from '$lib/server/auth'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  const db = event.platform?.env?.DB

  if (!db) {
    // No database available (e.g., during SSG)
    event.locals.user = null
    event.locals.session = null
    return resolve(event)
  }

  const lucia = initializeLucia(db)
  const sessionId = event.cookies.get(lucia.sessionCookieName)

  if (!sessionId) {
    event.locals.user = null
    event.locals.session = null
    return resolve(event)
  }

  const { session, user } = await lucia.validateSession(sessionId)

  if (session?.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id)
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes,
    })
  }

  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie()
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes,
    })
  }

  event.locals.user = user
    ? {
        id: user.id,
        githubId: user.githubId,
        todoistId: user.todoistId,
      }
    : null
  event.locals.session = session
    ? {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      }
    : null

  return resolve(event)
}

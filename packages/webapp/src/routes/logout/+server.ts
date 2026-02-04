import { initializeLucia } from '$lib/server/auth'
import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ cookies, locals, platform }) => {
  const db = platform?.env?.DB

  if (db && locals.session) {
    const lucia = initializeLucia(db)
    await lucia.invalidateSession(locals.session.id)
    const sessionCookie = lucia.createBlankSessionCookie()
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes,
    })
  }

  redirect(302, '/')
}

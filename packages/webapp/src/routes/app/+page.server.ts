import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  // User is guaranteed to be defined by the layout's redirect check
  return {
    user: locals.user,
  }
}

import { loginProviders } from '$lib/server/auth'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, platform }) => {
  // User is guaranteed to be defined by the layout's redirect check
  return {
    user: locals.user,
    providers: loginProviders(platform?.env),
  }
}

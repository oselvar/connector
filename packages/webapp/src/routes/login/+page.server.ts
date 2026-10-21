import { loginProviders } from '$lib/server/auth'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform }) => {
  return { providers: loginProviders(platform?.env) }
}

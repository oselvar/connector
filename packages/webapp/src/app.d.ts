// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      user: import('$lib/server/auth').User | null
      session: import('$lib/server/auth').Session | null
    }
    interface Platform {
      env: {
        DB: D1Database
        GITHUB_CLIENT_ID: string
        GITHUB_CLIENT_SECRET: string
        TODOIST_CLIENT_ID: string
        TODOIST_CLIENT_SECRET: string
      }
    }
  }
}

export {}

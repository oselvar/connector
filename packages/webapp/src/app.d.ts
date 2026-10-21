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
        // Each sign-in is offered only when both of its variables are set
        GITHUB_CLIENT_ID?: string
        GITHUB_CLIENT_SECRET?: string
        LINEAR_CLIENT_ID?: string
        LINEAR_CLIENT_SECRET?: string
      }
    }
  }
}

export {}

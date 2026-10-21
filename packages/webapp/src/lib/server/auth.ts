import { D1Adapter } from '@lucia-auth/adapter-sqlite'
import { GitHub, Linear } from 'arctic'
/// <reference types="@cloudflare/workers-types" />
import { Lucia } from 'lucia'

export type User = {
  id: string
  githubId: string | null
  linearId: string | null
}

export type Session = {
  id: string
  userId: string
  expiresAt: Date
}

export function initializeLucia(D1: D1Database) {
  const adapter = new D1Adapter(D1, {
    user: 'users',
    session: 'sessions',
  })

  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: true,
      },
    },
    getUserAttributes: (attributes) => {
      return {
        githubId: attributes.github_id,
        linearId: attributes.linear_id,
      }
    },
  })
}

/** Which sign-ins are set up: each needs its client id and secret */
export function loginProviders(env: App.Platform['env'] | undefined) {
  return {
    github: Boolean(env?.GITHUB_CLIENT_ID && env?.GITHUB_CLIENT_SECRET),
    linear: Boolean(env?.LINEAR_CLIENT_ID && env?.LINEAR_CLIENT_SECRET),
  }
}

export function createGitHubClient(clientId: string, clientSecret: string) {
  return new GitHub(clientId, clientSecret, null)
}

export function createLinearClient(clientId: string, clientSecret: string, redirectUri: string) {
  return new Linear(clientId, clientSecret, redirectUri)
}

// Lucia type augmentation
declare module 'lucia' {
  interface Register {
    Lucia: ReturnType<typeof initializeLucia>
    DatabaseUserAttributes: {
      github_id: string | null
      linear_id: string | null
    }
  }
}

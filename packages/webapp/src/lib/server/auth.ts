import { D1Adapter } from '@lucia-auth/adapter-sqlite'
import { GitHub } from 'arctic'
/// <reference types="@cloudflare/workers-types" />
import { Lucia } from 'lucia'

export type User = {
  id: string
  githubId: string | null
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
      }
    },
  })
}

export function createGitHubClient(clientId: string, clientSecret: string) {
  return new GitHub(clientId, clientSecret, null)
}

// Lucia type augmentation
declare module 'lucia' {
  interface Register {
    Lucia: ReturnType<typeof initializeLucia>
    DatabaseUserAttributes: {
      github_id: string | null
    }
  }
}

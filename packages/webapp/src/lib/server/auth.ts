import { D1Adapter } from '@lucia-auth/adapter-sqlite'
import { GitHub } from 'arctic'
/// <reference types="@cloudflare/workers-types" />
import { Lucia } from 'lucia'

export type User = {
  id: string
  githubId: string | null
  todoistId: string | null
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
        todoistId: attributes.todoist_id,
      }
    },
  })
}

export function createGitHubClient(clientId: string, clientSecret: string) {
  return new GitHub(clientId, clientSecret, null)
}

// Custom Todoist OAuth implementation
export class TodoistOAuth {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.redirectUri = redirectUri
  }

  createAuthorizationURL(state: string, scopes: string[]): URL {
    const url = new URL('https://todoist.com/oauth/authorize')
    url.searchParams.set('client_id', this.clientId)
    url.searchParams.set('scope', scopes.join(','))
    url.searchParams.set('state', state)
    return url
  }

  async validateAuthorizationCode(code: string): Promise<{ accessToken: string }> {
    const response = await fetch('https://todoist.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to validate authorization code')
    }

    const data = (await response.json()) as { access_token: string }
    return { accessToken: data.access_token }
  }
}

export function createTodoistClient(clientId: string, clientSecret: string, redirectUri: string) {
  return new TodoistOAuth(clientId, clientSecret, redirectUri)
}

// Lucia type augmentation
declare module 'lucia' {
  interface Register {
    Lucia: ReturnType<typeof initializeLucia>
    DatabaseUserAttributes: {
      github_id: string | null
      todoist_id: string | null
    }
  }
}

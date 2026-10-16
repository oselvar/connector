/// <reference types="@cloudflare/workers-types" />

export function generateId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateShareToken(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export type DbUser = {
  id: string
  created_at: string
  github_id: string | null
  github_access_token: string | null
}

export type DbWorkspace = {
  id: string
  name: string
  share_token: string
  created_at: string
}

export type DbWorkspaceMember = {
  workspace_id: string
  user_id: string
  role: 'owner' | 'member'
}

// User operations
export async function getUserById(db: D1Database, id: string): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<DbUser>()
}

export async function getUserByGithubId(db: D1Database, githubId: string): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE github_id = ?').bind(githubId).first<DbUser>()
}

export async function createUser(db: D1Database, user: Partial<DbUser> & { id: string }): Promise<void> {
  await db
    .prepare('INSERT INTO users (id, github_id, github_access_token) VALUES (?, ?, ?)')
    .bind(user.id, user.github_id ?? null, user.github_access_token ?? null)
    .run()
}

export async function updateUserGithub(
  db: D1Database,
  userId: string,
  githubId: string,
  accessToken: string
): Promise<void> {
  await db
    .prepare('UPDATE users SET github_id = ?, github_access_token = ? WHERE id = ?')
    .bind(githubId, accessToken, userId)
    .run()
}

// Workspace operations
export async function createWorkspace(db: D1Database, workspace: DbWorkspace): Promise<void> {
  await db
    .prepare('INSERT INTO workspaces (id, name, share_token) VALUES (?, ?, ?)')
    .bind(workspace.id, workspace.name, workspace.share_token)
    .run()
}

export async function getWorkspaceById(db: D1Database, id: string): Promise<DbWorkspace | null> {
  return db.prepare('SELECT * FROM workspaces WHERE id = ?').bind(id).first<DbWorkspace>()
}

export async function getWorkspaceByShareToken(db: D1Database, shareToken: string): Promise<DbWorkspace | null> {
  return db.prepare('SELECT * FROM workspaces WHERE share_token = ?').bind(shareToken).first<DbWorkspace>()
}

export async function getUserWorkspaces(db: D1Database, userId: string): Promise<(DbWorkspace & { role: string })[]> {
  const result = await db
    .prepare(
      `
      SELECT w.*, wm.role
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = ?
      ORDER BY w.created_at DESC
    `
    )
    .bind(userId)
    .all<DbWorkspace & { role: string }>()
  return result.results
}

// Workspace member operations
export async function addWorkspaceMember(
  db: D1Database,
  workspaceId: string,
  userId: string,
  role: 'owner' | 'member'
): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)')
    .bind(workspaceId, userId, role)
    .run()
}

export async function isWorkspaceMember(db: D1Database, workspaceId: string, userId: string): Promise<boolean> {
  const result = await db
    .prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .bind(workspaceId, userId)
    .first()
  return result !== null
}

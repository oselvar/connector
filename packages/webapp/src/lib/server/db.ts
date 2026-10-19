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
  linear_id: string | null
  linear_access_token: string | null
  linear_refresh_token: string | null
  linear_token_expires_at: number | null
}

export type LinearTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export type DbWorkspace = {
  id: string
  name: string
  share_token: string
  created_at: string
}

export type DbTeam = {
  id: string
  workspace_id: string
  added_by_user_id: string
  linear_team_id: string
  linear_team_key: string
  linear_team_name: string
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
    .prepare(
      `INSERT INTO users (id, github_id, github_access_token, linear_id, linear_access_token, linear_refresh_token, linear_token_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      user.id,
      user.github_id ?? null,
      user.github_access_token ?? null,
      user.linear_id ?? null,
      user.linear_access_token ?? null,
      user.linear_refresh_token ?? null,
      user.linear_token_expires_at ?? null
    )
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

export async function getUserByLinearId(db: D1Database, linearId: string): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE linear_id = ?').bind(linearId).first<DbUser>()
}

export async function updateUserLinear(
  db: D1Database,
  userId: string,
  linearId: string,
  tokens: LinearTokens
): Promise<void> {
  await db
    .prepare(
      'UPDATE users SET linear_id = ?, linear_access_token = ?, linear_refresh_token = ?, linear_token_expires_at = ? WHERE id = ?'
    )
    .bind(linearId, tokens.accessToken, tokens.refreshToken, tokens.expiresAt.getTime(), userId)
    .run()
}

export async function updateUserLinearTokens(db: D1Database, userId: string, tokens: LinearTokens): Promise<void> {
  await db
    .prepare(
      'UPDATE users SET linear_access_token = ?, linear_refresh_token = ?, linear_token_expires_at = ? WHERE id = ?'
    )
    .bind(tokens.accessToken, tokens.refreshToken, tokens.expiresAt.getTime(), userId)
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

// Team operations
export async function getWorkspaceTeams(db: D1Database, workspaceId: string): Promise<DbTeam[]> {
  const result = await db
    .prepare('SELECT * FROM teams WHERE workspace_id = ? ORDER BY linear_team_name')
    .bind(workspaceId)
    .all<DbTeam>()
  return result.results
}

export async function getWorkspaceTeam(db: D1Database, workspaceId: string, teamId: string): Promise<DbTeam | null> {
  return db.prepare('SELECT * FROM teams WHERE workspace_id = ? AND id = ?').bind(workspaceId, teamId).first<DbTeam>()
}

export async function createTeam(db: D1Database, team: DbTeam): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO teams (id, workspace_id, added_by_user_id, linear_team_id, linear_team_key, linear_team_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      team.id,
      team.workspace_id,
      team.added_by_user_id,
      team.linear_team_id,
      team.linear_team_key,
      team.linear_team_name
    )
    .run()
}

export async function deleteTeam(db: D1Database, workspaceId: string, teamId: string): Promise<void> {
  await db.prepare('DELETE FROM teams WHERE workspace_id = ? AND id = ?').bind(workspaceId, teamId).run()
}

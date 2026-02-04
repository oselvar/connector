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
  todoist_id: string | null
  todoist_access_token: string | null
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

export type DbProject = {
  id: string
  workspace_id: string
  todoist_project_id: string
  todoist_project_name: string
  webhook_registered_at: string | null
}

export type DbWebhookEvent = {
  id: string
  project_id: string
  event_name: string
  event_data: string
  todoist_delivery_id: string | null
  received_at: string
}

// User operations
export async function getUserById(db: D1Database, id: string): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<DbUser>()
}

export async function getUserByGithubId(db: D1Database, githubId: string): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE github_id = ?').bind(githubId).first<DbUser>()
}

export async function getUserByTodoistId(db: D1Database, todoistId: string): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE todoist_id = ?').bind(todoistId).first<DbUser>()
}

export async function createUser(db: D1Database, user: Partial<DbUser> & { id: string }): Promise<void> {
  await db
    .prepare(
      'INSERT INTO users (id, github_id, github_access_token, todoist_id, todoist_access_token) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(
      user.id,
      user.github_id ?? null,
      user.github_access_token ?? null,
      user.todoist_id ?? null,
      user.todoist_access_token ?? null
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

export async function updateUserTodoist(
  db: D1Database,
  userId: string,
  todoistId: string,
  accessToken: string
): Promise<void> {
  await db
    .prepare('UPDATE users SET todoist_id = ?, todoist_access_token = ? WHERE id = ?')
    .bind(todoistId, accessToken, userId)
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

// Project operations
export async function getWorkspaceProjects(db: D1Database, workspaceId: string): Promise<DbProject[]> {
  const result = await db
    .prepare('SELECT * FROM projects WHERE workspace_id = ? ORDER BY todoist_project_name')
    .bind(workspaceId)
    .all<DbProject>()
  return result.results
}

export async function createProject(db: D1Database, project: DbProject): Promise<void> {
  await db
    .prepare('INSERT INTO projects (id, workspace_id, todoist_project_id, todoist_project_name) VALUES (?, ?, ?, ?)')
    .bind(project.id, project.workspace_id, project.todoist_project_id, project.todoist_project_name)
    .run()
}

export async function getProjectByTodoistId(
  db: D1Database,
  workspaceId: string,
  todoistProjectId: string
): Promise<DbProject | null> {
  return db
    .prepare('SELECT * FROM projects WHERE workspace_id = ? AND todoist_project_id = ?')
    .bind(workspaceId, todoistProjectId)
    .first<DbProject>()
}

// Webhook event operations
export async function createWebhookEvent(db: D1Database, event: DbWebhookEvent): Promise<void> {
  await db
    .prepare(
      'INSERT OR IGNORE INTO webhook_events (id, project_id, event_name, event_data, todoist_delivery_id) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(event.id, event.project_id, event.event_name, event.event_data, event.todoist_delivery_id)
    .run()
}

export async function getProjectWebhookEvents(db: D1Database, projectId: string): Promise<DbWebhookEvent[]> {
  const result = await db
    .prepare('SELECT * FROM webhook_events WHERE project_id = ? ORDER BY received_at DESC')
    .bind(projectId)
    .all<DbWebhookEvent>()
  return result.results
}

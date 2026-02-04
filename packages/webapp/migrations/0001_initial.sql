-- Users (minimal - OAuth tokens only)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  github_id TEXT UNIQUE,
  github_access_token TEXT,
  todoist_id TEXT UNIQUE,
  todoist_access_token TEXT
);

-- Sessions (Lucia)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

-- Workspaces
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Workspace members (owner/member)
CREATE TABLE workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  PRIMARY KEY (workspace_id, user_id)
);

-- Todoist projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  todoist_project_id TEXT NOT NULL,
  todoist_project_name TEXT NOT NULL,
  webhook_registered_at TEXT,
  UNIQUE(workspace_id, todoist_project_id)
);

-- Webhook events (scoped to project)
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_data TEXT NOT NULL,
  todoist_delivery_id TEXT UNIQUE,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX idx_webhook_events_project_id ON webhook_events(project_id);

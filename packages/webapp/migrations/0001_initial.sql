-- Users (minimal - OAuth tokens only)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  github_id TEXT UNIQUE,
  github_access_token TEXT,
  linear_id TEXT UNIQUE,
  linear_access_token TEXT,
  linear_refresh_token TEXT,
  linear_token_expires_at INTEGER
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

-- Linear teams tracked by a workspace. Data is fetched with the token of the user who added the team.
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  added_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linear_team_id TEXT NOT NULL,
  linear_team_key TEXT NOT NULL,
  linear_team_name TEXT NOT NULL,
  UNIQUE(workspace_id, linear_team_id)
);

-- Indexes for common queries
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_teams_workspace_id ON teams(workspace_id);

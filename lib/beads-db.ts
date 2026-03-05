/**
 * Beads Database Service
 * Direct Postgres queries to the beads schema, replacing bd CLI calls.
 *
 * Uses BD_POSTGRES_URL env var to connect to the beads Supabase project.
 * Tables: beads.issues, beads.labels, beads.dependencies
 */

import { Pool } from "pg"

// Singleton pool -- reused across requests in the same Next.js server process.
let _pool: Pool | null = null

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.BD_POSTGRES_URL
    if (!connectionString) {
      throw new Error("BD_POSTGRES_URL environment variable is not set")
    }
    _pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  }
  return _pool
}

// ---------------------------------------------------------------------------
// Row types -- match the beads schema exactly
// ---------------------------------------------------------------------------

interface IssueRow {
  id: string
  title: string
  description: string | null
  notes: string | null
  status: string
  priority: number
  issue_type: string | null
  assignee: string | null
  estimated_minutes: number | null
  created_at: string
  updated_at: string | null
  closed_at: string | null
  close_reason: string | null
  external_ref: string | null
  owner: string | null
}

interface LabelRow {
  issue_id: string
  label: string
}

interface DependencyRow {
  issue_id: string
  depends_on_id: string
  type: string
  created_at: string
  created_by: string | null
}

// ---------------------------------------------------------------------------
// Transformed issue -- matches the format the API routes currently return
// ---------------------------------------------------------------------------

export interface BeadsApiIssue {
  id: string
  title: string
  description?: string
  notes?: string
  status: string
  priority: number
  type?: string
  labels: string[]
  assignee?: string
  estimate?: string
  branch?: string
  pr?: number
  externalRef?: string
  blockedBy?: string[]
  blocks?: string[]
  createdAt?: string
  updatedAt?: string
  closedAt?: string
  closeReason?: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function transformRow(
  row: IssueRow,
  labels: string[],
  blockedBy: string[],
  blocks: string[]
): BeadsApiIssue {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    notes: row.notes || undefined,
    status: row.status,
    priority: row.priority,
    type: row.issue_type || undefined,
    labels,
    assignee: row.assignee || undefined,
    estimate: row.estimated_minutes ? `${row.estimated_minutes}m` : undefined,
    externalRef: row.external_ref || undefined,
    blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
    blocks: blocks.length > 0 ? blocks : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
    closedAt: row.closed_at || undefined,
    closeReason: row.close_reason || undefined,
  }
}

/**
 * Batch-fetch labels for a set of issue IDs.
 * Returns a map: issue_id -> label[]
 */
async function fetchLabels(pool: Pool, issueIds: string[]): Promise<Map<string, string[]>> {
  if (issueIds.length === 0) return new Map()
  const res = await pool.query<LabelRow>(
    `SELECT issue_id, label FROM beads.labels WHERE issue_id = ANY($1)`,
    [issueIds]
  )
  const map = new Map<string, string[]>()
  for (const row of res.rows) {
    const arr = map.get(row.issue_id) ?? []
    arr.push(row.label)
    map.set(row.issue_id, arr)
  }
  return map
}

/**
 * Batch-fetch dependencies for a set of issue IDs.
 * Returns two maps: blockedBy (issue depends on X) and blocks (X depends on issue).
 *
 * In the dependencies table:
 *   issue_id depends_on depends_on_id  (type = "blocks")
 *   means depends_on_id blocks issue_id
 *   so issue_id is "blocked by" depends_on_id
 *   and depends_on_id "blocks" issue_id
 */
async function fetchDependencies(
  pool: Pool,
  issueIds: string[]
): Promise<{ blockedBy: Map<string, string[]>; blocks: Map<string, string[]> }> {
  const blockedBy = new Map<string, string[]>()
  const blocks = new Map<string, string[]>()
  if (issueIds.length === 0) return { blockedBy, blocks }

  // Get deps where the issue is the one that depends (blockedBy)
  const depsRes = await pool.query<DependencyRow>(
    `SELECT d.issue_id, d.depends_on_id, d.type, i.status as dep_status
     FROM beads.dependencies d
     LEFT JOIN beads.issues i ON i.id = d.depends_on_id
     WHERE d.issue_id = ANY($1) AND d.type = 'blocks'`,
    [issueIds]
  )
  for (const row of depsRes.rows) {
    // Only include as blocker if the dependency is not closed
    if ((row as any).dep_status !== "closed") {
      const arr = blockedBy.get(row.issue_id) ?? []
      arr.push(row.depends_on_id)
      blockedBy.set(row.issue_id, arr)
    }
  }

  // Get deps where the issue is depended upon (blocks)
  const dependentsRes = await pool.query<DependencyRow>(
    `SELECT issue_id, depends_on_id, type
     FROM beads.dependencies
     WHERE depends_on_id = ANY($1) AND type = 'blocks'`,
    [issueIds]
  )
  for (const row of dependentsRes.rows) {
    const arr = blocks.get(row.depends_on_id) ?? []
    arr.push(row.issue_id)
    blocks.set(row.depends_on_id, arr)
  }

  return { blockedBy, blocks }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ListOptions {
  includeAll?: boolean // include closed issues
  status?: string
  priority?: number
  limit?: number
  prefix?: string // filter by project prefix (e.g. "hp")
}

/**
 * List issues with optional filters.
 */
export async function listIssues(opts: ListOptions = {}): Promise<BeadsApiIssue[]> {
  const pool = getPool()
  const conditions: string[] = []
  const params: any[] = []
  let paramIdx = 1

  if (!opts.includeAll && !opts.status) {
    conditions.push(`i.status != $${paramIdx++}`)
    params.push("closed")
  }

  if (opts.status) {
    conditions.push(`i.status = $${paramIdx++}`)
    params.push(opts.status)
  }

  if (opts.priority) {
    conditions.push(`i.priority = $${paramIdx++}`)
    params.push(opts.priority)
  }

  if (opts.prefix) {
    conditions.push(`i.id LIKE $${paramIdx++} || '-%'`)
    params.push(opts.prefix)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const limitClause = opts.limit && opts.limit > 0 ? `LIMIT $${paramIdx++}` : ""
  if (opts.limit && opts.limit > 0) params.push(opts.limit)

  const issueRes = await pool.query<IssueRow>(
    `SELECT id, title, description, notes, status, priority, issue_type, assignee,
            estimated_minutes, created_at, updated_at, closed_at, close_reason,
            external_ref, owner
     FROM beads.issues i
     ${where}
     ORDER BY priority ASC, created_at DESC
     ${limitClause}`,
    params
  )

  const issueIds = issueRes.rows.map((r) => r.id)
  const [labelsMap, { blockedBy, blocks }] = await Promise.all([
    fetchLabels(pool, issueIds),
    fetchDependencies(pool, issueIds),
  ])

  return issueRes.rows.map((row) =>
    transformRow(
      row,
      labelsMap.get(row.id) ?? [],
      blockedBy.get(row.id) ?? [],
      blocks.get(row.id) ?? []
    )
  )
}

/**
 * Get a single issue by ID with full dependency info.
 */
export async function getIssue(id: string): Promise<BeadsApiIssue | null> {
  const pool = getPool()

  const issueRes = await pool.query<IssueRow>(
    `SELECT id, title, description, notes, status, priority, issue_type, assignee,
            estimated_minutes, created_at, updated_at, closed_at, close_reason,
            external_ref, owner
     FROM beads.issues
     WHERE id = $1`,
    [id]
  )

  if (issueRes.rows.length === 0) return null

  const row = issueRes.rows[0]
  const [labelsMap, { blockedBy, blocks }] = await Promise.all([
    fetchLabels(pool, [id]),
    fetchDependencies(pool, [id]),
  ])

  return transformRow(
    row,
    labelsMap.get(id) ?? [],
    blockedBy.get(id) ?? [],
    blocks.get(id) ?? []
  )
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface BeadsProject {
  prefix: string
  name: string
  description: string
}

/**
 * List all registered projects from the beads.projects table.
 */
export async function getProjects(): Promise<BeadsProject[]> {
  const pool = getPool()
  const res = await pool.query<BeadsProject>(
    `SELECT prefix, name, COALESCE(description, '') as description
     FROM beads.projects
     ORDER BY prefix`
  )
  return res.rows
}

export interface CreateIssueInput {
  title: string
  description?: string
  priority?: number
  type?: string
  labels?: string[]
  assignee?: string
  estimate?: number // minutes
}

/**
 * Create a new issue. Generates a beads-style ID.
 */
export async function createIssue(input: CreateIssueInput): Promise<BeadsApiIssue> {
  const pool = getPool()

  // Generate a beads-style ID: "beads-XXXX" with 4 random alphanumeric chars
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let suffix = ""
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  const id = `beads-${suffix}`

  const now = new Date().toISOString()

  await pool.query(
    `INSERT INTO beads.issues (id, title, description, status, priority, issue_type, assignee, estimated_minutes, created_at, updated_at)
     VALUES ($1, $2, $3, 'open', $4, $5, $6, $7, $8, $8)`,
    [
      id,
      input.title,
      input.description || null,
      input.priority ?? 3,
      input.type || null,
      input.assignee || null,
      input.estimate || null,
      now,
    ]
  )

  // Insert labels
  if (input.labels && input.labels.length > 0) {
    const values = input.labels.map((_, i) => `($1, $${i + 2})`).join(", ")
    await pool.query(
      `INSERT INTO beads.labels (issue_id, label) VALUES ${values}`,
      [id, ...input.labels]
    )
  }

  const issue = await getIssue(id)
  if (!issue) throw new Error("Failed to create issue")
  return issue
}

export interface UpdateIssueInput {
  status?: string
  priority?: number
  title?: string
  description?: string
  notes?: string
  labels?: string[]
  assignee?: string
  estimate?: number // minutes
}

/**
 * Update an existing issue.
 */
export async function updateIssue(
  id: string,
  input: UpdateIssueInput
): Promise<BeadsApiIssue | null> {
  const pool = getPool()

  // Build SET clause dynamically
  const sets: string[] = []
  const params: any[] = []
  let paramIdx = 1

  if (input.status !== undefined) {
    sets.push(`status = $${paramIdx++}`)
    params.push(input.status)
    // If closing, set closed_at
    if (input.status === "closed") {
      sets.push(`closed_at = $${paramIdx++}`)
      params.push(new Date().toISOString())
    }
  }
  if (input.priority !== undefined) {
    sets.push(`priority = $${paramIdx++}`)
    params.push(input.priority)
  }
  if (input.title !== undefined) {
    sets.push(`title = $${paramIdx++}`)
    params.push(input.title)
  }
  if (input.description !== undefined) {
    sets.push(`description = $${paramIdx++}`)
    params.push(input.description)
  }
  if (input.notes !== undefined) {
    sets.push(`notes = $${paramIdx++}`)
    params.push(input.notes)
  }
  if (input.assignee !== undefined) {
    sets.push(`assignee = $${paramIdx++}`)
    params.push(input.assignee || null)
  }
  if (input.estimate !== undefined) {
    sets.push(`estimated_minutes = $${paramIdx++}`)
    params.push(input.estimate)
  }

  // Always update updated_at
  sets.push(`updated_at = $${paramIdx++}`)
  params.push(new Date().toISOString())

  if (sets.length > 0) {
    params.push(id)
    await pool.query(
      `UPDATE beads.issues SET ${sets.join(", ")} WHERE id = $${paramIdx}`,
      params
    )
  }

  // Handle labels replacement
  if (input.labels !== undefined) {
    await pool.query(`DELETE FROM beads.labels WHERE issue_id = $1`, [id])
    if (input.labels.length > 0) {
      const values = input.labels.map((_, i) => `($1, $${i + 2})`).join(", ")
      await pool.query(
        `INSERT INTO beads.labels (issue_id, label) VALUES ${values}`,
        [id, ...input.labels]
      )
    }
  }

  return getIssue(id)
}

/**
 * Close an issue (set status to closed, record closed_at).
 */
export async function closeIssue(id: string, reason?: string): Promise<boolean> {
  const pool = getPool()
  const now = new Date().toISOString()

  const res = await pool.query(
    `UPDATE beads.issues
     SET status = 'closed', closed_at = $2, close_reason = $3, updated_at = $2
     WHERE id = $1`,
    [id, now, reason || null]
  )

  return (res.rowCount ?? 0) > 0
}

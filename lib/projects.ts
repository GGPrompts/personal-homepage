// Projects Dashboard - Types and Helpers

// ============================================================================
// TYPES
// ============================================================================

// Task type for Kanban board
export interface ProjectTask {
  id: string
  title: string
  description?: string
  status: "todo" | "in-progress" | "done"
  createdAt: string
  updatedAt: string
}

// Link type for project bookmarks
export interface ProjectLink {
  id: string
  name: string
  url: string
  type: "docs" | "deploy" | "design" | "api" | "other"
  icon?: string
}

// Command type for terminal shortcuts
export interface ProjectCommand {
  id: string
  name: string
  command: string
  description?: string
  category: "dev" | "build" | "test" | "deploy" | "custom"
}

// Metadata for a single project (stored in sync repo)
export interface ProjectMeta {
  pinned: boolean
  tasks: ProjectTask[]
  links: ProjectLink[]
  commands: ProjectCommand[]
}

// Full metadata file structure
export interface ProjectsMetaFile {
  version: 1
  projects: Record<string, ProjectMeta>  // keyed by project slug
  updatedAt: string
}

// Default empty metadata for a project
export const DEFAULT_PROJECT_META: ProjectMeta = {
  pinned: false,
  tasks: [],
  links: [],
  commands: [],
}

// Default empty metadata file
export const DEFAULT_PROJECTS_META: ProjectsMetaFile = {
  version: 1,
  projects: {},
  updatedAt: new Date().toISOString(),
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  clone_url: string
  ssh_url: string
  language: string | null
  topics: string[]
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  pushed_at: string
  created_at: string
  archived: boolean
  private: boolean
  default_branch: string
}

export interface LocalProject {
  name: string
  path: string
  description?: string
  techStack: string[]
  git: {
    branch: string
    remoteUrl?: string
    status: "clean" | "dirty" | "untracked"
    ahead: number
    behind: number
  } | null
  lastModified: string
  scripts?: string[]
}

export interface Project {
  id: string
  name: string
  slug: string
  github?: GitHubRepo
  local?: LocalProject
  source: "github" | "local" | "both"
  description: string
  techStack: string[]
  pinned: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

export function generateSlug(name: string, source: "github" | "local", fullName?: string): string {
  if (source === "github" && fullName) {
    return `gh-${fullName.replace("/", "-")}`
  }
  return `local-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
}

export function normalizeGitUrl(url: string): string {
  // Normalize GitHub URLs to a common format for matching
  return url
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "")
    .toLowerCase()
}

export function detectTechStack(files: string[]): string[] {
  const tech: string[] = []

  if (files.includes("package.json")) tech.push("Node.js")
  if (files.includes("go.mod")) tech.push("Go")
  if (files.includes("Cargo.toml")) tech.push("Rust")
  if (files.includes("pyproject.toml") || files.includes("requirements.txt")) tech.push("Python")
  if (files.includes("tsconfig.json")) tech.push("TypeScript")
  if (files.includes("next.config.js") || files.includes("next.config.mjs") || files.includes("next.config.ts")) tech.push("Next.js")
  if (files.includes("vite.config.js") || files.includes("vite.config.ts")) tech.push("Vite")
  if (files.includes("docker-compose.yml") || files.includes("Dockerfile")) tech.push("Docker")

  return tech
}

export function mergeProjects(
  githubRepos: GitHubRepo[],
  localProjects: LocalProject[]
): Project[] {
  const projects: Project[] = []
  const matchedLocalPaths = new Set<string>()

  // Process GitHub repos first
  for (const repo of githubRepos) {
    const repoUrl = normalizeGitUrl(repo.html_url)

    // Try to find matching local project
    const matchingLocal = localProjects.find((local) => {
      if (!local.git?.remoteUrl) return false
      return normalizeGitUrl(local.git.remoteUrl) === repoUrl
    })

    if (matchingLocal) {
      matchedLocalPaths.add(matchingLocal.path)
    }

    projects.push({
      id: `gh-${repo.id}`,
      name: repo.name,
      slug: generateSlug(repo.name, "github", repo.full_name),
      github: repo,
      local: matchingLocal,
      source: matchingLocal ? "both" : "github",
      description: repo.description || matchingLocal?.description || "",
      techStack: matchingLocal?.techStack || (repo.language ? [repo.language] : []),
      pinned: false,
    })
  }

  // Add local-only projects
  for (const local of localProjects) {
    if (!matchedLocalPaths.has(local.path)) {
      projects.push({
        id: `local-${local.path}`,
        name: local.name,
        slug: generateSlug(local.name, "local"),
        local,
        source: "local",
        description: local.description || "",
        techStack: local.techStack,
        pinned: false,
      })
    }
  }

  return projects
}

export function getStatusBadge(project: Project): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (project.github?.archived) {
    return { label: "Archived", variant: "secondary" }
  }
  if (project.source === "both") {
    return { label: "Cloned", variant: "default" }
  }
  if (project.source === "github") {
    return { label: "Remote", variant: "outline" }
  }
  return { label: "Local", variant: "secondary" }
}

export function getGitStatusBadge(status: "clean" | "dirty" | "untracked"): { label: string; color: string } {
  switch (status) {
    case "clean":
      return { label: "Clean", color: "text-emerald-500" }
    case "dirty":
      return { label: "Modified", color: "text-amber-500" }
    case "untracked":
      return { label: "Untracked", color: "text-muted-foreground" }
  }
}

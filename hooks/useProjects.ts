"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useAuth } from "@/components/AuthProvider"
import { useAllProjectsMeta } from "@/hooks/useProjectMeta"
import {
  mergeProjects,
  type LocalProject,
  type GitHubRepo,
  type Project,
} from "@/lib/projects"

// ============================================================================
// TYPES
// ============================================================================

export interface UseProjectsReturn {
  /** All projects with local paths (for cwd selection), sorted with pinned first */
  projects: Project[]
  /** Raw local projects data */
  localProjects: LocalProject[]
  /** Raw GitHub projects data */
  githubProjects: GitHubRepo[]
  /** Whether projects are loading */
  isLoading: boolean
  /** Check if a project is pinned */
  isPinned: (slug: string) => boolean
  /** Refetch projects */
  refetch: () => void
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const LOCAL_PROJECTS_QUERY_KEY = ['local-projects']
export const GITHUB_PROJECTS_QUERY_KEY = ['github-projects-for-ai']

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for fetching and working with projects from local filesystem and GitHub
 *
 * Fetches both local projects and GitHub repos, merges them together,
 * and returns projects with local paths (for working directory selection).
 * Projects are sorted with pinned projects first.
 *
 * @example
 * ```tsx
 * const { projects, isLoading, isPinned } = useProjects()
 *
 * // Use in a select dropdown for working directory
 * <Select>
 *   {projects.map(project => (
 *     <SelectItem key={project.local!.path} value={project.local!.path}>
 *       {isPinned(project.slug) && '*'} {project.name}
 *     </SelectItem>
 *   ))}
 * </Select>
 * ```
 */
export function useProjects(): UseProjectsReturn {
  const { getGitHubToken } = useAuth()

  // Fetch local projects
  const {
    data: localProjectsData,
    isLoading: localLoading,
    refetch: refetchLocal,
  } = useQuery({
    queryKey: LOCAL_PROJECTS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/projects/local')
      if (!res.ok) return []
      const data = await res.json()
      return (data.projects || []) as LocalProject[]
    },
    staleTime: 5 * 60 * 1000,
  })

  // Fetch GitHub projects
  const {
    data: githubProjectsData,
    isLoading: githubLoading,
    refetch: refetchGithub,
  } = useQuery({
    queryKey: GITHUB_PROJECTS_QUERY_KEY,
    queryFn: async () => {
      const token = await getGitHubToken()
      if (!token) return []
      const res = await fetch('/api/projects/github', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      const data = await res.json()
      return (data.repos || []) as GitHubRepo[]
    },
    staleTime: 5 * 60 * 1000,
  })

  // Get pinned status
  const { isPinned } = useAllProjectsMeta()

  // Safely get arrays
  const localProjects = localProjectsData ?? []
  const githubProjects = githubProjectsData ?? []

  // Merge and sort projects with pinned at top
  const projects = useMemo(() => {
    if (!Array.isArray(localProjects) || !Array.isArray(githubProjects)) {
      return []
    }

    const merged = mergeProjects(githubProjects, localProjects)
    const projectsWithLocalPath = merged.filter(p => p.local?.path)

    return projectsWithLocalPath.sort((a, b) => {
      const aPinned = isPinned(a.slug)
      const bPinned = isPinned(b.slug)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return a.name.localeCompare(b.name)
    })
  }, [localProjects, githubProjects, isPinned])

  const refetch = () => {
    refetchLocal()
    refetchGithub()
  }

  return {
    projects,
    localProjects,
    githubProjects,
    isLoading: localLoading || githubLoading,
    isPinned,
    refetch,
  }
}

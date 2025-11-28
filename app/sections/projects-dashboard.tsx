"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import {
  FolderGit2,
  Terminal,
  ExternalLink,
  Github,
  RotateCw,
  Search,
  ChevronUp,
  ChevronDown,
  Star,
  GitBranch,
  Clock,
  Code,
  Filter,
  ArrowUpDown,
  CircleAlert,
  FolderOpen,
  X,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/components/AuthProvider"
import { AuthModal } from "@/components/AuthModal"
import { useTerminalExtension } from "@/hooks/useTerminalExtension"
import {
  mergeProjects,
  getStatusBadge,
  getGitStatusBadge,
  type Project,
  type GitHubRepo,
  type LocalProject,
} from "@/lib/projects"

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SortableHeader({
  column,
  children,
}: {
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void }
  children: React.ReactNode
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      {sorted === "asc" ? (
        <ChevronUp className="ml-2 h-4 w-4" />
      ) : sorted === "desc" ? (
        <ChevronDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProjectsDashboard({
  activeSubItem,
  onSubItemHandled,
}: {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}) {
  const { user, getGitHubToken } = useAuth()
  const { available: terminalAvailable, runCommand } = useTerminalExtension()
  const [showAuthModal, setShowAuthModal] = React.useState(false)

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "pushed_at", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [techFilter, setTechFilter] = React.useState<string[]>([])

  // Handle sub-item navigation
  React.useEffect(() => {
    if (activeSubItem) {
      onSubItemHandled?.()
    }
  }, [activeSubItem, onSubItemHandled])

  // Fetch GitHub repos
  const {
    data: githubData,
    isLoading: githubLoading,
    error: githubError,
    refetch: refetchGithub,
  } = useQuery({
    queryKey: ["projects-github"],
    queryFn: async () => {
      const token = await getGitHubToken()
      if (!token) return { repos: [] as GitHubRepo[], count: 0 }

      const res = await fetch("/api/projects/github", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to fetch repos")
      }
      return res.json() as Promise<{ repos: GitHubRepo[]; count: number }>
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  // Fetch local projects
  const {
    data: localData,
    isLoading: localLoading,
    error: localError,
    refetch: refetchLocal,
  } = useQuery({
    queryKey: ["projects-local"],
    queryFn: async () => {
      const res = await fetch("/api/projects/local")
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to scan projects")
      }
      return res.json() as Promise<{ projects: LocalProject[]; count: number }>
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  // Merge projects
  const projects = React.useMemo(() => {
    return mergeProjects(githubData?.repos || [], localData?.projects || [])
  }, [githubData?.repos, localData?.projects])

  // Get unique tech stacks for filter
  const allTechStacks = React.useMemo(() => {
    const techs = new Set<string>()
    projects.forEach((p) => p.techStack.forEach((t) => techs.add(t)))
    return Array.from(techs).sort()
  }, [projects])

  // Filter projects
  const filteredProjects = React.useMemo(() => {
    let filtered = projects

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => {
        if (statusFilter === "cloned") return p.source === "both"
        if (statusFilter === "remote") return p.source === "github"
        if (statusFilter === "local") return p.source === "local"
        if (statusFilter === "dirty") return p.local?.git?.status === "dirty"
        if (statusFilter === "archived") return p.github?.archived
        return true
      })
    }

    // Tech filter
    if (techFilter.length > 0) {
      filtered = filtered.filter((p) =>
        techFilter.some((tech) => p.techStack.includes(tech))
      )
    }

    return filtered
  }, [projects, statusFilter, techFilter])

  // Table columns
  const columns = React.useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
        cell: ({ row }) => {
          const project = row.original
          const badge = getStatusBadge(project)
          return (
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${project.slug}`}
                    className="font-medium truncate hover:text-primary hover:underline"
                  >
                    {project.name}
                  </Link>
                  <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                    {badge.label}
                  </Badge>
                  {project.github?.private && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Private
                    </Badge>
                  )}
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
          )
        },
        filterFn: (row, _, filterValue) => {
          const project = row.original
          const search = filterValue.toLowerCase()
          return (
            project.name.toLowerCase().includes(search) ||
            project.description?.toLowerCase().includes(search) ||
            false
          )
        },
      },
      {
        accessorKey: "branch",
        header: "Branch",
        cell: ({ row }) => {
          const project = row.original
          const git = project.local?.git
          if (!git) return <span className="text-muted-foreground">-</span>

          const statusBadge = getGitStatusBadge(git.status)
          return (
            <div className="flex items-center gap-2">
              <GitBranch className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-sm">{git.branch}</span>
              <span className={`text-xs ${statusBadge.color}`}>{statusBadge.label}</span>
              {(git.ahead > 0 || git.behind > 0) && (
                <span className="text-xs text-muted-foreground">
                  {git.ahead > 0 && `+${git.ahead}`}
                  {git.ahead > 0 && git.behind > 0 && "/"}
                  {git.behind > 0 && `-${git.behind}`}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "techStack",
        header: "Tech",
        cell: ({ row }) => {
          const stack = row.original.techStack
          if (stack.length === 0) return <span className="text-muted-foreground">-</span>
          return (
            <div className="flex flex-wrap gap-1">
              {stack.slice(0, 3).map((tech) => (
                <Badge key={tech} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tech}
                </Badge>
              ))}
              {stack.length > 3 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  +{stack.length - 3}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "stars",
        header: ({ column }) => <SortableHeader column={column}>Stars</SortableHeader>,
        accessorFn: (row) => row.github?.stargazers_count ?? 0,
        cell: ({ row }) => {
          const stars = row.original.github?.stargazers_count
          if (stars === undefined) return <span className="text-muted-foreground">-</span>
          return (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-400" />
              <span>{stars}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "issues",
        header: ({ column }) => <SortableHeader column={column}>Issues</SortableHeader>,
        accessorFn: (row) => row.github?.open_issues_count ?? 0,
        cell: ({ row }) => {
          const issues = row.original.github?.open_issues_count
          if (issues === undefined) return <span className="text-muted-foreground">-</span>
          return (
            <div className="flex items-center gap-1">
              <CircleAlert className="h-3 w-3 text-muted-foreground" />
              <span>{issues}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "pushed_at",
        header: ({ column }) => <SortableHeader column={column}>Updated</SortableHeader>,
        accessorFn: (row) => row.github?.pushed_at || row.local?.lastModified || "",
        cell: ({ row }) => {
          const date = row.original.github?.pushed_at || row.original.local?.lastModified
          if (!date) return <span className="text-muted-foreground">-</span>
          const d = new Date(date)
          const now = new Date()
          const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

          let relative = ""
          if (diffDays === 0) relative = "Today"
          else if (diffDays === 1) relative = "Yesterday"
          else if (diffDays < 7) relative = `${diffDays}d ago`
          else if (diffDays < 30) relative = `${Math.floor(diffDays / 7)}w ago`
          else if (diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`
          else relative = `${Math.floor(diffDays / 365)}y ago`

          return (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{relative}</span>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const project = row.original
          return (
            <div className="flex items-center gap-1">
              {/* Terminal - only if local */}
              {project.local && terminalAvailable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => runCommand("", { workingDir: project.local!.path, name: project.name })}
                  title="Open Terminal"
                >
                  <Terminal className="h-4 w-4" />
                </Button>
              )}
              {/* VS Code - only if local */}
              {project.local && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (terminalAvailable) {
                      runCommand(`code "${project.local!.path}"`, { name: `VS Code: ${project.name}` })
                    }
                  }}
                  title="Open in VS Code"
                  disabled={!terminalAvailable}
                >
                  <Code className="h-4 w-4" />
                </Button>
              )}
              {/* Open folder - only if local */}
              {project.local && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (terminalAvailable) {
                      runCommand(`xdg-open "${project.local!.path}" || open "${project.local!.path}"`, { name: `Open: ${project.name}` })
                    }
                  }}
                  title="Open Folder"
                  disabled={!terminalAvailable}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              )}
              {/* GitHub - only if has github */}
              {project.github && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <a
                    href={project.github.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on GitHub"
                  >
                    <Github className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {/* Details */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <Link href={`/projects/${project.slug}`} title="View Details">
                  <Info className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )
        },
      },
    ],
    [terminalAvailable, runCommand]
  )

  // TanStack Table instance
  const table = useReactTable({
    data: filteredProjects,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const isLoading = githubLoading || localLoading
  const hasError = githubError || localError

  // Not signed in state
  if (!user) {
    return (
      <>
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <FolderGit2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign In for Full Features</h2>
            <p className="text-muted-foreground mb-4">
              Sign in with GitHub to see all your repositories. Local projects are still available.
            </p>
            <Button
              onClick={() => setShowAuthModal(true)}
              className="bg-[#24292e] hover:bg-[#24292e]/90 text-white"
            >
              <Github className="h-4 w-4 mr-2" />
              Sign in with GitHub
            </Button>
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold terminal-glow mb-1">Projects</h1>
          <p className="text-muted-foreground text-sm">
            {filteredProjects.length} projects
            {githubData?.count ? ` (${githubData.count} GitHub` : ""}
            {localData?.count ? `, ${localData.count} local)` : githubData?.count ? ")" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchGithub()
              refetchLocal()
            }}
            disabled={isLoading}
          >
            <RotateCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-9"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setGlobalFilter("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="cloned">Cloned</SelectItem>
            <SelectItem value="remote">Remote Only</SelectItem>
            <SelectItem value="local">Local Only</SelectItem>
            <SelectItem value="dirty">Modified</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Tech filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-4 w-4 mr-2" />
              Tech
              {techFilter.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                  {techFilter.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Tech</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allTechStacks.map((tech) => (
              <DropdownMenuCheckboxItem
                key={tech}
                checked={techFilter.includes(tech)}
                onCheckedChange={(checked) => {
                  setTechFilter(
                    checked
                      ? [...techFilter, tech]
                      : techFilter.filter((t) => t !== tech)
                  )
                }}
              >
                {tech}
              </DropdownMenuCheckboxItem>
            ))}
            {techFilter.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTechFilter([])}>
                  Clear all
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear filters */}
        {(statusFilter !== "all" || techFilter.length > 0 || globalFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all")
              setTechFilter([])
              setGlobalFilter("")
            }}
            className="h-9 text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Error state */}
      {hasError && (
        <div className="glass rounded-lg p-4 mb-4 border-destructive/50">
          <p className="text-sm text-destructive">
            {githubError instanceof Error ? githubError.message : ""}
            {localError instanceof Error ? localError.message : ""}
          </p>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto glass rounded-lg">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length}>
                    <div className="h-12 bg-muted/20 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FolderGit2 className="h-12 w-12 mb-4" />
                    <p>No projects found</p>
                    {(statusFilter !== "all" || techFilter.length > 0) && (
                      <Button
                        variant="link"
                        onClick={() => {
                          setStatusFilter("all")
                          setTechFilter([])
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer stats */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Showing {table.getRowModel().rows.length} of {projects.length} projects
        </div>
        {!terminalAvailable && (
          <div className="flex items-center gap-1">
            <Terminal className="h-3 w-3" />
            <span>Terminal extension not detected</span>
          </div>
        )}
      </div>
    </div>
  )
}

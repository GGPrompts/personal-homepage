"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Github,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Bookmark,
  Settings,
  User,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/AuthProvider"
import { AuthModal } from "@/components/AuthModal"
import { RepoSelector } from "@/components/RepoSelector"

interface SyncStatus {
  lastSync: string | null
  itemCount: number
  repo: string | null
}

export default function ProfileSection() {
  const { user, loading, signOut, getGitHubToken, isConfigured } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [notesRepo, setNotesRepo] = useState(
    () => typeof window !== "undefined" ? localStorage.getItem("github-repo") || "" : ""
  )
  const [token, setToken] = useState<string | null>(null)

  // Load token when user is available
  useEffect(() => {
    const loadToken = async () => {
      const authToken = await getGitHubToken()
      setToken(authToken)
    }
    if (user) {
      loadToken()
    }
  }, [user, getGitHubToken])

  // Get sync status from localStorage
  const getNotesStatus = (): SyncStatus => {
    if (typeof window === "undefined") return { lastSync: null, itemCount: 0, repo: null }
    const cache = localStorage.getItem("github-notes-cache")
    const repo = localStorage.getItem("github-repo")
    if (cache) {
      try {
        const data = JSON.parse(cache)
        return {
          lastSync: data.timestamp || null,
          itemCount: data.files?.length || 0,
          repo,
        }
      } catch {
        return { lastSync: null, itemCount: 0, repo }
      }
    }
    return { lastSync: null, itemCount: 0, repo }
  }

  const getBookmarksStatus = (): SyncStatus => {
    if (typeof window === "undefined") return { lastSync: null, itemCount: 0, repo: null }
    const cache = localStorage.getItem("bookmarks-github-cache")
    const repo = localStorage.getItem("github-repo")
    if (cache) {
      try {
        const data = JSON.parse(cache)
        const bookmarkCount = data.bookmarks?.reduce((acc: number, folder: { links?: unknown[] }) =>
          acc + (folder.links?.length || 0), 0) || 0
        return {
          lastSync: data.timestamp || null,
          itemCount: bookmarkCount,
          repo,
        }
      } catch {
        return { lastSync: null, itemCount: 0, repo }
      }
    }
    return { lastSync: null, itemCount: 0, repo }
  }

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return "Never"
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setSigningOut(false)
    }
  }

  const handleRepoChange = (repo: string) => {
    setNotesRepo(repo)
    localStorage.setItem("github-repo", repo)
  }

  const notesStatus = getNotesStatus()
  const bookmarksStatus = getBookmarksStatus()

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Supabase not configured
  if (!isConfigured) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-xl p-8 text-center">
          <div className="w-20 h-20 rounded-full glass-dark mx-auto mb-6 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Auth Not Configured</h2>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Add your Supabase credentials to enable GitHub authentication
          </p>
          <div className="glass-dark p-4 rounded-lg text-left max-w-md mx-auto">
            <p className="text-sm font-mono text-muted-foreground">
              # Add to .env.local<br />
              NEXT_PUBLIC_SUPABASE_URL=...<br />
              NEXT_PUBLIC_SUPABASE_ANON_KEY=...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-xl p-8 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-20 h-20 rounded-full glass-dark mx-auto mb-6 flex items-center justify-center">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Sign in with GitHub to sync your Quick Notes and Bookmarks across devices
            </p>
            <Button
              onClick={() => setShowAuthModal(true)}
              className="bg-[#24292e] hover:bg-[#24292e]/90 text-white"
            >
              <Github className="h-5 w-5 mr-2" />
              Sign in with GitHub
            </Button>
          </motion.div>
        </div>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    )
  }

  // Logged in
  const githubUsername = user.user_metadata?.user_name || user.user_metadata?.preferred_username
  const avatarUrl = user.user_metadata?.avatar_url
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || githubUsername

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback>{fullName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{fullName}</h2>
              {githubUsername && (
                <a
                  href={`https://github.com/${githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  @{githubUsername}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
            className="glass-dark"
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Sign Out
          </Button>
        </div>
      </div>

      {/* Connected Services */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Connected Services
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 glass-dark rounded-lg">
            <div className="flex items-center gap-3">
              <Github className="h-5 w-5" />
              <div>
                <p className="font-medium">GitHub</p>
                <p className="text-xs text-muted-foreground">@{githubUsername}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
              Connected
            </Badge>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Sync Status
        </h3>
        <div className="space-y-3">
          {/* Quick Notes */}
          <div className="flex items-center justify-between p-3 glass-dark rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-400" />
              <div>
                <p className="font-medium">Quick Notes</p>
                <p className="text-xs text-muted-foreground">
                  {notesStatus.itemCount > 0
                    ? `${notesStatus.itemCount} files`
                    : "No files synced"}
                </p>
              </div>
            </div>
            <div className="text-right">
              {notesStatus.lastSync ? (
                <Badge variant="outline" className="text-xs">
                  {formatLastSync(notesStatus.lastSync)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Not synced
                </Badge>
              )}
            </div>
          </div>

          {/* Bookmarks */}
          <div className="flex items-center justify-between p-3 glass-dark rounded-lg">
            <div className="flex items-center gap-3">
              <Bookmark className="h-5 w-5 text-amber-400" />
              <div>
                <p className="font-medium">Bookmarks</p>
                <p className="text-xs text-muted-foreground">
                  {bookmarksStatus.itemCount > 0
                    ? `${bookmarksStatus.itemCount} bookmarks`
                    : "No bookmarks synced"}
                </p>
              </div>
            </div>
            <div className="text-right">
              {bookmarksStatus.lastSync ? (
                <Badge variant="outline" className="text-xs">
                  {formatLastSync(bookmarksStatus.lastSync)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Not synced
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Repository Settings */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Repository Settings
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="repo" className="text-sm mb-2 block">
              GitHub Repository
            </Label>
            <RepoSelector
              value={notesRepo}
              onValueChange={handleRepoChange}
              token={token}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Repository used for syncing Quick Notes and Bookmarks
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

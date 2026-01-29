"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Download,
  Edit3,
  FileText,
  Forward,
  Image,
  Inbox,
  Mail,
  MailOpen,
  Menu,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  Star,
  Tag,
  Trash2,
  X,
  AlertCircle,
  File,
  Filter,
  LogIn,
  AlertTriangle,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

interface EmailAddress {
  name: string
  email: string
}

interface Attachment {
  id: string
  name: string
  mimeType: string
  size: number
}

interface Email {
  id: string
  threadId: string
  from: EmailAddress
  to: EmailAddress[]
  cc?: EmailAddress[]
  subject: string
  body: string
  bodyText?: string
  bodyPreview: string
  date: Date
  isRead: boolean
  isStarred: boolean
  labelIds: string[]
  attachments?: Attachment[]
  snippet?: string
}

interface Label {
  id: string
  name: string
  type: "system" | "user"
  color?: string
  unreadCount?: number
  totalCount?: number
}

interface Folder {
  id: string
  name: string
  icon: React.ElementType
  unreadCount: number
  isSystem: boolean
  labelId: string
}

// ============================================================================
// COMPONENT
// ============================================================================

interface EmailSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

export default function EmailSection({
  activeSubItem,
  onSubItemHandled,
}: EmailSectionProps) {
  const queryClient = useQueryClient()
  const {
    isConnected,
    isLoading: authLoading,
    connect,
    getAccessToken,
    user,
  } = useGoogleAuth()

  // State
  const [selectedFolder, setSelectedFolder] = useState("INBOX")
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [showCompose, setShowCompose] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filterLabel, setFilterLabel] = useState<string | null>(null)
  // Pagination state
  const [allEmails, setAllEmails] = useState<Email[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [composeData, setComposeData] = useState({
    to: "",
    cc: "",
    subject: "",
    body: "",
    threadId: "",
    inReplyTo: "",
  })

  // Handle sub-item navigation
  useEffect(() => {
    if (activeSubItem && onSubItemHandled) {
      // Could handle deep-linking to specific emails or folders
      onSubItemHandled()
    }
  }, [activeSubItem, onSubItemHandled])

  // Fetch labels
  const { data: labelsData, isLoading: labelsLoading } = useQuery({
    queryKey: ["gmail-labels"],
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error("Not authenticated")

      const response = await fetch("/api/gmail/labels", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch labels")
      }

      return response.json()
    },
    enabled: isConnected,
    staleTime: 5 * 60 * 1000,
  })

  // Build folders from labels
  const folders: Folder[] = useMemo(() => {
    const systemFolders: Folder[] = [
      {
        id: "inbox",
        name: "Inbox",
        icon: Inbox,
        unreadCount: 0,
        isSystem: true,
        labelId: "INBOX",
      },
      {
        id: "starred",
        name: "Starred",
        icon: Star,
        unreadCount: 0,
        isSystem: true,
        labelId: "STARRED",
      },
      {
        id: "sent",
        name: "Sent",
        icon: Send,
        unreadCount: 0,
        isSystem: true,
        labelId: "SENT",
      },
      {
        id: "drafts",
        name: "Drafts",
        icon: Edit3,
        unreadCount: 0,
        isSystem: true,
        labelId: "DRAFT",
      },
      {
        id: "spam",
        name: "Spam",
        icon: AlertCircle,
        unreadCount: 0,
        isSystem: true,
        labelId: "SPAM",
      },
      {
        id: "trash",
        name: "Trash",
        icon: Trash2,
        unreadCount: 0,
        isSystem: true,
        labelId: "TRASH",
      },
    ]

    // Update unread counts from labels data
    if (labelsData?.labels) {
      for (const folder of systemFolders) {
        const label = labelsData.labels.find(
          (l: Label) => l.id === folder.labelId
        )
        if (label) {
          folder.unreadCount = label.unreadCount || 0
        }
      }
    }

    return systemFolders
  }, [labelsData])

  // User labels for filtering
  const userLabels: Label[] = useMemo(() => {
    if (!labelsData?.labels) return []
    return labelsData.labels.filter((l: Label) => l.type === "user")
  }, [labelsData])

  // Fetch emails
  const {
    data: emailsData,
    isLoading: emailsLoading,
    refetch: refetchEmails,
  } = useQuery({
    queryKey: ["gmail-messages", selectedFolder, searchQuery],
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error("Not authenticated")

      const params = new URLSearchParams({
        maxResults: "50",
        labelIds: selectedFolder,
      })

      if (searchQuery) {
        params.set("q", searchQuery)
      }

      const response = await fetch(`/api/gmail/messages?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch emails")
      }

      const data = await response.json()
      // Parse dates and store for pagination
      const messages = (data.messages || []).map((m: any) => ({
        ...m,
        date: new Date(m.date),
      }))
      setAllEmails(messages)
      setNextPageToken(data.nextPageToken || null)
      return { ...data, messages }
    },
    enabled: isConnected,
    staleTime: 1 * 60 * 1000,
  })

  // Load more emails (pagination)
  const loadMoreEmails = async () => {
    if (!nextPageToken || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const token = await getAccessToken()
      if (!token) return

      const params = new URLSearchParams({
        maxResults: "50",
        labelIds: selectedFolder,
        pageToken: nextPageToken,
      })

      if (searchQuery) {
        params.set("q", searchQuery)
      }

      const response = await fetch(`/api/gmail/messages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        const newMessages = (data.messages || []).map((m: any) => ({
          ...m,
          date: new Date(m.date),
        }))
        setAllEmails(prev => [...prev, ...newMessages])
        setNextPageToken(data.nextPageToken || null)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }

  const emails: Email[] = allEmails.length > 0 ? allEmails : (emailsData?.messages || [])

  // Filter emails by label
  const filteredEmails = useMemo(() => {
    let result = [...emails]

    if (filterLabel) {
      result = result.filter((e) => e.labelIds.includes(filterLabel))
    }

    return result.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [emails, filterLabel])

  // Mutations
  const modifyEmailMutation = useMutation({
    mutationFn: async ({
      id,
      addLabelIds,
      removeLabelIds,
    }: {
      id: string
      addLabelIds?: string[]
      removeLabelIds?: string[]
    }) => {
      const token = await getAccessToken()
      if (!token) throw new Error("Not authenticated")

      const response = await fetch(`/api/gmail/messages/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addLabelIds, removeLabelIds }),
      })

      if (!response.ok) {
        throw new Error("Failed to modify email")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] })
      queryClient.invalidateQueries({ queryKey: ["gmail-labels"] })
    },
  })

  const deleteEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken()
      if (!token) throw new Error("Not authenticated")

      const response = await fetch(`/api/gmail/messages/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete email")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] })
      queryClient.invalidateQueries({ queryKey: ["gmail-labels"] })
      toast.success("Email moved to trash")
    },
    onError: () => {
      toast.error("Failed to delete email")
    },
  })

  const sendEmailMutation = useMutation({
    mutationFn: async (data: {
      to: string
      cc?: string
      subject: string
      body: string
      threadId?: string
      inReplyTo?: string
    }) => {
      const token = await getAccessToken()
      if (!token) throw new Error("Not authenticated")

      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to send email")
      }

      return response.json()
    },
    onSuccess: () => {
      setShowCompose(false)
      setComposeData({
        to: "",
        cc: "",
        subject: "",
        body: "",
        threadId: "",
        inReplyTo: "",
      })
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] })
      toast.success("Email sent successfully")
    },
    onError: () => {
      toast.error("Failed to send email")
    },
  })

  // Mark email as read when selected
  useEffect(() => {
    if (selectedEmail && !selectedEmail.isRead) {
      modifyEmailMutation.mutate({
        id: selectedEmail.id,
        removeLabelIds: ["UNREAD"],
      })
    }
  }, [selectedEmail?.id])

  // Format date
  const formatDate = useCallback((date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = diff / (1000 * 60 * 60)

    if (hours < 1) {
      return `${Math.floor(diff / (1000 * 60))}m ago`
    } else if (hours < 24) {
      return `${Math.floor(hours)}h ago`
    } else if (hours < 48) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }
  }, [])

  // Format file size
  const formatSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }, [])

  // Toggle star
  const toggleStar = useCallback(
    (emailId: string, isStarred: boolean, e: React.MouseEvent) => {
      e.stopPropagation()
      modifyEmailMutation.mutate({
        id: emailId,
        addLabelIds: isStarred ? [] : ["STARRED"],
        removeLabelIds: isStarred ? ["STARRED"] : [],
      })
    },
    [modifyEmailMutation]
  )

  // Toggle selection
  const toggleSelection = useCallback((emailId: string) => {
    setSelectedEmails((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }, [])

  // Select all
  const selectAll = useCallback(() => {
    if (selectedEmails.size === filteredEmails.length) {
      setSelectedEmails(new Set())
    } else {
      setSelectedEmails(new Set(filteredEmails.map((e) => e.id)))
    }
  }, [selectedEmails.size, filteredEmails])

  // Delete selected
  const deleteSelected = useCallback(() => {
    for (const id of selectedEmails) {
      deleteEmailMutation.mutate(id)
    }
    setSelectedEmails(new Set())
    if (selectedEmail && selectedEmails.has(selectedEmail.id)) {
      setSelectedEmail(null)
    }
  }, [selectedEmails, selectedEmail, deleteEmailMutation])

  // Archive selected (remove from INBOX)
  const archiveSelected = useCallback(() => {
    for (const id of selectedEmails) {
      modifyEmailMutation.mutate({
        id,
        removeLabelIds: ["INBOX"],
      })
    }
    setSelectedEmails(new Set())
    if (selectedEmail && selectedEmails.has(selectedEmail.id)) {
      setSelectedEmail(null)
    }
    toast.success("Archived")
  }, [selectedEmails, selectedEmail, modifyEmailMutation])

  // Mark as read/unread
  const markAsRead = useCallback(
    (read: boolean) => {
      for (const id of selectedEmails) {
        modifyEmailMutation.mutate({
          id,
          addLabelIds: read ? [] : ["UNREAD"],
          removeLabelIds: read ? ["UNREAD"] : [],
        })
      }
      setSelectedEmails(new Set())
    },
    [selectedEmails, modifyEmailMutation]
  )

  // Get attachment icon
  const getAttachmentIcon = useCallback((mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image
    if (mimeType === "application/pdf") return FileText
    return File
  }, [])

  // Get label color (for user labels)
  const getLabelColor = useCallback(
    (labelId: string) => {
      const label = userLabels.find((l) => l.id === labelId)
      return label?.color || "hsl(var(--muted-foreground))"
    },
    [userLabels]
  )

  // Get label name
  const getLabelName = useCallback(
    (labelId: string) => {
      const label = userLabels.find((l) => l.id === labelId)
      return label?.name || labelId
    },
    [userLabels]
  )

  // Handle send
  const handleSend = useCallback(() => {
    if (!composeData.to || !composeData.subject) {
      toast.error("Please enter recipient and subject")
      return
    }
    sendEmailMutation.mutate({
      to: composeData.to,
      cc: composeData.cc || undefined,
      subject: composeData.subject,
      body: composeData.body,
      threadId: composeData.threadId || undefined,
      inReplyTo: composeData.inReplyTo || undefined,
    })
  }, [composeData, sendEmailMutation])

  // Handle reply
  const handleReply = useCallback((email: Email) => {
    setComposeData({
      to: email.from.email,
      cc: "",
      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      body: `\n\n---\nOn ${email.date.toLocaleString()}, ${email.from.name} wrote:\n\n${email.bodyText || email.bodyPreview}`,
      threadId: email.threadId,
      inReplyTo: email.id,
    })
    setShowCompose(true)
  }, [])

  // Handle forward
  const handleForward = useCallback((email: Email) => {
    setComposeData({
      to: "",
      cc: "",
      subject: email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`,
      body: `\n\n---\nForwarded message:\nFrom: ${email.from.name} <${email.from.email}>\nDate: ${email.date.toLocaleString()}\nSubject: ${email.subject}\n\n${email.bodyText || email.bodyPreview}`,
      threadId: "",
      inReplyTo: "",
    })
    setShowCompose(true)
  }, [])

  // If not authenticated, show connect screen
  if (!isConnected && !authLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2 terminal-glow">Email</h1>
        <p className="text-muted-foreground mb-6">
          Connect your Google account to access Gmail
        </p>

        <Card className="glass max-w-md p-6">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Connect Gmail</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in with your Google account to view and send emails directly
              from your dashboard.
            </p>
            <Button onClick={connect} className="gap-2">
              <LogIn className="h-4 w-4" />
              Connect Google Account
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2 terminal-glow">Email</h1>
        <p className="text-muted-foreground mb-6">Loading...</p>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full min-h-0"
      data-tabz-section="email"
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-dark border-b border-border px-4 py-3 flex-shrink-0"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setShowSidebar(!showSidebar)}
              data-tabz-action="toggle-sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold terminal-glow hidden sm:block">
                Mail
              </h1>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 !bg-muted/50 !text-foreground"
                data-tabz-input="search"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowFilters(!showFilters)}
                data-tabz-action="toggle-filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={() => refetchEmails()}
              data-tabz-action="refresh"
            >
              <RefreshCw
                className={`h-5 w-5 ${emailsLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 mt-3 overflow-hidden"
            >
              <Badge
                variant={filterLabel === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilterLabel(null)}
              >
                All
              </Badge>
              {userLabels.map((label) => (
                <Badge
                  key={label.id}
                  variant={filterLabel === label.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFilterLabel(label.id)}
                  style={{
                    borderColor:
                      filterLabel === label.id ? undefined : label.color,
                    color: filterLabel === label.id ? undefined : label.color,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-64 glass border-r border-border flex-shrink-0 flex flex-col absolute md:relative z-20 h-full md:h-auto"
            >
              <div className="p-4">
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    setComposeData({
                      to: "",
                      cc: "",
                      subject: "",
                      body: "",
                      threadId: "",
                      inReplyTo: "",
                    })
                    setShowCompose(true)
                  }}
                  data-tabz-action="compose"
                >
                  <Plus className="h-4 w-4" />
                  Compose
                </Button>
              </div>

              <ScrollArea className="flex-1 px-2">
                {/* Folders */}
                <div className="space-y-1">
                  {folders.map((folder) => {
                    const Icon = folder.icon
                    const isActive = selectedFolder === folder.labelId
                    return (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setSelectedFolder(folder.labelId)
                          setSelectedEmail(null)
                          if (window.innerWidth < 768) setShowSidebar(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        data-tabz-action="select-folder"
                        data-tabz-folder={folder.labelId}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm">{folder.name}</span>
                        </div>
                        {folder.unreadCount > 0 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            {folder.unreadCount}
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>

                {userLabels.length > 0 && (
                  <>
                    <Separator className="my-4" />

                    {/* User Labels */}
                    <div className="mb-2 px-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Labels
                      </span>
                    </div>
                    <div className="space-y-1">
                      {userLabels.map((label) => (
                        <button
                          key={label.id}
                          onClick={() => {
                            setFilterLabel(
                              filterLabel === label.id ? null : label.id
                            )
                            if (window.innerWidth < 768) setShowSidebar(false)
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            filterLabel === label.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="text-sm">{label.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </ScrollArea>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Overlay for mobile */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-10 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Email List */}
        <div
          className={`flex-1 flex flex-col border-r border-border min-w-0 ${
            selectedEmail
              ? "hidden md:flex md:w-[400px] md:flex-shrink-0"
              : "flex"
          }`}
        >
          {/* Toolbar */}
          <div className="glass-dark border-b border-border px-4 py-2 flex items-center gap-2 flex-shrink-0">
            <Checkbox
              checked={
                selectedEmails.size === filteredEmails.length &&
                filteredEmails.length > 0
              }
              onCheckedChange={selectAll}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetchEmails()}
              data-tabz-action="refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${emailsLoading ? "animate-spin" : ""}`}
              />
            </Button>
            {selectedEmails.size > 0 && (
              <>
                <Separator orientation="vertical" className="h-5" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={archiveSelected}
                  data-tabz-action="archive"
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={deleteSelected}
                  data-tabz-action="delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => markAsRead(true)}>
                      <MailOpen className="h-4 w-4 mr-2" />
                      Mark as read
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => markAsRead(false)}>
                      <Mail className="h-4 w-4 mr-2" />
                      Mark as unread
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="text-xs text-muted-foreground ml-2">
                  {selectedEmails.size} selected
                </span>
              </>
            )}
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {filteredEmails.length} emails
            </span>
          </div>

          {/* Email List */}
          <ScrollArea className="flex-1">
            {emailsLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <>
              <AnimatePresence mode="popLayout">
                {filteredEmails.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-64 text-muted-foreground"
                  >
                    <Inbox className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-sm">No emails found</p>
                  </motion.div>
                ) : (
                  filteredEmails.map((email, idx) => (
                    <motion.div
                      key={email.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => setSelectedEmail(email)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border cursor-pointer transition-colors ${
                        selectedEmail?.id === email.id
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      } ${!email.isRead ? "bg-muted/30" : ""}`}
                      data-tabz-item={email.id}
                    >
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          checked={selectedEmails.has(email.id)}
                          onCheckedChange={() => toggleSelection(email.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => toggleStar(email.id, email.isStarred, e)}
                          className="text-muted-foreground hover:text-yellow-500 transition-colors"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              email.isStarred
                                ? "fill-yellow-500 text-yellow-500"
                                : ""
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`text-sm truncate ${
                              !email.isRead
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {email.from.name}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDate(email.date)}
                          </span>
                        </div>
                        <p
                          className={`text-sm truncate mb-1 ${
                            !email.isRead
                              ? "font-medium text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {email.subject}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {email.bodyPreview}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {email.labelIds
                            .filter(
                              (l) =>
                                !["INBOX", "UNREAD", "STARRED", "SENT", "DRAFT", "TRASH", "SPAM", "IMPORTANT"].includes(
                                  l
                                )
                            )
                            .slice(0, 3)
                            .map((label) => (
                              <div
                                key={label}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getLabelColor(label) }}
                                title={getLabelName(label)}
                              />
                            ))}
                          {email.attachments && email.attachments.length > 0 && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Paperclip className="h-3 w-3" />
                              <span className="text-xs">
                                {email.attachments.length}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
              {/* Load More Button */}
              {nextPageToken && (
                <div className="p-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={loadMoreEmails}
                    disabled={isLoadingMore}
                    className="w-full max-w-xs"
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      <>Load More Emails</>
                    )}
                  </Button>
                </div>
              )}
              </>
            )}
          </ScrollArea>
        </div>

        {/* Email Preview */}
        <AnimatePresence mode="wait">
          {selectedEmail ? (
            <motion.div
              key={selectedEmail.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col min-w-0"
            >
              {/* Preview Header */}
              <div className="glass-dark border-b border-border px-4 py-3 flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedEmail(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    modifyEmailMutation.mutate({
                      id: selectedEmail.id,
                      removeLabelIds: ["INBOX"],
                    })
                    setSelectedEmail(null)
                  }}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    deleteEmailMutation.mutate(selectedEmail.id)
                    setSelectedEmail(null)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 md:p-6 space-y-6">
                  {/* Subject */}
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-semibold text-foreground">
                      {selectedEmail.subject}
                    </h2>
                    <button
                      onClick={(e) =>
                        toggleStar(selectedEmail.id, selectedEmail.isStarred, e)
                      }
                      className="text-muted-foreground hover:text-yellow-500 transition-colors flex-shrink-0"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          selectedEmail.isStarred
                            ? "fill-yellow-500 text-yellow-500"
                            : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* From/To */}
                  <Card className="glass p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-medium">
                          {selectedEmail.from.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {selectedEmail.from.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedEmail.from.email}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {selectedEmail.date.toLocaleString()}
                          </p>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span>To: </span>
                          {selectedEmail.to.map((t) => t.email).join(", ")}
                          {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                            <>
                              <br />
                              <span>Cc: </span>
                              {selectedEmail.cc.map((c) => c.email).join(", ")}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Body */}
                  <div className="prose prose-invert max-w-none">
                    {selectedEmail.body.includes("<") ? (
                      <div
                        className="text-foreground text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                      />
                    ) : (
                      <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedEmail.body}
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {selectedEmail.attachments &&
                    selectedEmail.attachments.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Attachments ({selectedEmail.attachments.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedEmail.attachments.map((attachment) => {
                            const Icon = getAttachmentIcon(attachment.mimeType)
                            return (
                              <Card
                                key={attachment.id}
                                className="glass-dark p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                              >
                                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {attachment.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatSize(attachment.size)}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </Card>
                            )
                          })}
                        </div>
                      </div>
                    )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleReply(selectedEmail)}
                      data-tabz-action="reply"
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <ReplyAll className="h-4 w-4" />
                      Reply All
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleForward(selectedEmail)}
                      data-tabz-action="forward"
                    >
                      <Forward className="h-4 w-4" />
                      Forward
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hidden md:flex flex-1 items-center justify-center text-muted-foreground"
            >
              <div className="text-center">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select an email to read</p>
                <p className="text-sm">
                  Click on an email from the list to view its contents
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Compose Modal */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {composeData.threadId ? "Reply" : "New Message"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">To</label>
              <Input
                placeholder="recipient@example.com"
                value={composeData.to}
                onChange={(e) =>
                  setComposeData((prev) => ({ ...prev, to: e.target.value }))
                }
                className="bg-background/50"
                data-tabz-input="compose-to"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Cc</label>
              <Input
                placeholder="cc@example.com"
                value={composeData.cc}
                onChange={(e) =>
                  setComposeData((prev) => ({ ...prev, cc: e.target.value }))
                }
                className="bg-background/50"
                data-tabz-input="compose-cc"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Subject</label>
              <Input
                placeholder="Subject"
                value={composeData.subject}
                onChange={(e) =>
                  setComposeData((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                className="bg-background/50"
                data-tabz-input="compose-subject"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Message</label>
              <Textarea
                placeholder="Write your message..."
                value={composeData.body}
                onChange={(e) =>
                  setComposeData((prev) => ({ ...prev, body: e.target.value }))
                }
                className="min-h-[200px] bg-background/50"
                data-tabz-input="compose-body"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" disabled>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled>
                <Image className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowCompose(false)}>
                Discard
              </Button>
              <Button
                onClick={handleSend}
                disabled={sendEmailMutation.isPending}
                className="gap-2"
                data-tabz-action="send"
              >
                <Send className="h-4 w-4" />
                {sendEmailMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

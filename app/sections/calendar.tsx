"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Plus,
  MapPin,
  Users,
  Repeat,
  MoreHorizontal,
  Grid3X3,
  List,
  CalendarDays,
  CalendarRange,
  Edit,
  Trash2,
  Check,
  Video,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  Link as LinkIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"

// ============================================================================
// TYPES
// ============================================================================

interface GoogleCalendar {
  id: string
  summary: string
  description?: string
  backgroundColor?: string
  foregroundColor?: string
  primary?: boolean
  accessRole: string
}

interface GoogleEventDateTime {
  dateTime?: string
  date?: string
  timeZone?: string
}

interface GoogleEventAttendee {
  email: string
  displayName?: string
  responseStatus?: "needsAction" | "declined" | "tentative" | "accepted"
  organizer?: boolean
  self?: boolean
}

interface GoogleEvent {
  id: string
  summary?: string
  description?: string
  start: GoogleEventDateTime
  end: GoogleEventDateTime
  location?: string
  attendees?: GoogleEventAttendee[]
  recurrence?: string[]
  hangoutLink?: string
  htmlLink?: string
  status?: string
  colorId?: string
}

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  allDay: boolean
  calendar: string
  calendarName: string
  color: string
  location?: string
  attendees?: { name: string; email: string; status: string }[]
  recurring?: boolean
  videoCall?: string
  htmlLink?: string
}

interface CalendarInfo {
  id: string
  name: string
  color: string
  isVisible: boolean
  isOwner: boolean
}

type ViewType = "month" | "week" | "day" | "agenda"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate()
}

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay()
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

const isToday = (date: Date) => {
  return isSameDay(date, new Date())
}

// Google Calendar colors mapping
const GOOGLE_CALENDAR_COLORS: Record<string, string> = {
  "1": "#7986cb",
  "2": "#33b679",
  "3": "#8e24aa",
  "4": "#e67c73",
  "5": "#f6bf26",
  "6": "#f4511e",
  "7": "#039be5",
  "8": "#616161",
  "9": "#3f51b5",
  "10": "#0b8043",
  "11": "#d50000",
}

// Convert Google Event to our format
function convertGoogleEvent(event: GoogleEvent, calendarId: string, calendarName: string, defaultColor: string): CalendarEvent {
  const isAllDay = !event.start.dateTime
  const startStr = event.start.dateTime || event.start.date || ""
  const endStr = event.end.dateTime || event.end.date || ""

  return {
    id: event.id,
    title: event.summary || "(No title)",
    description: event.description,
    start: startStr,
    end: endStr,
    allDay: isAllDay,
    calendar: calendarId,
    calendarName,
    color: event.colorId ? GOOGLE_CALENDAR_COLORS[event.colorId] || defaultColor : defaultColor,
    location: event.location,
    attendees: event.attendees?.map((a) => ({
      name: a.displayName || a.email,
      email: a.email,
      status: a.responseStatus || "needsAction",
    })),
    recurring: !!event.recurrence,
    videoCall: event.hangoutLink,
    htmlLink: event.htmlLink,
  }
}

// ============================================================================
// HOOKS
// ============================================================================

function useCalendars(accessToken: string | null) {
  return useQuery({
    queryKey: ["google-calendars", accessToken],
    queryFn: async () => {
      if (!accessToken) throw new Error("Not authenticated")

      const response = await fetch("/api/calendar/calendars", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch calendars")
      }

      const data = await response.json()
      return data.items as GoogleCalendar[]
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

function useCalendarEvents(
  accessToken: string | null,
  calendars: CalendarInfo[],
  currentDate: Date
) {
  // Get visible calendar IDs
  const visibleCalendarIds = calendars.filter((c) => c.isVisible).map((c) => c.id)

  // Calculate time range based on current date (entire month plus buffer)
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)
  const timeMin = new Date(startOfMonth.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(endOfMonth.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  return useQuery({
    queryKey: ["google-calendar-events", accessToken, visibleCalendarIds, timeMin, timeMax],
    queryFn: async () => {
      if (!accessToken) throw new Error("Not authenticated")
      if (visibleCalendarIds.length === 0) return []

      // Fetch events from all visible calendars in parallel
      const eventPromises = visibleCalendarIds.map(async (calendarId) => {
        const calendar = calendars.find((c) => c.id === calendarId)
        if (!calendar) return []

        const params = new URLSearchParams({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "250",
        })

        const response = await fetch(`/api/calendar/events?${params}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          console.error(`Failed to fetch events for calendar ${calendarId}`)
          return []
        }

        const data = await response.json()
        return (data.items || []).map((event: GoogleEvent) =>
          convertGoogleEvent(event, calendarId, calendar.name, calendar.color)
        )
      })

      const results = await Promise.all(eventPromises)
      return results.flat()
    },
    enabled: !!accessToken && visibleCalendarIds.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CalendarSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

export default function CalendarSection({
  activeSubItem,
  onSubItemHandled,
}: CalendarSectionProps) {
  const queryClient = useQueryClient()
  const { isConnected, isLoading: authLoading, connect, getAccessToken } = useGoogleAuth()
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // UI State
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Debug: log when selectedDate changes
  React.useEffect(() => {
    console.log('selectedDate state updated to:', selectedDate.toISOString())
  }, [selectedDate])
  const [view, setView] = useState<ViewType>("month")
  const [showEventModal, setShowEventModal] = useState(false)
  const [showEventDetail, setShowEventDetail] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState("")

  // Calendar visibility state
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])

  // New event form state
  const [newEvent, setNewEvent] = useState<{
    title: string
    description: string
    allDay: boolean
    calendar: string
    location: string
    start: string
    end: string
  }>({
    title: "",
    description: "",
    allDay: false,
    calendar: "primary",
    location: "",
    start: "",
    end: "",
  })

  // Get access token on auth state change
  useEffect(() => {
    if (isConnected) {
      getAccessToken().then(setAccessToken)
    } else {
      setAccessToken(null)
    }
  }, [isConnected, getAccessToken])

  // Fetch calendars
  const {
    data: googleCalendars,
    isLoading: calendarsLoading,
    error: calendarsError,
  } = useCalendars(accessToken)

  // Initialize calendar visibility when calendars are loaded
  useEffect(() => {
    if (googleCalendars) {
      // Load saved visibility from localStorage
      const savedVisibility = localStorage.getItem("calendar-visibility")
      const visibilityMap: Record<string, boolean> = savedVisibility
        ? JSON.parse(savedVisibility)
        : {}

      setCalendars(
        googleCalendars.map((cal) => ({
          id: cal.id,
          name: cal.summary,
          color: cal.backgroundColor || "#4285f4",
          isVisible: visibilityMap[cal.id] ?? true,
          isOwner: cal.accessRole === "owner",
        }))
      )
    }
  }, [googleCalendars])

  // Fetch events
  const {
    data: events = [],
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useCalendarEvents(accessToken, calendars, currentDate)

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: {
      summary: string
      description?: string
      start: { dateTime?: string; date?: string }
      end: { dateTime?: string; date?: string }
      location?: string
    }) => {
      if (!accessToken) throw new Error("Not authenticated")

      const calendarId = newEvent.calendar || "primary"
      const response = await fetch(`/api/calendar/events?calendarId=${calendarId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create event")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] })
      setShowEventModal(false)
      setNewEvent({
        title: "",
        description: "",
        allDay: false,
        calendar: "primary",
        location: "",
        start: "",
        end: "",
      })
    },
  })

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async ({ eventId, calendarId }: { eventId: string; calendarId: string }) => {
      if (!accessToken) throw new Error("Not authenticated")

      const response = await fetch(
        `/api/calendar/events/${eventId}?calendarId=${calendarId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete event")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] })
      setShowEventDetail(false)
      setSelectedEvent(null)
    },
  })

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !showEventModal && !showEventDetail) {
        const activeElement = document.activeElement
        if (activeElement?.tagName !== "INPUT" && activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault()
          setQuickAddOpen(true)
        }
      }
      if (e.key === "Escape") {
        setQuickAddOpen(false)
        setShowEventModal(false)
        setShowEventDetail(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showEventModal, showEventDetail])

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date) => {
      return events.filter((event) => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        const calendar = calendars.find((c) => c.id === event.calendar)
        if (!calendar?.isVisible) return false

        if (event.allDay) {
          const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate())
          const eventEndDay = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate())
          const checkDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          return checkDay >= eventStartDay && checkDay < eventEndDay
        }
        return isSameDay(eventStart, date)
      })
    },
    [events, calendars]
  )

  // Navigation
  const navigatePrev = () => {
    const newDate = new Date(currentDate)
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Get calendar grid for month view
  const getMonthGrid = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const daysInPrevMonth = getDaysInMonth(year, month - 1)

    const grid: Date[] = []

    // Previous month's days
    for (let i = firstDay - 1; i >= 0; i--) {
      grid.push(new Date(year, month - 1, daysInPrevMonth - i))
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push(new Date(year, month, i))
    }

    // Next month's days
    const remainingDays = 42 - grid.length
    for (let i = 1; i <= remainingDays; i++) {
      grid.push(new Date(year, month + 1, i))
    }

    return grid
  }, [currentDate])

  // Get week days for week view
  const getWeekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      return day
    })
  }, [currentDate])

  // Hours for day/week view
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Get current time position
  const getCurrentTimePosition = () => {
    const now = new Date()
    return ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100
  }

  // Upcoming events for sidebar
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter((event) => {
        const eventStart = new Date(event.start)
        const calendar = calendars.find((c) => c.id === event.calendar)
        return eventStart >= now && calendar?.isVisible
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5)
  }, [events, calendars])

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventDetail(true)
  }

  // Handle create event
  const handleCreateEvent = () => {
    if (!newEvent.title) return

    const startDate = newEvent.start ? new Date(newEvent.start) : selectedDate
    const endDate = newEvent.end
      ? new Date(newEvent.end)
      : new Date(startDate.getTime() + 60 * 60 * 1000)

    const eventData = {
      summary: newEvent.title,
      description: newEvent.description || undefined,
      location: newEvent.location || undefined,
      start: newEvent.allDay
        ? { date: startDate.toISOString().split("T")[0] }
        : { dateTime: startDate.toISOString() },
      end: newEvent.allDay
        ? { date: endDate.toISOString().split("T")[0] }
        : { dateTime: endDate.toISOString() },
    }

    createEventMutation.mutate(eventData)
  }

  // Handle quick add
  const handleQuickAdd = () => {
    if (!quickAddTitle) return

    const now = new Date()
    const startTime = new Date(now.getTime() + 60 * 60 * 1000)
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    createEventMutation.mutate({
      summary: quickAddTitle,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    })

    setQuickAddOpen(false)
    setQuickAddTitle("")
  }

  // Handle delete event
  const handleDeleteEvent = () => {
    if (!selectedEvent) return
    deleteEventMutation.mutate({
      eventId: selectedEvent.id,
      calendarId: selectedEvent.calendar,
    })
  }

  // Toggle calendar visibility
  const toggleCalendarVisibility = (calendarId: string) => {
    setCalendars((prev) => {
      const updated = prev.map((cal) =>
        cal.id === calendarId ? { ...cal, isVisible: !cal.isVisible } : cal
      )
      // Save to localStorage
      const visibilityMap: Record<string, boolean> = {}
      updated.forEach((cal) => {
        visibilityMap[cal.id] = cal.isVisible
      })
      localStorage.setItem("calendar-visibility", JSON.stringify(visibilityMap))
      return updated
    })
  }

  // Render not connected state
  if (!isConnected && !authLoading) {
    return (
      <div
        className="p-6"
        data-tabz-section="calendar"
        data-tabz-region="not-connected"
      >
        <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow mb-2">
          Calendar
        </h1>
        <p className="text-muted-foreground mb-6">Connect to Google Calendar to view and manage your events</p>

        <Card className="glass border-primary/30 max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <CalendarIcon className="h-16 w-16 text-primary mx-auto mb-4 opacity-70" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">Connect Google Calendar</h3>
            <p className="text-muted-foreground mb-6">
              Sign in with your Google account to sync your calendars and events.
            </p>
            <Button
              onClick={connect}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-tabz-action="connect-google"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Connect Google Account
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (authLoading || (isConnected && calendarsLoading)) {
    return (
      <div
        className="p-6"
        data-tabz-section="calendar"
        data-tabz-region="loading"
      >
        <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow mb-2">
          Calendar
        </h1>
        <p className="text-muted-foreground mb-6">Loading your calendars...</p>

        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  // Error state
  if (calendarsError) {
    return (
      <div
        className="p-6"
        data-tabz-section="calendar"
        data-tabz-region="error"
      >
        <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow mb-2">
          Calendar
        </h1>

        <Card className="glass border-destructive/30 max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">Failed to Load Calendars</h3>
            <p className="text-muted-foreground mb-4">
              {calendarsError instanceof Error ? calendarsError.message : "Unknown error"}
            </p>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["google-calendars"] })}
              data-tabz-action="retry"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render month view
  const renderMonthView = () => (
    <div
      className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden"
      data-tabz-region="month-view"
    >
      {/* Day headers */}
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div
          key={day}
          className="glass-dark p-2 text-center text-xs font-medium text-muted-foreground"
        >
          <span className="hidden sm:inline">{day}</span>
          <span className="sm:hidden">{day[0]}</span>
        </div>
      ))}

      {/* Date cells */}
      {getMonthGrid.map((date) => {
        const isCurrentMonth = date.getMonth() === currentDate.getMonth()
        const dayEvents = getEventsForDate(date)
        const isSelected = isSameDay(date, selectedDate)
        const isTodayDate = isToday(date)
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

        return (
          <div
            key={dateKey}
            onClick={() => {
              console.log('Date clicked:', date.toISOString(), 'isSelected before:', isSelected)
              const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
              console.log('Setting selectedDate to:', newDate.toISOString())
              setSelectedDate(newDate)
            }}
            className={`
              min-h-[80px] md:min-h-[100px] p-1 md:p-2 cursor-pointer transition-all hover:bg-muted/50 hover:scale-[1.01] active:scale-[0.99]
              ${isCurrentMonth ? "glass" : "glass-dark opacity-50"}
              ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
            `}
            data-tabz-item={date.toISOString()}
          >
            <div
              className={`
                text-xs md:text-sm font-medium mb-1 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full
                ${isTodayDate ? "bg-primary text-primary-foreground" : ""}
                ${!isCurrentMonth ? "text-muted-foreground" : "text-foreground"}
              `}
            >
              {date.getDate()}
            </div>
            <div className="space-y-0.5">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEventClick(event)
                  }}
                  className="text-xs truncate px-1 py-0.5 rounded cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{
                    backgroundColor: `${event.color}20`,
                    borderLeft: `2px solid ${event.color}`,
                  }}
                >
                  <span className="hidden md:inline">{event.title}</span>
                  <span
                    className="md:hidden w-full h-1 block rounded"
                    style={{ backgroundColor: event.color }}
                  />
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground px-1">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  // Render week view
  const renderWeekView = () => (
    <div className="flex flex-col h-[600px] md:h-[700px]" data-tabz-region="week-view">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b border-border/30">
        <div className="p-2 text-xs text-muted-foreground" />
        {getWeekDays.map((day, idx) => (
          <div
            key={idx}
            className={`p-2 text-center border-l border-border/30 ${
              isToday(day) ? "bg-primary/10" : ""
            }`}
          >
            <div className="text-xs text-muted-foreground">
              <span className="hidden sm:inline">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span className="sm:hidden">
                {day.toLocaleDateString("en-US", { weekday: "narrow" })}
              </span>
            </div>
            <div
              className={`text-sm md:text-lg font-semibold ${
                isToday(day)
                  ? "w-7 h-7 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto"
                  : "text-foreground"
              }`}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <ScrollArea className="flex-1">
        <div className="relative">
          {/* Current time indicator */}
          {getWeekDays.some((d) => isToday(d)) && (
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: `${getCurrentTimePosition()}%` }}
            >
              <div className="relative flex items-center">
                <div className="w-12 text-xs text-destructive font-medium pr-1 text-right">
                  {formatTime(new Date())}
                </div>
                <div className="flex-1 h-0.5 bg-destructive" />
                <div className="w-2 h-2 bg-destructive rounded-full -ml-1" />
              </div>
            </div>
          )}

          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-border/20">
              <div className="p-1 md:p-2 text-xs text-muted-foreground text-right pr-2">
                {hour === 0 ? "" : `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`}
              </div>
              {getWeekDays.map((day, dayIdx) => {
                const dayEvents = getEventsForDate(day).filter((e) => {
                  const eventHour = new Date(e.start).getHours()
                  return eventHour === hour && !e.allDay
                })

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-[40px] md:min-h-[48px] border-l border-border/20 relative ${
                      isToday(day) ? "bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      const newDate = new Date(day)
                      newDate.setHours(hour)
                      setSelectedDate(newDate)
                      setShowEventModal(true)
                    }}
                  >
                    {dayEvents.map((event, eventIdx) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventClick(event)
                        }}
                        className="absolute inset-x-0.5 md:inset-x-1 rounded px-1 py-0.5 cursor-pointer text-xs overflow-hidden"
                        style={{
                          top: `${eventIdx * 4}px`,
                          backgroundColor: `${event.color}30`,
                          borderLeft: `2px solid ${event.color}`,
                        }}
                      >
                        <span className="font-medium truncate block">{event.title}</span>
                      </motion.div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )

  // Render day view
  const renderDayView = () => (
    <div className="flex flex-col h-[600px] md:h-[700px]" data-tabz-region="day-view">
      {/* Header */}
      <div className="p-4 border-b border-border/30 text-center">
        <div className="text-lg font-semibold text-foreground">
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>
        {isToday(selectedDate) && (
          <Badge className="mt-1 bg-primary/20 text-primary border-primary/30">Today</Badge>
        )}
      </div>

      {/* All-day events */}
      {getEventsForDate(selectedDate).filter((e) => e.allDay).length > 0 && (
        <div className="p-2 border-b border-border/30 glass-dark">
          <div className="text-xs text-muted-foreground mb-1">All Day</div>
          <div className="space-y-1">
            {getEventsForDate(selectedDate)
              .filter((e) => e.allDay)
              .map((event) => (
                <motion.div
                  key={event.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleEventClick(event)}
                  className="px-2 py-1 rounded text-sm cursor-pointer"
                  style={{
                    backgroundColor: `${event.color}20`,
                    borderLeft: `3px solid ${event.color}`,
                  }}
                >
                  {event.title}
                </motion.div>
              ))}
          </div>
        </div>
      )}

      {/* Time slots */}
      <ScrollArea className="flex-1">
        <div className="relative">
          {/* Current time indicator */}
          {isToday(selectedDate) && (
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: `${getCurrentTimePosition()}%` }}
            >
              <div className="relative flex items-center">
                <div className="w-16 text-xs text-destructive font-medium pr-2 text-right">
                  {formatTime(new Date())}
                </div>
                <div className="flex-1 h-0.5 bg-destructive" />
                <div className="w-2 h-2 bg-destructive rounded-full -ml-1" />
              </div>
            </div>
          )}

          {hours.map((hour) => {
            const hourEvents = getEventsForDate(selectedDate).filter((e) => {
              const eventHour = new Date(e.start).getHours()
              return eventHour === hour && !e.allDay
            })

            return (
              <div
                key={hour}
                className="flex border-b border-border/20 min-h-[60px]"
                onClick={() => {
                  const newDate = new Date(selectedDate)
                  newDate.setHours(hour)
                  setSelectedDate(newDate)
                  setShowEventModal(true)
                }}
              >
                <div className="w-16 p-2 text-xs text-muted-foreground text-right pr-3 flex-shrink-0">
                  {hour === 0 ? "12 AM" : `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`}
                </div>
                <div className="flex-1 relative border-l border-border/20">
                  {hourEvents.map((event) => {
                    const startMinutes = new Date(event.start).getMinutes()
                    const endTime = new Date(event.end)
                    const durationMinutes =
                      (endTime.getTime() - new Date(event.start).getTime()) / 60000

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventClick(event)
                        }}
                        className="absolute left-1 right-1 md:left-2 md:right-2 rounded-lg p-2 cursor-pointer overflow-hidden"
                        style={{
                          top: `${(startMinutes / 60) * 100}%`,
                          minHeight: `${Math.max(durationMinutes, 30)}px`,
                          backgroundColor: `${event.color}20`,
                          borderLeft: `3px solid ${event.color}`,
                        }}
                      >
                        <div className="font-medium text-sm text-foreground truncate">
                          {event.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(new Date(event.start))} - {formatTime(new Date(event.end))}
                        </div>
                        {event.location && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )

  // Render agenda view
  const renderAgendaView = () => {
    const groupedEvents: Record<string, CalendarEvent[]> = events
      .filter((event) => {
        const calendar = calendars.find((c) => c.id === event.calendar)
        return calendar?.isVisible && new Date(event.start) >= new Date()
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .reduce<Record<string, CalendarEvent[]>>(
        (groups, event) => {
          const date = new Date(event.start).toDateString()
          if (!groups[date]) groups[date] = []
          groups[date].push(event)
          return groups
        },
        {}
      )

    return (
      <ScrollArea className="h-[600px] md:h-[700px]" data-tabz-region="agenda-view">
        <div className="space-y-4 p-2">
          {(Object.entries(groupedEvents) as [string, CalendarEvent[]][])
            .slice(0, 14)
            .map(([date, dayEvents]) => (
              <div key={date}>
                <div className="sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                  <div className="text-sm font-semibold text-foreground">
                    {formatDate(new Date(date))}
                  </div>
                  {isToday(new Date(date)) && (
                    <Badge className="mt-1 bg-primary/20 text-primary border-primary/30 text-xs">
                      Today
                    </Badge>
                  )}
                </div>
                <div className="space-y-2 mt-2">
                  {dayEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => handleEventClick(event)}
                      className="glass border-border/30 rounded-lg p-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-1 self-stretch rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{event.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {event.allDay
                              ? "All Day"
                              : `${formatTime(new Date(event.start))} - ${formatTime(
                                  new Date(event.end)
                                )}`}
                          </div>
                          {event.location && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Users className="h-3 w-3" />
                              {event.attendees.length} attendee
                              {event.attendees.length > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: `${event.color}20`,
                            color: event.color,
                            borderColor: `${event.color}50`,
                          }}
                        >
                          {event.calendarName}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          {Object.keys(groupedEvents).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming events</p>
            </div>
          )}
        </div>
      </ScrollArea>
    )
  }

  // Mini calendar component
  const MiniCalendar = () => {
    const miniGrid = getMonthGrid

    return (
      <div className="glass border-border/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">
            {currentDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
            <div key={idx} className="text-xs text-muted-foreground p-1">
              {day}
            </div>
          ))}
          {miniGrid.map((date) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth()
            const isSelected = isSameDay(date, selectedDate)
            const isTodayDate = isToday(date)
            const hasEvents = getEventsForDate(date).length > 0
            const dateKey = `mini-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => {
                  console.log('Mini calendar clicked:', date.toISOString())
                  setSelectedDate(new Date(date))
                  if (view === "day") setCurrentDate(new Date(date))
                }}
                className={`
                  text-xs p-1 rounded-full relative transition-colors
                  ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                  ${isSelected ? "bg-primary text-primary-foreground" : ""}
                  ${isTodayDate && !isSelected ? "border border-primary" : ""}
                  hover:bg-muted/50
                `}
              >
                {date.getDate()}
                {hasEvents && !isSelected && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6" data-tabz-section="calendar">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow">
            Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-primary/30 text-foreground hover:bg-primary/10"
            onClick={goToToday}
            data-tabz-action="today"
          >
            Today
          </Button>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={navigatePrev}
              data-tabz-action="prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={navigateNext}
              data-tabz-action="next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetchEvents()}
            disabled={eventsLoading}
            data-tabz-action="refresh"
          >
            <RefreshCw className={`h-4 w-4 ${eventsLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setShowEventModal(true)}
            data-tabz-action="create-event"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">New Event</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </motion.div>

      {/* View Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6"
      >
        <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
          <div className="flex items-center justify-between">
            <TabsList className="glass border-primary/30">
              <TabsTrigger value="month" className="gap-1.5" data-tabz-action="view-month">
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline">Month</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1.5" data-tabz-action="view-week">
                <CalendarRange className="h-4 w-4" />
                <span className="hidden sm:inline">Week</span>
              </TabsTrigger>
              <TabsTrigger value="day" className="gap-1.5" data-tabz-action="view-day">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Day</span>
              </TabsTrigger>
              <TabsTrigger value="agenda" className="gap-1.5" data-tabz-action="view-agenda">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Agenda</span>
              </TabsTrigger>
            </TabsList>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </Tabs>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col lg:flex-row gap-6"
      >
        {/* Calendar View */}
        <div className="flex-1">
          <Card className="glass border-primary/30 p-4 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {view === "month" && renderMonthView()}
                {view === "week" && renderWeekView()}
                {view === "day" && renderDayView()}
                {view === "agenda" && renderAgendaView()}
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full lg:w-72 space-y-4"
            >
              {/* Mini Calendar */}
              <MiniCalendar />

              {/* Calendars List */}
              <Card className="glass border-secondary/30 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">My Calendars</h3>
                <div className="space-y-2">
                  {calendars.map((calendar) => (
                    <div key={calendar.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={calendar.isVisible}
                          onCheckedChange={() => toggleCalendarVisibility(calendar.id)}
                          className="border-border"
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: calendar.color }}
                        />
                        <span className="text-sm text-foreground truncate max-w-[140px]">
                          {calendar.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Upcoming Events */}
              <Card className="glass border-accent/30 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming Events</h3>
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      whileHover={{ x: 4 }}
                      onClick={() => handleEventClick(event)}
                      className="flex items-start gap-2 cursor-pointer"
                    >
                      <div
                        className="w-1 h-full min-h-[40px] rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {event.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(new Date(event.start))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {event.allDay ? "All Day" : formatTime(new Date(event.start))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {upcomingEvents.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No upcoming events
                    </p>
                  )}
                </div>
              </Card>

              {/* Quick Add Hint */}
              <div className="text-center text-xs text-muted-foreground">
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground">C</kbd> to
                quick add event
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Quick Add Popover */}
      <AnimatePresence>
        {quickAddOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setQuickAddOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass border-primary/30 rounded-lg p-4 w-full max-w-md"
            >
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Add event title and press Enter..."
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickAdd()
                  }}
                  className="flex-1"
                  autoFocus
                  data-tabz-input="quick-add-title"
                />
                <Button
                  size="icon"
                  onClick={handleQuickAdd}
                  disabled={createEventMutation.isPending}
                >
                  {createEventMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Event will be created for tomorrow at 9 AM
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Creation Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="glass border-primary/30 max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Event</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Event title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                data-tabz-input="event-title"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={newEvent.start}
                  onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                  data-tabz-input="event-start"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={newEvent.end}
                  onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                  data-tabz-input="event-end"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="allDay"
                checked={newEvent.allDay}
                onCheckedChange={(checked) => setNewEvent({ ...newEvent, allDay: checked })}
              />
              <Label htmlFor="allDay">All day</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="calendar">Calendar</Label>
              <Select
                value={newEvent.calendar}
                onValueChange={(value) => setNewEvent({ ...newEvent, calendar: value })}
              >
                <SelectTrigger data-tabz-input="event-calendar">
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars
                    .filter((c) => c.isOwner)
                    .map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: calendar.color }}
                          />
                          {calendar.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="Add location"
                  className="pl-10"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  data-tabz-input="event-location"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                data-tabz-input="event-description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={createEventMutation.isPending}
              data-tabz-action="submit-event"
            >
              {createEventMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Modal */}
      <Dialog open={showEventDetail} onOpenChange={setShowEventDetail}>
        <DialogContent className="glass border-primary/30 max-w-lg" aria-describedby={undefined}>
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-1 h-8 rounded-full"
                      style={{ backgroundColor: selectedEvent.color }}
                    />
                    <div>
                      <DialogTitle className="text-foreground">
                        {selectedEvent.title}
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedEvent.calendarName}
                      </p>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-foreground">
                    {selectedEvent.allDay ? (
                      <span>All Day</span>
                    ) : (
                      <>
                        {formatDate(new Date(selectedEvent.start))}
                        <br />
                        {formatTime(new Date(selectedEvent.start))} -{" "}
                        {formatTime(new Date(selectedEvent.end))}
                      </>
                    )}
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.videoCall && (
                  <div className="flex items-center gap-3 text-sm">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={selectedEvent.videoCall}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Join video call
                    </a>
                  </div>
                )}

                {selectedEvent.recurring && (
                  <div className="flex items-center gap-3 text-sm">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">Recurring event</span>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {selectedEvent.attendees.length} attendee
                        {selectedEvent.attendees.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="ml-7 space-y-1">
                      {selectedEvent.attendees.map((attendee, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-foreground">{attendee.name}</span>
                          <Badge
                            className={`text-xs ${
                              attendee.status === "accepted"
                                ? "bg-primary/20 text-primary border-primary/30"
                                : attendee.status === "declined"
                                ? "bg-destructive/20 text-destructive border-destructive/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {attendee.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="pt-2">
                    <Separator className="mb-4" />
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {selectedEvent.htmlLink && (
                  <div className="flex items-center gap-3 text-sm pt-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={selectedEvent.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Open in Google Calendar
                    </a>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteEvent}
                  disabled={deleteEventMutation.isPending}
                >
                  {deleteEventMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </Button>
                <div className="flex-1" />
                <Button variant="outline" onClick={() => setShowEventDetail(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

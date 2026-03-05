"use client";

import { useEffect, useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  ListChecks,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Milestone, MilestoneType } from "@/lib/govhound/types";

interface TabProps {
  onSelectOpportunity?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

interface CalendarDeadline {
  id: string;
  title: string;
  notice_id: string;
  response_deadline: string;
  agency: string | null;
}

interface CalendarMilestone extends Milestone {
  opportunities: {
    id: string;
    title: string;
    notice_id: string;
    response_deadline: string | null;
    agency: string | null;
  } | null;
}

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  subtitle: string;
  type: "deadline" | "milestone";
  milestoneType?: MilestoneType;
  milestoneStatus?: string;
  opportunityId: string;
}

const MILESTONE_TYPE_COLORS: Record<string, string> = {
  questions_due: "bg-primary/20 text-primary border-primary/30",
  site_visit: "bg-primary/20 text-primary border-primary/30",
  draft_due: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  review: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  final_due: "bg-destructive/15 text-destructive border-destructive/30",
  submission: "bg-destructive/15 text-destructive border-destructive/30",
  custom: "bg-card text-muted-foreground border-border",
};

export function CalendarTab({ onSelectOpportunity, onNavigateTab }: TabProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [milestones, setMilestones] = useState<CalendarMilestone[]>([]);
  const [deadlines, setDeadlines] = useState<CalendarDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        // Extend range to cover visible calendar grid
        const calStart = startOfWeek(monthStart);
        const calEnd = endOfWeek(monthEnd);

        const from = calStart.toISOString();
        const to = calEnd.toISOString();

        const res = await fetch(`/api/govhound/milestones?from=${from}&to=${to}`);
        if (res.ok) {
          const data = await res.json();
          setMilestones(data.milestones || []);
          setDeadlines(data.deadlines || []);
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentMonth]);

  // Build event list
  const events = useMemo(() => {
    const result: CalendarEvent[] = [];

    for (const d of deadlines) {
      result.push({
        id: `deadline-${d.id}`,
        date: new Date(d.response_deadline),
        title: d.title,
        subtitle: d.agency || "Unknown Agency",
        type: "deadline",
        opportunityId: d.id,
      });
    }

    for (const m of milestones) {
      result.push({
        id: `milestone-${m.id}`,
        date: new Date(m.due_date),
        title: m.title,
        subtitle: m.opportunities?.title || "Unknown Opportunity",
        type: "milestone",
        milestoneType: m.milestone_type,
        milestoneStatus: m.status,
        opportunityId: m.opportunities?.id || m.opportunity_id,
      });
    }

    return result;
  }, [milestones, deadlines]);

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function getEventsForDay(day: Date): CalendarEvent[] {
    return events.filter((e) => isSameDay(e.date, day));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Milestones and deadlines across all opportunities
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                className="text-muted-foreground hover:text-foreground hover:bg-accent text-xs px-2"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 bg-muted">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="px-2 py-2 text-xs font-medium text-muted-foreground/70 text-center border-b border-border"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);

                  return (
                    <div
                      key={idx}
                      className={`min-h-[100px] border-b border-r border-border p-1 ${
                        !inMonth ? "bg-muted/50" : "bg-background"
                      }`}
                    >
                      <div className="flex justify-end">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${
                            today
                              ? "bg-primary text-white font-bold"
                              : inMonth
                                ? "text-muted-foreground"
                                : "text-muted-foreground/70"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                      </div>

                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <button
                            key={event.id}
                            onClick={() => onSelectOpportunity?.(event.opportunityId)}
                            className="w-full text-left"
                          >
                            <div
                              className={`px-1.5 py-0.5 rounded text-xs truncate cursor-pointer border transition-opacity hover:opacity-80 ${
                                event.type === "deadline"
                                  ? "bg-destructive/20 text-destructive border-destructive/30 font-medium"
                                  : MILESTONE_TYPE_COLORS[event.milestoneType || "custom"]
                              } ${
                                event.milestoneStatus === "completed"
                                  ? "opacity-50 line-through"
                                  : ""
                              }`}
                              title={`${event.title} - ${event.subtitle}`}
                            >
                              {event.type === "deadline" ? (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5 shrink-0" />
                                  {event.title}
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5">
                                  <ListChecks className="h-2.5 w-2.5 shrink-0" />
                                  {event.title}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-xs text-muted-foreground/70 px-1">
                            +{dayEvents.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground/70">
        <span className="font-medium text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded bg-destructive/40 border border-destructive/30" />
          Response Deadline
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded bg-primary/20 border border-primary/30" />
          Questions / Site Visit
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded bg-yellow-500/15 border border-yellow-500/30" />
          Draft / Review
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded bg-destructive/15 border border-destructive/30" />
          Final / Submission
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Plus,
  SkipForward,
  Trash2,
  ListChecks,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type {
  Milestone,
  MilestoneStatus,
  MilestoneType,
} from "@/lib/govhound/types";

const STATUS_ICONS: Record<MilestoneStatus, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-text-tertiary" />,
  in_progress: <Clock className="h-4 w-4 text-blue-vivid" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-success" />,
  skipped: <SkipForward className="h-4 w-4 text-text-tertiary" />,
};

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  pending: "border-[hsla(210,40%,60%,0.2)] text-text-secondary",
  in_progress: "border-blue-vivid/40 text-blue-bright",
  completed: "border-green-success/40 text-green-success",
  skipped: "border-[hsla(210,40%,60%,0.2)] text-text-tertiary",
};

const TYPE_LABELS: Record<MilestoneType, string> = {
  questions_due: "Questions Due",
  site_visit: "Site Visit",
  draft_due: "Draft Due",
  review: "Internal Review",
  final_due: "Final Draft",
  submission: "Submission",
  custom: "Custom",
};

interface MilestoneTimelineProps {
  opportunityId: string;
  milestones: Milestone[];
  onRefresh: () => void;
  hasDeadline: boolean;
}

export function MilestoneTimeline({
  opportunityId,
  milestones,
  onRefresh,
  hasDeadline,
}: MilestoneTimelineProps) {
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<MilestoneType>("custom");
  const [newDueDate, setNewDueDate] = useState("");

  async function handleApplyTemplate() {
    setApplyingTemplate(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply_template: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to apply template");
      }
      onRefresh();
    } catch (err) {
      console.error("Apply template error:", err);
    } finally {
      setApplyingTemplate(false);
    }
  }

  async function handleAddMilestone() {
    if (!newTitle.trim() || !newDueDate) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          milestone_type: newType,
          due_date: new Date(newDueDate).toISOString(),
          sort_order: milestones.length + 1,
        }),
      });
      if (!res.ok) throw new Error("Failed to create milestone");
      setNewTitle("");
      setNewType("custom");
      setNewDueDate("");
      setAddDialogOpen(false);
      onRefresh();
    } catch (err) {
      console.error("Add milestone error:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(milestoneId: string, status: MilestoneStatus) {
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/milestones`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: milestoneId, status }),
      });
      if (!res.ok) throw new Error("Failed to update milestone");
      onRefresh();
    } catch (err) {
      console.error("Status change error:", err);
    }
  }

  async function handleDelete(milestoneId: string) {
    try {
      const res = await fetch(
        `/api/opportunities/${opportunityId}/milestones?milestone_id=${milestoneId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete milestone");
      onRefresh();
    } catch (err) {
      console.error("Delete milestone error:", err);
    }
  }

  return (
    <Card className="border-[hsla(210,40%,60%,0.12)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <ListChecks className="h-4 w-4 text-blue-vivid" />
            Milestones
          </CardTitle>
          <div className="flex gap-2">
            {milestones.length === 0 && hasDeadline && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyTemplate}
                disabled={applyingTemplate}
                className="border-[hsla(210,40%,60%,0.2)] text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover"
              >
                {applyingTemplate ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ListChecks className="mr-1.5 h-3.5 w-3.5" />
                )}
                Apply Template
              </Button>
            )}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[hsla(210,40%,60%,0.2)] text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-bg-elevated border-[hsla(210,40%,60%,0.2)]">
                <DialogHeader>
                  <DialogTitle className="text-text-primary">Add Milestone</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-text-secondary">Title</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g., Submit draft proposal"
                      className="bg-bg-surface border-[hsla(210,40%,60%,0.2)] text-text-primary placeholder:text-text-tertiary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-text-secondary">Type</Label>
                    <Select value={newType} onValueChange={(v) => setNewType(v as MilestoneType)}>
                      <SelectTrigger className="bg-bg-surface border-[hsla(210,40%,60%,0.2)] text-text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-[hsla(210,40%,60%,0.2)]">
                        {Object.entries(TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-text-secondary">Due Date</Label>
                    <Input
                      type="datetime-local"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="bg-bg-surface border-[hsla(210,40%,60%,0.2)] text-text-primary"
                    />
                  </div>
                  <Button
                    onClick={handleAddMilestone}
                    disabled={creating || !newTitle.trim() || !newDueDate}
                    className="w-full bg-blue-vivid hover:bg-blue-bright text-white"
                  >
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Milestone
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="text-center py-6">
            <ListChecks className="mx-auto mb-2 h-6 w-6 text-text-tertiary" />
            <p className="text-sm text-text-secondary">No milestones yet.</p>
            {hasDeadline && (
              <p className="text-xs text-text-tertiary mt-1">
                Apply a template to get started quickly.
              </p>
            )}
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[hsla(210,40%,60%,0.15)]" />

            {milestones.map((milestone) => {
              const overdue =
                milestone.status !== "completed" &&
                milestone.status !== "skipped" &&
                isPast(new Date(milestone.due_date));

              return (
                <div key={milestone.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* Timeline dot */}
                  <div className="relative z-10 mt-0.5 shrink-0">
                    {STATUS_ICONS[milestone.status]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            milestone.status === "completed" || milestone.status === "skipped"
                              ? "text-text-tertiary line-through"
                              : "text-text-primary"
                          }`}
                        >
                          {milestone.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p
                            className={`text-xs ${
                              overdue ? "text-red-alert font-medium" : "text-text-tertiary"
                            }`}
                          >
                            {format(new Date(milestone.due_date), "MMM d, yyyy")}
                            {" "}
                            ({formatDistanceToNow(new Date(milestone.due_date), {
                              addSuffix: true,
                            })})
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs py-0 ${STATUS_COLORS[milestone.status]}`}
                          >
                            {milestone.milestone_type !== "custom"
                              ? TYPE_LABELS[milestone.milestone_type]
                              : milestone.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Select
                          value={milestone.status}
                          onValueChange={(v) =>
                            handleStatusChange(milestone.id, v as MilestoneStatus)
                          }
                        >
                          <SelectTrigger className="h-7 w-24 text-xs bg-bg-surface border-[hsla(210,40%,60%,0.15)] text-text-secondary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-bg-elevated border-[hsla(210,40%,60%,0.2)]">
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="skipped">Skipped</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(milestone.id)}
                          className="h-7 w-7 p-0 text-text-tertiary hover:text-red-alert hover:bg-transparent"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

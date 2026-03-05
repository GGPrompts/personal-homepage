"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Phone,
  Mail,
  Users,
  AlertTriangle,
  ArrowRightLeft,
  Settings,
  Plus,
  Loader2,
  ScrollText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActivityLogEntry, ActivityEntryType } from "@/lib/govhound/types";

const ENTRY_TYPE_ICONS: Record<ActivityEntryType, React.ReactNode> = {
  note: <MessageSquare className="h-3.5 w-3.5" />,
  call: <Phone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  meeting: <Users className="h-3.5 w-3.5" />,
  amendment: <AlertTriangle className="h-3.5 w-3.5" />,
  status_change: <ArrowRightLeft className="h-3.5 w-3.5" />,
  system: <Settings className="h-3.5 w-3.5" />,
};

const ENTRY_TYPE_COLORS: Record<ActivityEntryType, string> = {
  note: "text-text-secondary",
  call: "text-blue-bright",
  email: "text-blue-vivid",
  meeting: "text-green-success",
  amendment: "text-gold-star",
  status_change: "text-blue-bright",
  system: "text-text-tertiary",
};

const ENTRY_TYPE_LABELS: Record<ActivityEntryType, string> = {
  note: "Note",
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  amendment: "Amendment",
  status_change: "Status Change",
  system: "System",
};

interface ActivityLogProps {
  opportunityId: string;
  entries: ActivityLogEntry[];
  onRefresh: () => void;
}

export function ActivityLog({ opportunityId, entries, onRefresh }: ActivityLogProps) {
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [content, setContent] = useState("");
  const [entryType, setEntryType] = useState<ActivityEntryType>("note");

  async function handleAdd() {
    if (!content.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), entry_type: entryType }),
      });
      if (!res.ok) throw new Error("Failed to add entry");
      setContent("");
      setEntryType("note");
      setShowForm(false);
      onRefresh();
    } catch (err) {
      console.error("Add activity error:", err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card className="border-[hsla(210,40%,60%,0.12)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <ScrollText className="h-4 w-4 text-blue-vivid" />
            Activity Log
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="border-[hsla(210,40%,60%,0.2)] text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick-add form */}
        {showForm && (
          <div className="rounded-lg border border-[hsla(210,40%,60%,0.15)] bg-bg-surface p-3 space-y-3">
            <div className="flex gap-2">
              <Select
                value={entryType}
                onValueChange={(v) => setEntryType(v as ActivityEntryType)}
              >
                <SelectTrigger className="w-32 h-8 text-xs bg-bg-base border-[hsla(210,40%,60%,0.15)] text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-elevated border-[hsla(210,40%,60%,0.2)]">
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened?"
              rows={3}
              className="bg-bg-base border-[hsla(210,40%,60%,0.15)] text-text-primary placeholder:text-text-tertiary text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setContent("");
                }}
                className="text-text-tertiary hover:text-text-secondary"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={creating || !content.trim()}
                className="bg-blue-vivid hover:bg-blue-bright text-white"
              >
                {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Entries */}
        {entries.length === 0 ? (
          <div className="text-center py-6">
            <ScrollText className="mx-auto mb-2 h-6 w-6 text-text-tertiary" />
            <p className="text-sm text-text-secondary">No activity yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex gap-3 rounded-lg border border-[hsla(210,40%,60%,0.08)] bg-bg-surface p-3"
              >
                <div className={`mt-0.5 shrink-0 ${ENTRY_TYPE_COLORS[entry.entry_type]}`}>
                  {ENTRY_TYPE_ICONS[entry.entry_type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className="text-xs py-0 border-[hsla(210,40%,60%,0.15)] text-text-tertiary"
                    >
                      {ENTRY_TYPE_LABELS[entry.entry_type]}
                    </Badge>
                    <span className="text-xs text-text-tertiary">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">
                    {entry.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

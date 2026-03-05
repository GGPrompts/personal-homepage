"use client";

import { useState } from "react";
import {
  Sparkles,
  Bookmark,
  Loader2,
  X,
  Eye,
  Gavel,
  XCircle,
  Trophy,
  ThumbsDown,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkOperationsToolbarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onComplete: () => void;
  onError: (message: string) => void;
}

const STATUS_OPTIONS = [
  { value: "watching", label: "Watching", icon: Eye },
  { value: "bidding", label: "Bidding", icon: Gavel },
  { value: "passed", label: "Passed", icon: XCircle },
  { value: "won", label: "Won", icon: Trophy },
  { value: "lost", label: "Lost", icon: ThumbsDown },
  { value: "no_bid", label: "No Bid", icon: Ban },
];

export function BulkOperationsToolbar({
  selectedIds,
  onClearSelection,
  onComplete,
  onError,
}: BulkOperationsToolbarProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const count = selectedIds.size;

  if (count === 0) return null;

  async function handleBulkAction(
    action: string,
    status?: string
  ) {
    setLoading(action);
    try {
      const res = await fetch("/api/opportunities/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Bulk operation failed");
      }

      const data = await res.json();
      if (data.summary?.failed > 0) {
        onError(
          `${data.summary.succeeded} succeeded, ${data.summary.failed} failed`
        );
      }

      onClearSelection();
      onComplete();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Bulk operation failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-vivid/30 bg-blue-deep/20 px-4 py-3">
      <Badge className="bg-blue-vivid text-white border-0 shrink-0">
        {count} selected
      </Badge>

      <div className="flex items-center gap-2 flex-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkAction("analyze")}
          disabled={loading !== null}
          className="border-[hsla(210,40%,60%,0.2)] text-gold-star hover:text-gold-light hover:bg-bg-surface-hover"
        >
          {loading === "analyze" ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-4 w-4" />
          )}
          Analyze All
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={loading !== null}
              className="border-[hsla(210,40%,60%,0.2)] text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover"
            >
              {loading === "save" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Bookmark className="mr-1 h-4 w-4" />
              )}
              Save As...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-bg-elevated border-[hsla(210,40%,60%,0.2)]">
            {STATUS_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => handleBulkAction("save", opt.value)}
                className="text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover cursor-pointer"
              >
                <opt.icon className="mr-2 h-4 w-4" />
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={loading !== null}
              className="border-[hsla(210,40%,60%,0.2)] text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover"
            >
              {loading === "change_status" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              Change Status...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-bg-elevated border-[hsla(210,40%,60%,0.2)]">
            {STATUS_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => handleBulkAction("change_status", opt.value)}
                className="text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover cursor-pointer"
              >
                <opt.icon className="mr-2 h-4 w-4" />
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

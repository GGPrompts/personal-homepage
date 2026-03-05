"use client";

import { useEffect, useState, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import {
  Bookmark,
  Eye,
  Gavel,
  XCircle,
  Clock,
  ExternalLink,
  Trophy,
  ThumbsDown,
  Ban,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreBadge } from "@/components/govhound/score-badge";
import { EmptyState } from "@/components/govhound/empty-state";
import { ComparisonView } from "@/components/govhound/comparison-view";
import type { OpportunityWithAnalysis, SavedStatus } from "@/lib/govhound/types";

interface TabProps {
  onSelectOpportunity?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const STATUS_CONFIG: Record<
  SavedStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  watching: { label: "Watching", icon: Eye, color: "text-primary" },
  bidding: { label: "Bidding", icon: Gavel, color: "text-green-500" },
  passed: { label: "Passed", icon: XCircle, color: "text-muted-foreground/70" },
  won: { label: "Won", icon: Trophy, color: "text-yellow-500" },
  lost: { label: "Lost", icon: ThumbsDown, color: "text-destructive" },
  no_bid: { label: "No Bid", icon: Ban, color: "text-muted-foreground/70" },
};

export function SavedTab({ onSelectOpportunity, onNavigateTab }: TabProps) {
  const [opportunities, setOpportunities] = useState<
    OpportunityWithAnalysis[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<"saved_at" | "deadline">("saved_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    watching: 0,
    bidding: 0,
    passed: 0,
    won: 0,
    lost: 0,
    no_bid: 0,
  });
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const limit = 50;

  const fetchSaved = useCallback(
    async (p: number = 1, status?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(limit),
          sort,
          order,
        });
        const statusFilter = status !== undefined ? status : activeTab;
        if (statusFilter && statusFilter !== "all") {
          params.set("status", statusFilter);
        }

        const res = await fetch(`/api/govhound/saved?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        setOpportunities(data.opportunities || []);
        setTotal(data.total || 0);
        setPage(p);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load saved"
        );
      } finally {
        setLoading(false);
      }
    },
    [sort, order, activeTab]
  );

  // Fetch counts for all statuses
  const fetchCounts = useCallback(async () => {
    try {
      const statuses = ["all", "watching", "bidding", "passed", "won", "lost", "no_bid"];
      const results: Record<string, number> = {};

      // Fetch all count in parallel
      const promises = statuses.map(async (s) => {
        const params = new URLSearchParams({ page: "1", limit: "1" });
        if (s !== "all") params.set("status", s);
        const res = await fetch(`/api/govhound/saved?${params}`);
        if (!res.ok) return { status: s, count: 0 };
        const data = await res.json();
        return { status: s, count: data.total || 0 };
      });

      const countResults = await Promise.all(promises);
      for (const r of countResults) {
        results[r.status] = r.count;
      }
      setCounts(results);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchSaved(1);
    fetchCounts();
  }, [fetchSaved, fetchCounts]);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setPage(1);
    setCompareIds(new Set());
  }

  function toggleSort() {
    if (sort === "saved_at") {
      setSort("deadline");
      setOrder("asc");
    } else {
      setSort("saved_at");
      setOrder("desc");
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ sort, order });
      if (activeTab && activeTab !== "all") {
        params.set("saved_status", activeTab);
      }
      const res = await fetch(`/api/govhound/opportunities/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `govhound-saved-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const compareOpportunities = opportunities.filter((o) =>
    compareIds.has(o.id)
  );

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Saved Opportunities
          </h1>
          <p className="text-muted-foreground">
            Track and manage your bookmarked contracts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareIds(new Set());
            }}
            className={`border-border ${
              compareMode
                ? "bg-primary text-white border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            Compare
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Download className="mr-1 h-4 w-4" />
            {exporting ? "Exporting..." : "CSV"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Comparison View */}
      {compareMode && compareIds.size >= 2 && (
        <ComparisonView
          opportunities={compareOpportunities}
          onClose={() => {
            setCompareMode(false);
            setCompareIds(new Set());
          }}
        />
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted border border-border">
            <TabsTrigger value="all" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="watching" className="data-[state=active]:bg-card data-[state=active]:text-primary text-muted-foreground">
              Watching ({counts.watching})
            </TabsTrigger>
            <TabsTrigger value="bidding" className="data-[state=active]:bg-card data-[state=active]:text-green-500 text-muted-foreground">
              Bidding ({counts.bidding})
            </TabsTrigger>
            <TabsTrigger value="passed" className="data-[state=active]:bg-card data-[state=active]:text-muted-foreground/70 text-muted-foreground">
              Passed ({counts.passed})
            </TabsTrigger>
            <TabsTrigger value="won" className="data-[state=active]:bg-card data-[state=active]:text-yellow-500 text-muted-foreground">
              Won ({counts.won})
            </TabsTrigger>
            <TabsTrigger value="lost" className="data-[state=active]:bg-card data-[state=active]:text-destructive text-muted-foreground">
              Lost ({counts.lost})
            </TabsTrigger>
            <TabsTrigger value="no_bid" className="data-[state=active]:bg-card data-[state=active]:text-muted-foreground/70 text-muted-foreground">
              No Bid ({counts.no_bid})
            </TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSort}
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ArrowUpDown className="mr-1 h-4 w-4" />
            {sort === "saved_at" ? "Saved date" : "Deadline"}
          </Button>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="h-12 w-12" />}
              title="No saved opportunities"
              description={
                activeTab === "all"
                  ? "Save opportunities from the scanner or detail pages to track them here."
                  : `No opportunities with "${activeTab}" status.`
              }
              action={
                <Button
                  onClick={() => onNavigateTab?.("scanner")}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Browse Opportunities
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {compareMode && (
                <p className="text-sm text-muted-foreground/70">
                  Select 2-3 opportunities to compare. ({compareIds.size}/3 selected)
                </p>
              )}
              {opportunities.map((opp) => {
                const saved = Array.isArray(opp.saved_opportunities)
                  ? opp.saved_opportunities[0]
                  : opp.saved_opportunities;
                const analysis = Array.isArray(opp.opportunity_analysis)
                  ? opp.opportunity_analysis[0]
                  : opp.opportunity_analysis;
                const statusConfig = saved
                  ? STATUS_CONFIG[saved.status as SavedStatus]
                  : null;

                const daysUntilDeadline = opp.response_deadline
                  ? differenceInDays(
                      new Date(opp.response_deadline),
                      new Date()
                    )
                  : null;

                const isSelected = compareIds.has(opp.id);

                return (
                  <Card
                    key={opp.id}
                    className={`border-border transition-all ${
                      isSelected ? "ring-2 ring-primary border-primary" : ""
                    } ${compareMode ? "cursor-pointer" : ""}`}
                    onClick={
                      compareMode
                        ? () => toggleCompare(opp.id)
                        : undefined
                    }
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {statusConfig && (
                              <Badge
                                variant="outline"
                                className={`${statusConfig.color} border-border`}
                              >
                                <statusConfig.icon className="mr-1 h-3 w-3" />
                                {statusConfig.label}
                              </Badge>
                            )}
                            {daysUntilDeadline !== null &&
                              daysUntilDeadline >= 0 &&
                              daysUntilDeadline <= 7 && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs bg-destructive border-0"
                                >
                                  <Clock className="mr-1 h-3 w-3" />
                                  {daysUntilDeadline === 0
                                    ? "Due today"
                                    : `${daysUntilDeadline}d left`}
                                </Badge>
                              )}
                          </div>

                          <button
                            onClick={(e) => {
                              if (compareMode) { e.preventDefault(); return; }
                              onSelectOpportunity?.(opp.id);
                            }}
                            className="block text-left"
                          >
                            <h3 className="font-medium text-foreground hover:text-primary hover:underline line-clamp-2">
                              {opp.title}
                            </h3>
                          </button>

                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            {opp.agency && <span>{opp.agency}</span>}
                            {opp.response_deadline && (
                              <span className="flex items-center gap-1 text-muted-foreground/70">
                                <Clock className="h-3 w-3" />
                                Due{" "}
                                {format(
                                  new Date(opp.response_deadline),
                                  "MMM d, yyyy"
                                )}
                              </span>
                            )}
                          </div>

                          {saved?.notes && (
                            <p className="text-sm text-muted-foreground/70 italic border-l-2 border-primary/20 pl-3">
                              {saved.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {analysis && (
                            <div className="flex gap-1">
                              <ScoreBadge
                                score={analysis.feasibility_score}
                                label="Fit"
                              />
                              <ScoreBadge
                                score={analysis.complexity_score}
                                label="Cx"
                              />
                            </div>
                          )}
                          {!compareMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSelectOpportunity?.(opp.id)}
                              className="text-muted-foreground hover:text-primary hover:bg-accent"
                            >
                              View
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSaved(page - 1)}
                    disabled={page <= 1 || loading}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground/70">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSaved(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

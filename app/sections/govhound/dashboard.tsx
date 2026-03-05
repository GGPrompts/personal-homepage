"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  TrendingUp,
  Clock,
  Gavel,
  Search,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/govhound/score-badge";
import { EmptyState } from "@/components/govhound/empty-state";
import type { DashboardStats, OpportunityWithAnalysis } from "@/lib/govhound/types";

interface TabProps {
  onSelectOpportunity?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const STAT_ICONS = {
  total: { icon: FileText, accent: "text-primary" },
  high: { icon: TrendingUp, accent: "text-green-500" },
  deadline: { icon: Clock, accent: "text-yellow-500" },
  bids: { icon: Gavel, accent: "text-blue-400" },
};

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  accent,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  loading: boolean;
  accent: string;
}) {
  return (
    <Card className="border-border transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${accent}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold text-foreground">{value}</div>
        )}
        <p className="text-xs text-muted-foreground/70">{description}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardTab({ onSelectOpportunity, onNavigateTab }: TabProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [opportunities, setOpportunities] = useState<
    OpportunityWithAnalysis[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, oppsRes] = await Promise.all([
          fetch("/api/govhound/stats"),
          fetch("/api/govhound/opportunities?limit=10&sort=posted_date&order=desc"),
        ]);

        if (statsRes.ok) {
          setStats(await statsRes.json());
        }

        if (oppsRes.ok) {
          const data = await oppsRes.json();
          setOpportunities(data.opportunities || []);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Federal IT contract opportunities at a glance.
          </p>
        </div>
        <Button
          onClick={() => onNavigateTab?.("scanner")}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          <Search className="mr-2 h-4 w-4" />
          New Scan
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Opportunities"
          value={stats?.total_opportunities ?? 0}
          icon={FileText}
          description="Contracts in database"
          loading={loading}
          accent={STAT_ICONS.total.accent}
        />
        <StatsCard
          title="High Feasibility"
          value={stats?.high_feasibility ?? 0}
          icon={TrendingUp}
          description="Score 4+ for small team"
          loading={loading}
          accent={STAT_ICONS.high.accent}
        />
        <StatsCard
          title="Upcoming Deadlines"
          value={stats?.upcoming_deadlines ?? 0}
          icon={Clock}
          description="Due within 14 days"
          loading={loading}
          accent={STAT_ICONS.deadline.accent}
        />
        <StatsCard
          title="Active Bids"
          value={stats?.active_bids ?? 0}
          icon={Gavel}
          description="Contracts being pursued"
          loading={loading}
          accent={STAT_ICONS.bids.accent}
        />
      </div>

      {/* Recent Opportunities */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Recent Opportunities</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab?.("scanner")}
            className="text-primary hover:text-primary hover:bg-accent"
          >
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No opportunities yet"
              description="Run your first scan to start finding federal IT contracts."
              action={
                <Button
                  onClick={() => onNavigateTab?.("scanner")}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Start Scanning
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => {
                const analysis = Array.isArray(opp.opportunity_analysis)
                  ? opp.opportunity_analysis[0]
                  : opp.opportunity_analysis;

                return (
                  <button
                    key={opp.id}
                    onClick={() => onSelectOpportunity?.(opp.id)}
                    className="w-full text-left flex items-start justify-between gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium leading-tight line-clamp-1 text-foreground">
                        {opp.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {opp.agency && <span>{opp.agency}</span>}
                        {opp.naics_code && (
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground/70">
                            {opp.naics_code}
                          </Badge>
                        )}
                        {opp.set_aside_type && (
                          <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-0">
                            {opp.set_aside_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {analysis ? (
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
                      ) : (
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground/70">
                          Not Analyzed
                        </Badge>
                      )}
                      {opp.response_deadline && (
                        <span className="text-xs text-muted-foreground/70">
                          Due{" "}
                          {formatDistanceToNow(
                            new Date(opp.response_deadline),
                            { addSuffix: true }
                          )}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

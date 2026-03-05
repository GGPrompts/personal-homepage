"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Users,
  DollarSign,
  TrendingUp,
  Building,
  RefreshCw,
  Shield,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type {
  CompetitorIntelReport,
  IncumbentInfo,
  PriceRange,
} from "@/lib/govhound/types";

interface CompetitorIntelPanelProps {
  opportunityId: string;
}

export function CompetitorIntelPanel({
  opportunityId,
}: CompetitorIntelPanelProps) {
  const [report, setReport] = useState<CompetitorIntelReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntel = useCallback(
    async (forceRefresh = false) => {
      try {
        if (forceRefresh) {
          setRefreshing(true);
        }
        setError(null);

        const method = forceRefresh ? "POST" : "GET";
        const res = await fetch(
          `/api/opportunities/${opportunityId}/intel`,
          { method }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch intel");
        }

        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load intel");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [opportunityId]
  );

  useEffect(() => {
    fetchIntel(false);
  }, [fetchIntel]);

  if (loading) {
    return (
      <Card className="border-[hsla(210,40%,60%,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-text-primary">
            <Shield className="h-4 w-4 text-blue-vivid" />
            Competitor Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData =
    report &&
    (report.incumbents.length > 0 || report.market_awards.length > 0);

  return (
    <Card className="border-[hsla(210,40%,60%,0.12)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-text-primary">
            <Shield className="h-4 w-4 text-blue-vivid" />
            Competitor Intelligence
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchIntel(true)}
            disabled={refreshing}
            className="text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover h-7 px-2"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-lg border border-red-alert/30 bg-red-alert/10 p-2">
            <p className="text-xs text-red-alert">{error}</p>
          </div>
        )}

        {!hasData && !error ? (
          <div className="text-center py-6">
            <Shield className="mx-auto mb-2 h-6 w-6 text-text-tertiary" />
            <p className="text-sm text-text-secondary mb-1">
              No competitor data found yet.
            </p>
            <p className="text-xs text-text-tertiary mb-3">
              Fetch data from USASpending and SAM.gov to identify incumbents and
              market pricing.
            </p>
            <Button
              onClick={() => fetchIntel(true)}
              disabled={refreshing}
              size="sm"
              className="bg-blue-vivid hover:bg-blue-bright text-white"
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Users className="mr-2 h-3.5 w-3.5" />
              )}
              Fetch Intel
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Price Range Indicator */}
            {report?.price_range && (
              <PriceRangeIndicator priceRange={report.price_range} />
            )}

            {/* Incumbents */}
            {report && report.incumbents.length > 0 && (
              <>
                <Separator className="bg-[hsla(210,40%,60%,0.12)]" />
                <IncumbentsList incumbents={report.incumbents} />
              </>
            )}

            {/* Award count summary */}
            {report && report.market_awards.length > 0 && (
              <>
                <Separator className="bg-[hsla(210,40%,60%,0.12)]" />
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <BarChart3 className="h-3 w-3" />
                  <span>
                    {report.market_awards.length} historical award
                    {report.market_awards.length !== 1 ? "s" : ""} from{" "}
                    {countSources(report.market_awards)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PriceRangeIndicator({ priceRange }: { priceRange: PriceRange }) {
  return (
    <div className="rounded-lg border border-[hsla(210,40%,60%,0.12)] bg-bg-surface p-3 space-y-2">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-green-success" />
        <span className="text-xs font-medium text-text-secondary">
          Market Price Range
        </span>
        <Badge
          variant="outline"
          className="ml-auto border-[hsla(210,40%,60%,0.2)] text-text-tertiary text-xs"
        >
          {priceRange.count} award{priceRange.count !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Visual range bar */}
      <div className="relative h-6 rounded bg-bg-base">
        <div className="absolute inset-y-0 left-0 right-0 flex items-center px-2">
          <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-blue-deep via-blue-vivid to-blue-bright" />
        </div>
        {/* Median marker */}
        <div
          className="absolute top-0 bottom-0 flex items-center"
          style={{
            left: `${Math.max(10, Math.min(90, ((priceRange.median - priceRange.min) / (priceRange.max - priceRange.min || 1)) * 100))}%`,
          }}
        >
          <div className="w-0.5 h-4 bg-gold-star rounded" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="text-xs text-text-tertiary">Low</p>
          <p className="text-xs font-mono font-medium text-text-primary">
            ${formatCompact(priceRange.min)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">Median</p>
          <p className="text-xs font-mono font-medium text-gold-star">
            ${formatCompact(priceRange.median)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">High</p>
          <p className="text-xs font-mono font-medium text-text-primary">
            ${formatCompact(priceRange.max)}
          </p>
        </div>
      </div>
    </div>
  );
}

function IncumbentsList({ incumbents }: { incumbents: IncumbentInfo[] }) {
  // Show top 5 incumbents
  const top = incumbents.slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-blue-vivid" />
        <span className="text-xs font-medium text-text-secondary">
          Likely Incumbents
        </span>
      </div>

      {top.map((incumbent, i) => (
        <div
          key={incumbent.awardee_uei || incumbent.awardee_name + i}
          className="rounded-lg border border-[hsla(210,40%,60%,0.12)] bg-bg-surface p-2.5 space-y-1.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {incumbent.awardee_name}
              </p>
              {incumbent.awardee_uei && (
                <p className="text-xs text-text-tertiary font-mono">
                  UEI: {incumbent.awardee_uei}
                </p>
              )}
            </div>
            {i === 0 && (
              <Badge
                variant="secondary"
                className="bg-gold-star/20 text-gold-star border-0 text-xs shrink-0"
              >
                Top
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />$
              {formatCompact(incumbent.total_value)}
            </span>
            <span className="flex items-center gap-1">
              <Building className="h-3 w-3" />
              {incumbent.total_awards} award
              {incumbent.total_awards !== 1 ? "s" : ""}
            </span>
            {incumbent.most_recent_award && (
              <span>
                Last: {incumbent.most_recent_award.split("T")[0]}
              </span>
            )}
          </div>
        </div>
      ))}

      {incumbents.length > 5 && (
        <p className="text-xs text-text-tertiary text-center">
          +{incumbents.length - 5} more competitor
          {incumbents.length - 5 !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function countSources(
  awards: { source: string }[]
): string {
  const sources = new Set(awards.map((a) => a.source));
  const labels: Record<string, string> = {
    usaspending: "USASpending",
    sam_awards: "SAM.gov",
    fpds: "FPDS",
  };
  return [...sources]
    .map((s) => labels[s] || s)
    .join(" and ");
}

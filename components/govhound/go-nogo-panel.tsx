"use client";

import { useState, useCallback } from "react";
import {
  Loader2,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CircleDot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RadarChart } from "@/components/govhound/radar-chart";
import type {
  GoNoGoAssessmentWithScores,
  GoNoGoRecommendation,
  ComplianceChecklistItem,
} from "@/lib/govhound/types";

const RECOMMENDATION_STYLES: Record<
  GoNoGoRecommendation,
  { bg: string; text: string; label: string }
> = {
  strong_go: {
    bg: "bg-green-success/20",
    text: "text-green-success",
    label: "STRONG GO",
  },
  go: {
    bg: "bg-blue-vivid/20",
    text: "text-blue-bright",
    label: "GO",
  },
  conditional_go: {
    bg: "bg-gold-star/20",
    text: "text-gold-star",
    label: "CONDITIONAL GO",
  },
  no_go: {
    bg: "bg-red-alert/20",
    text: "text-red-alert",
    label: "NO GO",
  },
};

function RecommendationBadge({
  recommendation,
}: {
  recommendation: GoNoGoRecommendation;
}) {
  const style = RECOMMENDATION_STYLES[recommendation];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold tracking-wide ${style.bg} ${style.text}`}
    >
      {recommendation === "strong_go" || recommendation === "go" ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : recommendation === "conditional_go" ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      {style.label}
    </span>
  );
}

function ScoreBar({
  score,
  label,
  weight,
  notes,
}: {
  score: number | null;
  label: string;
  weight: number;
  notes: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayScore = score ?? 0;
  const widthPct = (displayScore / 5) * 100;

  let barColor = "bg-red-alert";
  if (displayScore >= 4) barColor = "bg-green-success";
  else if (displayScore >= 3) barColor = "bg-blue-vivid";
  else if (displayScore >= 2) barColor = "bg-gold-star";

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => notes && setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-xs text-text-secondary truncate pr-2">
          {label}
          <span className="ml-1 text-text-tertiary">
            ({Math.round(weight * 100)}%)
          </span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span
            className={`text-xs font-mono font-bold ${
              score == null ? "text-text-tertiary" : "text-text-primary"
            }`}
          >
            {score != null ? `${score}/5` : "---"}
          </span>
          {notes && (
            expanded ? (
              <ChevronUp className="h-3 w-3 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-3 w-3 text-text-tertiary" />
            )
          )}
        </span>
      </button>
      <div className="h-1.5 w-full rounded-full bg-bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      {expanded && notes && (
        <p className="text-xs text-text-tertiary mt-1 pl-1">{notes}</p>
      )}
    </div>
  );
}

interface GoNoGoPanelProps {
  opportunityId: string;
}

export function GoNoGoPanel({ opportunityId }: GoNoGoPanelProps) {
  const [assessment, setAssessment] =
    useState<GoNoGoAssessmentWithScores | null>(null);
  const [compliance, setCompliance] = useState<ComplianceChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);

  const fetchAssessment = useCallback(async () => {
    try {
      setLoading(true);
      const [assessRes, compRes] = await Promise.all([
        fetch(`/api/opportunities/${opportunityId}/go-nogo`),
        fetch(`/api/opportunities/${opportunityId}/compliance`),
      ]);

      if (assessRes.ok) {
        const data = await assessRes.json();
        setAssessment(data.assessment || null);
      }
      if (compRes.ok) {
        const data = await compRes.json();
        setCompliance(data.items || []);
      }
      setLoaded(true);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  // Load on first render
  useState(() => {
    fetchAssessment();
  });

  async function handleRunAssessment() {
    setRunning(true);
    try {
      const res = await fetch(
        `/api/opportunities/${opportunityId}/go-nogo`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
      );
      if (res.ok) {
        await fetchAssessment();
      }
    } catch {
      // Ignore
    } finally {
      setRunning(false);
    }
  }

  async function handleToggleCompliance(item: ComplianceChecklistItem) {
    const newValue =
      item.is_met === null ? true : item.is_met === true ? false : null;
    try {
      const res = await fetch(
        `/api/opportunities/${opportunityId}/compliance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, is_met: newValue }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setCompliance(data.items || []);
      }
    } catch {
      // Ignore
    }
  }

  if (loading && !loaded) {
    return (
      <Card className="border-[hsla(210,40%,60%,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-text-primary">
            <Shield className="h-4 w-4 text-blue-vivid" />
            Go/No-Go Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-[240px] w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assessment) {
    return (
      <Card className="border-[hsla(210,40%,60%,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-text-primary">
            <Shield className="h-4 w-4 text-blue-vivid" />
            Go/No-Go Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Shield className="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
            <p className="text-sm text-text-secondary mb-1">
              No go/no-go assessment yet.
            </p>
            <p className="text-xs text-text-tertiary mb-4">
              Auto-scores eligibility, clearances, past performance, and
              technical fit.
            </p>
            <Button
              onClick={handleRunAssessment}
              disabled={running}
              className="bg-blue-vivid hover:bg-blue-bright text-white"
            >
              {running ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              Run Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scores = assessment.go_nogo_criteria_scores || [];
  const radarData = scores.map((s) => ({
    label: s.criterion,
    value: s.score ?? 0,
    maxValue: 5,
  }));

  const scoredCount = scores.filter((s) => s.score != null).length;
  const unscoredCount = scores.length - scoredCount;

  const complianceMet = compliance.filter((c) => c.is_met === true).length;
  const complianceGaps = compliance.filter((c) => c.is_met === false).length;
  const compliancePending = compliance.filter(
    (c) => c.is_met === null
  ).length;

  return (
    <>
      <Card className="border-[hsla(210,40%,60%,0.12)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-text-primary">
              <Shield className="h-4 w-4 text-blue-vivid" />
              Go/No-Go Assessment
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRunAssessment}
              disabled={running}
              className="text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Re-run"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recommendation badge and overall score */}
          <div className="flex items-center justify-between">
            <RecommendationBadge recommendation={assessment.recommendation} />
            <div className="text-right">
              <p className="text-2xl font-bold text-text-primary">
                {assessment.overall_score?.toFixed(1)}
              </p>
              <p className="text-xs text-text-tertiary">of 5.0</p>
            </div>
          </div>

          {unscoredCount > 0 && (
            <p className="text-xs text-gold-star">
              {unscoredCount} criterion{unscoredCount > 1 ? "a" : ""} not
              scored -- set up company profile for full assessment.
            </p>
          )}

          {/* Radar chart */}
          {scores.length >= 3 && (
            <div className="flex justify-center py-2">
              <RadarChart data={radarData} size={220} />
            </div>
          )}

          <Separator className="bg-[hsla(210,40%,60%,0.12)]" />

          {/* Score bars */}
          <div className="space-y-3">
            {scores.map((s) => (
              <ScoreBar
                key={s.id}
                label={s.criterion}
                score={s.score}
                weight={s.weight}
                notes={s.notes}
              />
            ))}
          </div>

          {assessment.assessor_notes && (
            <>
              <Separator className="bg-[hsla(210,40%,60%,0.12)]" />
              <div>
                <p className="text-xs text-text-tertiary mb-1">
                  Assessor Notes
                </p>
                <p className="text-sm text-text-secondary">
                  {assessment.assessor_notes}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Compliance Checklist */}
      {compliance.length > 0 && (
        <Card className="border-[hsla(210,40%,60%,0.12)]">
          <CardHeader>
            <button
              type="button"
              onClick={() => setShowCompliance(!showCompliance)}
              className="flex w-full items-center justify-between"
            >
              <CardTitle className="flex items-center gap-2 text-base text-text-primary">
                <CheckCircle2 className="h-4 w-4 text-green-success" />
                Compliance Checklist
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 text-xs">
                  {complianceMet > 0 && (
                    <Badge
                      variant="outline"
                      className="border-green-success/40 text-green-success text-xs"
                    >
                      {complianceMet} met
                    </Badge>
                  )}
                  {complianceGaps > 0 && (
                    <Badge
                      variant="outline"
                      className="border-red-alert/40 text-red-alert text-xs"
                    >
                      {complianceGaps} gap{complianceGaps > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {compliancePending > 0 && (
                    <Badge
                      variant="outline"
                      className="border-[hsla(210,40%,60%,0.2)] text-text-tertiary text-xs"
                    >
                      {compliancePending} pending
                    </Badge>
                  )}
                </div>
                {showCompliance ? (
                  <ChevronUp className="h-4 w-4 text-text-tertiary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-tertiary" />
                )}
              </div>
            </button>
          </CardHeader>
          {showCompliance && (
            <CardContent>
              <ul className="space-y-2">
                {compliance.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 text-sm group"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleCompliance(item)}
                      className="mt-0.5 shrink-0"
                      title="Click to toggle status"
                    >
                      {item.is_met === true ? (
                        <CheckCircle2 className="h-4 w-4 text-green-success" />
                      ) : item.is_met === false ? (
                        <XCircle className="h-4 w-4 text-red-alert" />
                      ) : (
                        <CircleDot className="h-4 w-4 text-text-tertiary" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={`${
                          item.is_met === true
                            ? "text-text-secondary"
                            : item.is_met === false
                              ? "text-red-alert"
                              : "text-text-secondary"
                        }`}
                      >
                        {item.requirement_text}
                      </p>
                      {item.gap_notes && (
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {item.gap_notes}
                        </p>
                      )}
                      {item.source_section && (
                        <p className="text-xs text-text-tertiary mt-0.5 italic truncate">
                          {item.source_section}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}
    </>
  );
}

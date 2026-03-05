"use client";

import { format, differenceInDays } from "date-fns";
import { X, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/govhound/score-badge";
import type { OpportunityWithAnalysis } from "@/lib/govhound/types";

interface ComparisonViewProps {
  opportunities: OpportunityWithAnalysis[];
  onClose: () => void;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ComparisonView({
  opportunities,
  onClose,
}: ComparisonViewProps) {
  if (opportunities.length < 2) return null;

  const items = opportunities.map((opp) => {
    const analysis = Array.isArray(opp.opportunity_analysis)
      ? opp.opportunity_analysis[0]
      : opp.opportunity_analysis;

    const daysUntilDeadline = opp.response_deadline
      ? differenceInDays(new Date(opp.response_deadline), new Date())
      : null;

    return { opp, analysis, daysUntilDeadline };
  });

  const gridCols =
    items.length === 2
      ? "grid-cols-[200px_1fr_1fr]"
      : "grid-cols-[200px_1fr_1fr_1fr]";

  return (
    <Card className="border-blue-vivid/30 bg-bg-elevated">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base text-text-primary">
          Side-by-Side Comparison
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className={`grid ${gridCols} gap-4 text-sm`}>
          {/* Title row */}
          <div className="font-medium text-text-tertiary py-2">Title</div>
          {items.map(({ opp }) => (
            <div key={`title-${opp.id}`} className="py-2">
              <a
                href={`/opportunity/${opp.id}`}
                className="font-medium text-text-primary hover:text-blue-bright hover:underline line-clamp-3"
              >
                {opp.title}
              </a>
            </div>
          ))}

          {/* Agency */}
          <div className="font-medium text-text-tertiary py-2 border-t border-[hsla(210,40%,60%,0.08)]">
            Agency
          </div>
          {items.map(({ opp }) => (
            <div
              key={`agency-${opp.id}`}
              className="py-2 text-text-secondary border-t border-[hsla(210,40%,60%,0.08)]"
            >
              {opp.agency || "--"}
            </div>
          ))}

          {/* Estimated Value */}
          <div className="font-medium text-text-tertiary py-2 border-t border-[hsla(210,40%,60%,0.08)]">
            Est. Value
          </div>
          {items.map(({ opp }) => (
            <div
              key={`value-${opp.id}`}
              className="py-2 text-text-secondary border-t border-[hsla(210,40%,60%,0.08)]"
            >
              {formatCurrency(opp.estimated_value)}
            </div>
          ))}

          {/* Deadline */}
          <div className="font-medium text-text-tertiary py-2 border-t border-[hsla(210,40%,60%,0.08)]">
            Deadline
          </div>
          {items.map(({ opp, daysUntilDeadline }) => (
            <div
              key={`deadline-${opp.id}`}
              className="py-2 border-t border-[hsla(210,40%,60%,0.08)]"
            >
              {opp.response_deadline ? (
                <div className="space-y-1">
                  <span className="text-text-secondary">
                    {format(new Date(opp.response_deadline), "MMM d, yyyy")}
                  </span>
                  {daysUntilDeadline !== null && (
                    <div>
                      <Badge
                        variant={
                          daysUntilDeadline <= 7
                            ? "destructive"
                            : "outline"
                        }
                        className={`text-xs ${
                          daysUntilDeadline <= 7
                            ? "bg-red-alert border-0"
                            : "border-[hsla(210,40%,60%,0.2)] text-text-tertiary"
                        }`}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {daysUntilDeadline < 0
                          ? "Expired"
                          : daysUntilDeadline === 0
                            ? "Due today"
                            : `${daysUntilDeadline}d left`}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-text-tertiary">--</span>
              )}
            </div>
          ))}

          {/* NAICS / Set-Aside */}
          <div className="font-medium text-text-tertiary py-2 border-t border-[hsla(210,40%,60%,0.08)]">
            NAICS / Set-Aside
          </div>
          {items.map(({ opp }) => (
            <div
              key={`naics-${opp.id}`}
              className="py-2 border-t border-[hsla(210,40%,60%,0.08)] flex flex-wrap gap-1"
            >
              {opp.naics_code && (
                <Badge
                  variant="outline"
                  className="text-xs border-[hsla(210,40%,60%,0.2)] text-text-tertiary"
                >
                  {opp.naics_code}
                </Badge>
              )}
              {opp.set_aside_type && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-blue-deep/50 text-blue-bright border-0"
                >
                  {opp.set_aside_type}
                </Badge>
              )}
              {!opp.naics_code && !opp.set_aside_type && (
                <span className="text-text-tertiary">--</span>
              )}
            </div>
          ))}

          {/* Scores */}
          <div className="font-medium text-text-tertiary py-2 border-t border-[hsla(210,40%,60%,0.08)]">
            Scores
          </div>
          {items.map(({ opp, analysis }) => (
            <div
              key={`scores-${opp.id}`}
              className="py-2 border-t border-[hsla(210,40%,60%,0.08)]"
            >
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
                <span className="text-text-tertiary text-xs">
                  Not analyzed
                </span>
              )}
            </div>
          ))}

          {/* Key Requirements */}
          <div className="font-medium text-text-tertiary py-2 border-t border-[hsla(210,40%,60%,0.08)]">
            Key Requirements
          </div>
          {items.map(({ opp, analysis }) => (
            <div
              key={`reqs-${opp.id}`}
              className="py-2 border-t border-[hsla(210,40%,60%,0.08)]"
            >
              {analysis?.key_requirements &&
              analysis.key_requirements.length > 0 ? (
                <ul className="space-y-1">
                  {analysis.key_requirements.slice(0, 5).map((req: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-text-secondary text-xs"
                    >
                      <CheckCircle className="h-3 w-3 text-green-success shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{req}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-text-tertiary text-xs">--</span>
              )}
            </div>
          ))}

          {/* Red Flags */}
          <div className="font-medium text-text-tertiary py-2 border-t border-[hsla(210,40%,60%,0.08)]">
            Red Flags
          </div>
          {items.map(({ opp, analysis }) => (
            <div
              key={`flags-${opp.id}`}
              className="py-2 border-t border-[hsla(210,40%,60%,0.08)]"
            >
              {analysis?.red_flags && analysis.red_flags.length > 0 ? (
                <ul className="space-y-1">
                  {analysis.red_flags.slice(0, 5).map((flag: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-text-secondary text-xs"
                    >
                      <AlertTriangle className="h-3 w-3 text-red-alert shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{flag}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-text-tertiary text-xs">
                  {analysis ? "None detected" : "--"}
                </span>
              )}
            </div>
          ))}

          {/* Effort Estimate */}
          <div className="font-medium text-text-tertiary py-2 border-t border-[hsla(210,40%,60%,0.08)]">
            Est. Effort
          </div>
          {items.map(({ opp, analysis }) => (
            <div
              key={`effort-${opp.id}`}
              className="py-2 text-text-secondary border-t border-[hsla(210,40%,60%,0.08)]"
            >
              {analysis?.estimated_effort || "--"}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

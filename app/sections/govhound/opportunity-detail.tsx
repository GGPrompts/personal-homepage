"use client";

import { useEffect, useState, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Calendar,
  MapPin,
  Building,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  User,
  Mail,
  Phone,
  Award,
  Link as LinkIcon,
  Tag,
  RefreshCw,
  FileEdit,
  File,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { GoNoGoPanel } from "@/components/govhound/go-nogo-panel";
import { CompetitorIntelPanel } from "@/components/govhound/competitor-intel-panel";
import { PricingPanel } from "@/components/govhound/pricing-panel";
import { MilestoneTimeline } from "@/components/govhound/milestone-timeline";
import { ActivityLog } from "@/components/govhound/activity-log";
import type {
  OpportunityWithAnalysis,
  OpportunityAnalysis,
  SavedStatus,
  ResourceLink,
  MatchResult,
  Milestone,
  ActivityLogEntry,
  ProposalDocument,
  ProposalDocType,
} from "@/lib/govhound/types";
import { PROPOSAL_DOC_TYPE_LABELS } from "@/lib/govhound/types";

interface TabProps {
  onSelectOpportunity?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenProposal?: (id: string) => void;
  onBack?: () => void;
}

export function OpportunityDetailTab({ opportunityId, onSelectOpportunity, onNavigateTab, onOpenProposal, onBack }: TabProps & { opportunityId: string }) {
  const id = opportunityId;

  const [opportunity, setOpportunity] =
    useState<OpportunityWithAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotes, setSaveNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<SavedStatus>("watching");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activityEntries, setActivityEntries] = useState<ActivityLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState<ProposalDocument[]>([]);
  const [hasProposal, setHasProposal] = useState(false);

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/milestones`);
      if (res.ok) {
        const data = await res.json();
        setMilestones(data.milestones || []);
      }
    } catch {
      // Non-critical
    }
  }, [id]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivityEntries(data.entries || []);
      }
    } catch {
      // Non-critical
    }
  }, [id]);

  useEffect(() => {
    async function fetchOpportunity() {
      try {
        const res = await fetch(`/api/govhound/opportunities/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Opportunity not found");
            return;
          }
          throw new Error("Failed to fetch opportunity");
        }
        const data = await res.json();
        setOpportunity(data);

        // Pre-fill save dialog if already saved
        const saved = Array.isArray(data.saved_opportunities)
          ? data.saved_opportunities[0]
          : data.saved_opportunities;
        if (saved) {
          setSaveNotes(saved.notes || "");
          setSaveStatus(saved.status || "watching");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load opportunity"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchOpportunity();

    async function fetchMatches() {
      try {
        setMatchesLoading(true);
        const res = await fetch(`/api/govhound/opportunities/${id}/matches`);
        if (res.ok) {
          const data = await res.json();
          setMatches(data.matches || []);
        }
      } catch {
        // Matches are non-critical, ignore errors
      } finally {
        setMatchesLoading(false);
      }
    }

    fetchMatches();
    fetchMilestones();
    fetchActivity();

    // Fetch documents
    async function fetchDocuments() {
      try {
        const res = await fetch(`/api/govhound/opportunities/${id}/documents`);
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
        }
      } catch {
        // Non-critical
      }
    }
    fetchDocuments();

    // Check for existing proposal
    async function checkProposal() {
      try {
        const res = await fetch(`/api/govhound/opportunities/${id}/proposal`);
        if (res.ok) {
          const data = await res.json();
          setHasProposal(!!data.proposal);
        }
      } catch {
        // Non-critical
      }
    }
    checkProposal();
  }, [id, fetchMilestones, fetchActivity]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/refresh`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh failed");

      // Re-fetch opportunity and activity to show any amendment entries
      const oppRes = await fetch(`/api/govhound/opportunities/${id}`);
      if (oppRes.ok) {
        setOpportunity(await oppRes.json());
      }
      fetchActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      // Re-fetch opportunity to get updated analysis
      const oppRes = await fetch(`/api/govhound/opportunities/${id}`);
      if (oppRes.ok) {
        setOpportunity(await oppRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: saveNotes, status: saveStatus }),
      });
      if (!res.ok) throw new Error("Failed to save");

      // Re-fetch
      const oppRes = await fetch(`/api/govhound/opportunities/${id}`);
      if (oppRes.ok) {
        setOpportunity(await oppRes.json());
      }
      setSaveDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsave() {
    try {
      await fetch(`/api/govhound/opportunities/${id}/save`, { method: "DELETE" });
      const oppRes = await fetch(`/api/govhound/opportunities/${id}`);
      if (oppRes.ok) {
        setOpportunity(await oppRes.json());
      }
    } catch {
      // Ignore
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error && !opportunity) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => onNavigateTab?.("scanner")} className="text-muted-foreground hover:text-foreground hover:bg-accent">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!opportunity) return null;

  const analysis = Array.isArray(opportunity.opportunity_analysis)
    ? opportunity.opportunity_analysis[0]
    : opportunity.opportunity_analysis;

  const saved = Array.isArray(opportunity.saved_opportunities)
    ? opportunity.saved_opportunities[0]
    : opportunity.saved_opportunities;

  const isSaved = !!saved;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab?.("scanner")}
            className="mb-2 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {opportunity.title}
          </h1>
          {opportunity.sol_number && (
            <p className="text-sm text-muted-foreground/70">
              Solicitation: {opportunity.sol_number}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant={isSaved ? "default" : "outline"}
                className={isSaved
                  ? "bg-primary/20 hover:bg-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                }
              >
                {isSaved ? (
                  <BookmarkCheck className="mr-2 h-4 w-4" />
                ) : (
                  <Bookmark className="mr-2 h-4 w-4" />
                )}
                {isSaved ? `Saved (${saved.status})` : "Save"}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {isSaved ? "Update Saved Opportunity" : "Save Opportunity"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <Select
                    value={saveStatus}
                    onValueChange={(v) => setSaveStatus(v as SavedStatus)}
                  >
                    <SelectTrigger className="bg-card border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="watching">Watching</SelectItem>
                      <SelectItem value="bidding">Bidding</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="no_bid">No Bid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Notes</Label>
                  <Textarea
                    placeholder="Add notes about this opportunity..."
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    rows={4}
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground/70"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isSaved ? "Update" : "Save"}
                  </Button>
                  {isSaved && (
                    <Button
                      variant="outline"
                      onClick={handleUnsave}
                      className="border-border text-muted-foreground hover:text-destructive hover:border-destructive/50"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>

          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            variant={analysis ? "outline" : "default"}
            className={analysis
              ? "border-border text-yellow-500 hover:text-yellow-400 hover:bg-accent"
              : "bg-yellow-500 hover:bg-yellow-400 text-black"
            }
          >
            {analyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {analysis ? "Re-analyze" : "Analyze"}
          </Button>

          <Button
            onClick={() => onNavigateTab?.("proposal-editor")}
            variant={hasProposal ? "outline" : "default"}
            className={hasProposal
              ? "border-border text-primary hover:text-primary hover:bg-accent"
              : "bg-primary hover:bg-primary/90 text-white"
            }
          >
            <FileEdit className="mr-2 h-4 w-4" />
            {hasProposal ? "View Proposal" : "Generate Proposal"}
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contract Details */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {opportunity.agency && (
                  <div className="flex items-start gap-2">
                    <Building className="mt-0.5 h-4 w-4 text-muted-foreground/70 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground/70">Agency</p>
                      <p className="text-sm font-medium text-foreground">
                        {opportunity.agency}
                      </p>
                    </div>
                  </div>
                )}
                {opportunity.posted_date && (
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground/70 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground/70">Posted Date</p>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(opportunity.posted_date), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
                {opportunity.response_deadline && (
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 text-muted-foreground/70 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground/70">Response Deadline</p>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(opportunity.response_deadline), "MMMM d, yyyy")}
                        <span className="ml-1 text-xs text-muted-foreground/70">
                          ({formatDistanceToNow(new Date(opportunity.response_deadline), { addSuffix: true })})
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                {opportunity.place_of_performance && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground/70 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground/70">Place of Performance</p>
                      <p className="text-sm font-medium text-foreground">{opportunity.place_of_performance}</p>
                    </div>
                  </div>
                )}
                {opportunity.estimated_value && (
                  <div className="flex items-start gap-2">
                    <DollarSign className="mt-0.5 h-4 w-4 text-green-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground/70">Estimated Value</p>
                      <p className="text-sm font-medium text-foreground">${opportunity.estimated_value.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {opportunity.notice_type && (
                  <Badge variant="outline" className="border-yellow-500/40 text-yellow-500">
                    <Tag className="mr-1 h-3 w-3" />
                    {opportunity.notice_type}
                  </Badge>
                )}
                {opportunity.naics_code && (
                  <Badge variant="outline" className="border-border text-muted-foreground">{`NAICS: ${opportunity.naics_code}`}</Badge>
                )}
                {opportunity.classification_code && (
                  <Badge variant="outline" className="border-border text-muted-foreground">{`Code: ${opportunity.classification_code}`}</Badge>
                )}
                {opportunity.set_aside_type && (
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-0">{opportunity.set_aside_type}</Badge>
                )}
                {opportunity.active != null && (
                  <Badge variant="outline" className={opportunity.active ? "border-green-500/40 text-green-500" : "border-destructive/40 text-destructive"}>
                    {opportunity.active ? "Active" : "Inactive"}
                  </Badge>
                )}
              </div>

              {opportunity.url && (
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary hover:underline"
                >
                  View on SAM.gov
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <Separator className="bg-border" />

              <div>
                <h3 className="mb-2 font-medium text-foreground">Description</h3>
                {opportunity.description ? (
                  <div className="max-w-none whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                    {opportunity.description}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/70 italic">No description available.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          {(opportunity.contact_name || opportunity.contact_email || opportunity.contact_phone) && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4 text-primary" />
                  Point of Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {opportunity.contact_name && (
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 text-muted-foreground/70 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground/70">Name</p>
                        <p className="text-sm font-medium text-foreground">{opportunity.contact_name}</p>
                      </div>
                    </div>
                  )}
                  {opportunity.contact_email && (
                    <div className="flex items-start gap-2">
                      <Mail className="mt-0.5 h-4 w-4 text-muted-foreground/70 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground/70">Email</p>
                        <a href={`mailto:${opportunity.contact_email}`} className="text-sm font-medium text-primary hover:text-primary hover:underline">
                          {opportunity.contact_email}
                        </a>
                      </div>
                    </div>
                  )}
                  {opportunity.contact_phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="mt-0.5 h-4 w-4 text-muted-foreground/70 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground/70">Phone</p>
                        <a href={`tel:${opportunity.contact_phone}`} className="text-sm font-medium text-primary hover:text-primary hover:underline">
                          {opportunity.contact_phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Awardee Information */}
          {(opportunity.awardee_name || opportunity.award_amount != null) && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Award className="h-4 w-4 text-yellow-500" />
                  Award Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {opportunity.awardee_name && (
                    <div>
                      <p className="text-xs text-muted-foreground/70">Awardee</p>
                      <p className="text-sm font-medium text-foreground">{opportunity.awardee_name}</p>
                      {opportunity.awardee_uei && <p className="text-xs text-muted-foreground/70 mt-0.5">UEI: {opportunity.awardee_uei}</p>}
                    </div>
                  )}
                  {opportunity.award_amount != null && (
                    <div>
                      <p className="text-xs text-muted-foreground/70">Award Amount</p>
                      <p className="text-sm font-medium text-green-500">${opportunity.award_amount.toLocaleString()}</p>
                    </div>
                  )}
                  {opportunity.award_date && (
                    <div>
                      <p className="text-xs text-muted-foreground/70">Award Date</p>
                      <p className="text-sm font-medium text-foreground">{format(new Date(opportunity.award_date), "MMMM d, yyyy")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resource Links */}
          {opportunity.resource_links && opportunity.resource_links.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  Resource Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {opportunity.resource_links.map((link: ResourceLink, i: number) => (
                    <li key={i}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary hover:underline">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {link.description || link.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Milestone Timeline */}
          <MilestoneTimeline
            opportunityId={id}
            milestones={milestones}
            onRefresh={fetchMilestones}
            hasDeadline={!!opportunity.response_deadline}
          />

          {/* Activity Log */}
          <ActivityLog
            opportunityId={id}
            entries={activityEntries}
            onRefresh={fetchActivity}
          />
        </div>

        {/* Sidebar - AI Analysis */}
        <div className="space-y-6">
          {analysis ? (
            <AnalysisPanel analysis={analysis} />
          ) : (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/70" />
                  <p className="text-sm text-muted-foreground mb-3">This opportunity has not been analyzed yet.</p>
                  <Button onClick={handleAnalyze} disabled={analyzing} className="bg-yellow-500 hover:bg-yellow-400 text-black">
                    {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Run Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Competitor Intelligence */}
          <CompetitorIntelPanel opportunityId={id} />

          {/* Pricing / BOE */}
          <PricingPanel opportunityId={id} />

          {/* Go/No-Go Assessment */}
          <GoNoGoPanel opportunityId={id} />

          {/* Past Performance Matches */}
          <PastPerformanceMatchesPanel
            matches={matches}
            loading={matchesLoading}
            onNavigateTab={onNavigateTab}
          />

          {/* Documents */}
          <DocumentsPanel
            opportunityId={id}
            documents={documents}
            onNavigateTab={onNavigateTab}
          />
        </div>
      </div>
    </div>
  );
}

function PastPerformanceMatchesPanel({
  matches,
  loading,
  onNavigateTab,
}: {
  matches: MatchResult[];
  loading: boolean;
  onNavigateTab?: (tab: string) => void;
}) {
  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Award className="h-4 w-4 text-primary" />
            Past Performance Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Award className="h-4 w-4 text-primary" />
          Past Performance Matches
        </CardTitle>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-6">
            <Award className="mx-auto mb-2 h-6 w-6 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground">No matching past contracts found.</p>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab?.("past-performance")} className="mt-2 text-primary hover:text-primary hover:bg-accent">
              Add Past Contracts
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div key={match.contract.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-foreground line-clamp-2">{match.contract.title}</h4>
                  <Badge variant="outline" className={
                    match.relevance_score >= 50 ? "border-green-500/40 text-green-500 shrink-0"
                      : match.relevance_score >= 25 ? "border-yellow-500/40 text-yellow-500 shrink-0"
                        : "border-border text-muted-foreground shrink-0"
                  }>
                    {match.relevance_score}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground/70 font-mono">{match.contract.contract_number}</p>
                <div className="flex flex-wrap gap-1.5">
                  {match.match_details.naics_match && <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">NAICS</Badge>}
                  {match.match_details.agency_match && <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">Agency</Badge>}
                  {match.match_details.technology_overlap > 0 && <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">Tech {Math.round(match.match_details.technology_overlap * 100)}%</Badge>}
                  {match.match_details.value_similarity > 0 && <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">Value {Math.round(match.match_details.value_similarity * 100)}%</Badge>}
                  {match.match_details.recency_score > 0 && <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">Recent</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                  <Building className="h-3 w-3" />
                  {match.contract.agency}
                  {match.contract.total_value && (
                    <>
                      <span className="text-muted-foreground/70">|</span>
                      <DollarSign className="h-3 w-3" />${match.contract.total_value.toLocaleString()}
                    </>
                  )}
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab?.("past-performance")} className="w-full text-primary hover:text-primary hover:bg-accent">
              Manage Past Contracts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisPanel({ analysis }: { analysis: OpportunityAnalysis }) {
  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            AI Analysis
          </CardTitle>
          <p className="text-xs text-muted-foreground/70">
            Analyzed {formatDistanceToNow(new Date(analysis.analyzed_at), { addSuffix: true })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground/70">Feasibility</p>
              <p className="text-2xl font-bold text-foreground">{analysis.feasibility_score}/5</p>
              <p className="text-xs text-muted-foreground/70">for small team</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground/70">Complexity</p>
              <p className="text-2xl font-bold text-foreground">{analysis.complexity_score}/5</p>
              <p className="text-xs text-muted-foreground/70">project scope</p>
            </div>
          </div>
          {analysis.estimated_effort && (
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground/70">Estimated Effort</p>
              <p className="font-medium text-foreground">{analysis.estimated_effort}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader><CardTitle className="text-base text-foreground">Requirements Summary</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{analysis.requirements_summary || "No summary available."}</p></CardContent>
      </Card>

      {analysis.tech_stack_detected && (
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base text-foreground">Tech Stack Detected</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{analysis.tech_stack_detected}</p></CardContent>
        </Card>
      )}

      {analysis.key_requirements && analysis.key_requirements.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Key Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.key_requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {analysis.red_flags && analysis.red_flags.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.red_flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {analysis.recommended_approach && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              Recommended Approach
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{analysis.recommended_approach}</p></CardContent>
        </Card>
      )}
    </>
  );
}

function DocumentsPanel({
  opportunityId,
  documents,
  onNavigateTab,
}: {
  opportunityId: string;
  documents: ProposalDocument[];
  onNavigateTab?: (tab: string) => void;
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <File className="h-4 w-4 text-primary" />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-6">
            <File className="mx-auto mb-2 h-6 w-6 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab?.("proposal-editor")} className="mt-2 text-primary hover:text-primary hover:bg-accent">
              <Upload className="mr-1 h-3 w-3" />
              Upload Documents
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                <File className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground/70">{PROPOSAL_DOC_TYPE_LABELS[doc.doc_type as ProposalDocType]}</p>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary shrink-0">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab?.("proposal-editor")} className="w-full text-primary hover:text-primary hover:bg-accent">
              Manage Documents
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

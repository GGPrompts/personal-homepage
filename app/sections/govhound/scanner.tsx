"use client";

import { useState, useCallback, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Save,
  Play,
  Trash2,
  Clock,
  Bell,
  Download,
  AlertTriangle,
  Key,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/govhound/score-badge";
import { EmptyState } from "@/components/govhound/empty-state";
import { BulkOperationsToolbar } from "@/components/govhound/bulk-operations-toolbar";
import { ComparisonView } from "@/components/govhound/comparison-view";
import type { OpportunityWithAnalysis, SearchProfileWithStats } from "@/lib/govhound/types";
import { DbExplorer } from "./db-explorer";

interface TabProps {
  onSelectOpportunity?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const SET_ASIDE_OPTIONS = [
  { value: "SBA", label: "Small Business" },
  { value: "8A", label: "8(a)" },
  { value: "HZC", label: "HUBZone" },
  { value: "SDVOSBC", label: "SDVOSB" },
  { value: "WOSB", label: "WOSB" },
  { value: "EDWOSB", label: "EDWOSB" },
];

const NAICS_OPTIONS = [
  { value: "541511", label: "541511 - Custom Programming" },
  { value: "541512", label: "541512 - Systems Design" },
  { value: "541513", label: "541513 - Facilities Management" },
  { value: "541519", label: "541519 - Other Computer Services" },
  { value: "518210", label: "518210 - Data Processing/Hosting" },
  { value: "511210", label: "511210 - Software Publishers" },
];

type ScannerView = "scanner" | "explorer";

export function ScannerTab({ onSelectOpportunity, onNavigateTab }: TabProps) {
  const [activeView, setActiveView] = useState<ScannerView>("scanner");
  const [keywords, setKeywords] = useState("");
  const [naicsCode, setNaicsCode] = useState("");
  const [setAside, setSetAside] = useState("");
  const [agency, setAgency] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [opportunities, setOpportunities] = useState<
    OpportunityWithAnalysis[]
  >([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Profile state
  const [profiles, setProfiles] = useState<SearchProfileWithStats[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [runningProfileId, setRunningProfileId] = useState<string | null>(null);
  const [showProfiles, setShowProfiles] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Compare state
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());

  // Export state
  const [exporting, setExporting] = useState(false);

  const limit = 20;

  // Fetch profiles and flags on mount
  useEffect(() => {
    fetchProfiles();
    fetchFlaggedIds();
  }, []);

  async function fetchFlaggedIds() {
    try {
      const res = await fetch("/api/govhound/profiles/flags");
      if (!res.ok) return;
      const data = await res.json();
      setFlaggedIds(new Set(data.flagged_opportunity_ids || []));
    } catch {
      // Non-critical, just don't show badges
    }
  }

  async function fetchProfiles() {
    setLoadingProfiles(true);
    try {
      const res = await fetch("/api/govhound/profiles");
      if (!res.ok) throw new Error("Failed to fetch profiles");
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    } finally {
      setLoadingProfiles(false);
    }
  }

  const fetchOpportunities = useCallback(
    async (p: number = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(limit),
          sort: "posted_date",
          order: "desc",
        });

        if (keywords) params.set("search", keywords);
        if (naicsCode) params.set("naics", naicsCode);
        if (setAside) params.set("set_aside", setAside);
        if (agency) params.set("agency", agency);

        const res = await fetch(`/api/govhound/opportunities?${params}`);
        if (!res.ok) throw new Error("Failed to fetch opportunities");

        const data = await res.json();
        setOpportunities(data.opportunities || []);
        setTotal(data.total || 0);
        setPage(p);
        setHasSearched(true);
        setSelectedIds(new Set());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch"
        );
      } finally {
        setLoading(false);
      }
    },
    [keywords, naicsCode, setAside, agency]
  );

  async function handleScan() {
    setScanning(true);
    setError(null);
    setErrorCode(null);
    try {
      const body: Record<string, unknown> = {};
      if (keywords) body.keywords = keywords;
      if (naicsCode) body.naics_codes = [naicsCode];
      if (setAside) body.set_aside_types = [setAside];
      if (agency) body.agency = agency;
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;

      // Default to IT NAICS codes if none specified
      if (!naicsCode) {
        body.naics_codes = ["541511", "541512", "541519"];
      }

      const res = await fetch("/api/govhound/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error_code) {
          setErrorCode(data.error_code);
        }
        throw new Error(data.error || "Scan failed");
      }

      // Refresh the list
      await fetchOpportunities(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function handleAnalyze(id: string) {
    setAnalyzingId(id);
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/analyze`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      // Refresh the list to show updated analysis
      await fetchOpportunities(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleSaveProfile() {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    try {
      const body: Record<string, unknown> = {
        name: profileName.trim(),
        keywords: keywords || null,
        naics_codes: naicsCode ? [naicsCode] : [],
        set_aside_types: setAside ? [setAside] : [],
        agencies: agency ? [agency] : [],
        classification_codes: [],
        date_range_days: 30,
      };

      const res = await fetch("/api/govhound/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      setProfileName("");
      setSaveDialogOpen(false);
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLoadProfile(profile: SearchProfileWithStats) {
    setKeywords(profile.keywords || "");
    setNaicsCode(
      profile.naics_codes.length > 0 ? profile.naics_codes[0] : ""
    );
    setSetAside(
      profile.set_aside_types.length > 0 ? profile.set_aside_types[0] : ""
    );
    setAgency(profile.agencies.length > 0 ? profile.agencies[0] : "");
    setShowFilters(true);
  }

  async function handleRunProfile(profileId: string) {
    setRunningProfileId(profileId);
    setError(null);
    try {
      const res = await fetch(`/api/govhound/profiles/${profileId}/run`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Profile scan failed");
      }

      await fetchProfiles();
      await fetchFlaggedIds();
      await fetchOpportunities(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile scan failed");
    } finally {
      setRunningProfileId(null);
    }
  }

  async function handleToggleProfile(
    profileId: string,
    isActive: boolean
  ) {
    try {
      const res = await fetch("/api/govhound/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId, is_active: isActive }),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    }
  }

  async function handleDeleteProfile(profileId: string) {
    try {
      const res = await fetch(`/api/govhound/profiles?id=${profileId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete profile");
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete profile");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === opportunities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(opportunities.map((o) => o.id)));
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
      const params = new URLSearchParams({
        sort: "posted_date",
        order: "desc",
      });
      if (keywords) params.set("search", keywords);
      if (naicsCode) params.set("naics", naicsCode);
      if (setAside) params.set("set_aside", setAside);
      if (agency) params.set("agency", agency);

      const res = await fetch(`/api/govhound/opportunities/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `govhound-opportunities-${new Date().toISOString().slice(0, 10)}.csv`;
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Contract Scanner</h1>
        <p className="text-muted-foreground">
          Search SAM.gov for federal IT contract opportunities, or explore your local database.
        </p>
      </div>

      {/* Sub-tab toggle: Scanner vs DB Explorer */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        <button
          onClick={() => setActiveView("scanner")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeView === "scanner"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <Search className="inline-block mr-1.5 h-3.5 w-3.5" />
          SAM.gov Scanner
        </button>
        <button
          onClick={() => setActiveView("explorer")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeView === "explorer"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <Database className="inline-block mr-1.5 h-3.5 w-3.5" />
          Database Explorer
        </button>
      </div>

      {/* Database Explorer View */}
      {activeView === "explorer" ? (
        <DbExplorer onSelectOpportunity={onSelectOpportunity} />
      ) : (
      <>

      {/* Search Profiles */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-yellow-500" />
              Saved Search Profiles
              {profiles.some((p) => p.new_count > 0) && (
                <Badge className="bg-primary text-white text-xs border-0">
                  {profiles.reduce((sum, p) => sum + p.new_count, 0)} new
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfiles(!showProfiles)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              {showProfiles ? "Hide" : "Show"} ({profiles.length})
            </Button>
          </div>
        </CardHeader>
        {showProfiles && (
          <CardContent className="space-y-3">
            {loadingProfiles ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 py-2">
                No saved profiles yet. Set your filters below and save them as a profile for automated scanning.
              </p>
            ) : (
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Switch
                        checked={profile.is_active}
                        onCheckedChange={(checked) =>
                          handleToggleProfile(profile.id, checked)
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm truncate">
                            {profile.name}
                          </span>
                          {profile.new_count > 0 && (
                            <Badge className="bg-primary text-white text-xs border-0 shrink-0">
                              {profile.new_count} new
                            </Badge>
                          )}
                          {!profile.is_active && (
                            <Badge variant="outline" className="text-xs border-border text-muted-foreground/70 shrink-0">
                              paused
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground/70">
                          {profile.keywords && (
                            <span>Keywords: {profile.keywords}</span>
                          )}
                          {profile.naics_codes.length > 0 && (
                            <span>NAICS: {profile.naics_codes.join(", ")}</span>
                          )}
                          {profile.set_aside_types.length > 0 && (
                            <span>Set-aside: {profile.set_aside_types.join(", ")}</span>
                          )}
                          {profile.last_run_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(profile.last_run_at), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoadProfile(profile)}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent"
                        title="Load filters"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRunProfile(profile.id)}
                        disabled={runningProfileId === profile.id}
                        className="text-primary hover:text-primary hover:bg-accent"
                        title="Run scan now"
                      >
                        {runningProfileId === profile.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="text-muted-foreground/70 hover:text-destructive hover:bg-accent"
                        title="Delete profile"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Search and Filters */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-foreground">Search & Filters</CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <Save className="mr-1 h-4 w-4" />
                    Save as Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Save Search Profile</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Save your current filters as a profile for automated daily scanning.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Profile Name</Label>
                      <Input
                        placeholder="e.g., AI/ML Small Business Opps"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveProfile();
                        }}
                        className="border-border placeholder:text-muted-foreground/70"
                      />
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-sm space-y-1">
                      <p className="text-muted-foreground/70 font-medium">Current filters:</p>
                      <p className="text-muted-foreground">
                        {keywords ? `Keywords: "${keywords}"` : "No keywords"}
                        {naicsCode ? ` | NAICS: ${naicsCode}` : ""}
                        {setAside ? ` | Set-aside: ${setAside}` : ""}
                        {agency ? ` | Agency: ${agency}` : ""}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={!profileName.trim() || savingProfile}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      {savingProfile ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Profile
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <SlidersHorizontal className="mr-1 h-4 w-4" />
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by keyword, title, or agency..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchOpportunities(1);
              }}
              className="flex-1 border-border placeholder:text-muted-foreground/70 focus:border-primary"
            />
            <Button
              onClick={() => fetchOpportunities(1)}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </Button>
            <Button
              variant="outline"
              onClick={handleScan}
              disabled={scanning}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              {scanning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {scanning ? "Scanning..." : "Scan SAM.gov"}
            </Button>
          </div>

          {showFilters && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">NAICS Code</Label>
                <Select value={naicsCode} onValueChange={setNaicsCode}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="All IT codes" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All IT codes</SelectItem>
                    {NAICS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Set-Aside Type</Label>
                <Select value={setAside} onValueChange={setSetAside}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="any">Any</SelectItem>
                    {SET_ASIDE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Agency</Label>
                <Input
                  placeholder="e.g., Department of Defense"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  className="border-border placeholder:text-muted-foreground/70"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Posted From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Posted To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border-border"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (errorCode === "MISSING_SAM_API_KEY" || errorCode === "MISSING_SUPABASE_KEY") ? (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Configuration Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              GovHound needs a few environment variables to connect to external services. Add these to your{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">.env.local</code> file:
            </p>
            <div className="space-y-3">
              {errorCode === "MISSING_SAM_API_KEY" && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-sm text-foreground">SAM_GOV_API_KEY</span>
                    <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">Missing</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mb-2">
                    Required to search federal contract opportunities on SAM.gov.
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://api.sam.gov" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">api.sam.gov</a> and create a free account</li>
                    <li>Request a public API key (instant approval)</li>
                    <li>Add <code className="rounded bg-muted px-1 py-0.5 font-mono">SAM_GOV_API_KEY=your_key_here</code> to <code className="rounded bg-muted px-1 py-0.5 font-mono">.env.local</code></li>
                    <li>Restart the dev server</li>
                  </ol>
                </div>
              )}
              {errorCode === "MISSING_SUPABASE_KEY" && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-sm text-foreground">SUPABASE_SERVICE_ROLE_KEY</span>
                    <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">Missing</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mb-2">
                    Required for server-side database access (storing and querying contracts).
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open your Supabase project dashboard</li>
                    <li>Go to Settings &gt; API &gt; Service Role Key</li>
                    <li>Add <code className="rounded bg-muted px-1 py-0.5 font-mono">SUPABASE_SERVICE_ROLE_KEY=your_key_here</code> to <code className="rounded bg-muted px-1 py-0.5 font-mono">.env.local</code></li>
                    <li>Restart the dev server</li>
                  </ol>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Bulk Operations Toolbar */}
      <BulkOperationsToolbar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
        onComplete={() => fetchOpportunities(page)}
        onError={(msg) => setError(msg)}
      />

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

      {/* Results */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-foreground">
            {hasSearched
              ? `${total} Opportunities Found`
              : "Opportunities"}
          </CardTitle>
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
              Compare {compareMode && compareIds.size > 0 ? `(${compareIds.size}/3)` : ""}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || !hasSearched}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <Download className="mr-1 h-4 w-4" />
              {exporting ? "Exporting..." : "CSV"}
            </Button>
            {total > 0 && (
              <span className="text-sm text-muted-foreground/70">
                Page {page} of {totalPages}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title={
                hasSearched
                  ? "No results found"
                  : "Search for opportunities"
              }
              description={
                hasSearched
                  ? "Try adjusting your filters or run a new SAM.gov scan."
                  : "Use the search bar above to find contracts in your database, or scan SAM.gov for new ones."
              }
            />
          ) : (
            <>
              {compareMode && (
                <p className="text-sm text-muted-foreground/70 mb-3">
                  Click rows to select 2-3 opportunities for comparison.
                </p>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      {!compareMode && (
                        <TableHead className="w-10">
                          <Checkbox
                            checked={
                              opportunities.length > 0 &&
                              selectedIds.size === opportunities.length
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead className="min-w-[300px] text-muted-foreground/70">Title</TableHead>
                      <TableHead className="text-muted-foreground/70">Agency</TableHead>
                      <TableHead className="text-muted-foreground/70">NAICS</TableHead>
                      <TableHead className="text-muted-foreground/70">Set-Aside</TableHead>
                      <TableHead className="text-muted-foreground/70">Deadline</TableHead>
                      <TableHead className="text-muted-foreground/70">Scores</TableHead>
                      <TableHead className="text-right text-muted-foreground/70">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunities.map((opp) => {
                      const analysis = Array.isArray(
                        opp.opportunity_analysis
                      )
                        ? opp.opportunity_analysis[0]
                        : opp.opportunity_analysis;

                      const isCompareSelected = compareIds.has(opp.id);

                      return (
                        <TableRow
                          key={opp.id}
                          className={`border-border hover:bg-accent transition-colors ${
                            isCompareSelected ? "bg-primary/10 hover:bg-primary/15" : ""
                          } ${compareMode ? "cursor-pointer" : ""}`}
                          onClick={
                            compareMode
                              ? () => toggleCompare(opp.id)
                              : undefined
                          }
                        >
                          {!compareMode && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(opp.id)}
                                onCheckedChange={() => toggleSelect(opp.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  if (compareMode) { e.preventDefault(); return; }
                                  onSelectOpportunity?.(opp.id);
                                }}
                                className="font-medium text-foreground hover:text-primary hover:underline line-clamp-2 text-left"
                              >
                                {opp.title}
                              </button>
                              {flaggedIds.has(opp.id) && (
                                <Badge className="bg-yellow-500 text-black text-[10px] font-bold border-0 shrink-0 px-1.5 py-0">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            {opp.sol_number && (
                              <p className="mt-0.5 text-xs text-muted-foreground/70">
                                {opp.sol_number}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {opp.agency || "--"}
                          </TableCell>
                          <TableCell>
                            {opp.naics_code ? (
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground/70">
                                {opp.naics_code}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/70">--</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {opp.set_aside_type ? (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-primary/20 text-primary border-0"
                              >
                                {opp.set_aside_type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/70">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                            {opp.response_deadline
                              ? format(
                                  new Date(opp.response_deadline),
                                  "MMM d, yyyy"
                                )
                              : "--"}
                          </TableCell>
                          <TableCell>
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
                              <span className="text-xs text-muted-foreground/70">
                                --
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              {!analysis && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAnalyze(opp.id)}
                                  disabled={analyzingId === opp.id}
                                  className="text-yellow-500 hover:text-yellow-400 hover:bg-accent"
                                >
                                  {analyzingId === opp.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onSelectOpportunity?.(opp.id)}
                                className="text-muted-foreground hover:text-foreground hover:bg-accent"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchOpportunities(page - 1)}
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
                    onClick={() => fetchOpportunities(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}

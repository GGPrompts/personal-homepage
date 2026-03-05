"use client";

import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import {
  Search,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Database,
  Filter,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/govhound/score-badge";
import { EmptyState } from "@/components/govhound/empty-state";
import type { OpportunityWithAnalysis } from "@/lib/govhound/types";

interface DbExplorerProps {
  onSelectOpportunity?: (id: string) => void;
}

interface Facets {
  agencies: string[];
  naics_codes: string[];
  set_aside_types: string[];
}

const ITEMS_PER_PAGE = 30;

export function DbExplorer({ onSelectOpportunity }: DbExplorerProps) {
  // Filter state
  const [keyword, setKeyword] = useState("");
  const [agency, setAgency] = useState("");
  const [naicsCode, setNaicsCode] = useState("");
  const [selectedSetAsides, setSelectedSetAsides] = useState<Set<string>>(
    new Set()
  );
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [sortBy, setSortBy] = useState("response_deadline");
  const [sortOrder, setSortOrder] = useState("asc");

  // Data state
  const [opportunities, setOpportunities] = useState<
    OpportunityWithAnalysis[]
  >([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Facets state
  const [facets, setFacets] = useState<Facets | null>(null);
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Analyzing state
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Load facets on mount
  useEffect(() => {
    fetchFacets();
  }, []);

  // Auto-search on mount to show all results
  useEffect(() => {
    fetchResults(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchFacets() {
    setFacetsLoading(true);
    try {
      const res = await fetch("/api/govhound/opportunities/facets");
      if (!res.ok) throw new Error("Failed to fetch facets");
      const data = await res.json();
      setFacets(data);
    } catch (err) {
      console.error("Failed to load facets:", err);
    } finally {
      setFacetsLoading(false);
    }
  }

  const fetchResults = useCallback(
    async (p: number = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(ITEMS_PER_PAGE),
          sort: sortBy,
          order: sortOrder,
        });

        if (keyword.trim()) params.set("search", keyword.trim());
        if (naicsCode && naicsCode !== "all") params.set("naics", naicsCode);
        if (agency && agency !== "all") params.set("agency", agency);
        if (selectedSetAsides.size > 0) {
          params.set("set_aside_types", [...selectedSetAsides].join(","));
        }
        if (deadlineFrom) params.set("deadline_from", deadlineFrom);
        if (deadlineTo) params.set("deadline_to", deadlineTo);

        const res = await fetch(`/api/govhound/opportunities?${params}`);
        if (!res.ok) throw new Error("Failed to fetch opportunities");

        const data = await res.json();
        setOpportunities(data.opportunities || []);
        setTotal(data.total || 0);
        setPage(p);
        setHasSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        setLoading(false);
      }
    },
    [keyword, naicsCode, agency, selectedSetAsides, deadlineFrom, deadlineTo, sortBy, sortOrder]
  );

  function handleSearch() {
    fetchResults(1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  function toggleSetAside(value: string) {
    setSelectedSetAsides((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function clearAllFilters() {
    setKeyword("");
    setAgency("");
    setNaicsCode("");
    setSelectedSetAsides(new Set());
    setDeadlineFrom("");
    setDeadlineTo("");
    setSortBy("response_deadline");
    setSortOrder("asc");
  }

  function handleClearAndSearch() {
    clearAllFilters();
    // Need to fetch with cleared values -- use a timeout to let state update
    setTimeout(() => fetchResults(1), 0);
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
      await fetchResults(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzingId(null);
    }
  }

  const activeFilterCount = [
    keyword.trim(),
    agency && agency !== "all" ? agency : "",
    naicsCode && naicsCode !== "all" ? naicsCode : "",
    selectedSetAsides.size > 0 ? "set-aside" : "",
    deadlineFrom,
    deadlineTo,
  ].filter(Boolean).length;

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Build active filter summary badges
  const filterBadges: { label: string; onClear: () => void }[] = [];
  if (keyword.trim()) {
    filterBadges.push({
      label: `Keyword: "${keyword.trim()}"`,
      onClear: () => setKeyword(""),
    });
  }
  if (agency && agency !== "all") {
    filterBadges.push({
      label: `Agency: ${agency}`,
      onClear: () => setAgency(""),
    });
  }
  if (naicsCode && naicsCode !== "all") {
    filterBadges.push({
      label: `NAICS: ${naicsCode}`,
      onClear: () => setNaicsCode(""),
    });
  }
  if (selectedSetAsides.size > 0) {
    filterBadges.push({
      label: `Set-Aside: ${[...selectedSetAsides].join(", ")}`,
      onClear: () => setSelectedSetAsides(new Set()),
    });
  }
  if (deadlineFrom) {
    filterBadges.push({
      label: `Deadline from: ${deadlineFrom}`,
      onClear: () => setDeadlineFrom(""),
    });
  }
  if (deadlineTo) {
    filterBadges.push({
      label: `Deadline to: ${deadlineTo}`,
      onClear: () => setDeadlineTo(""),
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Database Explorer
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Browse and filter all opportunities stored locally. No SAM.gov API call required.
        </p>
      </div>

      {/* Filters Card */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-0">
                  {activeFilterCount} active
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAndSearch}
                  className="text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear all
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                {showFilters ? "Collapse" : "Expand"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="space-y-4 pt-0">
            {/* Keyword Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Full-text search across titles, descriptions, agencies..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 border-border placeholder:text-muted-foreground/70 focus:border-primary"
              />
              <Button
                onClick={handleSearch}
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Agency Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Agency</Label>
                {facetsLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={agency} onValueChange={setAgency}>
                    <SelectTrigger className="border-border text-sm">
                      <SelectValue placeholder="All agencies" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-60">
                      <SelectItem value="all">All agencies</SelectItem>
                      {(facets?.agencies || []).map((a) => (
                        <SelectItem key={a} value={a}>
                          <span className="truncate">{a}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* NAICS Code Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">NAICS Code</Label>
                {facetsLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={naicsCode} onValueChange={setNaicsCode}>
                    <SelectTrigger className="border-border text-sm">
                      <SelectValue placeholder="All NAICS codes" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-60">
                      <SelectItem value="all">All NAICS codes</SelectItem>
                      {(facets?.naics_codes || []).map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Sort */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sort By</Label>
                <div className="flex gap-1.5">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="border-border text-sm flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="response_deadline">Deadline</SelectItem>
                      <SelectItem value="posted_date">Posted Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="created_at">Date Added</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
                    }
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-accent px-3 shrink-0"
                    title={sortOrder === "asc" ? "Ascending" : "Descending"}
                  >
                    {sortOrder === "asc" ? "ASC" : "DESC"}
                  </Button>
                </div>
              </div>

              {/* Deadline From */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Deadline From</Label>
                <Input
                  type="date"
                  value={deadlineFrom}
                  onChange={(e) => setDeadlineFrom(e.target.value)}
                  className="border-border text-sm"
                />
              </div>

              {/* Deadline To */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Deadline To</Label>
                <Input
                  type="date"
                  value={deadlineTo}
                  onChange={(e) => setDeadlineTo(e.target.value)}
                  className="border-border text-sm"
                />
              </div>
            </div>

            {/* Set-Aside Checkboxes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Set-Aside Type</Label>
              {facetsLoading ? (
                <Skeleton className="h-8 w-full" />
              ) : (facets?.set_aside_types || []).length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {(facets?.set_aside_types || []).map((sa) => (
                    <label
                      key={sa}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    >
                      <Checkbox
                        checked={selectedSetAsides.has(sa)}
                        onCheckedChange={() => toggleSetAside(sa)}
                      />
                      <span>{sa}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/70">No set-aside types in database</p>
              )}
            </div>

            {/* Apply button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSearch}
                disabled={loading}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Apply Filters
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Active Filter Summary */}
      {filterBadges.length > 0 && !showFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filterBadges.map((fb, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="text-xs bg-accent text-foreground border-0 gap-1 pr-1"
            >
              {fb.label}
              <button
                onClick={() => {
                  fb.onClear();
                  // Re-search after clearing
                  setTimeout(() => fetchResults(1), 0);
                }}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base text-foreground">
            {hasSearched ? `${total.toLocaleString()} Results` : "Results"}
          </CardTitle>
          {total > 0 && (
            <span className="text-sm text-muted-foreground/70">
              Page {page} of {totalPages}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={<Database className="h-12 w-12" />}
              title={
                hasSearched
                  ? "No matching opportunities"
                  : "Loading opportunities..."
              }
              description={
                hasSearched
                  ? "Try adjusting your filters or clearing them to see all results."
                  : "Querying your local database..."
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="min-w-[280px] text-muted-foreground/70">
                        Title
                      </TableHead>
                      <TableHead className="text-muted-foreground/70">Agency</TableHead>
                      <TableHead className="text-muted-foreground/70">NAICS</TableHead>
                      <TableHead className="text-muted-foreground/70">Set-Aside</TableHead>
                      <TableHead className="text-muted-foreground/70">Deadline</TableHead>
                      <TableHead className="text-muted-foreground/70">Scores</TableHead>
                      <TableHead className="text-right text-muted-foreground/70">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunities.map((opp) => {
                      const analysis = Array.isArray(opp.opportunity_analysis)
                        ? opp.opportunity_analysis[0]
                        : opp.opportunity_analysis;

                      const deadlinePast =
                        opp.response_deadline &&
                        new Date(opp.response_deadline) < new Date();

                      return (
                        <TableRow
                          key={opp.id}
                          className="border-border hover:bg-accent transition-colors"
                        >
                          <TableCell>
                            <button
                              onClick={() => onSelectOpportunity?.(opp.id)}
                              className="font-medium text-foreground hover:text-primary hover:underline line-clamp-2 text-left"
                            >
                              {opp.title}
                            </button>
                            {opp.sol_number && (
                              <p className="mt-0.5 text-xs text-muted-foreground/70">
                                {opp.sol_number}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                            {opp.agency || "--"}
                          </TableCell>
                          <TableCell>
                            {opp.naics_code ? (
                              <Badge
                                variant="outline"
                                className="text-xs border-border text-muted-foreground/70"
                              >
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
                          <TableCell
                            className={`text-sm whitespace-nowrap ${
                              deadlinePast
                                ? "text-muted-foreground/50 line-through"
                                : "text-muted-foreground"
                            }`}
                          >
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
                            <div className="flex items-center justify-end gap-1">
                              {!analysis && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAnalyze(opp.id)}
                                  disabled={analyzingId === opp.id}
                                  className="text-yellow-500 hover:text-yellow-400 hover:bg-accent"
                                  title="Analyze with AI"
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
                                title="View details"
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
                    onClick={() => fetchResults(page - 1)}
                    disabled={page <= 1 || loading}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {/* Show page numbers for quick navigation */}
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (page <= 4) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = page - 3 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === page ? "default" : "ghost"}
                          size="sm"
                          onClick={() => fetchResults(pageNum)}
                          disabled={loading}
                          className={`w-8 h-8 p-0 ${
                            pageNum === page
                              ? "bg-primary text-white"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchResults(page + 1)}
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
    </div>
  );
}

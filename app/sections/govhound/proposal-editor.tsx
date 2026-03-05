"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Save,
  RefreshCw,
  FileText,
  Upload,
  ChevronRight,
  Check,
  File,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ProposalWithSections,
  ProposalSection,
  ProposalVolume,
  ProposalDocument,
  ProposalDocType,
  ProposalStatus,
} from "@/lib/govhound/types";
import {
  PROPOSAL_VOLUME_LABELS,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_DOC_TYPE_LABELS,
} from "@/lib/govhound/types";

interface TabProps {
  onSelectOpportunity?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
  onBack?: () => void;
}

export function ProposalEditorTab({ opportunityId, onNavigateTab, onBack }: TabProps & { opportunityId: string }) {
  const id = opportunityId;

  const [proposal, setProposal] = useState<ProposalWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ProposalDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [opportunityTitle, setOpportunityTitle] = useState("");

  const fetchProposal = useCallback(async () => {
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/proposal`);
      if (!res.ok) throw new Error("Failed to fetch proposal");
      const data = await res.json();
      setProposal(data.proposal);
      if (data.proposal?.proposal_sections?.length && !selectedSectionId) {
        setSelectedSectionId(data.proposal.proposal_sections[0].id);
        setEditContent(data.proposal.proposal_sections[0].content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  }, [id, selectedSectionId]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch {
      // Non-critical
    }
  }, [id]);

  useEffect(() => {
    fetchProposal();
    fetchDocuments();

    async function fetchTitle() {
      try {
        const res = await fetch(`/api/govhound/opportunities/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOpportunityTitle(data.title || "");
        }
      } catch {
        // Non-critical
      }
    }
    fetchTitle();
  }, [id, fetchProposal, fetchDocuments]);

  useEffect(() => {
    if (selectedSectionId && proposal?.proposal_sections) {
      const section = proposal.proposal_sections.find((s) => s.id === selectedSectionId);
      if (section) {
        setEditContent(section.content);
        setSaved(false);
      }
    }
  }, [selectedSectionId, proposal]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/proposal`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }
      setSelectedSectionId(null);
      await fetchProposal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proposal generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveSection() {
    if (!selectedSectionId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/proposal/sections/${selectedSectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      if (proposal) {
        const updated = { ...proposal };
        updated.proposal_sections = updated.proposal_sections.map((s) =>
          s.id === selectedSectionId ? { ...s, content: editContent, ai_generated: false } : s
        );
        setProposal(updated);
      }
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save section");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateSection(sectionId: string) {
    setRegenerating(sectionId);
    setError(null);
    try {
      const res = await fetch(`/api/govhound/opportunities/${id}/proposal/sections/${sectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Regeneration failed");
      }
      const data = await res.json();
      if (proposal) {
        const updated = { ...proposal };
        updated.proposal_sections = updated.proposal_sections.map((s) =>
          s.id === sectionId ? (data.section as ProposalSection) : s
        );
        setProposal(updated);
        if (selectedSectionId === sectionId) {
          setEditContent(data.section.content);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate section");
    } finally {
      setRegenerating(null);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", uploadDocType);
      if (proposal?.id) {
        formData.append("proposal_id", proposal.id);
      }

      const res = await fetch(`/api/govhound/opportunities/${id}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const [uploadDocType, setUploadDocType] = useState<ProposalDocType>("rfp");

  const sectionsByVolume: Record<ProposalVolume, ProposalSection[]> = {
    admin: [],
    technical: [],
    past_performance: [],
    cost: [],
  };

  if (proposal?.proposal_sections) {
    for (const section of proposal.proposal_sections) {
      sectionsByVolume[section.volume]?.push(section);
    }
  }

  const selectedSection = proposal?.proposal_sections?.find((s) => s.id === selectedSectionId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBack?.()}
            className="mb-2 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Opportunity
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Proposal Editor</h1>
          {opportunityTitle && <p className="text-sm text-muted-foreground/70 line-clamp-1">{opportunityTitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {proposal && (
            <Badge
              variant="outline"
              className={
                proposal.status === "draft" ? "border-yellow-500/40 text-yellow-500"
                  : proposal.status === "in_review" ? "border-primary/40 text-primary"
                    : proposal.status === "final" ? "border-green-500/40 text-green-500"
                      : proposal.status === "submitted" ? "border-green-500/40 text-green-500"
                        : "border-border text-muted-foreground"
              }
            >
              {PROPOSAL_STATUS_LABELS[proposal.status]}
            </Badge>
          )}
          <Button onClick={handleGenerate} disabled={generating} className="bg-yellow-500 hover:bg-yellow-400 text-black">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {proposal ? "Regenerate All" : "Generate Proposal"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6"><p className="text-destructive text-sm">{error}</p></CardContent>
        </Card>
      )}

      {generating && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Generating proposal sections...</p>
                <p className="text-xs text-muted-foreground/70">This may take a few minutes. Claude is writing 12 sections across 4 volumes.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!proposal && !generating ? (
        <Card className="border-border">
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/70" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">No Proposal Draft Yet</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Generate an AI-assisted proposal with sections covering all four standard federal volumes: Administrative, Technical, Past Performance, and Cost/Price.
                </p>
              </div>
              <Button onClick={handleGenerate} className="bg-yellow-500 hover:bg-yellow-400 text-black">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Proposal
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : proposal ? (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar - Section Navigation */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground">Sections</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(Object.entries(sectionsByVolume) as [ProposalVolume, ProposalSection[]][]).map(([volume, sections]) =>
                  sections.length > 0 ? (
                    <div key={volume}>
                      <div className="px-4 py-2 bg-card">
                        <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">{PROPOSAL_VOLUME_LABELS[volume]}</p>
                      </div>
                      {sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setSelectedSectionId(section.id)}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                            selectedSectionId === section.id
                              ? "bg-primary/20 text-primary border-l-2 border-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground border-l-2 border-transparent"
                          }`}
                        >
                          <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${selectedSectionId === section.id ? "rotate-90" : ""}`} />
                          <span className="truncate">{section.section_title}</span>
                          {section.ai_generated && <Sparkles className="h-3 w-3 text-yellow-500 shrink-0 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  ) : null
                )}
              </CardContent>
            </Card>

            {/* Documents Panel */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {documents.length > 0 && (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 text-sm rounded-md border border-border bg-card p-2">
                        <File className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-xs">{doc.file_name}</p>
                          <p className="text-muted-foreground/70 text-xs">{PROPOSAL_DOC_TYPE_LABELS[doc.doc_type as ProposalDocType]}</p>
                        </div>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary shrink-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                <Separator className="bg-border" />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Upload Document</Label>
                  <Select value={uploadDocType} onValueChange={(v) => setUploadDocType(v as ProposalDocType)}>
                    <SelectTrigger className="bg-card border-border text-foreground text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {Object.entries(PROPOSAL_DOC_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="bg-card border-border text-foreground text-xs h-8 file:text-muted-foreground file:bg-transparent file:border-0 file:text-xs"
                    />
                    {uploading && <Loader2 className="absolute right-2 top-1.5 h-4 w-4 animate-spin text-muted-foreground/70" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Editor */}
          <div className="lg:col-span-3">
            {selectedSection ? (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">{selectedSection.section_title}</CardTitle>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {PROPOSAL_VOLUME_LABELS[selectedSection.volume as ProposalVolume]}
                        {selectedSection.ai_generated && (
                          <span className="ml-2 inline-flex items-center gap-1 text-yellow-500">
                            <Sparkles className="h-3 w-3" />
                            AI Generated
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerateSection(selectedSection.id)}
                        disabled={regenerating === selectedSection.id}
                        className="border-border text-muted-foreground hover:text-yellow-500 hover:border-yellow-500/40 hover:bg-accent"
                      >
                        {regenerating === selectedSection.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
                        Regenerate
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveSection}
                        disabled={saving || editContent === selectedSection.content}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="mr-1 h-3.5 w-3.5" /> : <Save className="mr-1 h-3.5 w-3.5" />}
                        {saved ? "Saved" : "Save"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editContent}
                    onChange={(e) => { setEditContent(e.target.value); setSaved(false); }}
                    rows={30}
                    className="bg-card border-border text-foreground font-mono text-sm leading-relaxed placeholder:text-muted-foreground/70 resize-y min-h-[500px]"
                    placeholder="Section content..."
                  />
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Content is in Markdown format. Edit directly or use Regenerate to get a new AI-generated version.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border">
                <CardContent className="py-16">
                  <div className="text-center">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/70" />
                    <p className="text-sm text-muted-foreground mt-3">Select a section from the sidebar to begin editing.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

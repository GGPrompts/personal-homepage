"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Plus,
  Loader2,
  Building,
  Calendar,
  DollarSign,
  FileText,
  Trash2,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EmptyState } from "@/components/govhound/empty-state";
import type {
  PastContractWithRatings,
  ContractType,
  ContractStatus,
} from "@/lib/govhound/types";
import {
  CONTRACT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
} from "@/lib/govhound/types";

interface TabProps {
  onSelectOpportunity?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

interface ContractFormData {
  contract_number: string;
  task_order_number: string;
  agency: string;
  sub_agency: string;
  title: string;
  description: string;
  naics_code: string;
  contract_type: ContractType;
  total_value: string;
  annual_value: string;
  period_start: string;
  period_end: string;
  status: ContractStatus;
  place_of_performance: string;
  technologies: string;
  key_personnel: string;
}

const EMPTY_FORM: ContractFormData = {
  contract_number: "",
  task_order_number: "",
  agency: "",
  sub_agency: "",
  title: "",
  description: "",
  naics_code: "",
  contract_type: "firm_fixed",
  total_value: "",
  annual_value: "",
  period_start: "",
  period_end: "",
  status: "active",
  place_of_performance: "",
  technologies: "",
  key_personnel: "",
};

export function PastPerformanceTab({ onSelectOpportunity, onNavigateTab }: TabProps) {
  const [contracts, setContracts] = useState<PastContractWithRatings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractFormData>(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchContracts();
  }, []);

  async function fetchContracts() {
    try {
      setLoading(true);
      const res = await fetch("/api/govhound/past-contracts?limit=100");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setContracts(data.contracts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contracts");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(contract: PastContractWithRatings) {
    setEditingId(contract.id);
    setForm({
      contract_number: contract.contract_number,
      task_order_number: contract.task_order_number || "",
      agency: contract.agency,
      sub_agency: contract.sub_agency || "",
      title: contract.title,
      description: contract.description || "",
      naics_code: contract.naics_code || "",
      contract_type: contract.contract_type,
      total_value: contract.total_value?.toString() || "",
      annual_value: contract.annual_value?.toString() || "",
      period_start: contract.period_start || "",
      period_end: contract.period_end || "",
      status: contract.status,
      place_of_performance: contract.place_of_performance || "",
      technologies: (contract.technologies || []).join(", "),
      key_personnel: (contract.key_personnel || []).map((p) => `${p.name}:${p.role}`).join(", "),
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        contract_number: form.contract_number,
        task_order_number: form.task_order_number || null,
        agency: form.agency,
        sub_agency: form.sub_agency || null,
        title: form.title,
        description: form.description || null,
        naics_code: form.naics_code || null,
        contract_type: form.contract_type,
        total_value: form.total_value ? parseFloat(form.total_value) : null,
        annual_value: form.annual_value ? parseFloat(form.annual_value) : null,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        status: form.status,
        place_of_performance: form.place_of_performance || null,
        technologies: form.technologies ? form.technologies.split(",").map((t) => t.trim()).filter(Boolean) : [],
        key_personnel: form.key_personnel
          ? form.key_personnel.split(",").map((p) => { const [name, role] = p.split(":").map((s) => s.trim()); return { name: name || "", role: role || "" }; }).filter((p) => p.name)
          : [],
      };

      const url = editingId ? `/api/govhound/past-contracts/${editingId}` : "/api/govhound/past-contracts";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this contract?")) return;
    try {
      const res = await fetch(`/api/govhound/past-contracts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const filtered = contracts.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.agency.toLowerCase().includes(q) || c.contract_number.toLowerCase().includes(q);
    }
    return true;
  });

  const statusColor: Record<ContractStatus, string> = {
    active: "border-green-500/40 text-green-500",
    completed: "border-primary/40 text-primary",
    terminated: "border-destructive/40 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Past Performance</h1>
          <p className="text-muted-foreground">Track past contracts for proposal matching and competitive analysis.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editingId ? "Edit Contract" : "Add Past Contract"}</DialogTitle>
            </DialogHeader>
            <ContractForm form={form} setForm={setForm} onSubmit={handleSubmit} submitting={submitting} isEdit={!!editingId} />
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6"><p className="text-destructive text-sm">{error}</p></CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search contracts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs bg-card border-border text-foreground placeholder:text-muted-foreground/70"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-card border-border text-foreground">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No past contracts"
          description={searchQuery || filterStatus !== "all" ? "No contracts match your current filters." : "Add your past contracts to enable proposal matching."}
          action={
            !searchQuery && filterStatus === "all" ? (
              <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Contract
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((contract) => {
            const bestRating = contract.past_performance_ratings && contract.past_performance_ratings.length > 0
              ? contract.past_performance_ratings.reduce((best, r) => (r.overall_rating || 0) > (best.overall_rating || 0) ? r : best)
              : null;

            return (
              <Card key={contract.id} className="border-border transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColor[contract.status]}>{CONTRACT_STATUS_LABELS[contract.status]}</Badge>
                        <Badge variant="outline" className="border-border text-muted-foreground">{CONTRACT_TYPE_LABELS[contract.contract_type]}</Badge>
                        {contract.naics_code && <Badge variant="outline" className="border-border text-muted-foreground">NAICS: {contract.naics_code}</Badge>}
                      </div>
                      <h3 className="font-medium text-foreground">{contract.title}</h3>
                      <p className="text-sm text-muted-foreground/70 font-mono">{contract.contract_number}{contract.task_order_number && ` / TO: ${contract.task_order_number}`}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Building className="h-3 w-3 text-muted-foreground/70" />{contract.agency}{contract.sub_agency && ` - ${contract.sub_agency}`}</span>
                        {(contract.period_start || contract.period_end) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground/70" />
                            {contract.period_start ? format(new Date(contract.period_start), "MMM yyyy") : "?"} - {contract.period_end ? format(new Date(contract.period_end), "MMM yyyy") : "Present"}
                          </span>
                        )}
                        {contract.total_value && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-green-500" />${contract.total_value.toLocaleString()}</span>}
                      </div>
                      {contract.technologies && contract.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {contract.technologies.map((tech, i) => (
                            <Badge key={i} variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">{tech}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {bestRating && bestRating.overall_rating && (
                        <div className="text-center rounded-lg border border-border bg-card px-3 py-1.5">
                          <p className="text-xs text-muted-foreground/70">Rating</p>
                          <p className="text-lg font-bold text-foreground">{bestRating.overall_rating}/5</p>
                        </div>
                      )}
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(contract)} className="text-muted-foreground hover:text-primary hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(contract.id)} className="text-muted-foreground hover:text-destructive hover:bg-accent"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContractForm({ form, setForm, onSubmit, submitting, isEdit }: {
  form: ContractFormData;
  setForm: React.Dispatch<React.SetStateAction<ContractFormData>>;
  onSubmit: () => void;
  submitting: boolean;
  isEdit: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Title *</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="IT Modernization Support" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Contract Number *</Label>
          <Input value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} placeholder="GS-35F-0000X" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Agency *</Label>
          <Input value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} placeholder="Department of Defense" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Sub-Agency</Label>
          <Input value={form.sub_agency} onChange={(e) => setForm({ ...form, sub_agency: e.target.value })} placeholder="DISA" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Task Order</Label>
          <Input value={form.task_order_number} onChange={(e) => setForm({ ...form, task_order_number: e.target.value })} className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">NAICS Code</Label>
          <Input value={form.naics_code} onChange={(e) => setForm({ ...form, naics_code: e.target.value })} placeholder="541512" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Place of Performance</Label>
          <Input value={form.place_of_performance} onChange={(e) => setForm({ ...form, place_of_performance: e.target.value })} placeholder="Washington, DC" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Contract Type</Label>
          <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v as ContractType })}>
            <SelectTrigger className="bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ContractStatus })}>
            <SelectTrigger className="bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Total Value ($)</Label>
          <Input type="number" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })} placeholder="5000000" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Annual Value ($)</Label>
          <Input type="number" value={form.annual_value} onChange={(e) => setForm({ ...form, annual_value: e.target.value })} placeholder="1000000" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Period Start</Label>
          <Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} className="bg-card border-border text-foreground" />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Period End</Label>
          <Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className="bg-card border-border text-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the work performed..." className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Technologies (comma-separated)</Label>
        <Input value={form.technologies} onChange={(e) => setForm({ ...form, technologies: e.target.value })} placeholder="AWS, Python, React, PostgreSQL" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Key Personnel (name:role, comma-separated)</Label>
        <Input value={form.key_personnel} onChange={(e) => setForm({ ...form, key_personnel: e.target.value })} placeholder="Jane Doe:PM, John Smith:Lead Engineer" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" />
      </div>
      <Button onClick={onSubmit} disabled={submitting || !form.title || !form.contract_number || !form.agency} className="w-full bg-primary hover:bg-primary/90 text-white">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? "Update Contract" : "Add Contract"}
      </Button>
    </div>
  );
}

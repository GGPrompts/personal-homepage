"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Calculator,
  Loader2,
  Save,
  X,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type {
  LaborCategory,
  IndirectRate,
  IndirectRateType,
  BOETemplate,
  BOETemplateElement,
  WrapRateBreakdown,
} from "@/lib/govhound/types";
import { INDIRECT_RATE_TYPE_LABELS } from "@/lib/govhound/types";
import { calculateWrapRate } from "@/lib/govhound/pricing-calculator";

interface TabProps {
  onSelectOpportunity?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export function PricingTab({ onSelectOpportunity, onNavigateTab }: TabProps) {
  const [showWrapCalculator, setShowWrapCalculator] = useState(false);

  if (showWrapCalculator) {
    return <WrapCalculatorView onBack={() => setShowWrapCalculator(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pricing Tools</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage labor rates, indirect rates, and BOE templates for cost volumes</p>
        </div>
        <Button onClick={() => setShowWrapCalculator(true)} className="bg-primary hover:bg-primary/90 text-white">
          <Calculator className="mr-2 h-4 w-4" />
          Wrap Rate Calculator
        </Button>
      </div>

      <Tabs defaultValue="labor" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="labor" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <DollarSign className="mr-1 h-4 w-4" />
            Labor Rate Card
          </TabsTrigger>
          <TabsTrigger value="indirect" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Calculator className="mr-1 h-4 w-4" />
            Indirect Rates
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Save className="mr-1 h-4 w-4" />
            BOE Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="labor"><LaborRateTab /></TabsContent>
        <TabsContent value="indirect"><IndirectRateTab /></TabsContent>
        <TabsContent value="templates"><BOETemplateTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// --- Wrap Calculator View (merged from wrap-calculator/page.tsx) ---

function WrapCalculatorView({ onBack }: { onBack: () => void }) {
  const [categories, setCategories] = useState<LaborCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [baseRate, setBaseRate] = useState<number>(0);
  const [fringePercent, setFringePercent] = useState<number>(0);
  const [overheadPercent, setOverheadPercent] = useState<number>(0);
  const [gsaPercent, setGsaPercent] = useState<number>(0);
  const [feePercent, setFeePercent] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<WrapRateBreakdown | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, rateRes] = await Promise.all([
        fetch("/api/govhound/pricing/labor-rates"),
        fetch("/api/govhound/pricing/indirect-rates"),
      ]);
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.labor_categories || []);
      }
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        const rates = (rateData.indirect_rates || []) as { rate_type: string; percentage: number }[];
        for (const rate of rates) {
          const pct = Number(rate.percentage);
          switch (rate.rate_type) {
            case "fringe": setFringePercent(pct); break;
            case "overhead": setOverheadPercent(pct); break;
            case "gsa": setGsaPercent(pct); break;
            case "fee": setFeePercent(pct); break;
          }
        }
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (baseRate > 0) {
      const result = calculateWrapRate(baseRate, fringePercent, overheadPercent, gsaPercent, feePercent);
      setBreakdown(result);
    } else {
      setBreakdown(null);
    }
  }, [baseRate, fringePercent, overheadPercent, gsaPercent, feePercent]);

  function handleCategorySelect(categoryId: string) {
    setSelectedCategory(categoryId);
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      const rate = Number(cat.gsa_rate) || Number(cat.site_rate) || Number(cat.remote_rate) || 0;
      setBaseRate(rate);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground hover:bg-accent">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Pricing
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Wrap Rate Calculator</h1>
          <p className="text-sm text-muted-foreground mt-1">Calculate fully burdened rates from base labor rates and indirect percentages</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <DollarSign className="h-4 w-4 text-primary" />
              Rate Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {categories.length > 0 && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Quick-fill from Labor Category</Label>
                <Select value={selectedCategory} onValueChange={handleCategorySelect}>
                  <SelectTrigger className="border-border"><SelectValue placeholder="Select a category..." /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.category_name} ({cat.abbreviation})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Separator className="bg-border" />
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Base Labor Rate ($/hr)</Label>
              <Input type="number" step="0.01" value={baseRate || ""} onChange={(e) => setBaseRate(parseFloat(e.target.value) || 0)} className="border-border text-lg font-mono" placeholder="0.00" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Fringe (%)</Label>
                <Input type="number" step="0.01" value={fringePercent || ""} onChange={(e) => setFringePercent(parseFloat(e.target.value) || 0)} className="border-border font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Overhead (%)</Label>
                <Input type="number" step="0.01" value={overheadPercent || ""} onChange={(e) => setOverheadPercent(parseFloat(e.target.value) || 0)} className="border-border font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">G&A / GSA (%)</Label>
                <Input type="number" step="0.01" value={gsaPercent || ""} onChange={(e) => setGsaPercent(parseFloat(e.target.value) || 0)} className="border-border font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Profit/Fee (%)</Label>
                <Input type="number" step="0.01" value={feePercent || ""} onChange={(e) => setFeePercent(parseFloat(e.target.value) || 0)} className="border-border font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calculator className="h-4 w-4 text-yellow-500" />
              Rate Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!breakdown || baseRate <= 0 ? (
              <div className="text-center py-12">
                <Calculator className="mx-auto mb-3 h-8 w-8 text-muted-foreground/70" />
                <p className="text-sm text-muted-foreground">Enter a base rate to see the breakdown.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <WaterfallRow label="Base Labor Rate" amount={breakdown.base_rate} isBase />
                  <WaterfallRow label={`Fringe (${fringePercent}%)`} amount={breakdown.fringe_amount} />
                  <WaterfallRow label={`Overhead (${overheadPercent}%)`} amount={breakdown.overhead_amount} />
                  <WaterfallRow label={`G&A / GSA (${gsaPercent}%)`} amount={breakdown.gsa_amount} />
                  <WaterfallRow label={`Profit/Fee (${feePercent}%)`} amount={breakdown.fee_amount} />
                </div>
                <Separator className="bg-border" />
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Fully Burdened Rate</span>
                    <span className="text-2xl font-bold text-green-500 font-mono">${breakdown.fully_burdened_rate.toFixed(2)}/hr</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground/70">Wrap Rate Multiplier</span>
                    <span className="text-sm font-mono text-muted-foreground">{breakdown.wrap_rate_multiplier.toFixed(2)}x</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
                  <span className="font-mono">${breakdown.base_rate.toFixed(2)}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-mono text-muted-foreground">{breakdown.wrap_rate_multiplier.toFixed(2)}x</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-mono text-green-500">${breakdown.fully_burdened_rate.toFixed(2)}</span>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground/70 mb-2">Annual Cost Estimate (2,080 hrs)</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground/70 text-xs">Direct</p>
                      <p className="text-foreground font-mono">${(breakdown.base_rate * 2080).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground/70 text-xs">Burdened</p>
                      <p className="text-green-500 font-mono">${(breakdown.fully_burdened_rate * 2080).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WaterfallRow({ label, amount, isBase = false }: { label: string; amount: number; isBase?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-card px-3 py-2">
      <span className={`text-sm ${isBase ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className={`font-mono text-sm ${isBase ? "text-foreground" : "text-primary"}`}>{isBase ? "" : "+ "}${amount.toFixed(2)}</span>
    </div>
  );
}

// --- Labor Rate Card Tab ---

function LaborRateTab() {
  const [categories, setCategories] = useState<LaborCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LaborCategory | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/govhound/pricing/labor-rates");
      if (res.ok) { const data = await res.json(); setCategories(data.labor_categories || []); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  async function handleSave(formData: FormData) {
    setSaving(true);
    try {
      const payload = {
        id: editing?.id,
        category_name: formData.get("category_name") as string,
        abbreviation: formData.get("abbreviation") as string,
        gsa_rate: parseFloat(formData.get("gsa_rate") as string) || null,
        site_rate: parseFloat(formData.get("site_rate") as string) || null,
        remote_rate: parseFloat(formData.get("remote_rate") as string) || null,
        min_education: formData.get("min_education") as string || null,
        min_years_experience: parseInt(formData.get("min_years_experience") as string) || null,
        description: formData.get("description") as string || null,
      };
      const res = await fetch("/api/govhound/pricing/labor-rates", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save");
      setDialogOpen(false); setEditing(null); fetchCategories();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try { await fetch(`/api/govhound/pricing/labor-rates?id=${id}`, { method: "DELETE" }); fetchCategories(); } catch { /* ignore */ }
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Labor Rate Card</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white"><Plus className="mr-1 h-4 w-4" />Add Category</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle className="text-foreground">{editing ? "Edit" : "Add"} Labor Category</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">Category Name</Label><Input name="category_name" defaultValue={editing?.category_name || ""} required className="border-border" /></div>
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">Abbreviation</Label><Input name="abbreviation" defaultValue={editing?.abbreviation || ""} required className="border-border" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">GSA Rate ($/hr)</Label><Input name="gsa_rate" type="number" step="0.01" defaultValue={editing?.gsa_rate ?? ""} className="border-border" /></div>
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">Site Rate ($/hr)</Label><Input name="site_rate" type="number" step="0.01" defaultValue={editing?.site_rate ?? ""} className="border-border" /></div>
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">Remote Rate ($/hr)</Label><Input name="remote_rate" type="number" step="0.01" defaultValue={editing?.remote_rate ?? ""} className="border-border" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">Min Education</Label><Input name="min_education" defaultValue={editing?.min_education || ""} placeholder="e.g. Bachelor's" className="border-border placeholder:text-muted-foreground/70" /></div>
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">Min Years Experience</Label><Input name="min_years_experience" type="number" defaultValue={editing?.min_years_experience ?? ""} className="border-border" /></div>
              </div>
              <div className="space-y-1"><Label className="text-muted-foreground text-xs">Description</Label><Textarea name="description" defaultValue={editing?.description || ""} rows={2} className="border-border placeholder:text-muted-foreground/70" /></div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground hover:bg-accent">Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-white">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" /></div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12"><DollarSign className="mx-auto mb-3 h-8 w-8 text-muted-foreground/70" /><p className="text-sm text-muted-foreground">No labor categories yet.</p><p className="text-xs text-muted-foreground/70 mt-1">Add your first labor category to build rate cards.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-border">
                <TableHead className="text-muted-foreground/70">Category</TableHead><TableHead className="text-muted-foreground/70">Abbrev</TableHead><TableHead className="text-muted-foreground/70 text-right">GSA Rate</TableHead><TableHead className="text-muted-foreground/70 text-right">Site Rate</TableHead><TableHead className="text-muted-foreground/70 text-right">Remote Rate</TableHead><TableHead className="text-muted-foreground/70">Min Edu</TableHead><TableHead className="text-muted-foreground/70 text-right">Min Yrs</TableHead><TableHead className="text-muted-foreground/70 w-20"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id} className="border-border">
                    <TableCell className="text-foreground font-medium">{cat.category_name}</TableCell>
                    <TableCell><Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">{cat.abbreviation}</Badge></TableCell>
                    <TableCell className="text-right text-foreground font-mono">{cat.gsa_rate != null ? `$${Number(cat.gsa_rate).toFixed(2)}` : "--"}</TableCell>
                    <TableCell className="text-right text-foreground font-mono">{cat.site_rate != null ? `$${Number(cat.site_rate).toFixed(2)}` : "--"}</TableCell>
                    <TableCell className="text-right text-foreground font-mono">{cat.remote_rate != null ? `$${Number(cat.remote_rate).toFixed(2)}` : "--"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{cat.min_education || "--"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{cat.min_years_experience ?? "--"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(cat); setDialogOpen(true); }} className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-foreground hover:bg-accent"><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)} className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-destructive hover:bg-accent"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Indirect Rate Tab ---

function IndirectRateTab() {
  const [rates, setRates] = useState<IndirectRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IndirectRate | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRates = useCallback(async () => {
    try { const res = await fetch("/api/govhound/pricing/indirect-rates"); if (res.ok) { const data = await res.json(); setRates(data.indirect_rates || []); } } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  async function handleSave(formData: FormData) {
    setSaving(true);
    try {
      const payload = { id: editing?.id, rate_type: formData.get("rate_type") as IndirectRateType, rate_name: formData.get("rate_name") as string, percentage: parseFloat(formData.get("percentage") as string), effective_date: formData.get("effective_date") as string || null, notes: formData.get("notes") as string || null };
      const res = await fetch("/api/govhound/pricing/indirect-rates", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save");
      setDialogOpen(false); setEditing(null); fetchRates();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try { await fetch(`/api/govhound/pricing/indirect-rates?id=${id}`, { method: "DELETE" }); fetchRates(); } catch { /* ignore */ }
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Indirect Rates</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
          <DialogTrigger asChild><Button size="sm" className="bg-primary hover:bg-primary/90 text-white"><Plus className="mr-1 h-4 w-4" />Add Rate</Button></DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle className="text-foreground">{editing ? "Edit" : "Add"} Indirect Rate</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Rate Type</Label>
                <Select name="rate_type" defaultValue={editing?.rate_type || "fringe"}>
                  <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">{Object.entries(INDIRECT_RATE_TYPE_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-muted-foreground text-xs">Rate Name</Label><Input name="rate_name" defaultValue={editing?.rate_name || ""} required className="border-border" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">Percentage (%)</Label><Input name="percentage" type="number" step="0.01" defaultValue={editing?.percentage ?? ""} required className="border-border" /></div>
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">Effective Date</Label><Input name="effective_date" type="date" defaultValue={editing?.effective_date || ""} className="border-border" /></div>
              </div>
              <div className="space-y-1"><Label className="text-muted-foreground text-xs">Notes</Label><Textarea name="notes" defaultValue={editing?.notes || ""} rows={2} className="border-border placeholder:text-muted-foreground/70" /></div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground hover:bg-accent">Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-white">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" /></div>
        ) : rates.length === 0 ? (
          <div className="text-center py-12"><Calculator className="mx-auto mb-3 h-8 w-8 text-muted-foreground/70" /><p className="text-sm text-muted-foreground">No indirect rates configured.</p><p className="text-xs text-muted-foreground/70 mt-1">Add fringe, overhead, G&A, and fee rates to calculate burdened rates.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-border">
                <TableHead className="text-muted-foreground/70">Type</TableHead><TableHead className="text-muted-foreground/70">Name</TableHead><TableHead className="text-muted-foreground/70 text-right">Percentage</TableHead><TableHead className="text-muted-foreground/70">Effective Date</TableHead><TableHead className="text-muted-foreground/70">Notes</TableHead><TableHead className="text-muted-foreground/70 w-20"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id} className="border-border">
                    <TableCell><Badge variant="outline" className="border-primary/30 text-primary text-xs">{INDIRECT_RATE_TYPE_LABELS[rate.rate_type]}</Badge></TableCell>
                    <TableCell className="text-foreground font-medium">{rate.rate_name}</TableCell>
                    <TableCell className="text-right text-foreground font-mono">{Number(rate.percentage).toFixed(2)}%</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{rate.effective_date || "--"}</TableCell>
                    <TableCell className="text-muted-foreground/70 text-sm max-w-[200px] truncate">{rate.notes || "--"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(rate); setDialogOpen(true); }} className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-foreground hover:bg-accent"><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(rate.id)} className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-destructive hover:bg-accent"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- BOE Template Tab ---

function BOETemplateTab() {
  const [templates, setTemplates] = useState<BOETemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newElements, setNewElements] = useState<BOETemplateElement[]>([{ wbs_id: "1.0", title: "", default_hours: 0, default_category_abbreviation: "" }]);

  const fetchTemplates = useCallback(async () => {
    try { const res = await fetch("/api/govhound/pricing/boe-templates"); if (res.ok) { const data = await res.json(); setTemplates(data.templates || []); } } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  function addElement() { const nextNum = newElements.length + 1; setNewElements([...newElements, { wbs_id: `${nextNum}.0`, title: "", default_hours: 0, default_category_abbreviation: "" }]); }
  function removeElement(index: number) { setNewElements(newElements.filter((_, i) => i !== index)); }
  function updateElement(index: number, field: keyof BOETemplateElement, value: string | number) { const updated = [...newElements]; updated[index] = { ...updated[index], [field]: value }; setNewElements(updated); }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/govhound/pricing/boe-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, description: newDescription || null, structure: newElements.filter((el) => el.title.trim()) }) });
      if (!res.ok) throw new Error("Failed to save");
      setDialogOpen(false); setNewName(""); setNewDescription(""); setNewElements([{ wbs_id: "1.0", title: "", default_hours: 0, default_category_abbreviation: "" }]); fetchTemplates();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try { await fetch(`/api/govhound/pricing/boe-templates?id=${id}`, { method: "DELETE" }); fetchTemplates(); } catch { /* ignore */ }
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">BOE Templates</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-primary hover:bg-primary/90 text-white"><Plus className="mr-1 h-4 w-4" />New Template</Button></DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-foreground">Create BOE Template</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">Template Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} required className="border-border" /></div>
                <div className="space-y-1"><Label className="text-muted-foreground text-xs">Description</Label><Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="border-border" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-muted-foreground text-xs">WBS Elements</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addElement} className="h-7 text-primary hover:text-primary hover:bg-accent"><Plus className="mr-1 h-3 w-3" />Add Element</Button>
                </div>
                <div className="space-y-2">
                  {newElements.map((el, i) => (
                    <div key={i} className="grid grid-cols-[80px_1fr_100px_120px_32px] gap-2 items-center">
                      <Input value={el.wbs_id} onChange={(e) => updateElement(i, "wbs_id", e.target.value)} placeholder="WBS" className="border-border font-mono text-xs" />
                      <Input value={el.title} onChange={(e) => updateElement(i, "title", e.target.value)} placeholder="Task title" className="border-border text-sm" />
                      <Input type="number" value={el.default_hours || ""} onChange={(e) => updateElement(i, "default_hours", parseInt(e.target.value) || 0)} placeholder="Hours" className="border-border text-sm" />
                      <Input value={el.default_category_abbreviation} onChange={(e) => updateElement(i, "default_category_abbreviation", e.target.value)} placeholder="Cat abbrev" className="border-border text-sm" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeElement(i)} className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-destructive hover:bg-accent"><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-accent">Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !newName.trim()} className="bg-primary hover:bg-primary/90 text-white">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Template</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" /></div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12"><Save className="mx-auto mb-3 h-8 w-8 text-muted-foreground/70" /><p className="text-sm text-muted-foreground">No BOE templates yet.</p><p className="text-xs text-muted-foreground/70 mt-1">Create reusable WBS templates to speed up cost estimates.</p></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((template) => {
              const elements = (template.structure || []) as BOETemplateElement[];
              return (
                <div key={template.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-foreground">{template.name}</h4>
                      {template.description && <p className="text-xs text-muted-foreground/70 mt-0.5">{template.description}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)} className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-destructive hover:bg-accent shrink-0"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <div className="space-y-1">
                    {elements.slice(0, 5).map((el, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground/70 font-mono w-10">{el.wbs_id}</span>
                        <span className="text-muted-foreground flex-1">{el.title}</span>
                        <span className="text-muted-foreground/70">{el.default_hours}h</span>
                        <Badge variant="outline" className="border-border text-muted-foreground/70 text-xs py-0">{el.default_category_abbreviation}</Badge>
                      </div>
                    ))}
                    {elements.length > 5 && <p className="text-xs text-muted-foreground/70">+{elements.length - 5} more elements</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign,
  Calculator,
  Loader2,
  Save,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
  OpportunityPricing,
  LaborCategory,
  IndirectRate,
  BOEWBSItem,
  PriceRange,
} from "@/lib/govhound/types";
import { calculateBOE } from "@/lib/govhound/pricing-calculator";

interface PricingPanelProps {
  opportunityId: string;
  priceRange?: PriceRange | null;
}

export function PricingPanel({ opportunityId, priceRange }: PricingPanelProps) {
  const [pricing, setPricing] = useState<OpportunityPricing | null>(null);
  const [categories, setCategories] = useState<LaborCategory[]>([]);
  const [indirectRates, setIndirectRates] = useState<IndirectRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // BOE line items being edited
  const [lines, setLines] = useState<BOEWBSItem[]>([]);
  const [odcs, setOdcs] = useState<number>(0);
  const [subcontractor, setSubcontractor] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [pricingRes, catRes, rateRes] = await Promise.all([
        fetch(`/api/opportunities/${opportunityId}/pricing`),
        fetch("/api/pricing/labor-rates"),
        fetch("/api/pricing/indirect-rates"),
      ]);

      if (pricingRes.ok) {
        const data = await pricingRes.json();
        if (data.pricing) {
          setPricing(data.pricing);
          setLines(data.pricing.boe_data || []);
          setOdcs(Number(data.pricing.total_odcs) || 0);
          setSubcontractor(Number(data.pricing.total_subcontractor) || 0);
          setNotes(data.pricing.notes || "");
        }
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.labor_categories || []);
      }

      if (rateRes.ok) {
        const rateData = await rateRes.json();
        setIndirectRates(rateData.indirect_rates || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function addLine() {
    const nextWbs = `${lines.length + 1}.0`;
    setLines([
      ...lines,
      {
        wbs_id: nextWbs,
        title: "",
        labor_category_id: "",
        labor_category_name: "",
        hours: 0,
        rate: 0,
        extended_cost: 0,
      },
    ]);
  }

  function updateLine(index: number, updates: Partial<BOEWBSItem>) {
    const updated = [...lines];
    updated[index] = { ...updated[index], ...updates };

    // If category changed, fill in name and rate
    if (updates.labor_category_id) {
      const cat = categories.find((c) => c.id === updates.labor_category_id);
      if (cat) {
        updated[index].labor_category_name = cat.category_name;
        updated[index].rate = Number(cat.gsa_rate) || Number(cat.site_rate) || Number(cat.remote_rate) || 0;
      }
    }

    // Recalculate extended cost
    updated[index].extended_cost = Math.round(updated[index].hours * updated[index].rate * 100) / 100;

    setLines(updated);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Calculate with indirect rates
      const boeResult = calculateBOE(lines, categories, indirectRates);

      const totalDirectLabor = boeResult.totalDirectLabor;
      const totalIndirect = boeResult.totalIndirect;
      const totalPrice = Math.round((totalDirectLabor + totalIndirect + odcs + subcontractor) * 100) / 100;

      const res = await fetch(`/api/opportunities/${opportunityId}/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boe_data: boeResult.lines,
          total_direct_labor: totalDirectLabor,
          total_odcs: odcs,
          total_subcontractor: subcontractor,
          total_indirect: totalIndirect,
          total_price: totalPrice,
          notes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPricing(data.pricing);
        setLines(data.pricing.boe_data || []);
        setEditing(false);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="border-[hsla(210,40%,60%,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-text-primary">
            <DollarSign className="h-4 w-4 text-green-success" />
            Pricing / BOE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Summary view (not editing)
  if (pricing && !editing) {
    return (
      <Card className="border-[hsla(210,40%,60%,0.12)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-text-primary">
            <DollarSign className="h-4 w-4 text-green-success" />
            Pricing / BOE
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-blue-bright hover:text-blue-vivid hover:bg-bg-surface-hover">
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <SummaryRow label="Direct Labor" value={Number(pricing.total_direct_labor)} />
            <SummaryRow label="Indirect Costs" value={Number(pricing.total_indirect)} />
            <SummaryRow label="ODCs" value={Number(pricing.total_odcs)} />
            <SummaryRow label="Subcontractor" value={Number(pricing.total_subcontractor)} />
          </div>

          <Separator className="bg-[hsla(210,40%,60%,0.12)]" />

          <div className="flex items-center justify-between rounded-md bg-green-success/10 px-3 py-2">
            <span className="text-sm font-medium text-text-primary">Total Price</span>
            <span className="text-lg font-bold text-green-success font-mono">
              ${Number(pricing.total_price).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Market range indicator */}
          {priceRange && priceRange.count > 0 && (
            <MarketRangeIndicator totalPrice={Number(pricing.total_price)} priceRange={priceRange} />
          )}

          {pricing.notes && (
            <p className="text-xs text-text-tertiary mt-2">{pricing.notes}</p>
          )}

          <div className="text-xs text-text-tertiary">
            {(pricing.boe_data || []).length} WBS line items
          </div>

          <Link href="/pricing/wrap-calculator">
            <Button variant="ghost" size="sm" className="w-full mt-1 text-blue-bright hover:text-blue-vivid hover:bg-bg-surface-hover">
              <Calculator className="mr-1 h-3 w-3" />
              Open Wrap Calculator
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Edit/Create view
  return (
    <Card className="border-[hsla(210,40%,60%,0.12)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base text-text-primary">
          <DollarSign className="h-4 w-4 text-green-success" />
          {pricing ? "Edit Pricing" : "Build BOE"}
        </CardTitle>
        <div className="flex gap-1">
          {pricing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover">
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-4">
            <DollarSign className="mx-auto mb-2 h-6 w-6 text-text-tertiary" />
            <p className="text-sm text-text-secondary">No labor categories set up.</p>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="mt-2 text-blue-bright hover:text-blue-vivid hover:bg-bg-surface-hover">
                Set Up Rate Card
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* WBS Lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-text-secondary text-xs">WBS Line Items</Label>
                <Button variant="ghost" size="sm" onClick={addLine} className="h-6 text-xs text-blue-bright hover:text-blue-vivid hover:bg-bg-surface-hover">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Line
                </Button>
              </div>

              {lines.map((line, i) => (
                <div key={i} className="rounded-md border border-[hsla(210,40%,60%,0.12)] bg-bg-surface p-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={line.wbs_id}
                      onChange={(e) => updateLine(i, { wbs_id: e.target.value })}
                      className="w-16 bg-bg-base border-[hsla(210,40%,60%,0.2)] text-text-primary font-mono text-xs h-7"
                      placeholder="WBS"
                    />
                    <Input
                      value={line.title}
                      onChange={(e) => updateLine(i, { title: e.target.value })}
                      className="flex-1 bg-bg-base border-[hsla(210,40%,60%,0.2)] text-text-primary text-xs h-7"
                      placeholder="Task"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeLine(i)} className="h-6 w-6 p-0 text-text-tertiary hover:text-red-alert hover:bg-bg-surface-hover shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={line.labor_category_id} onValueChange={(v) => updateLine(i, { labor_category_id: v })}>
                      <SelectTrigger className="bg-bg-base border-[hsla(210,40%,60%,0.2)] text-text-primary text-xs h-7">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-[hsla(210,40%,60%,0.2)]">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="text-xs">
                            {cat.abbreviation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={line.hours || ""}
                      onChange={(e) => updateLine(i, { hours: parseInt(e.target.value) || 0 })}
                      className="bg-bg-base border-[hsla(210,40%,60%,0.2)] text-text-primary text-xs h-7"
                      placeholder="Hours"
                    />
                    <div className="text-right text-xs font-mono text-text-secondary leading-7">
                      ${line.extended_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="bg-[hsla(210,40%,60%,0.12)]" />

            {/* ODCs & Sub */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-text-secondary text-xs">ODCs ($)</Label>
                <Input
                  type="number"
                  value={odcs || ""}
                  onChange={(e) => setOdcs(parseFloat(e.target.value) || 0)}
                  className="bg-bg-surface border-[hsla(210,40%,60%,0.2)] text-text-primary text-xs h-7"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-text-secondary text-xs">Subcontractor ($)</Label>
                <Input
                  type="number"
                  value={subcontractor || ""}
                  onChange={(e) => setSubcontractor(parseFloat(e.target.value) || 0)}
                  className="bg-bg-surface border-[hsla(210,40%,60%,0.2)] text-text-primary text-xs h-7"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-text-secondary text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="bg-bg-surface border-[hsla(210,40%,60%,0.2)] text-text-primary text-xs placeholder:text-text-tertiary"
                placeholder="Pricing assumptions, exclusions..."
              />
            </div>

            {/* Market range indicator */}
            {priceRange && priceRange.count > 0 && (
              <MarketRangeIndicator
                totalPrice={lines.reduce((sum, l) => sum + l.extended_cost, 0) + odcs + subcontractor}
                priceRange={priceRange}
              />
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-vivid hover:bg-blue-bright text-white">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Pricing
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary font-mono">
        ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}

function MarketRangeIndicator({ totalPrice, priceRange }: { totalPrice: number; priceRange: PriceRange }) {
  // Determine position within market range
  let positionLabel = "Within market range";
  let colorClass = "text-green-success border-green-success/30 bg-green-success/5";

  if (totalPrice < priceRange.min) {
    positionLabel = "Below market range";
    colorClass = "text-blue-bright border-blue-vivid/30 bg-blue-vivid/5";
  } else if (totalPrice > priceRange.max) {
    positionLabel = "Above market range";
    colorClass = "text-gold-star border-gold-star/30 bg-gold-star/5";
  }

  return (
    <div className={`rounded-md border p-2 ${colorClass}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <TrendingUp className="h-3 w-3" />
        <span className="text-xs font-medium">{positionLabel}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-tertiary font-mono">
          ${priceRange.min.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span className="text-text-tertiary">-</span>
        <span className="text-text-tertiary font-mono">
          ${priceRange.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>
      <p className="text-xs text-text-tertiary mt-1">
        Median: ${priceRange.median.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({priceRange.count} awards)
      </p>
    </div>
  );
}

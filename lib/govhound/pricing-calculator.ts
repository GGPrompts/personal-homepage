import type {
  LaborCategory,
  IndirectRate,
  BOEWBSItem,
  WrapRateBreakdown,
  CostSummary,
  OpportunityPricing,
  IndirectRateType,
} from "./types";

/**
 * Calculate a fully-burdened (wrapped) rate from a base rate and indirect percentages.
 * The standard federal cost accounting approach:
 *   base + fringe -> subtotal + overhead -> subtotal + G&A -> subtotal + fee
 */
export function calculateWrapRate(
  baseRate: number,
  fringePercent: number,
  overheadPercent: number,
  gsaPercent: number,
  feePercent: number
): WrapRateBreakdown {
  const fringeAmount = baseRate * (fringePercent / 100);
  const afterFringe = baseRate + fringeAmount;

  const overheadAmount = afterFringe * (overheadPercent / 100);
  const afterOverhead = afterFringe + overheadAmount;

  const gsaAmount = afterOverhead * (gsaPercent / 100);
  const afterGsa = afterOverhead + gsaAmount;

  const feeAmount = afterGsa * (feePercent / 100);
  const fullyBurdenedRate = afterGsa + feeAmount;

  return {
    base_rate: baseRate,
    fringe_amount: round2(fringeAmount),
    overhead_amount: round2(overheadAmount),
    gsa_amount: round2(gsaAmount),
    fee_amount: round2(feeAmount),
    fully_burdened_rate: round2(fullyBurdenedRate),
    wrap_rate_multiplier: baseRate > 0 ? round2(fullyBurdenedRate / baseRate) : 0,
  };
}

/**
 * Calculate a full Basis of Estimate from WBS items, labor categories, and indirect rates.
 * Returns extended costs for each line and rolled-up totals.
 */
export function calculateBOE(
  wbsItems: BOEWBSItem[],
  laborCategories: LaborCategory[],
  indirectRates: IndirectRate[]
): {
  lines: BOEWBSItem[];
  totalDirectLabor: number;
  totalIndirect: number;
  indirectBreakdown: { name: string; rate_type: IndirectRateType; percentage: number; amount: number }[];
} {
  // Build category lookup
  const catMap = new Map<string, LaborCategory>();
  for (const cat of laborCategories) {
    catMap.set(cat.id, cat);
  }

  // Compute direct labor per line
  const lines: BOEWBSItem[] = wbsItems.map((item) => {
    const extendedCost = round2(item.hours * item.rate);
    return { ...item, extended_cost: extendedCost };
  });

  const totalDirectLabor = round2(
    lines.reduce((sum, line) => sum + line.extended_cost, 0)
  );

  // Group indirect rates by type and apply in standard order
  const ratesByType = groupRatesByType(indirectRates);
  const indirectBreakdown: { name: string; rate_type: IndirectRateType; percentage: number; amount: number }[] = [];

  let runningSubtotal = totalDirectLabor;

  // Standard application order: fringe, overhead, gsa, fee, other
  const applicationOrder: IndirectRateType[] = ["fringe", "overhead", "gsa", "fee", "other"];
  for (const rateType of applicationOrder) {
    const rates = ratesByType.get(rateType) || [];
    for (const rate of rates) {
      const amount = round2(runningSubtotal * (rate.percentage / 100));
      indirectBreakdown.push({
        name: rate.rate_name,
        rate_type: rate.rate_type,
        percentage: rate.percentage,
        amount,
      });
      runningSubtotal = round2(runningSubtotal + amount);
    }
  }

  const totalIndirect = round2(runningSubtotal - totalDirectLabor);

  return {
    lines,
    totalDirectLabor,
    totalIndirect,
    indirectBreakdown,
  };
}

/**
 * Generate a formatted cost summary from opportunity pricing data.
 */
export function generateCostSummary(pricing: OpportunityPricing): CostSummary {
  const boeData = pricing.boe_data || [];

  // Aggregate by labor category
  const categoryTotals = new Map<string, { category: string; hours: number; rate: number; extended: number }>();
  for (const item of boeData) {
    const key = item.labor_category_id;
    const existing = categoryTotals.get(key);
    if (existing) {
      existing.hours += item.hours;
      existing.extended += item.extended_cost;
      // weighted average rate
      existing.rate = existing.extended / existing.hours;
    } else {
      categoryTotals.set(key, {
        category: item.labor_category_name,
        hours: item.hours,
        rate: item.rate,
        extended: item.extended_cost,
      });
    }
  }

  const directLaborLines = Array.from(categoryTotals.values()).map((line) => ({
    ...line,
    rate: round2(line.rate),
    extended: round2(line.extended),
  }));

  return {
    direct_labor_lines: directLaborLines,
    total_direct_labor: pricing.total_direct_labor,
    total_odcs: pricing.total_odcs,
    total_subcontractor: pricing.total_subcontractor,
    indirect_lines: [],
    total_indirect: pricing.total_indirect,
    total_price: pricing.total_price,
  };
}

// --- Helpers ---

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function groupRatesByType(rates: IndirectRate[]): Map<IndirectRateType, IndirectRate[]> {
  const map = new Map<IndirectRateType, IndirectRate[]>();
  for (const rate of rates) {
    const existing = map.get(rate.rate_type);
    if (existing) {
      existing.push(rate);
    } else {
      map.set(rate.rate_type, [rate]);
    }
  }
  return map;
}

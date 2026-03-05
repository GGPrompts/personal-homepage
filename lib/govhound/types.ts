export interface Opportunity {
  id: string;
  notice_id: string;
  title: string;
  agency: string | null;
  posted_date: string | null;
  response_deadline: string | null;
  naics_code: string | null;
  set_aside_type: string | null;
  description: string | null;
  place_of_performance: string | null;
  estimated_value: number | null;
  sol_number: string | null;
  classification_code: string | null;
  url: string | null;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  notice_type: string | null;
  contracting_office: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  awardee_name: string | null;
  awardee_uei: string | null;
  award_date: string | null;
  award_amount: number | null;
  resource_links: ResourceLink[] | null;
  additional_info_link: string | null;
  modified_date: string | null;
  active: boolean | null;
  pop_zip: string | null;
  full_parent_path: string | null;
}

export interface ResourceLink {
  url: string;
  description?: string;
  [key: string]: unknown;
}

export interface OpportunityAnalysis {
  id: string;
  opportunity_id: string;
  requirements_summary: string | null;
  tech_stack_detected: string | null;
  complexity_score: number | null;
  feasibility_score: number | null;
  estimated_effort: string | null;
  key_requirements: string[];
  red_flags: string[];
  recommended_approach: string | null;
  analyzed_at: string;
}

export interface Scan {
  id: string;
  query_params: Record<string, unknown>;
  results_count: number;
  started_at: string;
  completed_at: string | null;
  status: "pending" | "running" | "completed" | "failed";
}

export type SavedStatus = "watching" | "bidding" | "passed" | "won" | "lost" | "no_bid";

export interface SavedOpportunity {
  id: string;
  opportunity_id: string;
  notes: string | null;
  status: SavedStatus;
  saved_at: string;
}

export interface OpportunityWithAnalysis extends Opportunity {
  opportunity_analysis: OpportunityAnalysis | null;
  saved_opportunities: SavedOpportunity | null;
}

export interface ScanParams {
  keywords?: string;
  naics_codes?: string[];
  set_aside_types?: string[];
  date_from?: string;
  date_to?: string;
  agency?: string;
  classification_codes?: string[];
}

export interface DashboardStats {
  total_opportunities: number;
  high_feasibility: number;
  upcoming_deadlines: number;
  active_bids: number;
}

// --- Company Profile & Team ---

export interface CompanyProfile {
  id: string;
  name: string;
  uei: string | null;
  cage_code: string | null;
  sam_status: string | null;
  sam_expiration: string | null;
  duns: string | null;
  website: string | null;
  size_standard: string | null;
  primary_naics: string | null;
  founded_date: string | null;
  created_at: string;
  updated_at: string;
}

export type CertType =
  | "8a"
  | "hubzone"
  | "sdvosb"
  | "wosb"
  | "edwosb"
  | "sba"
  | "cmmc_l1"
  | "cmmc_l2"
  | "fedramp"
  | "iso27001"
  | "cmmi"
  | "soc2"
  | "section508";

export const CERT_TYPE_LABELS: Record<CertType, string> = {
  "8a": "8(a)",
  hubzone: "HUBZone",
  sdvosb: "SDVOSB",
  wosb: "WOSB",
  edwosb: "EDWOSB",
  sba: "SBA",
  cmmc_l1: "CMMC Level 1",
  cmmc_l2: "CMMC Level 2",
  fedramp: "FedRAMP",
  iso27001: "ISO 27001",
  cmmi: "CMMI",
  soc2: "SOC 2",
  section508: "Section 508",
};

export interface CompanyCertification {
  id: string;
  company_id: string;
  cert_type: CertType;
  cert_number: string | null;
  issued_date: string | null;
  expiration_date: string | null;
  status: string;
  created_at: string;
}

export interface CompanyNaicsCode {
  id: string;
  company_id: string;
  naics_code: string;
  is_primary: boolean;
  size_standard_value: string | null;
  created_at: string;
}

export interface CompanyContractVehicle {
  id: string;
  company_id: string;
  vehicle_name: string;
  contract_number: string | null;
  ordering_period_end: string | null;
  created_at: string;
}

export type ClearanceLevel =
  | "none"
  | "public_trust"
  | "secret"
  | "top_secret"
  | "ts_sci";

export const CLEARANCE_LABELS: Record<ClearanceLevel, string> = {
  none: "None",
  public_trust: "Public Trust",
  secret: "Secret",
  top_secret: "Top Secret",
  ts_sci: "TS/SCI",
};

export interface TeamMember {
  id: string;
  company_id: string;
  name: string;
  title: string | null;
  role: string | null;
  clearance_level: ClearanceLevel;
  years_experience: number | null;
  certifications: string[];
  skills: string[];
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfileFull extends CompanyProfile {
  company_certifications: CompanyCertification[];
  company_naics_codes: CompanyNaicsCode[];
  company_contract_vehicles: CompanyContractVehicle[];
  team_members: TeamMember[];
}

// --- Past Performance ---

export type ContractType =
  | "firm_fixed"
  | "time_materials"
  | "cost_plus"
  | "idiq"
  | "bpa";

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  firm_fixed: "Firm Fixed Price",
  time_materials: "Time & Materials",
  cost_plus: "Cost Plus",
  idiq: "IDIQ",
  bpa: "BPA",
};

export type ContractStatus = "active" | "completed" | "terminated";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: "Active",
  completed: "Completed",
  terminated: "Terminated",
};

export type RatingType = "cpars" | "ppirs" | "self";

export const RATING_TYPE_LABELS: Record<RatingType, string> = {
  cpars: "CPARS",
  ppirs: "PPIRS",
  self: "Self-Assessment",
};

export interface PastContract {
  id: string;
  company_id: string | null;
  contract_number: string;
  task_order_number: string | null;
  agency: string;
  sub_agency: string | null;
  title: string;
  description: string | null;
  naics_code: string | null;
  contract_type: ContractType;
  total_value: number | null;
  annual_value: number | null;
  period_start: string | null;
  period_end: string | null;
  status: ContractStatus;
  place_of_performance: string | null;
  technologies: string[];
  key_personnel: KeyPerson[];
  created_at: string;
  updated_at: string;
}

export interface KeyPerson {
  name: string;
  role: string;
}

export interface PastPerformanceRating {
  id: string;
  contract_id: string;
  rating_type: RatingType;
  quality_rating: number | null;
  schedule_rating: number | null;
  cost_rating: number | null;
  management_rating: number | null;
  overall_rating: number | null;
  narrative: string | null;
  rated_date: string | null;
  created_at: string;
}

export interface PastContractWithRatings extends PastContract {
  past_performance_ratings: PastPerformanceRating[];
}

export interface MatchResult {
  contract: PastContract;
  relevance_score: number;
  match_details: {
    naics_match: boolean;
    agency_match: boolean;
    value_similarity: number;
    technology_overlap: number;
    recency_score: number;
  };
}

// --- Go/No-Go Decision Support ---

export type GoNoGoRecommendation =
  | "strong_go"
  | "go"
  | "conditional_go"
  | "no_go";

export const GO_NOGO_RECOMMENDATION_LABELS: Record<GoNoGoRecommendation, string> = {
  strong_go: "Strong Go",
  go: "Go",
  conditional_go: "Conditional Go",
  no_go: "No Go",
};

export interface GoNoGoAssessment {
  id: string;
  opportunity_id: string;
  assessed_at: string;
  overall_score: number | null;
  recommendation: GoNoGoRecommendation;
  assessor_notes: string | null;
}

export interface GoNoGoCriterionScore {
  id: string;
  assessment_id: string;
  criterion: string;
  weight: number;
  score: number | null;
  notes: string | null;
}

export interface GoNoGoAssessmentWithScores extends GoNoGoAssessment {
  go_nogo_criteria_scores: GoNoGoCriterionScore[];
}

export interface ComplianceChecklistItem {
  id: string;
  opportunity_id: string;
  requirement_text: string;
  source_section: string | null;
  is_met: boolean | null;
  gap_notes: string | null;
  mapped_response_section: string | null;
}

export const DEFAULT_GO_NOGO_CRITERIA: {
  criterion: string;
  weight: number;
}[] = [
  { criterion: "Past performance relevance", weight: 0.2 },
  { criterion: "Technical capability match", weight: 0.2 },
  { criterion: "Set-aside/certification eligibility", weight: 0.15 },
  { criterion: "Clearance requirements met", weight: 0.1 },
  { criterion: "Price competitiveness", weight: 0.1 },
  { criterion: "Strategic value", weight: 0.1 },
  { criterion: "Resource availability", weight: 0.1 },
  { criterion: "Geographic feasibility", weight: 0.05 },
];

// --- Competitor Intelligence ---

export type AwardSource = "usaspending" | "sam_awards" | "fpds";

export interface CompetitorAward {
  id: string;
  opportunity_id: string | null;
  naics_code: string | null;
  agency: string | null;
  awardee_name: string;
  awardee_uei: string | null;
  award_amount: number | null;
  award_date: string | null;
  contract_number: string | null;
  period_of_performance: string | null;
  source: AwardSource;
  fetched_at: string;
}

export interface Competitor {
  id: string;
  name: string;
  uei: string | null;
  notes: string | null;
  tracked_since: string;
}

export interface IncumbentInfo {
  awardee_name: string;
  awardee_uei: string | null;
  total_awards: number;
  total_value: number;
  most_recent_award: string | null;
  contracts: string[];
}

export interface PriceRange {
  min: number;
  max: number;
  median: number;
  average: number;
  count: number;
}

export interface CompetitorIntelReport {
  opportunity_id: string;
  incumbents: IncumbentInfo[];
  market_awards: CompetitorAward[];
  price_range: PriceRange | null;
  fetched_at: string;
}

// --- Milestone & Activity Log ---

export type MilestoneType =
  | "questions_due"
  | "site_visit"
  | "draft_due"
  | "review"
  | "final_due"
  | "submission"
  | "custom";

export const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  questions_due: "Questions Due",
  site_visit: "Site Visit",
  draft_due: "Draft Due",
  review: "Internal Review",
  final_due: "Final Draft",
  submission: "Submission",
  custom: "Custom",
};

export type MilestoneStatus = "pending" | "in_progress" | "completed" | "skipped";

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
};

export interface Milestone {
  id: string;
  opportunity_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: MilestoneStatus;
  milestone_type: MilestoneType;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ActivityEntryType =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "amendment"
  | "status_change"
  | "system";

export const ACTIVITY_ENTRY_TYPE_LABELS: Record<ActivityEntryType, string> = {
  note: "Note",
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  amendment: "Amendment",
  status_change: "Status Change",
  system: "System",
};

export interface ActivityLogEntry {
  id: string;
  opportunity_id: string;
  entry_type: ActivityEntryType;
  content: string;
  created_at: string;
}

export interface AmendmentDiff {
  field: string;
  old_value: string | null;
  new_value: string | null;
}

// --- Search Profiles & Automated Scanning ---

export interface SearchProfile {
  id: string;
  name: string;
  keywords: string | null;
  naics_codes: string[];
  set_aside_types: string[];
  agencies: string[];
  classification_codes: string[];
  date_range_days: number;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
}

export interface NewOpportunityFlag {
  id: string;
  opportunity_id: string;
  profile_id: string;
  flagged_at: string;
  seen: boolean;
}

export interface SearchProfileWithStats extends SearchProfile {
  new_count: number;
}

// --- Proposals ---

export type ProposalStatus = "draft" | "in_review" | "final" | "submitted" | "archived";

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  final: "Final",
  submitted: "Submitted",
  archived: "Archived",
};

export type ProposalVolume = "admin" | "technical" | "past_performance" | "cost";

export const PROPOSAL_VOLUME_LABELS: Record<ProposalVolume, string> = {
  admin: "Vol I: Administrative",
  technical: "Vol II: Technical",
  past_performance: "Vol III: Past Performance",
  cost: "Vol IV: Cost/Price",
};

export type ProposalDocType =
  | "rfp"
  | "sow"
  | "amendment"
  | "qa"
  | "teaming_agreement"
  | "proposal_draft"
  | "other";

export const PROPOSAL_DOC_TYPE_LABELS: Record<ProposalDocType, string> = {
  rfp: "RFP",
  sow: "SOW",
  amendment: "Amendment",
  qa: "Q&A",
  teaming_agreement: "Teaming Agreement",
  proposal_draft: "Proposal Draft",
  other: "Other",
};

export interface Proposal {
  id: string;
  opportunity_id: string;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
}

export interface ProposalSection {
  id: string;
  proposal_id: string;
  volume: ProposalVolume;
  section_title: string;
  section_order: number;
  content: string;
  ai_generated: boolean;
  last_edited_at: string;
}

export interface ProposalDocument {
  id: string;
  proposal_id: string | null;
  opportunity_id: string | null;
  doc_type: ProposalDocType;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

export interface ProposalWithSections extends Proposal {
  proposal_sections: ProposalSection[];
}

// --- Pricing & Cost Volume ---

export type IndirectRateType = "fringe" | "overhead" | "gsa" | "fee" | "other";

export const INDIRECT_RATE_TYPE_LABELS: Record<IndirectRateType, string> = {
  fringe: "Fringe Benefits",
  overhead: "Overhead",
  gsa: "GSA Fee",
  fee: "Profit/Fee",
  other: "Other",
};

export interface LaborCategory {
  id: string;
  company_id: string | null;
  category_name: string;
  abbreviation: string;
  gsa_rate: number | null;
  site_rate: number | null;
  remote_rate: number | null;
  min_education: string | null;
  min_years_experience: number | null;
  description: string | null;
  created_at: string;
}

export interface IndirectRate {
  id: string;
  company_id: string | null;
  rate_type: IndirectRateType;
  rate_name: string;
  percentage: number;
  effective_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface BOEWBSItem {
  wbs_id: string;
  title: string;
  labor_category_id: string;
  labor_category_name: string;
  hours: number;
  rate: number;
  extended_cost: number;
}

export interface BOETemplate {
  id: string;
  name: string;
  description: string | null;
  structure: BOETemplateElement[];
  created_at: string;
}

export interface BOETemplateElement {
  wbs_id: string;
  title: string;
  default_hours: number;
  default_category_abbreviation: string;
}

export interface OpportunityPricing {
  id: string;
  opportunity_id: string;
  boe_data: BOEWBSItem[];
  total_direct_labor: number;
  total_odcs: number;
  total_subcontractor: number;
  total_indirect: number;
  total_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WrapRateBreakdown {
  base_rate: number;
  fringe_amount: number;
  overhead_amount: number;
  gsa_amount: number;
  fee_amount: number;
  fully_burdened_rate: number;
  wrap_rate_multiplier: number;
}

export interface CostSummary {
  direct_labor_lines: {
    category: string;
    hours: number;
    rate: number;
    extended: number;
  }[];
  total_direct_labor: number;
  total_odcs: number;
  total_subcontractor: number;
  indirect_lines: {
    name: string;
    rate_type: IndirectRateType;
    percentage: number;
    amount: number;
  }[];
  total_indirect: number;
  total_price: number;
}

export const DEFAULT_MILESTONE_TEMPLATE: {
  title: string;
  milestone_type: MilestoneType;
  days_before: number;
  sort_order: number;
}[] = [
  { title: "Questions Due", milestone_type: "questions_due", days_before: 21, sort_order: 1 },
  { title: "Draft Complete", milestone_type: "draft_due", days_before: 14, sort_order: 2 },
  { title: "Internal Review", milestone_type: "review", days_before: 10, sort_order: 3 },
  { title: "Final Draft", milestone_type: "final_due", days_before: 5, sort_order: 4 },
  { title: "Submission", milestone_type: "submission", days_before: 1, sort_order: 5 },
];

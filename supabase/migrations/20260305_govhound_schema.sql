-- GovHound schema (consolidated from 11 migrations)

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE saved_status AS ENUM ('watching', 'bidding', 'passed', 'won', 'lost', 'no_bid');

CREATE TYPE cert_type AS ENUM (
  '8a', 'hubzone', 'sdvosb', 'wosb', 'edwosb', 'sba',
  'cmmc_l1', 'cmmc_l2', 'fedramp',
  'iso27001', 'cmmi', 'soc2', 'section508'
);

CREATE TYPE clearance_level AS ENUM (
  'none', 'public_trust', 'secret', 'top_secret', 'ts_sci'
);

CREATE TYPE contract_type AS ENUM (
  'firm_fixed', 'time_materials', 'cost_plus', 'idiq', 'bpa'
);

CREATE TYPE contract_status AS ENUM (
  'active', 'completed', 'terminated'
);

CREATE TYPE rating_type AS ENUM (
  'cpars', 'ppirs', 'self'
);

CREATE TYPE go_nogo_recommendation AS ENUM (
  'strong_go', 'go', 'conditional_go', 'no_go'
);

CREATE TYPE award_source AS ENUM ('usaspending', 'sam_awards', 'fpds');

CREATE TYPE milestone_type AS ENUM (
  'questions_due', 'site_visit', 'draft_due', 'review', 'final_due', 'submission', 'custom'
);

CREATE TYPE milestone_status AS ENUM (
  'pending', 'in_progress', 'completed', 'skipped'
);

CREATE TYPE activity_entry_type AS ENUM (
  'note', 'call', 'email', 'meeting', 'amendment', 'status_change', 'system'
);

CREATE TYPE proposal_status AS ENUM ('draft', 'in_review', 'final', 'submitted', 'archived');

CREATE TYPE proposal_volume AS ENUM ('admin', 'technical', 'past_performance', 'cost');

CREATE TYPE proposal_doc_type AS ENUM ('rfp', 'sow', 'amendment', 'qa', 'teaming_agreement', 'proposal_draft', 'other');

CREATE TYPE indirect_rate_type AS ENUM ('fringe', 'overhead', 'gsa', 'fee', 'other');

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Full-text search vector trigger function
CREATE OR REPLACE FUNCTION opportunities_search_vector_update() RETURNS trigger AS $$
BEGIN
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.agency, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Proposals updated_at trigger function
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLES (ordered by foreign key dependencies)
-- =============================================================================

-- Scan history
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_params jsonb NOT NULL DEFAULT '{}',
  results_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- Opportunities (initial + enrichment columns merged)
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id text UNIQUE NOT NULL,
  title text NOT NULL,
  agency text,
  posted_date timestamptz,
  response_deadline timestamptz,
  naics_code text,
  set_aside_type text,
  description text,
  place_of_performance text,
  estimated_value numeric,
  sol_number text,
  classification_code text,
  url text,
  raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Enrichment columns (from enrich_opportunities migration)
  notice_type text,
  contracting_office text,
  contact_name text,
  contact_email text,
  contact_phone text,
  awardee_name text,
  awardee_uei text,
  award_date timestamptz,
  award_amount numeric,
  resource_links jsonb,
  additional_info_link text,
  modified_date timestamptz,
  active boolean,
  pop_zip text,
  full_parent_path text,
  -- Full-text search vector
  search_vector tsvector
);

CREATE INDEX idx_opportunities_notice_id ON opportunities (notice_id);
CREATE INDEX idx_opportunities_posted_date ON opportunities (posted_date DESC);
CREATE INDEX idx_opportunities_response_deadline ON opportunities (response_deadline);
CREATE INDEX idx_opportunities_naics_code ON opportunities (naics_code);
CREATE INDEX idx_opportunities_agency ON opportunities (agency);
CREATE INDEX idx_opportunities_notice_type ON opportunities (notice_type);
CREATE INDEX idx_opportunities_active ON opportunities (active);
CREATE INDEX idx_opportunities_modified_date ON opportunities (modified_date DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_search_vector ON opportunities USING gin (search_vector);

-- Full-text search trigger
DROP TRIGGER IF EXISTS opportunities_search_vector_trigger ON opportunities;
CREATE TRIGGER opportunities_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, agency, description
  ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION opportunities_search_vector_update();

-- AI analysis results
CREATE TABLE IF NOT EXISTS opportunity_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  requirements_summary text,
  tech_stack_detected text,
  complexity_score integer CHECK (complexity_score BETWEEN 1 AND 5),
  feasibility_score integer CHECK (feasibility_score BETWEEN 1 AND 5),
  estimated_effort text,
  key_requirements jsonb DEFAULT '[]',
  red_flags jsonb DEFAULT '[]',
  recommended_approach text,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id)
);

CREATE INDEX idx_analysis_opportunity_id ON opportunity_analysis (opportunity_id);
CREATE INDEX idx_analysis_feasibility ON opportunity_analysis (feasibility_score DESC);

-- Saved / bookmarked opportunities
CREATE TABLE IF NOT EXISTS saved_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  notes text,
  status saved_status NOT NULL DEFAULT 'watching',
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id)
);

CREATE INDEX idx_saved_opportunity_id ON saved_opportunities (opportunity_id);
CREATE INDEX idx_saved_status ON saved_opportunities (status);

-- Company profile
CREATE TABLE IF NOT EXISTS company_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  uei text,
  cage_code text,
  sam_status text,
  sam_expiration date,
  duns text,
  website text,
  size_standard text,
  primary_naics text,
  founded_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Company certifications
CREATE TABLE IF NOT EXISTS company_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company_profile(id) ON DELETE CASCADE,
  cert_type cert_type NOT NULL,
  cert_number text,
  issued_date date,
  expiration_date date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_company_certifications_company ON company_certifications(company_id);

-- Company NAICS codes
CREATE TABLE IF NOT EXISTS company_naics_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company_profile(id) ON DELETE CASCADE,
  naics_code text NOT NULL,
  is_primary boolean DEFAULT false,
  size_standard_value text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_company_naics_company ON company_naics_codes(company_id);

-- Company contract vehicles
CREATE TABLE IF NOT EXISTS company_contract_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company_profile(id) ON DELETE CASCADE,
  vehicle_name text NOT NULL,
  contract_number text,
  ordering_period_end date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_company_vehicles_company ON company_contract_vehicles(company_id);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company_profile(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  role text,
  clearance_level clearance_level DEFAULT 'none',
  years_experience integer,
  certifications jsonb DEFAULT '[]'::jsonb,
  skills jsonb DEFAULT '[]'::jsonb,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_team_members_company ON team_members(company_id);

-- Past contracts
CREATE TABLE IF NOT EXISTS past_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profile(id) ON DELETE SET NULL,
  contract_number text NOT NULL,
  task_order_number text,
  agency text NOT NULL,
  sub_agency text,
  title text NOT NULL,
  description text,
  naics_code text,
  contract_type contract_type NOT NULL DEFAULT 'firm_fixed',
  total_value numeric,
  annual_value numeric,
  period_start date,
  period_end date,
  status contract_status NOT NULL DEFAULT 'active',
  place_of_performance text,
  technologies jsonb DEFAULT '[]',
  key_personnel jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_past_contracts_company ON past_contracts (company_id);
CREATE INDEX idx_past_contracts_naics ON past_contracts (naics_code);
CREATE INDEX idx_past_contracts_agency ON past_contracts (agency);
CREATE INDEX idx_past_contracts_status ON past_contracts (status);

-- Past performance ratings
CREATE TABLE IF NOT EXISTS past_performance_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES past_contracts (id) ON DELETE CASCADE,
  rating_type rating_type NOT NULL DEFAULT 'self',
  quality_rating integer CHECK (quality_rating BETWEEN 1 AND 5),
  schedule_rating integer CHECK (schedule_rating BETWEEN 1 AND 5),
  cost_rating integer CHECK (cost_rating BETWEEN 1 AND 5),
  management_rating integer CHECK (management_rating BETWEEN 1 AND 5),
  overall_rating integer CHECK (overall_rating BETWEEN 1 AND 5),
  narrative text,
  rated_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ratings_contract ON past_performance_ratings (contract_id);

-- Go/No-Go assessments
CREATE TABLE IF NOT EXISTS go_nogo_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  overall_score numeric CHECK (overall_score >= 0 AND overall_score <= 5),
  recommendation go_nogo_recommendation NOT NULL DEFAULT 'no_go',
  assessor_notes text,
  CONSTRAINT uq_go_nogo_opportunity UNIQUE (opportunity_id)
);

CREATE INDEX idx_go_nogo_opportunity ON go_nogo_assessments (opportunity_id);

-- Go/No-Go criteria scores
CREATE TABLE IF NOT EXISTS go_nogo_criteria_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES go_nogo_assessments (id) ON DELETE CASCADE,
  criterion text NOT NULL,
  weight numeric NOT NULL CHECK (weight >= 0 AND weight <= 1),
  score integer CHECK (score BETWEEN 1 AND 5),
  notes text
);

CREATE INDEX idx_criteria_assessment ON go_nogo_criteria_scores (assessment_id);

-- Compliance checklists
CREATE TABLE IF NOT EXISTS compliance_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  requirement_text text NOT NULL,
  source_section text,
  is_met boolean,
  gap_notes text,
  mapped_response_section text
);

CREATE INDEX idx_compliance_opportunity ON compliance_checklists (opportunity_id);

-- Competitor awards
CREATE TABLE IF NOT EXISTS competitor_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  naics_code text,
  agency text,
  awardee_name text NOT NULL,
  awardee_uei text,
  award_amount numeric,
  award_date date,
  contract_number text,
  period_of_performance text,
  source award_source NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitor_awards_opportunity ON competitor_awards(opportunity_id);
CREATE INDEX idx_competitor_awards_naics ON competitor_awards(naics_code);
CREATE INDEX idx_competitor_awards_agency ON competitor_awards(agency);
CREATE INDEX idx_competitor_awards_awardee ON competitor_awards(awardee_name);
CREATE INDEX idx_competitor_awards_awardee_uei ON competitor_awards(awardee_uei);

-- Tracked competitors
CREATE TABLE IF NOT EXISTS competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  uei text,
  notes text,
  tracked_since timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_competitors_uei ON competitors(uei) WHERE uei IS NOT NULL;

-- Opportunity milestones
CREATE TABLE IF NOT EXISTS opportunity_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz NOT NULL,
  status milestone_status NOT NULL DEFAULT 'pending',
  milestone_type milestone_type NOT NULL DEFAULT 'custom',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_milestones_opportunity_id ON opportunity_milestones (opportunity_id);
CREATE INDEX idx_milestones_due_date ON opportunity_milestones (due_date);
CREATE INDEX idx_milestones_status ON opportunity_milestones (status);

-- Opportunity activity log
CREATE TABLE IF NOT EXISTS opportunity_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  entry_type activity_entry_type NOT NULL DEFAULT 'note',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_opportunity_id ON opportunity_activity_log (opportunity_id);
CREATE INDEX idx_activity_log_created_at ON opportunity_activity_log (created_at DESC);

-- Search profiles
CREATE TABLE IF NOT EXISTS search_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  keywords text,
  naics_codes jsonb DEFAULT '[]',
  set_aside_types jsonb DEFAULT '[]',
  agencies jsonb DEFAULT '[]',
  classification_codes jsonb DEFAULT '[]',
  date_range_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_profiles_active ON search_profiles (is_active) WHERE is_active = true;

-- New opportunity flags (per search profile)
CREATE TABLE IF NOT EXISTS new_opportunity_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES search_profiles (id) ON DELETE CASCADE,
  flagged_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false,
  UNIQUE (opportunity_id, profile_id)
);

CREATE INDEX idx_new_flags_profile ON new_opportunity_flags (profile_id);
CREATE INDEX idx_new_flags_unseen ON new_opportunity_flags (profile_id, seen) WHERE seen = false;
CREATE INDEX idx_new_flags_opportunity ON new_opportunity_flags (opportunity_id);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  status proposal_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proposals_opportunity_id_unique UNIQUE (opportunity_id)
);

-- Proposals updated_at trigger
CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposals_updated_at();

-- Proposal sections
CREATE TABLE IF NOT EXISTS proposal_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  volume proposal_volume NOT NULL,
  section_title text NOT NULL,
  section_order integer NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  ai_generated boolean NOT NULL DEFAULT false,
  last_edited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_sections_proposal_id ON proposal_sections(proposal_id);
CREATE INDEX idx_proposal_sections_volume ON proposal_sections(volume);

-- Proposal documents
CREATE TABLE IF NOT EXISTS proposal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  doc_type proposal_doc_type NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_documents_proposal_id ON proposal_documents(proposal_id);
CREATE INDEX idx_proposal_documents_opportunity_id ON proposal_documents(opportunity_id);

-- Labor categories / rate card
CREATE TABLE IF NOT EXISTS labor_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profile(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  abbreviation text NOT NULL,
  gsa_rate numeric(12,2),
  site_rate numeric(12,2),
  remote_rate numeric(12,2),
  min_education text,
  min_years_experience integer,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indirect rates
CREATE TABLE IF NOT EXISTS indirect_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profile(id) ON DELETE CASCADE,
  rate_type indirect_rate_type NOT NULL,
  rate_name text NOT NULL,
  percentage numeric(8,4) NOT NULL,
  effective_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- BOE templates
CREATE TABLE IF NOT EXISTS boe_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  structure jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Opportunity-specific pricing
CREATE TABLE IF NOT EXISTS opportunity_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  boe_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_direct_labor numeric(14,2) DEFAULT 0,
  total_odcs numeric(14,2) DEFAULT 0,
  total_subcontractor numeric(14,2) DEFAULT 0,
  total_indirect numeric(14,2) DEFAULT 0,
  total_price numeric(14,2) DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_pricing_opportunity_id_key UNIQUE (opportunity_id)
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_naics_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_contract_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_performance_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE go_nogo_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE go_nogo_criteria_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_opportunity_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE indirect_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE boe_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_pricing ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES (allow all access, no auth yet)
-- =============================================================================

CREATE POLICY "Allow all access to scans" ON scans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to opportunities" ON opportunities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to opportunity_analysis" ON opportunity_analysis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to saved_opportunities" ON saved_opportunities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to company_profile" ON company_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to company_certifications" ON company_certifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to company_naics_codes" ON company_naics_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to company_contract_vehicles" ON company_contract_vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to team_members" ON team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to past_contracts" ON past_contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to past_performance_ratings" ON past_performance_ratings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to go_nogo_assessments" ON go_nogo_assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to go_nogo_criteria_scores" ON go_nogo_criteria_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to compliance_checklists" ON compliance_checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to competitor_awards" ON competitor_awards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to competitors" ON competitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to opportunity_milestones" ON opportunity_milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to opportunity_activity_log" ON opportunity_activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to search_profiles" ON search_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to new_opportunity_flags" ON new_opportunity_flags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to proposals" ON proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to proposal_sections" ON proposal_sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to proposal_documents" ON proposal_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to labor_categories" ON labor_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to indirect_rates" ON indirect_rates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to boe_templates" ON boe_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to opportunity_pricing" ON opportunity_pricing FOR ALL USING (true) WITH CHECK (true);

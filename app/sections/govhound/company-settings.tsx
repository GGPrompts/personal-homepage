"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Shield,
  Users,
  Hash,
  FileText,
  Plus,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CompanyProfile,
  CompanyCertification,
  CompanyNaicsCode,
  CompanyContractVehicle,
  TeamMember,
  CertType,
  ClearanceLevel,
} from "@/lib/govhound/types";
import { CERT_TYPE_LABELS, CLEARANCE_LABELS } from "@/lib/govhound/types";

interface TabProps {
  onSelectOpportunity?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

type CompanyProfileFull = CompanyProfile & {
  company_certifications: CompanyCertification[];
  company_naics_codes: CompanyNaicsCode[];
  company_contract_vehicles: CompanyContractVehicle[];
  team_members: TeamMember[];
};

export function CompanySettingsTab({ onSelectOpportunity, onNavigateTab }: TabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyProfileFull | null>(null);

  const [form, setForm] = useState({
    name: "", uei: "", cage_code: "", sam_status: "", sam_expiration: "", duns: "", website: "", size_standard: "", primary_naics: "", founded_date: "",
  });

  const fetchCompany = useCallback(async () => {
    try {
      const res = await fetch("/api/govhound/company");
      if (!res.ok) throw new Error("Failed to fetch company profile");
      const data = await res.json();
      if (data.company) {
        setCompany(data.company);
        setForm({
          name: data.company.name || "", uei: data.company.uei || "", cage_code: data.company.cage_code || "", sam_status: data.company.sam_status || "", sam_expiration: data.company.sam_expiration || "", duns: data.company.duns || "", website: data.company.website || "", size_standard: data.company.size_standard || "", primary_naics: data.company.primary_naics || "", founded_date: data.company.founded_date || "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  function showSuccess(msg: string) { setSuccess(msg); setError(null); setTimeout(() => setSuccess(null), 3000); }
  function showError(msg: string) { setError(msg); setSuccess(null); }

  async function saveProfile() {
    if (!form.name.trim()) { showError("Company name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/govhound/company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: company?.id }) });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      await fetchCompany();
      if (!company && data.company) {
        setCompany({ ...data.company, company_certifications: [], company_naics_codes: [], company_contract_vehicles: [], team_members: [] });
      }
      showSuccess("Company profile saved");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[600px] w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your company profile and team capabilities for personalized contract scoring.</p>
      </div>

      {error && <Card className="border-destructive/50"><CardContent className="pt-6"><p className="text-destructive text-sm">{error}</p></CardContent></Card>}
      {success && <Card className="border-green-500/50"><CardContent className="pt-6"><p className="text-green-500 text-sm">{success}</p></CardContent></Card>}

      <Tabs defaultValue="general">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="general" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground"><Building2 className="h-4 w-4 mr-1.5" />General</TabsTrigger>
          <TabsTrigger value="certifications" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground"><Shield className="h-4 w-4 mr-1.5" />Certifications</TabsTrigger>
          <TabsTrigger value="naics" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground"><Hash className="h-4 w-4 mr-1.5" />NAICS Codes</TabsTrigger>
          <TabsTrigger value="vehicles" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground"><FileText className="h-4 w-4 mr-1.5" />Contract Vehicles</TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground"><Users className="h-4 w-4 mr-1.5" />Team</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <GeneralTab form={form} setForm={setForm} saving={saving} onSave={saveProfile} />
        </TabsContent>
        <TabsContent value="certifications" className="mt-4">
          <CertificationsTab companyId={company?.id} certifications={company?.company_certifications || []} onRefresh={fetchCompany} onError={showError} onSuccess={showSuccess} />
        </TabsContent>
        <TabsContent value="naics" className="mt-4">
          <NaicsTab companyId={company?.id} naicsCodes={company?.company_naics_codes || []} onRefresh={fetchCompany} onError={showError} onSuccess={showSuccess} />
        </TabsContent>
        <TabsContent value="vehicles" className="mt-4">
          <VehiclesTab companyId={company?.id} vehicles={company?.company_contract_vehicles || []} onRefresh={fetchCompany} onError={showError} onSuccess={showSuccess} />
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <TeamTab companyId={company?.id} members={company?.team_members || []} onRefresh={fetchCompany} onError={showError} onSuccess={showSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type ProfileForm = { name: string; uei: string; cage_code: string; sam_status: string; sam_expiration: string; duns: string; website: string; size_standard: string; primary_naics: string; founded_date: string; };

function GeneralTab({ form, setForm, saving, onSave }: { form: ProfileForm; setForm: (f: ProfileForm) => void; saving: boolean; onSave: () => void }) {
  function update(field: string, value: string) { setForm({ ...form, [field]: value }); }
  return (
    <Card className="border-border">
      <CardHeader><CardTitle className="text-foreground">Company Information</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="name" className="text-muted-foreground">Company Name *</Label><Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Acme Federal Solutions" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
          <div className="space-y-2"><Label htmlFor="website" className="text-muted-foreground">Website</Label><Input id="website" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://example.com" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
        </div>
        <Separator className="bg-border" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label htmlFor="uei" className="text-muted-foreground">UEI</Label><Input id="uei" value={form.uei} onChange={(e) => update("uei", e.target.value)} placeholder="Unique Entity ID" className="bg-card border-border text-foreground font-mono placeholder:text-muted-foreground/70" /></div>
          <div className="space-y-2"><Label htmlFor="cage_code" className="text-muted-foreground">CAGE Code</Label><Input id="cage_code" value={form.cage_code} onChange={(e) => update("cage_code", e.target.value)} placeholder="5-character code" className="bg-card border-border text-foreground font-mono placeholder:text-muted-foreground/70" /></div>
          <div className="space-y-2"><Label htmlFor="duns" className="text-muted-foreground">DUNS</Label><Input id="duns" value={form.duns} onChange={(e) => update("duns", e.target.value)} placeholder="DUNS number" className="bg-card border-border text-foreground font-mono placeholder:text-muted-foreground/70" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sam_status" className="text-muted-foreground">SAM.gov Status</Label>
            <Select value={form.sam_status} onValueChange={(v) => update("sam_status", v)}>
              <SelectTrigger className="bg-card border-border text-foreground"><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="sam_expiration" className="text-muted-foreground">SAM Expiration</Label><Input id="sam_expiration" type="date" value={form.sam_expiration} onChange={(e) => update("sam_expiration", e.target.value)} className="bg-card border-border text-foreground" /></div>
          <div className="space-y-2"><Label htmlFor="founded_date" className="text-muted-foreground">Founded Date</Label><Input id="founded_date" type="date" value={form.founded_date} onChange={(e) => update("founded_date", e.target.value)} className="bg-card border-border text-foreground" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="primary_naics" className="text-muted-foreground">Primary NAICS Code</Label><Input id="primary_naics" value={form.primary_naics} onChange={(e) => update("primary_naics", e.target.value)} placeholder="e.g. 541512" className="bg-card border-border text-foreground font-mono placeholder:text-muted-foreground/70" /></div>
          <div className="space-y-2"><Label htmlFor="size_standard" className="text-muted-foreground">Size Standard</Label><Input id="size_standard" value={form.size_standard} onChange={(e) => update("size_standard", e.target.value)} placeholder="e.g. Small Business" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CertificationsTab({ companyId, certifications, onRefresh, onError, onSuccess }: { companyId?: string; certifications: CompanyCertification[]; onRefresh: () => Promise<void>; onError: (msg: string) => void; onSuccess: (msg: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCert, setNewCert] = useState({ cert_type: "" as CertType | "", cert_number: "", issued_date: "", expiration_date: "" });

  async function addCert() {
    if (!companyId) { onError("Save company profile first"); return; }
    if (!newCert.cert_type) { onError("Certification type is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/govhound/company/certifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_id: companyId, ...newCert }) });
      if (!res.ok) throw new Error("Failed to save");
      setNewCert({ cert_type: "", cert_number: "", issued_date: "", expiration_date: "" }); setAdding(false); await onRefresh(); onSuccess("Certification added");
    } catch (err) { onError(err instanceof Error ? err.message : "Failed to save"); } finally { setSaving(false); }
  }

  async function deleteCert(id: string) {
    try { const res = await fetch(`/api/govhound/company/certifications?id=${id}`, { method: "DELETE" }); if (!res.ok) throw new Error("Failed to delete"); await onRefresh(); onSuccess("Certification removed"); }
    catch (err) { onError(err instanceof Error ? err.message : "Failed to delete"); }
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Certifications</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setAdding(!adding)} className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"><Plus className="h-4 w-4 mr-1" />Add</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!companyId && <p className="text-muted-foreground/70 text-sm">Save your company profile first to add certifications.</p>}
        {adding && companyId && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Type *</Label>
                <Select value={newCert.cert_type} onValueChange={(v) => setNewCert({ ...newCert, cert_type: v as CertType })}>
                  <SelectTrigger className="bg-card border-border text-foreground"><SelectValue placeholder="Select certification" /></SelectTrigger>
                  <SelectContent>{Object.entries(CERT_TYPE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-muted-foreground">Certificate Number</Label><Input value={newCert.cert_number} onChange={(e) => setNewCert({ ...newCert, cert_number: e.target.value })} placeholder="Certificate #" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-muted-foreground">Issued Date</Label><Input type="date" value={newCert.issued_date} onChange={(e) => setNewCert({ ...newCert, issued_date: e.target.value })} className="bg-card border-border text-foreground" /></div>
              <div className="space-y-2"><Label className="text-muted-foreground">Expiration Date</Label><Input type="date" value={newCert.expiration_date} onChange={(e) => setNewCert({ ...newCert, expiration_date: e.target.value })} className="bg-card border-border text-foreground" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)} className="text-muted-foreground">Cancel</Button>
              <Button size="sm" onClick={addCert} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
            </div>
          </div>
        )}
        {certifications.length === 0 && !adding ? <p className="text-muted-foreground/70 text-sm">No certifications added yet.</p> : (
          <div className="space-y-2">
            {certifications.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-primary border-primary/20">{CERT_TYPE_LABELS[cert.cert_type] || cert.cert_type}</Badge>
                  {cert.cert_number && <span className="text-sm text-muted-foreground font-mono">{cert.cert_number}</span>}
                  {cert.expiration_date && <span className="text-xs text-muted-foreground/70">Exp: {cert.expiration_date}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteCert(cert.id)} className="text-muted-foreground/70 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NaicsTab({ companyId, naicsCodes, onRefresh, onError, onSuccess }: { companyId?: string; naicsCodes: CompanyNaicsCode[]; onRefresh: () => Promise<void>; onError: (msg: string) => void; onSuccess: (msg: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newNaics, setNewNaics] = useState({ naics_code: "", is_primary: false, size_standard_value: "" });

  async function addNaics() {
    if (!companyId) { onError("Save company profile first"); return; }
    if (!newNaics.naics_code.trim()) { onError("NAICS code is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/govhound/company/naics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_id: companyId, ...newNaics }) });
      if (!res.ok) throw new Error("Failed to save");
      setNewNaics({ naics_code: "", is_primary: false, size_standard_value: "" }); setAdding(false); await onRefresh(); onSuccess("NAICS code added");
    } catch (err) { onError(err instanceof Error ? err.message : "Failed to save"); } finally { setSaving(false); }
  }

  async function deleteNaics(id: string) {
    try { const res = await fetch(`/api/govhound/company/naics?id=${id}`, { method: "DELETE" }); if (!res.ok) throw new Error("Failed to delete"); await onRefresh(); onSuccess("NAICS code removed"); }
    catch (err) { onError(err instanceof Error ? err.message : "Failed to delete"); }
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">NAICS Codes</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setAdding(!adding)} className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"><Plus className="h-4 w-4 mr-1" />Add</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!companyId && <p className="text-muted-foreground/70 text-sm">Save your company profile first to add NAICS codes.</p>}
        {adding && companyId && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label className="text-muted-foreground">NAICS Code *</Label><Input value={newNaics.naics_code} onChange={(e) => setNewNaics({ ...newNaics, naics_code: e.target.value })} placeholder="e.g. 541512" className="bg-card border-border text-foreground font-mono placeholder:text-muted-foreground/70" /></div>
              <div className="space-y-2"><Label className="text-muted-foreground">Size Standard</Label><Input value={newNaics.size_standard_value} onChange={(e) => setNewNaics({ ...newNaics, size_standard_value: e.target.value })} placeholder="e.g. $30M" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
              <div className="flex items-end space-x-2 pb-0.5">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={newNaics.is_primary} onChange={(e) => setNewNaics({ ...newNaics, is_primary: e.target.checked })} className="rounded border-border" />
                  Primary
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)} className="text-muted-foreground">Cancel</Button>
              <Button size="sm" onClick={addNaics} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
            </div>
          </div>
        )}
        {naicsCodes.length === 0 && !adding ? <p className="text-muted-foreground/70 text-sm">No NAICS codes added yet.</p> : (
          <div className="space-y-2">
            {naicsCodes.map((naics) => (
              <div key={naics.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground font-mono font-medium">{naics.naics_code}</span>
                  {naics.is_primary && <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">Primary</Badge>}
                  {naics.size_standard_value && <span className="text-xs text-muted-foreground/70">Size: {naics.size_standard_value}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteNaics(naics.id)} className="text-muted-foreground/70 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VehiclesTab({ companyId, vehicles, onRefresh, onError, onSuccess }: { companyId?: string; vehicles: CompanyContractVehicle[]; onRefresh: () => Promise<void>; onError: (msg: string) => void; onSuccess: (msg: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ vehicle_name: "", contract_number: "", ordering_period_end: "" });

  async function addVehicle() {
    if (!companyId) { onError("Save company profile first"); return; }
    if (!newVehicle.vehicle_name.trim()) { onError("Vehicle name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/govhound/company/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_id: companyId, ...newVehicle }) });
      if (!res.ok) throw new Error("Failed to save");
      setNewVehicle({ vehicle_name: "", contract_number: "", ordering_period_end: "" }); setAdding(false); await onRefresh(); onSuccess("Contract vehicle added");
    } catch (err) { onError(err instanceof Error ? err.message : "Failed to save"); } finally { setSaving(false); }
  }

  async function deleteVehicle(id: string) {
    try { const res = await fetch(`/api/govhound/company/vehicles?id=${id}`, { method: "DELETE" }); if (!res.ok) throw new Error("Failed to delete"); await onRefresh(); onSuccess("Contract vehicle removed"); }
    catch (err) { onError(err instanceof Error ? err.message : "Failed to delete"); }
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Contract Vehicles</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setAdding(!adding)} className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"><Plus className="h-4 w-4 mr-1" />Add</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!companyId && <p className="text-muted-foreground/70 text-sm">Save your company profile first to add contract vehicles.</p>}
        {adding && companyId && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label className="text-muted-foreground">Vehicle Name *</Label><Input value={newVehicle.vehicle_name} onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_name: e.target.value })} placeholder="e.g. GSA MAS" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
              <div className="space-y-2"><Label className="text-muted-foreground">Contract Number</Label><Input value={newVehicle.contract_number} onChange={(e) => setNewVehicle({ ...newVehicle, contract_number: e.target.value })} placeholder="Contract #" className="bg-card border-border text-foreground font-mono placeholder:text-muted-foreground/70" /></div>
              <div className="space-y-2"><Label className="text-muted-foreground">Ordering Period End</Label><Input type="date" value={newVehicle.ordering_period_end} onChange={(e) => setNewVehicle({ ...newVehicle, ordering_period_end: e.target.value })} className="bg-card border-border text-foreground" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)} className="text-muted-foreground">Cancel</Button>
              <Button size="sm" onClick={addVehicle} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
            </div>
          </div>
        )}
        {vehicles.length === 0 && !adding ? <p className="text-muted-foreground/70 text-sm">No contract vehicles added yet.</p> : (
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground font-medium">{vehicle.vehicle_name}</span>
                  {vehicle.contract_number && <span className="text-sm text-muted-foreground font-mono">{vehicle.contract_number}</span>}
                  {vehicle.ordering_period_end && <span className="text-xs text-muted-foreground/70">Ends: {vehicle.ordering_period_end}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteVehicle(vehicle.id)} className="text-muted-foreground/70 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamTab({ companyId, members, onRefresh, onError, onSuccess }: { companyId?: string; members: TeamMember[]; onRefresh: () => Promise<void>; onError: (msg: string) => void; onSuccess: (msg: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", title: "", role: "", clearance_level: "none" as ClearanceLevel, years_experience: "", certifications: "", skills: "", bio: "" });

  async function addMember() {
    if (!companyId) { onError("Save company profile first"); return; }
    if (!newMember.name.trim()) { onError("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/govhound/company/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        company_id: companyId, name: newMember.name, title: newMember.title, role: newMember.role, clearance_level: newMember.clearance_level,
        years_experience: newMember.years_experience ? parseInt(newMember.years_experience, 10) : null,
        certifications: newMember.certifications ? newMember.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [],
        skills: newMember.skills ? newMember.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
        bio: newMember.bio,
      }) });
      if (!res.ok) throw new Error("Failed to save");
      setNewMember({ name: "", title: "", role: "", clearance_level: "none", years_experience: "", certifications: "", skills: "", bio: "" });
      setAdding(false); await onRefresh(); onSuccess("Team member added");
    } catch (err) { onError(err instanceof Error ? err.message : "Failed to save"); } finally { setSaving(false); }
  }

  async function deleteMember(id: string) {
    try { const res = await fetch(`/api/govhound/company/team?id=${id}`, { method: "DELETE" }); if (!res.ok) throw new Error("Failed to delete"); await onRefresh(); onSuccess("Team member removed"); }
    catch (err) { onError(err instanceof Error ? err.message : "Failed to delete"); }
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Team Members</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setAdding(!adding)} className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"><Plus className="h-4 w-4 mr-1" />Add</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!companyId && <p className="text-muted-foreground/70 text-sm">Save your company profile first to add team members.</p>}
        {adding && companyId && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label className="text-muted-foreground">Name *</Label><Input value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="Full name" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
              <div className="space-y-2"><Label className="text-muted-foreground">Title</Label><Input value={newMember.title} onChange={(e) => setNewMember({ ...newMember, title: e.target.value })} placeholder="e.g. Senior Developer" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
              <div className="space-y-2"><Label className="text-muted-foreground">Role</Label><Input value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })} placeholder="e.g. Tech Lead" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Clearance Level</Label>
                <Select value={newMember.clearance_level} onValueChange={(v) => setNewMember({ ...newMember, clearance_level: v as ClearanceLevel })}>
                  <SelectTrigger className="bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CLEARANCE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-muted-foreground">Years Experience</Label><Input type="number" value={newMember.years_experience} onChange={(e) => setNewMember({ ...newMember, years_experience: e.target.value })} placeholder="e.g. 10" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-muted-foreground">Certifications <span className="text-muted-foreground/70">(comma-separated)</span></Label><Input value={newMember.certifications} onChange={(e) => setNewMember({ ...newMember, certifications: e.target.value })} placeholder="e.g. PMP, AWS SA Pro, CISSP" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
              <div className="space-y-2"><Label className="text-muted-foreground">Skills <span className="text-muted-foreground/70">(comma-separated)</span></Label><Input value={newMember.skills} onChange={(e) => setNewMember({ ...newMember, skills: e.target.value })} placeholder="e.g. Python, AWS, Terraform, React" className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
            </div>
            <div className="space-y-2"><Label className="text-muted-foreground">Bio</Label><Textarea value={newMember.bio} onChange={(e) => setNewMember({ ...newMember, bio: e.target.value })} placeholder="Brief professional summary..." rows={3} className="bg-card border-border text-foreground placeholder:text-muted-foreground/70" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)} className="text-muted-foreground">Cancel</Button>
              <Button size="sm" onClick={addMember} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
            </div>
          </div>
        )}
        {members.length === 0 && !adding ? <p className="text-muted-foreground/70 text-sm">No team members added yet.</p> : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{member.name}</span>
                      {member.title && <span className="text-sm text-muted-foreground">- {member.title}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {member.role && <Badge variant="outline" className="text-primary border-primary/20 text-xs">{member.role}</Badge>}
                      {member.clearance_level && member.clearance_level !== "none" && <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 text-xs">{CLEARANCE_LABELS[member.clearance_level]}</Badge>}
                      {member.years_experience && <span className="text-xs text-muted-foreground/70">{member.years_experience} yrs exp</span>}
                    </div>
                    {member.skills && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {member.skills.map((skill, i) => <Badge key={i} variant="secondary" className="text-xs bg-muted text-muted-foreground border-0">{skill}</Badge>)}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteMember(member.id)} className="text-muted-foreground/70 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

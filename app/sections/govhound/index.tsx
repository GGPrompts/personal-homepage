"use client";

import { useState, useCallback } from "react";
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Calendar,
  FileText,
  DollarSign,
  Building2,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Tab components — lazy imported to avoid loading everything at once
import { DashboardTab } from "./dashboard";
import { ScannerTab } from "./scanner";
import { SavedTab } from "./saved";
import { CalendarTab } from "./calendar";
import { OpportunityDetailTab } from "./opportunity-detail";
import { ProposalEditorTab } from "./proposal-editor";
import { PastPerformanceTab } from "./past-performance";
import { PricingTab } from "./pricing";
import { CompanySettingsTab } from "./company-settings";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "scanner", label: "Scanner", icon: Search },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "past-performance", label: "Past Perf.", icon: History },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "company", label: "Company", icon: Building2 },
] as const;

type TabId = (typeof TABS)[number]["id"] | "opportunity" | "proposal";

interface GovHoundSectionProps {
  activeSubItem?: string | null;
  onSubItemHandled?: () => void;
}

export default function GovHoundSection({
  activeSubItem,
  onSubItemHandled,
}: GovHoundSectionProps) {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<
    string | null
  >(null);

  const handleSelectOpportunity = useCallback((id: string) => {
    setSelectedOpportunityId(id);
    setActiveTab("opportunity");
  }, []);

  const handleNavigateTab = useCallback((tab: string) => {
    setActiveTab(tab as TabId);
    if (tab !== "opportunity" && tab !== "proposal") {
      setSelectedOpportunityId(null);
    }
  }, []);

  const handleOpenProposal = useCallback(
    (id: string) => {
      setSelectedOpportunityId(id);
      setActiveTab("proposal");
    },
    []
  );

  const handleBack = useCallback(() => {
    if (activeTab === "proposal") {
      setActiveTab("opportunity");
    } else if (activeTab === "opportunity") {
      setActiveTab("dashboard");
    }
  }, [activeTab]);

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardTab
            onSelectOpportunity={handleSelectOpportunity}
            onNavigateTab={handleNavigateTab}
          />
        );
      case "scanner":
        return (
          <ScannerTab
            onSelectOpportunity={handleSelectOpportunity}
            onNavigateTab={handleNavigateTab}
          />
        );
      case "saved":
        return (
          <SavedTab
            onSelectOpportunity={handleSelectOpportunity}
            onNavigateTab={handleNavigateTab}
          />
        );
      case "calendar":
        return (
          <CalendarTab
            onSelectOpportunity={handleSelectOpportunity}
            onNavigateTab={handleNavigateTab}
          />
        );
      case "opportunity":
        if (!selectedOpportunityId) {
          setActiveTab("dashboard");
          return null;
        }
        return (
          <OpportunityDetailTab
            opportunityId={selectedOpportunityId}
            onSelectOpportunity={handleSelectOpportunity}
            onNavigateTab={handleNavigateTab}
            onOpenProposal={handleOpenProposal}
            onBack={handleBack}
          />
        );
      case "proposal":
        if (!selectedOpportunityId) {
          setActiveTab("dashboard");
          return null;
        }
        return (
          <ProposalEditorTab
            opportunityId={selectedOpportunityId}
            onNavigateTab={handleNavigateTab}
            onBack={handleBack}
          />
        );
      case "past-performance":
        return (
          <PastPerformanceTab
            onNavigateTab={handleNavigateTab}
          />
        );
      case "pricing":
        return <PricingTab onNavigateTab={handleNavigateTab} />;
      case "company":
        return <CompanySettingsTab onNavigateTab={handleNavigateTab} />;
      default:
        return (
          <DashboardTab
            onSelectOpportunity={handleSelectOpportunity}
            onNavigateTab={handleNavigateTab}
          />
        );
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold font-mono gradient-text-theme terminal-glow">GovHound</h1>
        <p className="text-muted-foreground">Federal contract scanner &amp; opportunity tracker</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleNavigateTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap",
                isActive
                  ? "bg-card text-foreground border border-border border-b-transparent -mb-px"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}

        {/* Show breadcrumb for drill-down views */}
        {activeTab === "opportunity" && (
          <div className="flex items-center gap-1 ml-2 text-sm text-muted-foreground">
            <span>/</span>
            <button
              onClick={handleBack}
              className="flex items-center gap-1 px-2 py-1 bg-card text-foreground border border-border border-b-transparent rounded-t-md -mb-px"
            >
              <FileText className="h-3.5 w-3.5" />
              Detail
            </button>
          </div>
        )}
        {activeTab === "proposal" && (
          <div className="flex items-center gap-1 ml-2 text-sm text-muted-foreground">
            <span>/</span>
            <button
              onClick={() => setActiveTab("opportunity")}
              className="px-2 py-1 hover:text-foreground"
            >
              Detail
            </button>
            <span>/</span>
            <button className="flex items-center gap-1 px-2 py-1 bg-card text-foreground border border-border border-b-transparent rounded-t-md -mb-px">
              <FileText className="h-3.5 w-3.5" />
              Proposal
            </button>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div>{renderTab()}</div>
    </div>
  );
}

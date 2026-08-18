import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radar, Loader2, Copy, Check, Send, Trash2, Download } from "lucide-react";
import type { DailyScan } from "@shared/schema";

type ScanBrand = "mondayceobrief" | "agentlayeros";
type FilterBrand = "all" | ScanBrand;

const BRAND_LABELS: Record<ScanBrand, string> = {
  mondayceobrief: "MondayCEOBrief",
  agentlayeros: "AgentLayerOS",
};

const FILTER_LABELS: Record<FilterBrand, string> = {
  all: "All",
  mondayceobrief: "MondayCEOBrief",
  agentlayeros: "AgentLayerOS",
};

export default function DailyScanPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<ScanBrand>("mondayceobrief");
  const [filterBrand, setFilterBrand] = useState<FilterBrand>(() => {
    const stored = localStorage.getItem("dailyScan.filterBrand");
    return (stored as FilterBrand) || "all";
  });

  const handleSetFilterBrand = (f: FilterBrand) => {
    localStorage.setItem("dailyScan.filterBrand", f);
    setFilterBrand(f);
  };

  const { data: scans = [], isLoading } = useQuery<DailyScan[]>({
    queryKey: ["/api/daily-scans"],
  });

  const runScan = useMutation({
    mutationFn: async (brand: ScanBrand) => {
      const res = await apiRequest("POST", "/api/daily-scans/run", { brand });
      return res.json();
    },
    onSuccess: (scan: DailyScan) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-scans"] });
      setExpandedId(scan.id);
      const brandLabel = BRAND_LABELS[(scan.brand as ScanBrand) ?? "mondayceobrief"] ?? scan.brand;
      toast({
        title: scan.status === "quiet" ? "Quiet day" : "Scan complete",
        description:
          scan.status === "quiet"
            ? `Limited high-signal activity today (${brandLabel}). A report was still produced.`
            : `${scan.postCount} high-signal posts found for ${brandLabel} — ${scan.scanDate}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scan failed",
        description: error?.message || "Failed to run daily scan",
        variant: "destructive",
      });
    },
  });

  const deleteScan = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/daily-scans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-scans"] });
      toast({ title: "Scan deleted" });
    },
  });

  const copyReport = async (scan: DailyScan) => {
    await navigator.clipboard.writeText(scan.report);
    setCopiedId(scan.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied", description: "Report copied to clipboard." });
  };

  const sendToRawMaterials = (scan: DailyScan) => {
    sessionStorage.setItem("pendingRawMaterials", scan.report);
    // Carry the brand forward so the run page can pre-select the right brand
    if (scan.brand) {
      sessionStorage.setItem("pendingRawMaterialsBrand", scan.brand);
    }
    navigate("/");
  };

  const downloadReport = (scan: DailyScan) => {
    const blob = new Blob([scan.report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const brandSlug = scan.brand === "agentlayeros" ? "AgentLayerOS" : "Daily_Company_Brain";
    a.download = `${brandSlug}_Scan_${scan.scanDate}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const brandBadgeVariant = (brand?: string | null) =>
    brand === "agentlayeros" ? "secondary" : "outline";

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Radar className="h-6 w-6" />
            Daily Scan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Journalist-style X scan for the AI Company Brain beat. Runs automatically at 6:00 AM
            Eastern for both brands; you can also run either lens on demand.
          </p>
        </div>

        {/* Brand selector + run button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Brand toggle */}
          <div className="flex items-center rounded-md border overflow-hidden text-sm">
            {(["mondayceobrief", "agentlayeros"] as ScanBrand[]).map((brand) => (
              <button
                key={brand}
                className={`px-3 py-1.5 transition-colors ${
                  selectedBrand === brand
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
                onClick={() => setSelectedBrand(brand)}
                data-testid={`button-brand-${brand}`}
              >
                {BRAND_LABELS[brand]}
              </button>
            ))}
          </div>

          <Button
            onClick={() => runScan.mutate(selectedBrand)}
            disabled={runScan.isPending}
            data-testid="button-run-scan"
          >
            {runScan.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning X...
              </>
            ) : (
              <>
                <Radar className="h-4 w-4 mr-2" />
                Run Scan Now
              </>
            )}
          </Button>
        </div>
      </div>

      {!isLoading && scans.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <div className="flex items-center rounded-md border overflow-hidden text-sm">
            {(["all", "mondayceobrief", "agentlayeros"] as FilterBrand[]).map((f) => (
              <button
                key={f}
                className={`px-3 py-1.5 transition-colors ${
                  filterBrand === f
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
                onClick={() => handleSetFilterBrand(f)}
                data-testid={`filter-${f}`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : scans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Radar className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No scans yet. Run your first scan to generate today's Raw Materials.</p>
          </CardContent>
        </Card>
      ) : (() => {
        const filteredScans = scans.filter(
          (scan) => filterBrand === "all" || scan.brand === filterBrand,
        );
        if (filteredScans.length === 0) {
          return (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Radar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No {FILTER_LABELS[filterBrand]} scans yet.</p>
              </CardContent>
            </Card>
          );
        }
        return (
        <div className="space-y-4">
          {filteredScans.map((scan) => {
            const isExpanded = expandedId === scan.id;
            const brandLabel = BRAND_LABELS[(scan.brand as ScanBrand) ?? "mondayceobrief"] ?? scan.brand ?? "MondayCEOBrief";
            return (
              <Card key={scan.id} data-testid={`card-scan-${scan.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <button
                      className="text-left"
                      onClick={() => setExpandedId(isExpanded ? null : scan.id)}
                      data-testid={`button-expand-${scan.id}`}
                    >
                      <CardTitle className="text-base">
                        {scan.brand === "agentlayeros"
                          ? `AgentLayerOS Daily Scan – ${scan.scanDate}`
                          : `Daily Company Brain Scan – ${scan.scanDate}`}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={brandBadgeVariant(scan.brand)}>
                          {brandLabel}
                        </Badge>
                        <Badge variant={scan.status === "quiet" ? "secondary" : "default"}>
                          {scan.status === "quiet"
                            ? "Quiet day"
                            : `${scan.postCount} high-signal posts`}
                        </Badge>
                        <Badge variant="outline">
                          {scan.triggeredBy === "scheduled" ? "Scheduled 6AM ET" : "Manual"}
                        </Badge>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={() => sendToRawMaterials(scan)}
                        data-testid={`button-send-${scan.id}`}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send to Raw Materials
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => copyReport(scan)} title="Copy">
                        {copiedId === scan.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => downloadReport(scan)} title="Download .md">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteScan.mutate(scan.id)}
                        title="Delete"
                        data-testid={`button-delete-${scan.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm font-sans bg-muted/50 rounded-md p-4 max-h-[32rem] overflow-auto">
                      {scan.report}
                    </pre>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
        );
      })()}
    </div>
  );
}

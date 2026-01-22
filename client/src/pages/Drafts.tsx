import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, Quote, TrendingUp, Lightbulb, Copy, ExternalLink, Check, Sheet, Zap } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PostDraft, WeeklyRun, DraftStatus } from "@shared/schema";

const POST_TYPE_CONFIG = {
  educational_authority: {
    icon: FileText,
    label: "Educational Authority",
    description: "Clear stance, operator-safe, calm authority",
  },
  founder_story: {
    icon: Quote,
    label: "Founder Story",
    description: "One moment, one lesson, why it matters",
  },
  trend_translation: {
    icon: TrendingUp,
    label: "Trend Translation",
    description: "Trend → operator lens → grounded POV",
  },
  system_principle: {
    icon: Lightbulb,
    label: "System Principle",
    description: "Constraint, rule, or mental model",
  },
  contrarian_pov: {
    icon: Zap,
    label: "Contrarian POV",
    description: "Thoughtful disagreement with popular narratives",
  },
};

const CONTRARIAN_ANGLE_LABELS: Record<string, string> = {
  calm_reframe: "Calm Reframe",
  operator_reality: "Operator Reality",
  systems_view: "Systems View",
  consequence_view: "Consequence View",
};

const STATUS_COLORS = {
  draft: "secondary",
  edited: "outline",
  posted: "default",
} as const;

export default function Drafts() {
  const { toast } = useToast();
  const [selectedDraft, setSelectedDraft] = useState<PostDraft | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: drafts = [], isLoading } = useQuery<PostDraft[]>({
    queryKey: ["/api/post-drafts"],
  });

  const { data: weeklyRuns = [] } = useQuery<WeeklyRun[]>({
    queryKey: ["/api/weekly-runs"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PostDraft> }) => {
      return apiRequest("PATCH", `/api/post-drafts/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Draft updated", description: "Changes have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/post-drafts"] });
      setEditDialogOpen(false);
      setSelectedDraft(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update draft.", variant: "destructive" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      return apiRequest("POST", "/api/export-to-sheets", { spreadsheetId: sheetId });
    },
    onSuccess: () => {
      toast({ title: "Exported", description: "Drafts have been exported to Google Sheets." });
      setExportDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Export failed", description: "Failed to export to Google Sheets.", variant: "destructive" });
    },
  });

  const handleCopyDraft = async (draft: PostDraft) => {
    const fullPost = `${draft.hook}\n${draft.rehook}\n\n${draft.body}${draft.cta ? `\n\n${draft.cta}` : ""}`;
    await navigator.clipboard.writeText(fullPost);
    setCopiedId(draft.id);
    toast({ title: "Copied", description: "Post copied to clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEditDraft = (draft: PostDraft) => {
    setSelectedDraft(draft);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedDraft) return;
    updateMutation.mutate({
      id: selectedDraft.id,
      data: {
        hook: selectedDraft.hook,
        rehook: selectedDraft.rehook,
        body: selectedDraft.body,
        coreInsight: selectedDraft.coreInsight,
        cta: selectedDraft.cta,
        status: selectedDraft.status,
        postUrl: selectedDraft.postUrl,
      },
    });
  };

  // Group drafts by weekly run
  const draftsByRun = drafts.reduce(
    (acc, draft) => {
      const runId = draft.weeklyRunId;
      if (!acc[runId]) acc[runId] = [];
      acc[runId].push(draft);
      return acc;
    },
    {} as Record<string, PostDraft[]>
  );

  const runIds = Object.keys(draftsByRun).sort().reverse();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Post Drafts</h1>
          <p className="text-muted-foreground mt-1">
            View, edit, and export your generated LinkedIn post drafts.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setExportDialogOpen(true)}
          disabled={drafts.length === 0}
          data-testid="button-export-sheets"
        >
          <Sheet className="h-4 w-4 mr-2" />
          Export to Sheets
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : drafts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No drafts yet</h3>
            <p className="text-muted-foreground text-center mt-1 max-w-sm">
              Run a weekly generation to create your first post drafts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={runIds[0]} className="w-full">
          <TabsList className="mb-4">
            {runIds.map((runId, index) => {
              const run = weeklyRuns.find((r) => r.id === runId);
              return (
                <TabsTrigger key={runId} value={runId} data-testid={`tab-week-${index}`}>
                  Week {run?.weekNumber || index + 1}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {runIds.map((runId) => (
            <TabsContent key={runId} value={runId}>
              <div className="grid gap-4 md:grid-cols-2">
                {draftsByRun[runId].map((draft) => {
                  const config = POST_TYPE_CONFIG[draft.postType as keyof typeof POST_TYPE_CONFIG];
                  const Icon = config?.icon || FileText;
                  const angleLabel = draft.contrarianAngle 
                    ? CONTRARIAN_ANGLE_LABELS[draft.contrarianAngle] 
                    : null;
                  return (
                    <Card key={draft.id} className="flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">
                              {config?.label || draft.postType}
                            </CardTitle>
                            {angleLabel && (
                              <Badge variant="outline" className="text-xs">
                                {angleLabel}
                              </Badge>
                            )}
                          </div>
                          <Badge variant={STATUS_COLORS[draft.status as keyof typeof STATUS_COLORS]}>
                            {draft.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {angleLabel ? `${config?.description} - ${angleLabel}` : config?.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <div className="flex-1 space-y-2">
                          <p className="font-medium text-sm">{draft.hook}</p>
                          <p className="text-sm text-muted-foreground">{draft.rehook}</p>
                          <Separator className="my-2" />
                          <ScrollArea className="h-[120px]">
                            <p className="text-sm whitespace-pre-wrap">{draft.body}</p>
                          </ScrollArea>
                          {draft.cta && (
                            <p className="text-xs text-muted-foreground italic mt-2">
                              {draft.cta}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyDraft(draft)}
                            data-testid={`button-copy-${draft.id}`}
                          >
                            {copiedId === draft.id ? (
                              <Check className="h-4 w-4 mr-1" />
                            ) : (
                              <Copy className="h-4 w-4 mr-1" />
                            )}
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDraft(draft)}
                            data-testid={`button-edit-${draft.id}`}
                          >
                            Edit
                          </Button>
                          {draft.postUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={draft.postUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Draft</DialogTitle>
            <DialogDescription>
              Make changes to this post draft.
            </DialogDescription>
          </DialogHeader>
          {selectedDraft && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Hook (Line 1)</Label>
                <Input
                  value={selectedDraft.hook}
                  onChange={(e) => setSelectedDraft({ ...selectedDraft, hook: e.target.value })}
                  data-testid="input-edit-hook"
                />
              </div>
              <div className="space-y-2">
                <Label>Rehook (Line 2)</Label>
                <Input
                  value={selectedDraft.rehook}
                  onChange={(e) => setSelectedDraft({ ...selectedDraft, rehook: e.target.value })}
                  data-testid="input-edit-rehook"
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  className="min-h-[200px]"
                  value={selectedDraft.body}
                  onChange={(e) => setSelectedDraft({ ...selectedDraft, body: e.target.value })}
                  data-testid="input-edit-body"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={selectedDraft.status}
                    onValueChange={(value) => setSelectedDraft({ ...selectedDraft, status: value as DraftStatus })}
                  >
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="edited">Edited</SelectItem>
                      <SelectItem value="posted">Posted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Post URL</Label>
                  <Input
                    placeholder="https://linkedin.com/posts/..."
                    value={selectedDraft.postUrl || ""}
                    onChange={(e) => setSelectedDraft({ ...selectedDraft, postUrl: e.target.value })}
                    data-testid="input-edit-url"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CTA / Engagement Prompt</Label>
                <Input
                  placeholder="Optional call-to-action"
                  value={selectedDraft.cta || ""}
                  onChange={(e) => setSelectedDraft({ ...selectedDraft, cta: e.target.value })}
                  data-testid="input-edit-cta"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export to Google Sheets</DialogTitle>
            <DialogDescription>
              Enter the ID of your Google Sheet to export drafts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sheetId">Spreadsheet ID</Label>
              <Input
                id="sheetId"
                placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                data-testid="input-sheet-id"
              />
              <p className="text-xs text-muted-foreground">
                Find this in the URL of your Google Sheet between /d/ and /edit
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => exportMutation.mutate(spreadsheetId)}
              disabled={exportMutation.isPending || !spreadsheetId.trim()}
              data-testid="button-confirm-export"
            >
              {exportMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

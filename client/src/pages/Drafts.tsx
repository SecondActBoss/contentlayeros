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
import { Loader2, FileText, Quote, TrendingUp, Lightbulb, Copy, ExternalLink, Check, Sheet, Zap, Newspaper, MessageCircle, Trash2, Layers, BookOpen, Globe, Package } from "lucide-react";
import { SiX, SiLinkedin } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PostDraft, WeeklyRun, DraftStatus, CarouselSlide } from "@shared/schema";

const POST_TYPE_CONFIG = {
  educational_authority: {
    icon: FileText,
    label: "Educational Authority",
    description: "Clear stance, operator-safe, calm authority",
    platform: "linkedin",
  },
  founder_story: {
    icon: Quote,
    label: "Founder Story",
    description: "One moment, one lesson, why it matters",
    platform: "linkedin",
  },
  trend_translation: {
    icon: TrendingUp,
    label: "Trend Translation",
    description: "Trend → operator lens → grounded POV",
    platform: "linkedin",
  },
  system_principle: {
    icon: Lightbulb,
    label: "System Principle",
    description: "Constraint, rule, or mental model",
    platform: "linkedin",
  },
  contrarian_pov: {
    icon: Zap,
    label: "Contrarian POV",
    description: "Thoughtful disagreement with popular narratives",
    platform: "linkedin",
  },
  newsletter_section: {
    icon: Newspaper,
    label: "Newsletter Section",
    description: "300-500 word newsletter piece with paradox and open loop",
    platform: "twitter",
  },
  twitter_pov: {
    icon: MessageCircle,
    label: "𝕏 POV Compression",
    description: "Distill multi-paragraph idea to one line",
    platform: "twitter",
  },
  twitter_paradox: {
    icon: Zap,
    label: "𝕏 Paradox / Reframe",
    description: "Counter-intuitive statement that stops scroll",
    platform: "twitter",
  },
  twitter_operator: {
    icon: FileText,
    label: "𝕏 Operator Reality",
    description: "What everyone says vs what actually works",
    platform: "twitter",
  },
  raw_tweet: {
    icon: MessageCircle,
    label: "Raw Tweet",
    description: "Single tweet, ≤280 chars, operator tone",
    platform: "twitter",
  },
  linkedin_carousel: {
    icon: Layers,
    label: "LinkedIn Carousel",
    description: "Multi-slide visual content for high engagement",
    platform: "linkedin",
  },
  authority_article: {
    icon: BookOpen,
    label: "Authority Article",
    description: "Long-form source article (800–1500 words) for all downstream content",
    platform: "linkedin",
  },
  tripack_x_article: {
    icon: SiX,
    label: "𝕏 Article",
    description: "Platform-adapted for virality and engagement (700–1200 words)",
    platform: "tripack",
  },
  tripack_linkedin_pulse: {
    icon: SiLinkedin,
    label: "LinkedIn Pulse Article",
    description: "SEO + LLM citation optimized (900–1500 words)",
    platform: "tripack",
  },
  tripack_website: {
    icon: Globe,
    label: "Website Article",
    description: "Definitive owned version with full depth (1200–2000 words)",
    platform: "tripack",
  },
};

const CAROUSEL_THEME_LABELS: Record<string, string> = {
  step_by_step: "Step-by-Step Framework",
  myth_busting: "Myth vs Reality",
  lessons_learned: "Lessons from Experience",
};

const RAW_TWEET_TYPE_LABELS: Record<string, string> = {
  pov_statement: "POV Statement",
  contrarian_reframe: "Contrarian Reframe",
  operator_reality: "Operator Reality",
  system_rule: "System Rule",
  quiet_insight: "Quiet Insight",
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [weekToDelete, setWeekToDelete] = useState<{ id: string; weekNumber: number } | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [triPublishingRunId, setTriPublishingRunId] = useState<string | null>(null);

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

  const deleteWeekMutation = useMutation({
    mutationFn: async (runId: string) => {
      return apiRequest("DELETE", `/api/weekly-runs/${runId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-runs"] });
      toast({ title: "Deleted", description: "Weekly run and all its drafts have been deleted." });
      setDeleteDialogOpen(false);
      setWeekToDelete(null);
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Failed to delete the weekly run.", variant: "destructive" });
    },
  });

  const triPublishMutation = useMutation({
    mutationFn: async (runId: string) => {
      setTriPublishingRunId(runId);
      return apiRequest("POST", `/api/weekly-runs/${runId}/tri-publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-drafts"] });
      toast({ title: "Tri-Publish Pack generated", description: "3 platform-adapted articles are ready in your drafts." });
      setTriPublishingRunId(null);
    },
    onError: () => {
      toast({ title: "Generation failed", description: "Could not generate the Tri-Publish Pack. Make sure this run has a source article.", variant: "destructive" });
      setTriPublishingRunId(null);
    },
  });

  const handleCopyDraft = async (draft: PostDraft) => {
    let fullPost: string;
    
    if (draft.postType === "authority_article") {
      fullPost = `${draft.hook}\n\n${draft.body}${draft.coreInsight ? `\n\n[Named Concept: ${draft.coreInsight}]` : ""}`;
    } else if (draft.postType === "tripack_x_article" || draft.postType === "tripack_website") {
      fullPost = `${draft.hook}\n\n${draft.body}`;
    } else if (draft.postType === "tripack_linkedin_pulse") {
      fullPost = `${draft.hook}\n\n${draft.body}${draft.rehook ? `\n\n[SEO Title: ${draft.rehook}]` : ""}${draft.coreInsight ? `\n[Meta Description: ${draft.coreInsight}]` : ""}`;
    } else if (draft.postType === "linkedin_carousel" && draft.carouselSlides) {
      const slides = draft.carouselSlides as CarouselSlide[];
      const slidesText = slides.map(slide => 
        `[Slide ${slide.slideNumber} - ${slide.slideType}]\n${slide.headline}\n${slide.body}`
      ).join("\n\n");
      fullPost = `${draft.hook}\n\n${slidesText}${draft.coreInsight ? `\n\nCore Insight: ${draft.coreInsight}` : ""}`;
    } else {
      fullPost = `${draft.hook}\n${draft.rehook}\n\n${draft.body}${draft.cta ? `\n\n${draft.cta}` : ""}`;
    }
    
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

  const runIds = Object.keys(draftsByRun).sort((a, b) => {
    const runA = weeklyRuns.find((r) => r.id === a);
    const runB = weeklyRuns.find((r) => r.id === b);
    return (runB?.weekNumber || 0) - (runA?.weekNumber || 0);
  });

  // Separate drafts by platform
  const linkedInDrafts = drafts.filter(d => {
    const config = POST_TYPE_CONFIG[d.postType as keyof typeof POST_TYPE_CONFIG];
    return config?.platform === "linkedin" || !config?.platform;
  });
  const twitterDrafts = drafts.filter(d => {
    const config = POST_TYPE_CONFIG[d.postType as keyof typeof POST_TYPE_CONFIG];
    return config?.platform === "twitter";
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Drafts</h1>
          <p className="text-muted-foreground mt-1">
            View, edit, and export your generated content drafts.
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
        <Tabs 
          value={selectedTabId || runIds[0]} 
          onValueChange={setSelectedTabId} 
          className="w-full"
        >
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <TabsList>
              {runIds.map((runId, index) => {
                const run = weeklyRuns.find((r) => r.id === runId);
                return (
                  <TabsTrigger key={runId} value={runId} data-testid={`tab-week-${index}`}>
                    Week {run?.weekNumber || index + 1}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const currentRunId = selectedTabId || runIds[0];
                const run = weeklyRuns.find((r) => r.id === currentRunId);
                if (run) {
                  setWeekToDelete({ id: run.id, weekNumber: run.weekNumber });
                  setDeleteDialogOpen(true);
                }
              }}
              data-testid="button-delete-week"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Week
            </Button>
            {(() => {
              const currentRunId = selectedTabId || runIds[0];
              const currentRun = weeklyRuns.find((r) => r.id === currentRunId);
              const hasTripack = draftsByRun[currentRunId]?.some((d) =>
                d.postType.startsWith("tripack_")
              );
              const isGenerating = triPublishingRunId === currentRunId;
              if (!currentRun?.sourceArticle || hasTripack) return null;
              return (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triPublishMutation.mutate(currentRunId)}
                  disabled={isGenerating}
                  data-testid="button-tri-publish"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Package className="h-4 w-4 mr-1" />
                  )}
                  {isGenerating ? "Generating…" : "Tri-Publish Pack"}
                </Button>
              );
            })()}
          </div>
          {runIds.map((runId) => (
            <TabsContent key={runId} value={runId}>
              <div className="grid gap-4 md:grid-cols-2">
                {draftsByRun[runId].map((draft) => {
                  const config = POST_TYPE_CONFIG[draft.postType as keyof typeof POST_TYPE_CONFIG];
                  const Icon = config?.icon || FileText;
                  const angleLabel = draft.contrarianAngle 
                    ? CONTRARIAN_ANGLE_LABELS[draft.contrarianAngle] 
                    : null;
                  const rawTweetTypeLabel = draft.rawTweetType
                    ? RAW_TWEET_TYPE_LABELS[draft.rawTweetType]
                    : null;
                  const isTripack = draft.postType.startsWith("tripack_");
                  return (
                    <Card key={draft.id} className={`flex flex-col ${draft.postType === "authority_article" || isTripack ? "md:col-span-2" : ""}`}>
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
                            {rawTweetTypeLabel && (
                              <Badge variant="outline" className="text-xs">
                                {rawTweetTypeLabel}
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
                          {/* Authority Article display */}
                          {draft.postType === "authority_article" ? (
                            <>
                              <p className="font-semibold text-base leading-tight">{draft.hook}</p>
                              {draft.coreInsight && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Named concept: {draft.coreInsight}
                                  </Badge>
                                </div>
                              )}
                              <Separator className="my-2" />
                              <ScrollArea className="h-[300px]">
                                <p className="text-sm whitespace-pre-wrap leading-relaxed" data-testid={`article-body-${draft.id}`}>
                                  {draft.body}
                                </p>
                              </ScrollArea>
                            </>
                          ) : isTripack ? (
                            /* Tri-Publish Pack article display */
                            <>
                              <p className="font-semibold text-base leading-tight" data-testid={`tripack-title-${draft.id}`}>{draft.hook}</p>
                              {draft.postType === "tripack_linkedin_pulse" && (
                                <div className="flex flex-col gap-1.5">
                                  {draft.rehook && (
                                    <div className="flex items-start gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs shrink-0">SEO Title</Badge>
                                      <span className="text-xs text-muted-foreground">{draft.rehook}</span>
                                    </div>
                                  )}
                                  {draft.coreInsight && (
                                    <div className="flex items-start gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs shrink-0">Meta</Badge>
                                      <span className="text-xs text-muted-foreground">{draft.coreInsight}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              <Separator className="my-2" />
                              <ScrollArea className="h-[320px]">
                                <p className="text-sm whitespace-pre-wrap leading-relaxed" data-testid={`tripack-body-${draft.id}`}>
                                  {draft.body}
                                </p>
                              </ScrollArea>
                            </>
                          ) : draft.postType === "linkedin_carousel" && draft.carouselSlides ? (
                            /* Carousel slides display */
                            <>
                              <p className="font-medium text-sm">{draft.hook}</p>
                              {draft.carouselTheme && (
                                <Badge variant="outline" className="text-xs">
                                  {CAROUSEL_THEME_LABELS[draft.carouselTheme] || draft.carouselTheme}
                                </Badge>
                              )}
                              <Separator className="my-2" />
                              <ScrollArea className="h-[180px]">
                                <div className="space-y-3" data-testid={`carousel-slides-${draft.id}`}>
                                  {(draft.carouselSlides as CarouselSlide[]).map((slide, idx) => (
                                    <div 
                                      key={idx} 
                                      className="p-2 rounded-md border bg-muted/30"
                                      data-testid={`carousel-slide-${draft.id}-${idx}`}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="secondary" className="text-xs px-1.5">
                                          {slide.slideNumber}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground capitalize">
                                          {slide.slideType}
                                        </span>
                                      </div>
                                      <p className="font-medium text-sm">{slide.headline}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{slide.body}</p>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                              {draft.coreInsight && (
                                <p className="text-xs text-muted-foreground italic mt-2">
                                  Core insight: {draft.coreInsight}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
                          {/* Phoenix Metadata for 𝕏 posts */}
                          {config?.platform === "twitter" && (draft.replyLikelihood || draft.dwellLikelihood || draft.fatigueRisk) && (
                            <div className="mt-3 p-2 bg-muted/50 rounded-md space-y-1" data-testid={`phoenix-metadata-${draft.id}`}>
                              <div className="flex items-center gap-2 flex-wrap">
                                {draft.replyLikelihood && (
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-reply-${draft.id}`}>
                                    Reply: {draft.replyLikelihood}
                                  </Badge>
                                )}
                                {draft.dwellLikelihood && (
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-dwell-${draft.id}`}>
                                    Dwell: {draft.dwellLikelihood}
                                  </Badge>
                                )}
                                {draft.fatigueRisk && draft.fatigueRisk !== "low" && (
                                  <Badge variant={draft.fatigueRisk === "high" ? "destructive" : "secondary"} className="text-xs" data-testid={`badge-fatigue-${draft.id}`}>
                                    Fatigue: {draft.fatigueRisk}
                                  </Badge>
                                )}
                              </div>
                              {draft.authorEngagementReminder && (
                                <p className="text-xs text-muted-foreground" data-testid={`text-engagement-reminder-${draft.id}`}>
                                  {draft.authorEngagementReminder}
                                </p>
                              )}
                            </div>
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

      {/* Delete Week Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Week {weekToDelete?.weekNumber}?</DialogTitle>
            <DialogDescription>
              This will permanently delete this weekly run and all its draft posts. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => weekToDelete && deleteWeekMutation.mutate(weekToDelete.id)}
              disabled={deleteWeekMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteWeekMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

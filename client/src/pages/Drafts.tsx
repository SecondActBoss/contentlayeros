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
import { Switch } from "@/components/ui/switch";
import { Loader2, FileText, Quote, TrendingUp, Lightbulb, Copy, ExternalLink, Check, Sheet, Zap, Newspaper, MessageCircle, Trash2, Layers, BookOpen, Globe, Package, Repeat2, CheckCircle2, Circle } from "lucide-react";
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
  quote_repost: {
    icon: Repeat2,
    label: "Quote Repost",
    description: "Natural reaction line designed to encourage quote reposts on 𝕏",
    platform: "x_repost",
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

const FIRST_COMMENT = "I wrote a deeper breakdown on this if you want to go further 👇";

const PURPOSE_TAGS: Record<string, string> = {
  educational_authority: "Build authority",
  founder_story: "Drive engagement",
  trend_translation: "Introduce contrarian POV",
  system_principle: "Reinforce core concept",
  contrarian_pov: "Challenge assumptions",
  linkedin_carousel: "Drive engagement",
  twitter_pov: "Expand reach on 𝕏",
  twitter_paradox: "Expand reach on 𝕏",
  twitter_operator: "Expand reach on 𝕏",
  raw_tweet: "Expand reach on 𝕏",
  newsletter_section: "Drive newsletter growth",
  tripack_x_article: "Reach via 𝕏",
  tripack_linkedin_pulse: "SEO + AI citations",
  tripack_website: "Owned audience",
  quote_repost: "Amplify via reposts",
};

const PLATFORM_TAGS: Record<string, string> = {
  educational_authority: "LinkedIn",
  founder_story: "LinkedIn",
  trend_translation: "LinkedIn",
  system_principle: "LinkedIn",
  contrarian_pov: "LinkedIn",
  linkedin_carousel: "LinkedIn",
  twitter_pov: "X",
  twitter_paradox: "X",
  twitter_operator: "X",
  raw_tweet: "X",
  newsletter_section: "X",
  tripack_x_article: "X",
  tripack_linkedin_pulse: "LinkedIn",
  tripack_website: "Website",
  quote_repost: "X",
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
  const [quoteRepostingRunId, setQuoteRepostingRunId] = useState<string | null>(null);
  const [executionPlanMode, setExecutionPlanMode] = useState(false);
  const [copiedFirstComment, setCopiedFirstComment] = useState<string | null>(null);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [draftChecklists, setDraftChecklists] = useState<Record<string, { posted: boolean; firstComment: boolean; replied: boolean }>>({});

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

  const quoteRepostMutation = useMutation({
    mutationFn: async (runId: string) => {
      setQuoteRepostingRunId(runId);
      return apiRequest("POST", `/api/weekly-runs/${runId}/quote-reposts`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-drafts"] });
      toast({ title: "Quote Reposts generated", description: "5 quote-repost lines are ready in your drafts." });
      setQuoteRepostingRunId(null);
    },
    onError: () => {
      toast({ title: "Generation failed", description: "Could not generate quote reposts. Make sure this run has a source article.", variant: "destructive" });
      setQuoteRepostingRunId(null);
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
    } else if (draft.postType === "quote_repost") {
      fullPost = draft.hook;
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

  // Helpers for execution plan
  const extractCoreThesis = (body: string | null): string | null => {
    if (!body) return null;
    const sentences = body.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 2).join(" ").trim() || null;
  };

  const copyFirstComment = async (key: string) => {
    await navigator.clipboard.writeText(FIRST_COMMENT);
    setCopiedFirstComment(key);
    setTimeout(() => setCopiedFirstComment(null), 2000);
  };

  const toggleChecklist = (draftId: string, key: "posted" | "firstComment" | "replied") => {
    setDraftChecklists(prev => ({
      ...prev,
      [draftId]: {
        posted: false, firstComment: false, replied: false,
        ...prev[draftId],
        [key]: !(prev[draftId]?.[key]),
      },
    }));
  };

  const toggleComplete = (draftId: string) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(draftId)) next.delete(draftId);
      else next.add(draftId);
      return next;
    });
  };

  const renderDraftBody = (draft: PostDraft) => {
    const isTripack = draft.postType.startsWith("tripack_");
    if (draft.postType === "authority_article" || isTripack) {
      return (
        <>
          <p className="font-semibold text-base leading-tight">{draft.hook}</p>
          {draft.postType === "tripack_linkedin_pulse" && (
            <div className="flex flex-col gap-1.5">
              {draft.rehook && <div className="flex items-start gap-2 flex-wrap"><Badge variant="outline" className="text-xs shrink-0">SEO Title</Badge><span className="text-xs text-muted-foreground">{draft.rehook}</span></div>}
              {draft.coreInsight && <div className="flex items-start gap-2 flex-wrap"><Badge variant="outline" className="text-xs shrink-0">Meta</Badge><span className="text-xs text-muted-foreground">{draft.coreInsight}</span></div>}
            </div>
          )}
          <Separator className="my-2" />
          <ScrollArea className="h-[260px]"><p className="text-sm whitespace-pre-wrap leading-relaxed">{draft.body}</p></ScrollArea>
        </>
      );
    }
    if (draft.postType === "linkedin_carousel" && draft.carouselSlides) {
      const slides = draft.carouselSlides as CarouselSlide[];
      return (
        <>
          <p className="font-medium text-sm">{draft.hook}</p>
          {draft.carouselTheme && <Badge variant="outline" className="text-xs">{CAROUSEL_THEME_LABELS[draft.carouselTheme] || draft.carouselTheme}</Badge>}
          <Separator className="my-2" />
          <ScrollArea className="h-[160px]">
            <div className="space-y-3">
              {slides.map((slide, idx) => (
                <div key={idx} className="p-2 rounded-md border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className="text-xs px-1.5">{slide.slideNumber}</Badge><span className="text-xs text-muted-foreground capitalize">{slide.slideType}</span></div>
                  <p className="font-medium text-sm">{slide.headline}</p>
                  <p className="text-xs text-muted-foreground mt-1">{slide.body}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      );
    }
    if (draft.postType === "quote_repost") {
      return (
        <div className="space-y-2">
          {draft.rehook && <Badge variant="secondary" className="text-xs">{draft.rehook}</Badge>}
          <p className="text-sm font-medium leading-snug">"{draft.hook}"</p>
        </div>
      );
    }
    return (
      <>
        <p className="font-medium text-sm">{draft.hook}</p>
        <p className="text-sm text-muted-foreground">{draft.rehook}</p>
        <Separator className="my-2" />
        <ScrollArea className="h-[120px]"><p className="text-sm whitespace-pre-wrap">{draft.body}</p></ScrollArea>
        {draft.cta && <p className="text-xs text-muted-foreground italic mt-2">{draft.cta}</p>}
      </>
    );
  };

  const renderExecutionPlanForRun = (runId: string) => {
    const runDrafts = draftsByRun[runId];
    if (!runDrafts?.length) return null;

    const authorityDraft = runDrafts.find(d => d.postType === "authority_article");
    const linkedinPulseDraft = runDrafts.find(d => d.postType === "tripack_linkedin_pulse");
    const xArticleDraft = runDrafts.find(d => d.postType === "tripack_x_article");
    const day1Article = linkedinPulseDraft || authorityDraft;

    const feedPostOrder = ["educational_authority", "founder_story", "trend_translation", "system_principle", "contrarian_pov"];
    const day1FeedPost = runDrafts
      .filter(d => feedPostOrder.includes(d.postType))
      .sort((a, b) => feedPostOrder.indexOf(a.postType) - feedPostOrder.indexOf(b.postType))[0];

    const day1Ids = new Set([day1Article?.id, day1FeedPost?.id, xArticleDraft?.id].filter(Boolean));
    const section2Drafts = runDrafts.filter(d => !day1Ids.has(d.id) && d.postType !== "authority_article");
    const dayLabels = ["Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

    const allTrackedDrafts = [
      ...(day1Article ? [day1Article] : []),
      ...(day1FeedPost ? [day1FeedPost] : []),
      ...(xArticleDraft ? [xArticleDraft] : []),
      ...section2Drafts,
    ];
    const completedCount = allTrackedDrafts.filter(d => completedItems.has(d.id)).length;
    const totalCount = allTrackedDrafts.length;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const checklistSection = (draft: PostDraft) => {
      const cl = draftChecklists[draft.id] || { posted: false, firstComment: false, replied: false };
      const isCompleted = completedItems.has(draft.id);
      const checklistItems: { key: "posted" | "firstComment" | "replied"; label: string }[] = [
        { key: "posted", label: "Posted" },
        { key: "firstComment", label: "1st Comment Added" },
        { key: "replied", label: "Replied to comments (first 30 min)" },
      ];
      return (
        <div className="space-y-3 pt-3 border-t" data-testid={`checklist-${draft.id}`}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Execution Checklist</p>
          <div className="space-y-2">
            {checklistItems.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleChecklist(draft.id, key)}
                className="flex items-center gap-2.5 w-full text-left hover:opacity-75 transition-opacity"
                data-testid={`checklist-${key}-${draft.id}`}
              >
                {cl[key] ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                )}
                <span className={`text-sm ${cl[key] ? "line-through text-muted-foreground" : ""}`}>{label}</span>
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant={isCompleted ? "secondary" : "default"}
            className="w-full"
            onClick={() => toggleComplete(draft.id)}
            data-testid={`button-mark-complete-${draft.id}`}
          >
            {isCompleted ? (
              <><Check className="h-4 w-4 mr-2" />Completed — click to undo</>
            ) : (
              "Mark Complete"
            )}
          </Button>
        </div>
      );
    };

    const stepCircle = (n: number) => (
      <div className="absolute left-0 top-3 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{n}</div>
    );

    const firstCommentBox = (fcKey: string) => (
      <div className="p-3 rounded-md bg-muted/50 border space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">1st Comment</p>
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyFirstComment(fcKey)} data-testid={`button-copy-fc-${fcKey}`}>
            {copiedFirstComment === fcKey ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copiedFirstComment === fcKey ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-sm">{FIRST_COMMENT}</p>
      </div>
    );

    const actionRow = (draft: PostDraft) => (
      <div className="flex gap-2 pt-3 border-t">
        <Button variant="outline" size="sm" onClick={() => handleCopyDraft(draft)} data-testid={`button-copy-${draft.id}`}>
          {copiedId === draft.id ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}Copy
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleEditDraft(draft)} data-testid={`button-edit-${draft.id}`}>Edit</Button>
        {draft.postUrl && <Button variant="ghost" size="sm" asChild><a href={draft.postUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>}
      </div>
    );

    return (
      <div className="space-y-10" data-testid="execution-plan-view">
        {/* ── PROGRESS BAR ─────────────────────────────────────────────────── */}
        {totalCount > 0 && (
          <div className="rounded-xl border bg-card p-4 space-y-2.5" data-testid="execution-progress-bar">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Execution Progress</span>
              <span className="text-sm font-semibold text-primary" data-testid="progress-label">
                {completedCount} / {totalCount} completed
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
                data-testid="progress-fill"
              />
            </div>
            {completedCount === totalCount && totalCount > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5" data-testid="progress-complete-msg">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All items complete — system executed.
              </p>
            )}
          </div>
        )}

        {/* ── SECTION 1: DAY 1 LAUNCH ───────────────────────────────────────── */}
        {(day1Article || day1FeedPost || xArticleDraft) && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-lg">🚀</span>
              <h3 className="font-semibold text-base tracking-tight">DAY 1 LAUNCH</h3>
              <Badge variant="default" className="text-xs">Execute in sequence</Badge>
            </div>
            <div className="space-y-5">
              {/* Step 1: LinkedIn Article */}
              {day1Article && (
                <div className="relative pl-10" data-testid="execution-step-article">
                  {stepCircle(1)}
                  <Card className={`transition-opacity duration-300 ${completedItems.has(day1Article.id) ? "opacity-50" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Publish FIRST</p>
                          <CardTitle className="text-sm font-medium mt-0.5">{linkedinPulseDraft ? "LinkedIn Pulse Article" : "LinkedIn Authority Article"}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {completedItems.has(day1Article.id) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          <Badge variant={STATUS_COLORS[day1Article.status as keyof typeof STATUS_COLORS]}>{day1Article.status}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {renderDraftBody(day1Article)}
                      <p className="text-xs text-muted-foreground italic">Post this as a LinkedIn Article. Builds authority and long-term visibility (SEO + AI citations).</p>
                      {actionRow(day1Article)}
                      {checklistSection(day1Article)}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 2: LinkedIn Feed Post */}
              {day1FeedPost && (
                <div className="relative pl-10" data-testid="execution-step-feed-post">
                  {stepCircle(2)}
                  <Card className={`transition-opacity duration-300 ${completedItems.has(day1FeedPost.id) ? "opacity-50" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Post 5–10 minutes AFTER article</p>
                          <CardTitle className="text-sm font-medium mt-0.5">#1 LinkedIn Feed Post</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{POST_TYPE_CONFIG[day1FeedPost.postType as keyof typeof POST_TYPE_CONFIG]?.label}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {completedItems.has(day1FeedPost.id) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          <Badge variant={STATUS_COLORS[day1FeedPost.status as keyof typeof STATUS_COLORS]}>{day1FeedPost.status}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {renderDraftBody(day1FeedPost)}
                      {firstCommentBox(`fc-li-${day1FeedPost.id}`)}
                      <p className="text-xs text-muted-foreground italic">Post this as the first comment immediately after publishing your post. Add your article link.</p>
                      {actionRow(day1FeedPost)}
                      {checklistSection(day1FeedPost)}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 3: X Article */}
              {xArticleDraft && (
                <div className="relative pl-10" data-testid="execution-step-x-article">
                  {stepCircle(3)}
                  <Card className={`transition-opacity duration-300 ${completedItems.has(xArticleDraft.id) ? "opacity-50" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Publish after LinkedIn</p>
                          <CardTitle className="text-sm font-medium mt-0.5">X Article (Long-form)</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {completedItems.has(xArticleDraft.id) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          <Badge variant={STATUS_COLORS[xArticleDraft.status as keyof typeof STATUS_COLORS]}>{xArticleDraft.status}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {renderDraftBody(xArticleDraft)}
                      {firstCommentBox(`fc-x-${xArticleDraft.id}`)}
                      <p className="text-xs text-muted-foreground italic">Use this as your reply or follow-up tweet to drive traffic back to your article.</p>
                      {actionRow(xArticleDraft)}
                      {checklistSection(xArticleDraft)}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 2: SUPPORTING CONTENT ──────────────────────────────────── */}
        {section2Drafts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-lg">📅</span>
              <h3 className="font-semibold text-base tracking-tight">SUPPORTING CONTENT</h3>
              <Badge variant="outline" className="text-xs">Week 1</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {section2Drafts.map((draft, idx) => {
                const config = POST_TYPE_CONFIG[draft.postType as keyof typeof POST_TYPE_CONFIG];
                const Icon = config?.icon || FileText;
                const dayLabel = dayLabels[idx] || `Day ${idx + 2}`;
                const purposeTag = PURPOSE_TAGS[draft.postType] || "Supporting content";
                const platformTag = PLATFORM_TAGS[draft.postType];
                const isWide = draft.postType === "linkedin_carousel" || draft.postType.startsWith("tripack_");
                return (
                  <Card key={draft.id} className={`flex flex-col transition-opacity duration-300${isWide ? " md:col-span-2" : ""}${completedItems.has(draft.id) ? " opacity-50" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-sm font-medium">{config?.label || draft.postType}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {completedItems.has(draft.id) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          <Badge variant={STATUS_COLORS[draft.status as keyof typeof STATUS_COLORS]}>{draft.status}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-timing-${draft.id}`}>{dayLabel}</Badge>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-purpose-${draft.id}`}>{purposeTag}</Badge>
                        {platformTag && <Badge variant="outline" className="text-xs" data-testid={`badge-platform-${draft.id}`}>{platformTag}</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 flex-1">
                      <div className="flex-1 space-y-2">{renderDraftBody(draft)}</div>
                      {actionRow(draft)}
                      {checklistSection(draft)}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SECTION 3: CORE ARTICLE (REFERENCE) ────────────────────────────── */}
        {authorityDraft && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-lg">🧠</span>
              <h3 className="font-semibold text-base tracking-tight">CORE ARTICLE (REFERENCE)</h3>
            </div>
            <Card data-testid="section-core-article">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Core Authority Article (Source)</CardTitle>
                <CardDescription className="text-xs">All content in this run is derived from this</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {authorityDraft.coreInsight && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Concepts Extracted</p>
                    <div className="flex flex-wrap gap-2">
                      {authorityDraft.coreInsight.split(" + ").map((concept, i) => (
                        <Badge key={i} variant="default" className="text-xs" data-testid={`ref-concept-${i}`}>{concept.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {authorityDraft.body && (() => {
                  const thesis = extractCoreThesis(authorityDraft.body);
                  return thesis ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Core Thesis</p>
                      <p className="text-sm italic text-muted-foreground" data-testid="ref-core-thesis">{thesis}</p>
                    </div>
                  ) : null;
                })()}
                <Separator />
                <p className="font-medium text-sm">{authorityDraft.hook}</p>
                <ScrollArea className="h-[160px]">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{authorityDraft.body}</p>
                </ScrollArea>
                {actionRow(authorityDraft)}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Drafts</h1>
          <p className="text-muted-foreground mt-1">
            {executionPlanMode ? "Execution-ready publishing sequence — follow top to bottom." : "View, edit, and export your generated content drafts."}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-card" data-testid="toggle-execution-mode">
            <Switch
              id="execution-mode-toggle"
              checked={executionPlanMode}
              onCheckedChange={setExecutionPlanMode}
            />
            <Label htmlFor="execution-mode-toggle" className="text-sm font-medium cursor-pointer whitespace-nowrap">
              {executionPlanMode ? "Execution Plan" : "Drafts View"}
            </Label>
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
              const hasSourceArticle = !!currentRun?.sourceArticle;
              const hasQuoteReposts = draftsByRun[currentRunId]?.some((d) =>
                d.postType === "quote_repost"
              );
              const isQuoteGenerating = quoteRepostingRunId === currentRunId;
              return (
                <>
                  {!hasTripack && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => hasSourceArticle && triPublishMutation.mutate(currentRunId)}
                      disabled={isGenerating || !hasSourceArticle}
                      title={!hasSourceArticle ? "Re-run generation to enable Tri-Publish Pack" : undefined}
                      data-testid="button-tri-publish"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Package className="h-4 w-4 mr-1" />
                      )}
                      {isGenerating ? "Generating…" : "Tri-Publish Pack"}
                    </Button>
                  )}
                  {!hasQuoteReposts && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => hasSourceArticle && quoteRepostMutation.mutate(currentRunId)}
                      disabled={isQuoteGenerating || !hasSourceArticle}
                      title={!hasSourceArticle ? "Re-run generation to enable Quote Repost Engine" : undefined}
                      data-testid="button-quote-reposts"
                    >
                      {isQuoteGenerating ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Repeat2 className="h-4 w-4 mr-1" />
                      )}
                      {isQuoteGenerating ? "Generating…" : "Quote Reposts"}
                    </Button>
                  )}
                </>
              );
            })()}
          </div>
          {runIds.map((runId) => (
            <TabsContent key={runId} value={runId}>
              {executionPlanMode ? renderExecutionPlanForRun(runId) : (
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
                          ) : draft.postType === "quote_repost" ? (
                            /* Quote Repost display */
                            <div className="space-y-2">
                              {draft.rehook && (
                                <Badge variant="secondary" className="text-xs" data-testid={`badge-repost-type-${draft.id}`}>
                                  {draft.rehook}
                                </Badge>
                              )}
                              <p className="text-sm font-medium leading-snug" data-testid={`quote-repost-line-${draft.id}`}>
                                "{draft.hook}"
                              </p>
                            </div>
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
              )}
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

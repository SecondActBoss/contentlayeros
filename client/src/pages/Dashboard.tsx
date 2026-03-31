import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Play, FileText, Lightbulb, TrendingUp, Quote, Zap, Newspaper, MessageCircle, ChevronDown, Brain, Target, Search, Database, ShoppingCart, Focus, BookOpen, Check, Copy } from "lucide-react";
import { SiX, SiLinkedin } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContextItem, PostDraft, ExtractedSignals, DistributionMode, ThinkingGatesOutput } from "@shared/schema";

const POST_TYPE_ICONS: Record<string, any> = {
  educational_authority: FileText,
  founder_story: Quote,
  trend_translation: TrendingUp,
  system_principle: Lightbulb,
  contrarian_pov: Zap,
  authority_article: BookOpen,
  newsletter_section: Newspaper,
  twitter_pov: MessageCircle,
  twitter_paradox: Zap,
  twitter_operator: FileText,
  raw_tweet: MessageCircle,
};

const POST_TYPE_LABELS: Record<string, string> = {
  educational_authority: "Educational Authority",
  founder_story: "Founder Story",
  trend_translation: "Trend Translation",
  system_principle: "System Principle",
  contrarian_pov: "Contrarian POV",
  authority_article: "Authority Article",
  newsletter_section: "Newsletter Section",
  twitter_pov: "𝕏 POV Compression",
  twitter_paradox: "𝕏 Paradox / Reframe",
  twitter_operator: "𝕏 Operator Reality",
  raw_tweet: "Raw Tweet",
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

type ArticleAnalysis = {
  namedConcepts: string[];
  coreThesis: string;
  keyPhrases: string[];
  linkedinHooks: string[];
  xHooks: string[];
  contrarianAngles: string[];
};

export default function Dashboard() {
  const { toast } = useToast();
  const [rawInput, setRawInput] = useState("");
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [generatedPosts, setGeneratedPosts] = useState<PostDraft[]>([]);
  const [extractedSignals, setExtractedSignals] = useState<ExtractedSignals | null>(null);
  const [distributionMode, setDistributionMode] = useState<DistributionMode>("linkedin");
  const [isContrarianMode, setIsContrarianMode] = useState(false);
  const [isRawTweetMode, setIsRawTweetMode] = useState(false);
  const [isAuthorityArticleMode, setIsAuthorityArticleMode] = useState(false);
  const [articleAngle, setArticleAngle] = useState("");
  const [externalSignal, setExternalSignal] = useState("");
  const [framingNote, setFramingNote] = useState("");
  const [gatesOpen, setGatesOpen] = useState(false);
  const [gateOutputs, setGateOutputs] = useState<ThinkingGatesOutput | null>(null);
  const [gateBeliefStressTest, setGateBeliefStressTest] = useState(false);
  const [gateExperienceMiner, setGateExperienceMiner] = useState(false);
  const [gateClarityDestroyer, setGateClarityDestroyer] = useState(false);
  const [gateContentInfrastructure, setGateContentInfrastructure] = useState(false);
  const [gateSilentSalesMap, setGateSilentSalesMap] = useState(false);
  const [gateWeeklyOperatorFocus, setGateWeeklyOperatorFocus] = useState(false);
  const [articleAnalysis, setArticleAnalysis] = useState<ArticleAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedAnalysisItem, setCopiedAnalysisItem] = useState<string | null>(null);
  // Distribution Pack
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [distributionPack, setDistributionPack] = useState<{ xArticle: PostDraft; linkedinPulse: PostDraft; website: PostDraft } | null>(null);
  const [distributionQuoteReposts, setDistributionQuoteReposts] = useState<PostDraft[]>([]);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [includeQuoteReposts, setIncludeQuoteReposts] = useState(false);
  const [includeLlmOptimization, setIncludeLlmOptimization] = useState(false);
  const [copiedPackItem, setCopiedPackItem] = useState<string | null>(null);

  const { data: contextItems = [], isLoading: loadingContext } = useQuery<ContextItem[]>({
    queryKey: ["/api/context-items"],
  });

  const runArticleAnalysis = async (articleTitle: string, articleBody: string) => {
    setIsAnalyzing(true);
    try {
      const response = await apiRequest("POST", "/api/article-analysis", { articleTitle, articleBody });
      const data = await response.json();
      setArticleAnalysis(data);
    } catch {
      // silently fail — analysis is non-critical
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateDistributionPack = async () => {
    if (!currentRunId) return;
    setIsGeneratingPack(true);
    try {
      const triRes = await apiRequest("POST", `/api/weekly-runs/${currentRunId}/tri-publish`, { includeLlmOptimization });
      const triData: PostDraft[] = await triRes.json();
      const xArticle = triData.find((p) => p.postType === "tripack_x_article");
      const linkedinPulse = triData.find((p) => p.postType === "tripack_linkedin_pulse");
      const website = triData.find((p) => p.postType === "tripack_website");
      if (xArticle && linkedinPulse && website) {
        setDistributionPack({ xArticle, linkedinPulse, website });
      }
      if (includeQuoteReposts) {
        const qrRes = await apiRequest("POST", `/api/weekly-runs/${currentRunId}/quote-reposts`);
        const qrData: PostDraft[] = await qrRes.json();
        setDistributionQuoteReposts(qrData);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/post-drafts"] });
      toast({ title: "Distribution Pack ready", description: "3 platform-adapted versions generated." });
    } catch {
      toast({ title: "Failed to generate Distribution Pack", variant: "destructive" });
    } finally {
      setIsGeneratingPack(false);
    }
  };

  const generateMutation = useMutation({
    mutationFn: async (data: { 
      rawInput: string; 
      selectedContextIds: string[];
      distributionMode?: DistributionMode;
      isContrarianMode?: boolean;
      isRawTweetMode?: boolean;
      isAuthorityArticleMode?: boolean;
      articleAngle?: string;
      externalSignal?: string;
      framingNote?: string;
      gateBeliefStressTest?: boolean;
      gateExperienceMiner?: boolean;
      gateClarityDestroyer?: boolean;
      gateContentInfrastructure?: boolean;
      gateSilentSalesMap?: boolean;
      gateWeeklyOperatorFocus?: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/weekly-runs", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      setGeneratedPosts(data.posts || []);
      setExtractedSignals(data.extractedSignals || null);
      setGateOutputs(data.gateOutputs || null);
      setArticleAnalysis(null);
      setCurrentRunId(data.id || null);
      setDistributionPack(null);
      setDistributionQuoteReposts([]);
      const postCount = data.posts?.length || 0;
      let modeDesc: string;
      if (distributionMode === "twitter") {
        if (isRawTweetMode) {
          modeDesc = `${postCount} raw tweets have been created.`;
        } else {
          modeDesc = `1 𝕏 Article + 9 𝕏 posts have been created.`;
        }
      } else if (isAuthorityArticleMode) {
        modeDesc = `Authority article generated and used as the source for ${postCount - 1} content drafts.`;
        const authorityDraft = data.posts?.find((p: any) => p.postType === "authority_article");
        if (authorityDraft) {
          runArticleAnalysis(authorityDraft.hook, authorityDraft.body);
        }
      } else if (isContrarianMode) {
        modeDesc = `${postCount} contrarian LinkedIn post drafts have been created.`;
      } else {
        modeDesc = `${postCount} LinkedIn post drafts have been created.`;
      }
      const gateCount = Object.keys(data.gateOutputs || {}).length;
      if (gateCount > 0) {
        modeDesc += ` ${gateCount} thinking gate${gateCount > 1 ? 's' : ''} analyzed.`;
      }
      toast({
        title: "Content generated",
        description: modeDesc,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/post-drafts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleContextToggle = (id: string) => {
    setSelectedContextIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    // For LinkedIn contrarian mode, need external signal
    if (distributionMode === "linkedin" && isContrarianMode && !externalSignal.trim()) {
      toast({
        title: "External signal required",
        description: "Please provide the post or article you want to respond to.",
        variant: "destructive",
      });
      return;
    }
    // All modes need raw input
    if (!rawInput.trim()) {
      toast({
        title: "Input required",
        description: "Please provide your materials before generating.",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate({ 
      rawInput, 
      selectedContextIds,
      distributionMode,
      isContrarianMode: distributionMode === "linkedin" ? isContrarianMode : false,
      isRawTweetMode: distributionMode === "twitter" ? isRawTweetMode : false,
      isAuthorityArticleMode: distributionMode === "linkedin" ? isAuthorityArticleMode : false,
      articleAngle: isAuthorityArticleMode ? articleAngle : undefined,
      externalSignal: isContrarianMode ? externalSignal : undefined,
      framingNote: isContrarianMode ? framingNote : undefined,
      gateBeliefStressTest,
      gateExperienceMiner,
      gateClarityDestroyer,
      gateContentInfrastructure,
      gateSilentSalesMap,
      gateWeeklyOperatorFocus,
    });
  };

  const anyGateEnabled = gateBeliefStressTest || gateExperienceMiner || gateClarityDestroyer || 
                         gateContentInfrastructure || gateSilentSalesMap || gateWeeklyOperatorFocus;

  const groupedContext = contextItems.reduce(
    (acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    },
    {} as Record<string, ContextItem[]>
  );

  const contextLabels: Record<string, string> = {
    icp: "ICP Context",
    positioning: "Positioning",
    language_rules: "Language Rules",
    visual: "Visual Reference",
  };

  const getPageTitle = () => {
    if (distributionMode === "twitter") {
      return isRawTweetMode ? "Raw Tweet Mode" : "𝕏 Mode";
    }
    if (isAuthorityArticleMode) return "Authority Article (Source of Truth)";
    if (isContrarianMode) return "Be Contrary";
    return "Content Run";
  };

  const getPageDescription = () => {
    if (distributionMode === "twitter") {
      if (isRawTweetMode) {
        return "Generate 5-7 single tweets. Quick drafts, varied types, operator tone.";
      }
      return "Generate 1 𝕏 Article + 9 𝕏 posts from your weekly materials.";
    }
    if (isAuthorityArticleMode) {
      return "This article becomes the foundation for all posts, carousels, and X content.";
    }
    if (isContrarianMode) {
      return "Generate thoughtful contrarian takes in response to popular narratives.";
    }
    return "Turn raw materials into a complete content system — starting with a core authority article.";
  };

  const getButtonLabel = () => {
    if (distributionMode === "twitter") {
      return isRawTweetMode ? "Generate Raw Tweets" : "Generate 𝕏 Content";
    }
    if (isAuthorityArticleMode) return "Generate Content System";
    if (isContrarianMode) return "Generate 4 Contrarian Posts";
    return "Generate 4 Posts";
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* Distribution Mode Tabs */}
      <Tabs 
        value={distributionMode} 
        onValueChange={(v) => setDistributionMode(v as DistributionMode)}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="linkedin" data-testid="tab-linkedin">
            <SiLinkedin className="h-3 w-3 mr-2" />
            LinkedIn
          </TabsTrigger>
          <TabsTrigger value="twitter" data-testid="tab-twitter">
            <SiX className="h-3 w-3 mr-2" />
            Mode
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {getPageTitle()}
          </h1>
          <p className="text-muted-foreground mt-1">
            {getPageDescription()}
          </p>
          {distributionMode === "linkedin" && !isContrarianMode && (
            <p className="text-xs text-muted-foreground/70 mt-2 italic">
              Tip: paste messy thoughts - clarity comes later.
            </p>
          )}
          {distributionMode === "twitter" && (
            <p className="text-xs text-muted-foreground/70 mt-2 italic">
              No hashtags. No emojis. Clarity over cleverness.
            </p>
          )}
        </div>
        {distributionMode === "linkedin" && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="authority-article-toggle" className="text-sm font-medium">
                  Authority Article
                </Label>
                <Switch
                  id="authority-article-toggle"
                  checked={isAuthorityArticleMode}
                  onCheckedChange={(checked) => {
                    setIsAuthorityArticleMode(checked);
                    if (checked) setIsContrarianMode(false);
                  }}
                  data-testid="toggle-authority-article-mode"
                />
              </div>
              {isAuthorityArticleMode && (
                <p className="text-xs text-muted-foreground text-right max-w-[220px]">
                  All posts and carousels will be derived from this article for consistency and authority.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="contrarian-toggle" className="text-sm font-medium">
                Be Contrary
              </Label>
              <Switch
                id="contrarian-toggle"
                checked={isContrarianMode}
                onCheckedChange={(checked) => {
                  setIsContrarianMode(checked);
                  if (checked) setIsAuthorityArticleMode(false);
                }}
                data-testid="toggle-contrarian-mode"
              />
            </div>
          </div>
        )}
        {distributionMode === "twitter" && (
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="raw-tweet-toggle" className="text-sm font-medium">
              Raw Tweets
            </Label>
            <Switch
              id="raw-tweet-toggle"
              checked={isRawTweetMode}
              onCheckedChange={setIsRawTweetMode}
              data-testid="toggle-raw-tweet-mode"
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* LinkedIn Contrarian Mode */}
          {distributionMode === "linkedin" && isContrarianMode ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">External Signal</CardTitle>
                <CardDescription>
                  Paste the post, article, or narrative you want to thoughtfully disagree with
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste the external content here...

Examples:
- A viral X post
- A LinkedIn post
- An article excerpt
- A popular hot take or narrative"
                  className="min-h-[200px] resize-none text-sm"
                  value={externalSignal}
                  onChange={(e) => setExternalSignal(e.target.value)}
                  data-testid="input-external-signal"
                />
                <div>
                  <Label htmlFor="framing-note" className="text-sm font-medium">
                    Framing Note (optional)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Guide the angle of your disagreement
                  </p>
                  <Textarea
                    id="framing-note"
                    placeholder="e.g., 'I agree with the problem, not the conclusion' or 'This is right for creators, wrong for operators'"
                    className="min-h-[80px] resize-none text-sm"
                    value={framingNote}
                    onChange={(e) => setFramingNote(e.target.value)}
                    data-testid="input-framing-note"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Raw Materials</CardTitle>
                <CardDescription>
                  Voice notes, call transcripts, build notes, reflections, links, opinions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Paste your weekly materials here...

Examples:
- Voice note transcripts
- Call transcripts  
- Build notes and decisions
- Slack thoughts
- Personal reflections
- Links to articles or X posts
- Opinions or decisions made"
                  className="min-h-[280px] resize-none text-sm"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  data-testid="input-raw-materials"
                />
                {isAuthorityArticleMode && (
                  <p className="text-xs text-muted-foreground italic" data-testid="hint-concept-naming">
                    Tip: Strong articles often introduce a named concept (e.g., "Coordination Debt").
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Authority Article Angle - optional field when article mode is on */}
          {distributionMode === "linkedin" && isAuthorityArticleMode && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  Article Angle
                  <Badge variant="secondary" className="text-xs font-normal">optional</Badge>
                </CardTitle>
                <CardDescription>
                  Focus the article on a specific angle, tension, or framing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Define the tension or idea (e.g., 'Missed calls = silent revenue loss' or 'AI Employees vs tools')"
                  className="min-h-[80px] resize-none text-sm"
                  value={articleAngle}
                  onChange={(e) => setArticleAngle(e.target.value)}
                  data-testid="input-article-angle"
                />
              </CardContent>
            </Card>
          )}

          {/* Thinking Gates - Optional */}
          <Collapsible open={gatesOpen} onOpenChange={setGatesOpen}>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <button 
                    type="button"
                    className="w-full text-left cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-expanded={gatesOpen}
                    data-testid="button-toggle-thinking-gates"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">Thinking Gates</CardTitle>
                        {anyGateEnabled && (
                          <Badge variant="secondary" className="text-xs">
                            {[gateBeliefStressTest, gateExperienceMiner, gateClarityDestroyer, gateContentInfrastructure, gateSilentSalesMap, gateWeeklyOperatorFocus].filter(Boolean).length} active
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${gatesOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <CardDescription className="mt-1">
                      Optional analysis layers to pressure-test your content
                    </CardDescription>
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3 p-3 rounded-md border">
                      <Checkbox
                        id="gate-belief"
                        checked={gateBeliefStressTest}
                        onCheckedChange={(checked) => setGateBeliefStressTest(!!checked)}
                        data-testid="gate-belief-stress-test"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="gate-belief" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                          <Target className="h-3 w-3" />
                          Belief Stress Test
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Force clarity around the belief driving this content
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-md border">
                      <Checkbox
                        id="gate-experience"
                        checked={gateExperienceMiner}
                        onCheckedChange={(checked) => setGateExperienceMiner(!!checked)}
                        data-testid="gate-experience-miner"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="gate-experience" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                          <Search className="h-3 w-3" />
                          Experience Miner
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Ensure content is grounded in decisions, not advice
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-md border">
                      <Checkbox
                        id="gate-clarity"
                        checked={gateClarityDestroyer}
                        onCheckedChange={(checked) => setGateClarityDestroyer(!!checked)}
                        data-testid="gate-clarity-destroyer"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="gate-clarity" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                          <Zap className="h-3 w-3" />
                          Clarity Destroyer
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Eliminate vague thinking before distribution
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-md border">
                      <Checkbox
                        id="gate-infrastructure"
                        checked={gateContentInfrastructure}
                        onCheckedChange={(checked) => setGateContentInfrastructure(!!checked)}
                        data-testid="gate-content-infrastructure"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="gate-infrastructure" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                          <Database className="h-3 w-3" />
                          Content as Infrastructure
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Treat content as a durable business asset
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-md border">
                      <Checkbox
                        id="gate-sales"
                        checked={gateSilentSalesMap}
                        onCheckedChange={(checked) => setGateSilentSalesMap(!!checked)}
                        data-testid="gate-silent-sales-map"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="gate-sales" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                          <ShoppingCart className="h-3 w-3" />
                          Silent Sales Map
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Ensure content reduces friction before sales
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-md border">
                      <Checkbox
                        id="gate-focus"
                        checked={gateWeeklyOperatorFocus}
                        onCheckedChange={(checked) => setGateWeeklyOperatorFocus(!!checked)}
                        data-testid="gate-weekly-operator-focus"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="gate-focus" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                          <Focus className="h-3 w-3" />
                          Weekly Operator Focus
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Protect time and focus under constraint
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Authority Article — 3-tab strategic view */}
          {generatedPosts.some((p) => p.postType === "authority_article") && (() => {
            const authorityDraft = generatedPosts.find((p) => p.postType === "authority_article")!;
            const derivedPosts = generatedPosts.filter((p) => p.postType !== "authority_article");
            const copyItem = async (text: string, id: string) => {
              await navigator.clipboard.writeText(text);
              setCopiedAnalysisItem(id);
              setTimeout(() => setCopiedAnalysisItem(null), 2000);
            };
            return (
              <>
                <Card data-testid="card-authority-article">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{authorityDraft.hook}</CardTitle>
                    </div>
                    <CardDescription>Strategic asset — foundation for all content in this run</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="article">
                      <TabsList className="mb-4">
                        <TabsTrigger value="article" data-testid="tab-article">Article</TabsTrigger>
                        <TabsTrigger value="concepts" data-testid="tab-concepts">Key Concepts</TabsTrigger>
                        <TabsTrigger value="repurpose" data-testid="tab-repurpose">Repurpose</TabsTrigger>
                      </TabsList>

                      {/* Article Tab */}
                      <TabsContent value="article">
                        <ScrollArea className="h-[360px] pr-2">
                          <div className="space-y-3 text-sm leading-relaxed whitespace-pre-line" data-testid="article-body">
                            {authorityDraft.body}
                          </div>
                        </ScrollArea>
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyItem(`${authorityDraft.hook}\n\n${authorityDraft.body}`, "article")}
                            data-testid="button-copy-article"
                          >
                            {copiedAnalysisItem === "article" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            {copiedAnalysisItem === "article" ? "Copied" : "Copy Article"}
                          </Button>
                          {authorityDraft.coreInsight && (
                            <Badge variant="secondary" className="text-xs" data-testid="badge-named-concept">
                              {authorityDraft.coreInsight}
                            </Badge>
                          )}
                        </div>
                      </TabsContent>

                      {/* Key Concepts Tab */}
                      <TabsContent value="concepts">
                        {isAnalyzing ? (
                          <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Extracting concepts...
                          </div>
                        ) : articleAnalysis ? (
                          <div className="space-y-5 text-sm">
                            {articleAnalysis.namedConcepts.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Named Concepts</h4>
                                <div className="flex flex-wrap gap-2">
                                  {articleAnalysis.namedConcepts.map((c, i) => (
                                    <Badge key={i} variant="default" className="text-xs" data-testid={`concept-${i}`}>{c}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {articleAnalysis.coreThesis && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Core Thesis</h4>
                                <p className="text-sm font-medium" data-testid="core-thesis">{articleAnalysis.coreThesis}</p>
                              </div>
                            )}
                            {articleAnalysis.keyPhrases.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Phrases</h4>
                                <div className="space-y-1">
                                  {articleAnalysis.keyPhrases.map((phrase, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50" data-testid={`key-phrase-${i}`}>
                                      <span className="text-sm flex-1">"{phrase}"</span>
                                      <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyItem(phrase, `phrase-${i}`)}>
                                        {copiedAnalysisItem === `phrase-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-4">Analysis unavailable.</p>
                        )}
                      </TabsContent>

                      {/* Repurpose Suggestions Tab */}
                      <TabsContent value="repurpose">
                        {isAnalyzing ? (
                          <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating repurpose suggestions...
                          </div>
                        ) : articleAnalysis ? (
                          <div className="space-y-5 text-sm">
                            {articleAnalysis.linkedinHooks.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                                  <SiLinkedin className="h-3 w-3" /> LinkedIn Hooks
                                </h4>
                                <div className="space-y-2">
                                  {articleAnalysis.linkedinHooks.map((hook, i) => (
                                    <div key={i} className="flex items-start gap-2 p-2 rounded border" data-testid={`linkedin-hook-${i}`}>
                                      <p className="text-sm flex-1">{hook}</p>
                                      <Button variant="ghost" size="sm" className="h-6 px-2 shrink-0" onClick={() => copyItem(hook, `lhook-${i}`)}>
                                        {copiedAnalysisItem === `lhook-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {articleAnalysis.xHooks.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                                  <SiX className="h-3 w-3" /> 𝕏 Hooks
                                </h4>
                                <div className="space-y-2">
                                  {articleAnalysis.xHooks.map((hook, i) => (
                                    <div key={i} className="flex items-start gap-2 p-2 rounded border" data-testid={`x-hook-${i}`}>
                                      <p className="text-sm flex-1">{hook}</p>
                                      <Button variant="ghost" size="sm" className="h-6 px-2 shrink-0" onClick={() => copyItem(hook, `xhook-${i}`)}>
                                        {copiedAnalysisItem === `xhook-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {articleAnalysis.contrarianAngles.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contrarian Angles</h4>
                                <div className="space-y-2">
                                  {articleAnalysis.contrarianAngles.map((angle, i) => (
                                    <div key={i} className="flex items-start gap-2 p-2 rounded border border-dashed" data-testid={`contrarian-angle-${i}`}>
                                      <p className="text-sm flex-1">{angle}</p>
                                      <Button variant="ghost" size="sm" className="h-6 px-2 shrink-0" onClick={() => copyItem(angle, `angle-${i}`)}>
                                        {copiedAnalysisItem === `angle-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-4">Analysis unavailable.</p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Derived posts grid */}
                {derivedPosts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Derived Content</CardTitle>
                      <CardDescription>
                        4 posts + 3 carousels generated from the authority article — review in Drafts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {derivedPosts.map((post) => {
                          const Icon = POST_TYPE_ICONS[post.postType as keyof typeof POST_TYPE_ICONS] || FileText;
                          return (
                            <div key={post.id} className="p-3 rounded-md border bg-card" data-testid={`preview-post-${post.postType}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium">
                                  {POST_TYPE_LABELS[post.postType as keyof typeof POST_TYPE_LABELS]}
                                </span>
                              </div>
                              <p className="text-sm font-medium line-clamp-2">{post.hook}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Distribution Pack ─────────────────────────────────── */}
                {!distributionPack ? (
                  <Card data-testid="card-distribution-pack-trigger">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Distribution Pack</CardTitle>
                      <CardDescription>
                        Turn this article into reach (𝕏), authority (LinkedIn), and ownership (your site)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3" data-testid="toggle-quote-reposts">
                          <Checkbox
                            id="include-quote-reposts"
                            checked={includeQuoteReposts}
                            onCheckedChange={(v) => setIncludeQuoteReposts(!!v)}
                          />
                          <div>
                            <Label htmlFor="include-quote-reposts" className="text-sm font-medium cursor-pointer">
                              Include Quote Repost Prompts
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">5 typed repost lines for 𝕏</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3" data-testid="toggle-llm-optimization">
                          <Checkbox
                            id="include-llm-opt"
                            checked={includeLlmOptimization}
                            onCheckedChange={(v) => setIncludeLlmOptimization(!!v)}
                          />
                          <div>
                            <Label htmlFor="include-llm-opt" className="text-sm font-medium cursor-pointer">
                              Include LLM Optimization
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Explicit definitions, named concepts, structured clarity</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={generateDistributionPack}
                        disabled={isGeneratingPack}
                        className="w-full sm:w-auto"
                        data-testid="button-generate-distribution-pack"
                      >
                        {isGeneratingPack ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Generate Distribution Pack
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card data-testid="card-distribution-pack-results">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Distribution Pack</CardTitle>
                      <CardDescription>3 platform-adapted versions — same thesis, different format</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="x-article">
                        <TabsList className="mb-4 flex-wrap h-auto gap-1">
                          <TabsTrigger value="x-article" data-testid="tab-pack-x">
                            <SiX className="h-3 w-3 mr-1.5" /> X Article
                          </TabsTrigger>
                          <TabsTrigger value="linkedin-pulse" data-testid="tab-pack-linkedin">
                            <SiLinkedin className="h-3 w-3 mr-1.5" /> LinkedIn Pulse
                          </TabsTrigger>
                          <TabsTrigger value="website" data-testid="tab-pack-website">
                            Website Version
                          </TabsTrigger>
                        </TabsList>

                        {/* X Article Tab */}
                        <TabsContent value="x-article" className="space-y-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Built for reach and virality</p>
                          <p className="text-sm font-semibold">{distributionPack.xArticle.hook}</p>
                          <ScrollArea className="h-[320px] pr-2">
                            <div className="text-sm leading-relaxed whitespace-pre-line" data-testid="pack-x-body">
                              {distributionPack.xArticle.body}
                            </div>
                          </ScrollArea>
                          <Button
                            variant="outline" size="sm"
                            onClick={async () => {
                              await navigator.clipboard.writeText(`${distributionPack.xArticle.hook}\n\n${distributionPack.xArticle.body}`);
                              setCopiedPackItem("x"); setTimeout(() => setCopiedPackItem(null), 2000);
                            }}
                            data-testid="button-copy-pack-x"
                          >
                            {copiedPackItem === "x" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            {copiedPackItem === "x" ? "Copied" : "Copy"}
                          </Button>
                          {distributionQuoteReposts.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <Separator />
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Quote Repost Prompts</p>
                              {distributionQuoteReposts.map((qr, i) => (
                                <div key={qr.id} className="flex items-start gap-2 p-2 rounded border" data-testid={`quote-repost-${i}`}>
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground mb-0.5">{qr.rehook}</p>
                                    <p className="text-sm">{qr.hook}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 shrink-0"
                                    onClick={async () => {
                                      await navigator.clipboard.writeText(qr.hook);
                                      setCopiedPackItem(`qr-${i}`); setTimeout(() => setCopiedPackItem(null), 2000);
                                    }}>
                                    {copiedPackItem === `qr-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        {/* LinkedIn Pulse Tab */}
                        <TabsContent value="linkedin-pulse" className="space-y-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Built for SEO and AI citations</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {distributionPack.linkedinPulse.rehook && (
                              <div className="p-3 rounded-md border bg-muted/40" data-testid="pack-linkedin-seo-title">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">SEO Title</p>
                                <p className="text-sm font-medium">{distributionPack.linkedinPulse.rehook}</p>
                                <Button variant="ghost" size="sm" className="h-6 px-2 mt-1"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(distributionPack.linkedinPulse.rehook!);
                                    setCopiedPackItem("li-seo"); setTimeout(() => setCopiedPackItem(null), 2000);
                                  }}>
                                  {copiedPackItem === "li-seo" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            )}
                            {distributionPack.linkedinPulse.coreInsight && (
                              <div className="p-3 rounded-md border bg-muted/40" data-testid="pack-linkedin-meta-desc">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Meta Description</p>
                                <p className="text-sm">{distributionPack.linkedinPulse.coreInsight}</p>
                                <Button variant="ghost" size="sm" className="h-6 px-2 mt-1"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(distributionPack.linkedinPulse.coreInsight!);
                                    setCopiedPackItem("li-meta"); setTimeout(() => setCopiedPackItem(null), 2000);
                                  }}>
                                  {copiedPackItem === "li-meta" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-semibold">{distributionPack.linkedinPulse.hook}</p>
                          <ScrollArea className="h-[280px] pr-2">
                            <div className="text-sm leading-relaxed whitespace-pre-line" data-testid="pack-linkedin-body">
                              {distributionPack.linkedinPulse.body}
                            </div>
                          </ScrollArea>
                          <Button
                            variant="outline" size="sm"
                            onClick={async () => {
                              await navigator.clipboard.writeText(`${distributionPack.linkedinPulse.hook}\n\n${distributionPack.linkedinPulse.body}`);
                              setCopiedPackItem("li"); setTimeout(() => setCopiedPackItem(null), 2000);
                            }}
                            data-testid="button-copy-pack-linkedin"
                          >
                            {copiedPackItem === "li" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            {copiedPackItem === "li" ? "Copied" : "Copy Article"}
                          </Button>
                        </TabsContent>

                        {/* Website Version Tab */}
                        <TabsContent value="website" className="space-y-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Built for depth and ownership</p>
                          <p className="text-sm font-semibold">{distributionPack.website.hook}</p>
                          <ScrollArea className="h-[320px] pr-2">
                            <div className="text-sm leading-relaxed whitespace-pre-line" data-testid="pack-website-body">
                              {distributionPack.website.body}
                            </div>
                          </ScrollArea>
                          <Button
                            variant="outline" size="sm"
                            onClick={async () => {
                              await navigator.clipboard.writeText(`${distributionPack.website.hook}\n\n${distributionPack.website.body}`);
                              setCopiedPackItem("web"); setTimeout(() => setCopiedPackItem(null), 2000);
                            }}
                            data-testid="button-copy-pack-website"
                          >
                            {copiedPackItem === "web" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            {copiedPackItem === "web" ? "Copied" : "Copy Article"}
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}

          {/* Generated Posts Preview — non-authority modes */}
          {generatedPosts.length > 0 && !generatedPosts.some((p) => p.postType === "authority_article") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Generated Drafts</CardTitle>
                <CardDescription>
                  Review and edit in the Drafts section
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {generatedPosts.map((post) => {
                    const Icon = POST_TYPE_ICONS[post.postType as keyof typeof POST_TYPE_ICONS] || FileText;
                    const angleLabel = post.contrarianAngle 
                      ? CONTRARIAN_ANGLE_LABELS[post.contrarianAngle] 
                      : null;
                    return (
                      <div
                        key={post.id}
                        className="p-3 rounded-md border bg-card"
                        data-testid={`preview-post-${post.postType}${post.contrarianAngle ? `-${post.contrarianAngle}` : ''}`}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">
                            {POST_TYPE_LABELS[post.postType as keyof typeof POST_TYPE_LABELS]}
                          </span>
                          {angleLabel && (
                            <Badge variant="outline" className="text-xs">
                              {angleLabel}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium line-clamp-2">{post.hook}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {post.rehook}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extracted Signals */}
          {extractedSignals && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Extracted Signals</CardTitle>
                <CardDescription>
                  Key themes identified from your input
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {extractedSignals.expertise.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Monetizable Expertise
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {extractedSignals.expertise.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {extractedSignals.stories.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Founder Stories
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {extractedSignals.stories.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {extractedSignals.trends.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Trends & Arbitrage
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {extractedSignals.trends.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {extractedSignals.opinions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Strong Opinions
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {extractedSignals.opinions.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thinking Gate Outputs */}
          {gateOutputs && Object.keys(gateOutputs).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Thinking Gate Analysis</CardTitle>
                </div>
                <CardDescription>
                  Insights from enabled thinking gates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {gateOutputs.beliefStressTest && (
                  <div className="p-3 rounded-md border space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium">Belief Stress Test</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Core Belief:</span>
                        <p className="mt-1">{gateOutputs.beliefStressTest.coreBelief}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Market Still Believes:</span>
                        <p className="mt-1">{gateOutputs.beliefStressTest.marketBelief}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tension with Wisdom:</span>
                        <p className="mt-1">{gateOutputs.beliefStressTest.tensionWithWisdom}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Short-term Cost:</span>
                        <p className="mt-1">{gateOutputs.beliefStressTest.shortTermCost}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Long-term Compound:</span>
                        <p className="mt-1">{gateOutputs.beliefStressTest.longTermCompound}</p>
                      </div>
                    </div>
                  </div>
                )}

                {gateOutputs.experienceMiner && (
                  <div className="p-3 rounded-md border space-y-2">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium">Experience Miner</h4>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">Operating Principles</span>
                        <ul className="list-disc list-inside space-y-1">
                          {gateOutputs.experienceMiner.operatingPrinciples?.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Mistakes Not to Repeat</span>
                        <ul className="list-disc list-inside space-y-1">
                          {gateOutputs.experienceMiner.mistakesNotToRepeat?.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Defensible Positions</span>
                        <ul className="list-disc list-inside space-y-1">
                          {gateOutputs.experienceMiner.defensiblePositions?.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {gateOutputs.clarityDestroyer && gateOutputs.clarityDestroyer.length > 0 && (
                  <div className="p-3 rounded-md border space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium">Clarity Destroyer</h4>
                    </div>
                    <div className="space-y-2">
                      {gateOutputs.clarityDestroyer.map((result, i) => (
                        <div key={i} className="p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={result.verdict === "survives_scrutiny" ? "default" : "destructive"} className="text-xs">
                              {result.verdict === "survives_scrutiny" ? "Survives Scrutiny" : "Collapses Under Precision"}
                            </Badge>
                          </div>
                          {result.flags && result.flags.length > 0 && (
                            <ul className="text-xs text-muted-foreground list-disc list-inside">
                              {result.flags.map((flag, j) => (
                                <li key={j}>{flag}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {gateOutputs.silentSalesMap && (
                  <div className="p-3 rounded-md border space-y-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium">Silent Sales Map</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={gateOutputs.silentSalesMap.supportsRealOutcome ? "default" : "secondary"}>
                          {gateOutputs.silentSalesMap.supportsRealOutcome ? "Supports Real Outcome" : "No Clear Outcome"}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Belief Installed:</span>
                        <p className="mt-1">{gateOutputs.silentSalesMap.beliefInstalled}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Buyer Qualification Effect:</span>
                        <p className="mt-1">{gateOutputs.silentSalesMap.buyerQualificationEffect}</p>
                      </div>
                      {gateOutputs.silentSalesMap.objectionsRemoved?.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Objections Removed:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {gateOutputs.silentSalesMap.objectionsRemoved.map((obj, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{obj}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Outcome Note:</span>
                        <p className="mt-1">{gateOutputs.silentSalesMap.outcomeNote}</p>
                      </div>
                    </div>
                  </div>
                )}

                {gateOutputs.weeklyOperatorFocus && (
                  <div className="p-3 rounded-md border space-y-2">
                    <div className="flex items-center gap-2">
                      <Focus className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium">Weekly Operator Focus</h4>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">Deserves Focus This Week</span>
                        <ul className="list-disc list-inside space-y-1">
                          {gateOutputs.weeklyOperatorFocus.deservesFocusThisWeek?.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Can Wait</span>
                        <ul className="list-disc list-inside space-y-1">
                          {gateOutputs.weeklyOperatorFocus.canWaitWithoutConsequence?.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Compounds If Done Well</span>
                        <ul className="list-disc list-inside space-y-1">
                          {gateOutputs.weeklyOperatorFocus.compoundsIfDoneOnceAndWell?.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Motion Without Leverage</span>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {gateOutputs.weeklyOperatorFocus.createsMotionWithoutLeverage?.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {gateOutputs.contentInfrastructure && gateOutputs.contentInfrastructure.length > 0 && (
                  <div className="p-3 rounded-md border space-y-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium">Content as Infrastructure</h4>
                    </div>
                    <div className="space-y-3">
                      {gateOutputs.contentInfrastructure.map((infra, i) => (
                        <div key={i} className="p-2 rounded bg-muted/50 space-y-1 text-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{infra.buyerSophisticationLevel}</Badge>
                            <span className="text-xs text-muted-foreground">Repels: {infra.buyerTypeRepelled}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Core Thesis:</span>
                            <p>{infra.coreThesis}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Corrects:</span>
                            <p>{infra.misunderstandingCorrected}</p>
                          </div>
                          {infra.offersSupported?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-muted-foreground text-xs">Supports:</span>
                              {infra.offersSupported.map((offer, j) => (
                                <Badge key={j} variant="secondary" className="text-xs">{offer}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Context Selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Context Selection</CardTitle>
              <CardDescription>
                Select contexts to apply to this run
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingContext ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : contextItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No contexts defined yet. Add some in the Context section.
                </p>
              ) : (
                <ScrollArea className="h-[320px] pr-4">
                  <div className="space-y-4">
                    {Object.entries(groupedContext).map(([type, items]) => (
                      <div key={type}>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">
                          {contextLabels[type] || type}
                        </h4>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-2"
                            >
                              <Checkbox
                                id={item.id}
                                checked={selectedContextIds.includes(item.id)}
                                onCheckedChange={() => handleContextToggle(item.id)}
                                data-testid={`checkbox-context-${item.id}`}
                              />
                              <Label
                                htmlFor={item.id}
                                className="text-sm font-normal cursor-pointer leading-tight"
                              >
                                {item.title}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <Separator className="mt-3" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {distributionMode === "linkedin" && isAuthorityArticleMode && !generateMutation.isPending && (
            <p className="text-xs text-center text-muted-foreground -mb-1">
              Step 1: Authority Article → Step 2: All Content
            </p>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !rawInput.trim() || (distributionMode === "linkedin" && isContrarianMode && !externalSignal.trim())}
            data-testid="button-generate"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : distributionMode === "twitter" ? (
              <>
                <SiX className="h-3 w-3 mr-2" />
                {getButtonLabel()}
              </>
            ) : isContrarianMode ? (
              <>
                <Zap className="h-4 w-4 mr-2" />
                {getButtonLabel()}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {getButtonLabel()}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

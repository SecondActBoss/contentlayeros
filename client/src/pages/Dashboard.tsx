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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Play, FileText, Lightbulb, TrendingUp, Quote, Zap, Newspaper, MessageCircle, ChevronDown, Brain, Target, Search, Database, ShoppingCart, Focus } from "lucide-react";
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

export default function Dashboard() {
  const { toast } = useToast();
  const [rawInput, setRawInput] = useState("");
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [generatedPosts, setGeneratedPosts] = useState<PostDraft[]>([]);
  const [extractedSignals, setExtractedSignals] = useState<ExtractedSignals | null>(null);
  const [distributionMode, setDistributionMode] = useState<DistributionMode>("linkedin");
  const [isContrarianMode, setIsContrarianMode] = useState(false);
  const [isRawTweetMode, setIsRawTweetMode] = useState(false);
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

  const { data: contextItems = [], isLoading: loadingContext } = useQuery<ContextItem[]>({
    queryKey: ["/api/context-items"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { 
      rawInput: string; 
      selectedContextIds: string[];
      distributionMode?: DistributionMode;
      isContrarianMode?: boolean;
      isRawTweetMode?: boolean;
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
      const postCount = data.posts?.length || 0;
      let modeDesc: string;
      if (distributionMode === "twitter") {
        if (isRawTweetMode) {
          modeDesc = `${postCount} raw tweets have been created.`;
        } else {
          modeDesc = `1 newsletter section + 3 𝕏 posts have been created.`;
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
      isContrarianMode,
      isRawTweetMode: distributionMode === "twitter" ? isRawTweetMode : false,
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
    if (isContrarianMode) return "Be Contrary";
    return "Weekly Run";
  };

  const getPageDescription = () => {
    if (distributionMode === "twitter") {
      if (isRawTweetMode) {
        return "Generate 5-7 single tweets. Quick drafts, varied types, operator tone.";
      }
      return "Generate 1 newsletter section + 3 𝕏 posts from your weekly materials.";
    }
    if (isContrarianMode) {
      return "Generate thoughtful contrarian takes in response to popular narratives.";
    }
    return "Turn your raw weekly materials into 4 high-quality LinkedIn post drafts.";
  };

  const getButtonLabel = () => {
    if (distributionMode === "twitter") {
      return isRawTweetMode ? "Generate Raw Tweets" : "Generate 𝕏 Content";
    }
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
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="contrarian-toggle" className="text-sm font-medium">
              Be Contrary
            </Label>
            <Switch
              id="contrarian-toggle"
              checked={isContrarianMode}
              onCheckedChange={setIsContrarianMode}
              data-testid="toggle-contrarian-mode"
            />
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
              <CardContent>
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

          {/* Generated Posts Preview */}
          {generatedPosts.length > 0 && (
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

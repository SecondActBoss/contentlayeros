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
import { Loader2, Play, FileText, Lightbulb, TrendingUp, Quote, Zap, Newspaper, MessageCircle } from "lucide-react";
import { SiX, SiLinkedin } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContextItem, PostDraft, ExtractedSignals, DistributionMode } from "@shared/schema";

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
    }) => {
      const response = await apiRequest("POST", "/api/weekly-runs", data);
      return response;
    },
    onSuccess: (data: any) => {
      setGeneratedPosts(data.posts || []);
      setExtractedSignals(data.extractedSignals || null);
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
    });
  };

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

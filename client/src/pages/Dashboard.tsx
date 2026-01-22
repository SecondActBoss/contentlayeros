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
import { Loader2, Play, FileText, Lightbulb, TrendingUp, Quote, Zap } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContextItem, PostDraft, ExtractedSignals } from "@shared/schema";

const POST_TYPE_ICONS = {
  educational_authority: FileText,
  founder_story: Quote,
  trend_translation: TrendingUp,
  system_principle: Lightbulb,
  contrarian_pov: Zap,
};

const POST_TYPE_LABELS = {
  educational_authority: "Educational Authority",
  founder_story: "Founder Story",
  trend_translation: "Trend Translation",
  system_principle: "System Principle",
  contrarian_pov: "Contrarian POV",
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
  const [isContrarianMode, setIsContrarianMode] = useState(false);
  const [externalSignal, setExternalSignal] = useState("");
  const [framingNote, setFramingNote] = useState("");

  const { data: contextItems = [], isLoading: loadingContext } = useQuery<ContextItem[]>({
    queryKey: ["/api/context-items"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { 
      rawInput: string; 
      selectedContextIds: string[];
      isContrarianMode?: boolean;
      externalSignal?: string;
      framingNote?: string;
    }) => {
      const response = await apiRequest("POST", "/api/weekly-runs", data);
      return response;
    },
    onSuccess: (data: any) => {
      setGeneratedPosts(data.posts || []);
      setExtractedSignals(data.extractedSignals || null);
      toast({
        title: "Posts generated",
        description: isContrarianMode 
          ? "4 contrarian LinkedIn post drafts have been created."
          : "4 LinkedIn post drafts have been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/post-drafts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate posts. Please try again.",
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
    if (isContrarianMode && !externalSignal.trim()) {
      toast({
        title: "External signal required",
        description: "Please provide the post or article you want to respond to.",
        variant: "destructive",
      });
      return;
    }
    if (!isContrarianMode && !rawInput.trim()) {
      toast({
        title: "Input required",
        description: "Please provide your weekly materials before generating.",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate({ 
      rawInput: isContrarianMode ? "" : rawInput, 
      selectedContextIds,
      isContrarianMode,
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

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isContrarianMode ? "Be Contrary" : "Weekly Run"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isContrarianMode 
              ? "Generate thoughtful contrarian takes in response to popular narratives."
              : "Turn your raw weekly materials into 4 high-quality LinkedIn post drafts."}
          </p>
          {!isContrarianMode && (
            <p className="text-xs text-muted-foreground/70 mt-2 italic">
              Tip: paste messy thoughts - clarity comes later.
            </p>
          )}
        </div>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          {isContrarianMode ? (
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
            disabled={generateMutation.isPending || (isContrarianMode ? !externalSignal.trim() : !rawInput.trim())}
            data-testid="button-generate"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : isContrarianMode ? (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate 4 Contrarian Takes
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Generate 4 Drafts
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

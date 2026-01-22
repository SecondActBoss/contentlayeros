import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, TrendingUp, TrendingDown, Minus, Star, FileText, Quote, Lightbulb } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FeedbackEntry, ExtractedPatterns } from "@shared/schema";

const PERFORMANCE_CONFIG = {
  strong: { icon: TrendingUp, color: "text-green-600 dark:text-green-400", label: "Strong" },
  average: { icon: Minus, color: "text-yellow-600 dark:text-yellow-400", label: "Average" },
  weak: { icon: TrendingDown, color: "text-red-600 dark:text-red-400", label: "Weak" },
};

const POST_TYPE_ICONS = {
  educational_authority: FileText,
  founder_story: Quote,
  trend_translation: TrendingUp,
  system_principle: Lightbulb,
};

export default function Feedback() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    finalContent: "",
    performanceLabel: "",
    notes: "",
    postType: "educational_authority",
    postDraftId: "",
  });

  const { data: feedbackEntries = [], isLoading } = useQuery<FeedbackEntry[]>({
    queryKey: ["/api/feedback"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      toast({ title: "Feedback recorded", description: "Post has been added to learning data." });
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to record feedback.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      finalContent: "",
      performanceLabel: "",
      notes: "",
      postType: "educational_authority",
      postDraftId: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.finalContent.trim()) {
      toast({ title: "Content required", description: "Please paste the final posted content.", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  // Group by performance
  const strongPosts = feedbackEntries.filter((e) => e.performanceLabel === "strong");
  const averagePosts = feedbackEntries.filter((e) => e.performanceLabel === "average");
  const weakPosts = feedbackEntries.filter((e) => e.performanceLabel === "weak");
  const unlabeledPosts = feedbackEntries.filter((e) => !e.performanceLabel);

  // Extract pattern insights
  const patterns = feedbackEntries
    .filter((e) => e.extractedPatterns)
    .map((e) => e.extractedPatterns as ExtractedPatterns);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feedback & Learning</h1>
          <p className="text-muted-foreground mt-1">
            Record approved posts and performance to improve future drafts.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-feedback">
              <Plus className="h-4 w-4 mr-2" />
              Add Approved Post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Record Approved Post</DialogTitle>
              <DialogDescription>
                Add a posted piece of content with optional performance data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="postType">Post Type</Label>
                <Select
                  value={formData.postType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, postType: value }))}
                >
                  <SelectTrigger data-testid="select-feedback-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educational_authority">Educational Authority</SelectItem>
                    <SelectItem value="founder_story">Founder Story</SelectItem>
                    <SelectItem value="trend_translation">Trend Translation</SelectItem>
                    <SelectItem value="system_principle">System Principle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Final Posted Content</Label>
                <Textarea
                  id="content"
                  placeholder="Paste the exact content you posted to LinkedIn..."
                  className="min-h-[200px]"
                  value={formData.finalContent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, finalContent: e.target.value }))}
                  data-testid="input-feedback-content"
                />
              </div>
              <div className="space-y-2">
                <Label>Performance (Optional)</Label>
                <Select
                  value={formData.performanceLabel}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, performanceLabel: value }))}
                >
                  <SelectTrigger data-testid="select-feedback-performance">
                    <SelectValue placeholder="Select performance level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strong">Strong</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="weak">Weak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder='e.g., "High operator DMs", "Saved a lot", "Good comments, low reach"'
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  data-testid="input-feedback-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                data-testid="button-save-feedback"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Record Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{strongPosts.length}</p>
                <p className="text-xs text-muted-foreground">Strong posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Minus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{averagePosts.length}</p>
                <p className="text-xs text-muted-foreground">Average posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{weakPosts.length}</p>
                <p className="text-xs text-muted-foreground">Weak posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{feedbackEntries.length}</p>
                <p className="text-xs text-muted-foreground">Total recorded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pattern Insights */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Learned Patterns</CardTitle>
            <CardDescription>
              Extracted from your strong-performing posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Tone</p>
                <div className="flex flex-wrap gap-1">
                  {[...new Set(patterns.map((p) => p.tone).filter(Boolean))].slice(0, 3).map((tone, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tone}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Hook Structure</p>
                <div className="flex flex-wrap gap-1">
                  {[...new Set(patterns.map((p) => p.hookStructure).filter(Boolean))].slice(0, 3).map((hook, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {hook}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Sentence Length</p>
                <div className="flex flex-wrap gap-1">
                  {[...new Set(patterns.map((p) => p.sentenceLength).filter(Boolean))].slice(0, 3).map((len, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {len}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Framing Style</p>
                <div className="flex flex-wrap gap-1">
                  {[...new Set(patterns.map((p) => p.framingStyle).filter(Boolean))].slice(0, 3).map((frame, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {frame}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recorded Posts */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : feedbackEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No feedback recorded</h3>
            <p className="text-muted-foreground text-center mt-1 max-w-sm">
              Add approved posts to help the system learn from your best content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Recorded Posts</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {feedbackEntries.map((entry) => {
              const perfConfig = entry.performanceLabel
                ? PERFORMANCE_CONFIG[entry.performanceLabel as keyof typeof PERFORMANCE_CONFIG]
                : null;
              const Icon = POST_TYPE_ICONS[entry.postType as keyof typeof POST_TYPE_ICONS] || FileText;
              return (
                <Card key={entry.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium capitalize">
                          {entry.postType.replace(/_/g, " ")}
                        </CardTitle>
                      </div>
                      {perfConfig && (
                        <Badge variant="outline" className="gap-1">
                          <perfConfig.icon className={`h-3 w-3 ${perfConfig.color}`} />
                          {perfConfig.label}
                        </Badge>
                      )}
                    </div>
                    {entry.notes && (
                      <CardDescription className="text-xs">
                        {entry.notes}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[100px]">
                      <p className="text-sm whitespace-pre-wrap">{entry.finalContent}</p>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

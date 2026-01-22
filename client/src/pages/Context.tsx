import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Users, Target, MessageSquare, Image, Upload, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import type { ContextItem, ContextType } from "@shared/schema";

const CONTEXT_TYPES = [
  { value: "icp", label: "ICP Context", icon: Users, description: "Target audience, pains, fears, goals" },
  { value: "positioning", label: "Positioning", icon: Target, description: "Beliefs, constraints, philosophy" },
  { value: "language_rules", label: "Language Rules", icon: MessageSquare, description: "Terminology, do/don't language" },
  { value: "visual", label: "Visual Reference", icon: Image, description: "Screenshots, images for grounding" },
] as const;

export default function Context() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContextItem | null>(null);
  const [formData, setFormData] = useState({
    type: "icp" as ContextType,
    title: "",
    content: "",
    imageUrl: null as string | null,
    isActive: true,
  });
  
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setFormData((prev) => ({ ...prev, imageUrl: response.objectPath }));
      toast({ title: "Image uploaded", description: "Your screenshot has been uploaded." });
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Failed to upload image.", variant: "destructive" });
    },
  });

  const { data: contextItems = [], isLoading } = useQuery<ContextItem[]>({
    queryKey: ["/api/context-items"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/context-items", data);
    },
    onSuccess: () => {
      toast({ title: "Context created", description: "New context item has been added." });
      queryClient.invalidateQueries({ queryKey: ["/api/context-items"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create context.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return apiRequest("PATCH", `/api/context-items/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Context updated", description: "Changes have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/context-items"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update context.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/context-items/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Context deleted", description: "Context item has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/context-items"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete context.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ type: "icp", title: "", content: "", imageUrl: null, isActive: true });
    setEditingItem(null);
  };

  const handleEdit = (item: ContextItem) => {
    setEditingItem(item);
    setFormData({
      type: item.type as ContextType,
      title: item.title,
      content: item.content,
      imageUrl: item.imageUrl || null,
      isActive: item.isActive,
    });
    setDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({ title: "Validation error", description: "Title is required.", variant: "destructive" });
      return;
    }
    if (formData.type !== "visual" && !formData.content.trim()) {
      toast({ title: "Validation error", description: "Content is required.", variant: "destructive" });
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (item: ContextItem) => {
    updateMutation.mutate({ id: item.id, data: { isActive: !item.isActive } });
  };

  const groupedItems = contextItems.reduce(
    (acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    },
    {} as Record<string, ContextItem[]>
  );

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Context Management</h1>
          <p className="text-muted-foreground mt-1">
            Define and manage context inputs for content generation.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-context">
              <Plus className="h-4 w-4 mr-2" />
              Add Context
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Context" : "Add Context"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update this context item." : "Create a new context item for content generation."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as ContextType }))}
                >
                  <SelectTrigger data-testid="select-context-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTEXT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Primary ICP - SaaS Founders"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  data-testid="input-context-title"
                />
              </div>
              {formData.type === "visual" ? (
                <div className="space-y-2">
                  <Label>Screenshot / Image</Label>
                  <div className="border-2 border-dashed rounded-md p-4">
                    {formData.imageUrl ? (
                      <div className="relative">
                        <img 
                          src={formData.imageUrl} 
                          alt="Uploaded visual" 
                          className="max-h-48 mx-auto rounded"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-0 right-0"
                          onClick={() => setFormData((prev) => ({ ...prev, imageUrl: null }))}
                          data-testid="button-remove-image"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Upload a screenshot</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="image-upload"
                          data-testid="input-image-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("image-upload")?.click()}
                          disabled={isUploading}
                          data-testid="button-upload-image"
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Choose File
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="content">Description (optional)</Label>
                    <Textarea
                      id="content"
                      placeholder="Describe what this visual represents..."
                      className="min-h-[80px]"
                      value={formData.content}
                      onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                      data-testid="input-context-content"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Describe the context in detail..."
                    className="min-h-[150px]"
                    value={formData.content}
                    onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                    data-testid="input-context-content"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-context"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingItem ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : contextItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No contexts yet</h3>
            <p className="text-muted-foreground text-center mt-1 max-w-sm">
              Add your first context item to help guide content generation.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="outline">ICP</Badge>
              <Badge variant="outline">Positioning</Badge>
              <Badge variant="outline">Language Rules</Badge>
              <Badge variant="outline">Visual Reference</Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="icp" className="w-full">
          <TabsList className="mb-4">
            {CONTEXT_TYPES.map((type) => {
              const count = groupedItems[type.value]?.length || 0;
              return (
                <TabsTrigger
                  key={type.value}
                  value={type.value}
                  className="gap-2"
                  data-testid={`tab-${type.value}`}
                >
                  <type.icon className="h-4 w-4" />
                  {type.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {CONTEXT_TYPES.map((type) => (
            <TabsContent key={type.value} value={type.value}>
              <div className="space-y-3">
                {(groupedItems[type.value] || []).length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No {type.label.toLowerCase()} contexts defined yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  (groupedItems[type.value] || []).map((item) => (
                    <Card key={item.id} className={!item.isActive ? "opacity-60" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{item.title}</CardTitle>
                              {!item.isActive && (
                                <Badge variant="outline" className="text-xs">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="mt-1">
                              {type.description}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={item.isActive}
                              onCheckedChange={() => handleToggleActive(item)}
                              data-testid={`toggle-active-${item.id}`}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(item.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="max-h-40 rounded mb-2"
                          />
                        )}
                        {item.content && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {item.content}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

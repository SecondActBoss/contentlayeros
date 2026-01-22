import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { extractSignals, generatePosts, generateContrarianPosts, generateTwitterContent, extractPatterns } from "./lib/contentGenerator";
import { appendPostsToSheet } from "./lib/googleSheets";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { insertContextItemSchema, insertPostDraftSchema, insertFeedbackEntrySchema } from "@shared/schema";
import { z } from "zod";

// Validation schemas for API requests
const weeklyRunInputSchema = z.object({
  rawInput: z.string(),
  selectedContextIds: z.array(z.string()).optional().default([]),
  distributionMode: z.enum(["linkedin", "twitter"]).optional().default("linkedin"),
  isContrarianMode: z.boolean().optional().default(false),
  externalSignal: z.string().optional(),
  framingNote: z.string().optional(),
});

const updateContextItemSchema = insertContextItemSchema.partial();

const updatePostDraftSchema = z.object({
  hook: z.string().optional(),
  rehook: z.string().optional(),
  body: z.string().optional(),
  coreInsight: z.string().optional(),
  cta: z.string().nullable().optional(),
  status: z.enum(["draft", "edited", "posted"]).optional(),
  postUrl: z.string().nullable().optional(),
});

const exportToSheetsSchema = z.object({
  spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Context Items CRUD
  app.get("/api/context-items", async (req, res) => {
    try {
      const items = await storage.getAllContextItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching context items:", error);
      res.status(500).json({ error: "Failed to fetch context items" });
    }
  });

  app.get("/api/context-items/:id", async (req, res) => {
    try {
      const item = await storage.getContextItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Context item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching context item:", error);
      res.status(500).json({ error: "Failed to fetch context item" });
    }
  });

  app.post("/api/context-items", async (req, res) => {
    try {
      const parsed = insertContextItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const item = await storage.createContextItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating context item:", error);
      res.status(500).json({ error: "Failed to create context item" });
    }
  });

  app.patch("/api/context-items/:id", async (req, res) => {
    try {
      const parsed = updateContextItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const item = await storage.updateContextItem(req.params.id, parsed.data);
      if (!item) {
        return res.status(404).json({ error: "Context item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating context item:", error);
      res.status(500).json({ error: "Failed to update context item" });
    }
  });

  app.delete("/api/context-items/:id", async (req, res) => {
    try {
      await storage.deleteContextItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting context item:", error);
      res.status(500).json({ error: "Failed to delete context item" });
    }
  });

  // Weekly Runs
  app.get("/api/weekly-runs", async (req, res) => {
    try {
      const runs = await storage.getAllWeeklyRuns();
      res.json(runs);
    } catch (error) {
      console.error("Error fetching weekly runs:", error);
      res.status(500).json({ error: "Failed to fetch weekly runs" });
    }
  });

  app.get("/api/weekly-runs/:id", async (req, res) => {
    try {
      const run = await storage.getWeeklyRun(req.params.id);
      if (!run) {
        return res.status(404).json({ error: "Weekly run not found" });
      }
      const posts = await storage.getPostDraftsByRun(run.id);
      res.json({ ...run, posts });
    } catch (error) {
      console.error("Error fetching weekly run:", error);
      res.status(500).json({ error: "Failed to fetch weekly run" });
    }
  });

  // Main workflow: Generate posts from raw input
  app.post("/api/weekly-runs", async (req, res) => {
    try {
      const parsed = weeklyRunInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const { rawInput, selectedContextIds, distributionMode, isContrarianMode, externalSignal, framingNote } = parsed.data;

      // Validate based on mode
      if (isContrarianMode && distributionMode === "linkedin" && !externalSignal?.trim()) {
        return res.status(400).json({ error: "External signal is required for contrarian mode" });
      }
      if (!rawInput?.trim()) {
        return res.status(400).json({ error: "Raw input is required" });
      }

      // Get selected contexts
      const allContexts = await storage.getAllContextItems();
      const selectedContexts = selectedContextIds?.length > 0
        ? allContexts.filter((c) => selectedContextIds.includes(c.id))
        : allContexts.filter((c) => c.isActive);

      // Get next week number
      const weekNumber = await storage.getNextWeekNumber();

      // Get strong-performing examples for learning
      const strongExamples = await storage.getStrongFeedbackEntries();

      let postData;
      let extractedSignals = null;

      // Extract signals from raw input (used by all modes except pure contrarian)
      extractedSignals = await extractSignals(rawInput, selectedContexts);

      if (distributionMode === "twitter") {
        // Generate 𝕏 content: 1 newsletter section + 3 posts
        postData = await generateTwitterContent(
          rawInput,
          selectedContexts,
          extractedSignals,
          strongExamples,
          isContrarianMode,
          externalSignal,
          framingNote
        );
      } else if (isContrarianMode) {
        // Generate 4 contrarian LinkedIn posts
        postData = await generateContrarianPosts(externalSignal!, framingNote, selectedContexts, strongExamples);
      } else {
        // Generate 4 regular LinkedIn posts
        postData = await generatePosts(rawInput, selectedContexts, extractedSignals, strongExamples);
      }

      // Create weekly run
      const weeklyRun = await storage.createWeeklyRun({
        weekNumber,
        rawInput: rawInput || "",
        selectedContextIds: selectedContextIds || [],
        distributionMode: distributionMode || "linkedin",
        isContrarianMode: isContrarianMode || false,
        externalSignal: externalSignal || null,
        framingNote: framingNote || null,
      });

      // Update with extracted signals
      if (extractedSignals) {
        await storage.updateWeeklyRun(weeklyRun.id, { extractedSignals });
      }

      // Create post drafts
      const posts = await Promise.all(
        postData.map((post) =>
          storage.createPostDraft({
            ...post,
            weeklyRunId: weeklyRun.id,
          })
        )
      );

      res.status(201).json({
        ...weeklyRun,
        extractedSignals,
        posts,
      });
    } catch (error) {
      console.error("Error creating weekly run:", error);
      res.status(500).json({ error: "Failed to generate posts. Please try again." });
    }
  });

  // Post Drafts
  app.get("/api/post-drafts", async (req, res) => {
    try {
      const drafts = await storage.getAllPostDrafts();
      res.json(drafts);
    } catch (error) {
      console.error("Error fetching post drafts:", error);
      res.status(500).json({ error: "Failed to fetch post drafts" });
    }
  });

  app.get("/api/post-drafts/:id", async (req, res) => {
    try {
      const draft = await storage.getPostDraft(req.params.id);
      if (!draft) {
        return res.status(404).json({ error: "Post draft not found" });
      }
      res.json(draft);
    } catch (error) {
      console.error("Error fetching post draft:", error);
      res.status(500).json({ error: "Failed to fetch post draft" });
    }
  });

  app.patch("/api/post-drafts/:id", async (req, res) => {
    try {
      const parsed = updatePostDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const draft = await storage.updatePostDraft(req.params.id, parsed.data);
      if (!draft) {
        return res.status(404).json({ error: "Post draft not found" });
      }
      res.json(draft);
    } catch (error) {
      console.error("Error updating post draft:", error);
      res.status(500).json({ error: "Failed to update post draft" });
    }
  });

  app.delete("/api/post-drafts/:id", async (req, res) => {
    try {
      await storage.deletePostDraft(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting post draft:", error);
      res.status(500).json({ error: "Failed to delete post draft" });
    }
  });

  // Export to Google Sheets
  app.post("/api/export-to-sheets", async (req, res) => {
    try {
      const parsed = exportToSheetsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const { spreadsheetId } = parsed.data;

      const drafts = await storage.getAllPostDrafts();
      const runs = await storage.getAllWeeklyRuns();

      const postsWithWeek = drafts.map((draft) => {
        const run = runs.find((r) => r.id === draft.weeklyRunId);
        return {
          weekNumber: run?.weekNumber || 0,
          postType: draft.postType,
          contrarianAngle: draft.contrarianAngle,
          hook: draft.hook,
          rehook: draft.rehook,
          body: draft.body,
          coreInsight: draft.coreInsight,
          cta: draft.cta || "",
          status: draft.status,
        };
      });

      await appendPostsToSheet(spreadsheetId, postsWithWeek);
      res.json({ success: true, exported: postsWithWeek.length });
    } catch (error) {
      console.error("Error exporting to sheets:", error);
      res.status(500).json({ error: "Failed to export to Google Sheets" });
    }
  });

  // Feedback
  app.get("/api/feedback", async (req, res) => {
    try {
      const entries = await storage.getAllFeedbackEntries();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const parsed = insertFeedbackEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      // Create feedback entry
      const entry = await storage.createFeedbackEntry(parsed.data);

      // Extract patterns from the content for learning
      if (entry.finalContent) {
        const patterns = await extractPatterns(entry.finalContent);
        await storage.updateFeedbackEntry(entry.id, { extractedPatterns: patterns });
        entry.extractedPatterns = patterns;
      }

      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ error: "Failed to create feedback" });
    }
  });

  app.get("/api/feedback/:id", async (req, res) => {
    try {
      const entry = await storage.getFeedbackEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Feedback entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  return httpServer;
}

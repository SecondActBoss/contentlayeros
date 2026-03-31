import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { extractSignals, extractCoreIdea, generateSourceArticle, generatePosts, generateContrarianPosts, generateCarousels, generateTwitterContent, generateRawTweets, generateAuthorityArticle, generateTriPublishPack, generateQuoteReposts, generateArticleAnalysis, extractPatterns, detectContentFatigue } from "./lib/contentGenerator";
import { runThinkingGates } from "./lib/thinkingGates";
import { appendPostsToSheet } from "./lib/googleSheets";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { insertContextItemSchema, insertPostDraftSchema, insertFeedbackEntrySchema, type PostDraft } from "@shared/schema";
import { z } from "zod";

// Validation schemas for API requests
const weeklyRunInputSchema = z.object({
  rawInput: z.string(),
  selectedContextIds: z.array(z.string()).optional().default([]),
  distributionMode: z.enum(["linkedin", "twitter"]).optional().default("linkedin"),
  isContrarianMode: z.boolean().optional().default(false),
  isRawTweetMode: z.boolean().optional().default(false),
  externalSignal: z.string().optional(),
  framingNote: z.string().optional(),
  gateBeliefStressTest: z.boolean().optional().default(false),
  gateExperienceMiner: z.boolean().optional().default(false),
  gateClarityDestroyer: z.boolean().optional().default(false),
  gateContentInfrastructure: z.boolean().optional().default(false),
  gateSilentSalesMap: z.boolean().optional().default(false),
  gateWeeklyOperatorFocus: z.boolean().optional().default(false),
  isAuthorityArticleMode: z.boolean().optional().default(false),
  articleAngle: z.string().optional(),
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

  app.delete("/api/weekly-runs/:id", async (req, res) => {
    try {
      const run = await storage.getWeeklyRun(req.params.id);
      if (!run) {
        return res.status(404).json({ error: "Weekly run not found" });
      }
      await storage.deleteWeeklyRun(req.params.id);
      res.json({ success: true, message: `Week ${run.weekNumber} deleted successfully` });
    } catch (error) {
      console.error("Error deleting weekly run:", error);
      res.status(500).json({ error: "Failed to delete weekly run" });
    }
  });

  // Tri-Publish Pack: generate 3 platform-adapted versions of the source article
  app.post("/api/weekly-runs/:id/tri-publish", async (req, res) => {
    try {
      const run = await storage.getWeeklyRun(req.params.id);
      if (!run) {
        return res.status(404).json({ error: "Weekly run not found" });
      }
      if (!run.sourceArticle) {
        return res.status(400).json({ error: "This run does not have a source article. Please re-generate to create one." });
      }

      // Get context items used in this run
      const allContexts = await storage.getActiveContextItems();
      const selectedContexts = allContexts.filter((c) =>
        run.selectedContextIds.includes(c.id)
      );

      const { includeLlmOptimization } = req.body as { includeLlmOptimization?: boolean };
      const packDrafts = await generateTriPublishPack(run.sourceArticle, selectedContexts, includeLlmOptimization);

      const savedDrafts = await Promise.all(
        packDrafts.map((draft) =>
          storage.createPostDraft({
            ...draft,
            weeklyRunId: run.id,
            carouselSlides: draft.carouselSlides as any,
          })
        )
      );

      res.json(savedDrafts);
    } catch (error) {
      console.error("Error generating tri-publish pack:", error);
      res.status(500).json({ error: "Failed to generate tri-publish pack" });
    }
  });

  // Quote Repost Engine: generate 5 typed repost lines from source article
  app.post("/api/weekly-runs/:id/quote-reposts", async (req, res) => {
    try {
      const run = await storage.getWeeklyRun(req.params.id);
      if (!run) {
        return res.status(404).json({ error: "Weekly run not found" });
      }
      if (!run.sourceArticle) {
        return res.status(400).json({ error: "This run does not have a source article. Please re-generate to create one." });
      }

      const allContexts = await storage.getActiveContextItems();
      const selectedContexts = allContexts.filter((c) =>
        run.selectedContextIds.includes(c.id)
      );

      const reposts = await generateQuoteReposts(run.sourceArticle, selectedContexts);

      const savedDrafts = await Promise.all(
        reposts.map((draft) =>
          storage.createPostDraft({
            ...draft,
            weeklyRunId: run.id,
            carouselSlides: draft.carouselSlides as any,
          })
        )
      );

      res.json(savedDrafts);
    } catch (error) {
      console.error("Error generating quote reposts:", error);
      res.status(500).json({ error: "Failed to generate quote reposts" });
    }
  });

  // Article Analysis: extract concepts and generate repurpose suggestions
  app.post("/api/article-analysis", async (req, res) => {
    try {
      const { articleTitle, articleBody } = req.body;
      if (!articleBody?.trim()) {
        return res.status(400).json({ error: "Article body is required" });
      }
      const analysis = await generateArticleAnalysis(articleTitle || "", articleBody);
      res.json(analysis);
    } catch (error) {
      console.error("Error generating article analysis:", error);
      res.status(500).json({ error: "Failed to analyze article" });
    }
  });

  // Main workflow: Generate posts from raw input
  app.post("/api/weekly-runs", async (req, res) => {
    try {
      const parsed = weeklyRunInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const { 
        rawInput, 
        selectedContextIds, 
        distributionMode, 
        isContrarianMode, 
        isRawTweetMode, 
        externalSignal, 
        framingNote,
        gateBeliefStressTest,
        gateExperienceMiner,
        gateClarityDestroyer,
        gateContentInfrastructure,
        gateSilentSalesMap,
        gateWeeklyOperatorFocus,
        isAuthorityArticleMode,
        articleAngle,
      } = parsed.data;

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

      // ── Step 1: Extract signals ────────────────────────────────────────────
      extractedSignals = await extractSignals(rawInput, selectedContexts);

      // ── Step 2: Extract core idea (shared across all modes) ───────────────
      const sharedCoreIdea = await extractCoreIdea(
        rawInput,
        selectedContexts,
        extractedSignals,
        isContrarianMode || false,
        externalSignal,
        framingNote
      );

      // ── Step 3: Generate source article (LinkedIn modes only) ───────────────
      // 𝕏 modes use rawInput directly — source article would inject AgentLayerOS
      // positioning context and override whatever the user actually typed in.
      let sourceArticleText: string | undefined;
      if (distributionMode !== "twitter") {
        sourceArticleText = await generateSourceArticle(
          rawInput,
          selectedContexts,
          extractedSignals,
          sharedCoreIdea,
          articleAngle
        );
      }

      // ── Step 4: Route to mode-specific generators ─────────────────────────
      if (distributionMode === "twitter") {
        if (isRawTweetMode) {
          // Generate 5-7 raw tweets — rawInput is the primary source
          postData = await generateRawTweets(
            rawInput,
            selectedContexts,
            extractedSignals,
            externalSignal,
            framingNote,
            undefined
          );
        } else {
          // Generate 𝕏 content: 1 X Article + 9 posts — rawInput is primary source
          postData = await generateTwitterContent(
            rawInput,
            selectedContexts,
            extractedSignals,
            strongExamples,
            isContrarianMode,
            externalSignal,
            framingNote,
            sharedCoreIdea,
            undefined
          );
        }
      } else if (isAuthorityArticleMode) {
        // Step 1: Generate the authority article (800-1500 words)
        const authorityDrafts = await generateAuthorityArticle(rawInput, selectedContexts, extractedSignals, articleAngle);
        const authorityDraft = authorityDrafts[0];

        // Step 2: Use authority article body as the source for all downstream generators
        const authorityArticleBody = `${authorityDraft.hook}\n\n${authorityDraft.body}`;
        sourceArticleText = authorityArticleBody;

        // Step 3: Generate posts + carousels from the authority article
        const [regularPosts, carouselPosts] = await Promise.all([
          generatePosts(rawInput, selectedContexts, extractedSignals, strongExamples, authorityArticleBody),
          generateCarousels(rawInput, selectedContexts, extractedSignals, strongExamples, authorityArticleBody),
        ]);

        postData = [authorityDraft, ...regularPosts, ...carouselPosts];
      } else if (isContrarianMode) {
        // Generate 4 contrarian LinkedIn posts
        postData = await generateContrarianPosts(
          externalSignal!,
          framingNote,
          selectedContexts,
          strongExamples,
          sourceArticleText
        );
      } else {
        // Generate 4 regular LinkedIn posts + 3 carousels
        const regularPosts = await generatePosts(
          rawInput,
          selectedContexts,
          extractedSignals,
          strongExamples,
          sourceArticleText
        );
        const carouselPosts = await generateCarousels(
          rawInput,
          selectedContexts,
          extractedSignals,
          strongExamples,
          sourceArticleText
        );
        postData = [...regularPosts, ...carouselPosts];
      }

      // Create weekly run
      const weeklyRun = await storage.createWeeklyRun({
        weekNumber,
        rawInput: rawInput || "",
        selectedContextIds: selectedContextIds || [],
        distributionMode: distributionMode || "linkedin",
        isContrarianMode: isContrarianMode || false,
        isRawTweetMode: isRawTweetMode || false,
        externalSignal: externalSignal || null,
        framingNote: framingNote || null,
        gateBeliefStressTest: gateBeliefStressTest || false,
        gateExperienceMiner: gateExperienceMiner || false,
        gateClarityDestroyer: gateClarityDestroyer || false,
        gateContentInfrastructure: gateContentInfrastructure || false,
        gateSilentSalesMap: gateSilentSalesMap || false,
        gateWeeklyOperatorFocus: gateWeeklyOperatorFocus || false,
        isAuthorityArticleMode: isAuthorityArticleMode || false,
        articleAngle: articleAngle || null,
        sourceArticle: sourceArticleText || null,
        coreIdea: sharedCoreIdea?.coreIdea || null,
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
            // Cast carouselSlides to match expected jsonb type
            carouselSlides: post.carouselSlides as any,
          })
        )
      );

      // Run thinking gates if any are enabled
      const anyGateEnabled = gateBeliefStressTest || gateExperienceMiner || gateClarityDestroyer || 
                             gateContentInfrastructure || gateSilentSalesMap || gateWeeklyOperatorFocus;
      
      let gateOutputs = null;
      if (anyGateEnabled) {
        gateOutputs = await runThinkingGates(
          {
            beliefStressTest: gateBeliefStressTest || false,
            experienceMiner: gateExperienceMiner || false,
            clarityDestroyer: gateClarityDestroyer || false,
            contentInfrastructure: gateContentInfrastructure || false,
            silentSalesMap: gateSilentSalesMap || false,
            weeklyOperatorFocus: gateWeeklyOperatorFocus || false,
          },
          rawInput,
          selectedContexts,
          posts
        );
        await storage.updateWeeklyRun(weeklyRun.id, { gateOutputs });
      }

      res.status(201).json({
        ...weeklyRun,
        extractedSignals,
        gateOutputs,
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

  // Phoenix Guardrail: Fatigue Detection
  // 𝕏 post types for filtering
  const TWITTER_POST_TYPES = ["newsletter_section", "twitter_pov", "twitter_paradox", "twitter_operator", "raw_tweet"];
  
  app.post("/api/drafts/:draftId/fatigue-check", async (req, res) => {
    try {
      const draft = await storage.getPostDraft(req.params.draftId);
      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }

      // Only run fatigue detection for 𝕏 posts
      if (!TWITTER_POST_TYPES.includes(draft.postType)) {
        return res.json({
          overallFatigueRisk: "low",
          similarPosts: [],
          recommendations: ["Fatigue detection is only available for 𝕏 posts."],
        });
      }

      // Get recent approved 𝕏 posts from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const allDrafts = await storage.getAllPostDrafts();
      const recentApproved = allDrafts
        .filter((d: PostDraft) => 
          d.status === "posted" && 
          d.id !== draft.id &&
          TWITTER_POST_TYPES.includes(d.postType) &&
          new Date(d.createdAt) >= sevenDaysAgo
        )
        .slice(-7)
        .map((d: PostDraft) => ({ hook: d.hook, body: d.body, coreInsight: d.coreInsight }));

      const fatigueAnalysis = await detectContentFatigue(
        { hook: draft.hook, body: draft.body, coreInsight: draft.coreInsight },
        recentApproved
      );

      res.json(fatigueAnalysis);
    } catch (error) {
      console.error("Error checking fatigue:", error);
      res.status(500).json({ error: "Failed to check content fatigue" });
    }
  });

  return httpServer;
}

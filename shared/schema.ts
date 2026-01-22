import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (kept for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Context Types: ICP, positioning, language_rules, visual
export type ContextType = "icp" | "positioning" | "language_rules" | "visual";

// Context items - reusable context pieces
export const contextItems = pgTable("context_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // icp, positioning, language_rules, visual
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"), // Optional image URL for visual type
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertContextItemSchema = createInsertSchema(contextItems).omit({
  id: true,
  createdAt: true,
});

export type InsertContextItem = z.infer<typeof insertContextItemSchema>;
export type ContextItem = typeof contextItems.$inferSelect;

// Post types as defined in the spec
export type PostType = "educational_authority" | "founder_story" | "trend_translation" | "system_principle" | "contrarian_pov";

// Contrarian angle sub-types
export type ContrarianAngle = "calm_reframe" | "operator_reality" | "systems_view" | "consequence_view";

// Post draft status
export type DraftStatus = "draft" | "edited" | "posted";

// Weekly runs - a single weekly content generation run
export const weeklyRuns = pgTable("weekly_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekNumber: integer("week_number").notNull(),
  rawInput: text("raw_input").notNull(),
  selectedContextIds: text("selected_context_ids").array().notNull(),
  extractedSignals: jsonb("extracted_signals"), // { expertise: [], stories: [], trends: [], opinions: [] }
  isContrarianMode: boolean("is_contrarian_mode").default(false).notNull(),
  externalSignal: text("external_signal"), // The external post/article to respond to in contrarian mode
  framingNote: text("framing_note"), // Optional framing note for contrarian mode
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertWeeklyRunSchema = createInsertSchema(weeklyRuns).omit({
  id: true,
  createdAt: true,
  extractedSignals: true,
});

export type InsertWeeklyRun = z.infer<typeof insertWeeklyRunSchema>;
export type WeeklyRun = typeof weeklyRuns.$inferSelect;

// Post drafts - the 4 posts generated per weekly run
export const postDrafts = pgTable("post_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weeklyRunId: varchar("weekly_run_id").notNull(),
  postType: text("post_type").notNull(), // educational_authority, founder_story, trend_translation, system_principle, contrarian_pov
  contrarianAngle: text("contrarian_angle"), // calm_reframe, operator_reality, systems_view, consequence_view (only for contrarian_pov)
  hook: text("hook").notNull(), // Line 1
  rehook: text("rehook").notNull(), // Line 2
  body: text("body").notNull(),
  coreInsight: text("core_insight").notNull(),
  cta: text("cta"), // Optional CTA / engagement prompt
  status: text("status").default("draft").notNull(), // draft, edited, posted
  postUrl: text("post_url"), // Added manually later
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPostDraftSchema = createInsertSchema(postDrafts).omit({
  id: true,
  createdAt: true,
});

export type InsertPostDraft = z.infer<typeof insertPostDraftSchema>;
export type PostDraft = typeof postDrafts.$inferSelect;

// Feedback entries - approved posts with performance data
export const feedbackEntries = pgTable("feedback_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postDraftId: varchar("post_draft_id"), // Optional link to original draft
  finalContent: text("final_content").notNull(), // The actual posted content
  performanceLabel: text("performance_label"), // strong, average, weak
  notes: text("notes"), // "High operator DMs", "Saved a lot", etc.
  postType: text("post_type").notNull(),
  extractedPatterns: jsonb("extracted_patterns"), // { tone, hookStructure, sentenceLength, framingStyle }
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertFeedbackEntrySchema = createInsertSchema(feedbackEntries).omit({
  id: true,
  createdAt: true,
  extractedPatterns: true,
});

export type InsertFeedbackEntry = z.infer<typeof insertFeedbackEntrySchema>;
export type FeedbackEntry = typeof feedbackEntries.$inferSelect;

// Extracted signals type
export interface ExtractedSignals {
  expertise: string[];
  stories: string[];
  trends: string[];
  opinions: string[];
}

// Extracted patterns type
export interface ExtractedPatterns {
  tone: string;
  hookStructure: string;
  sentenceLength: string;
  framingStyle: string;
}

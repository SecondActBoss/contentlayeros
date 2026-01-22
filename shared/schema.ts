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

// Distribution mode - which platform to generate content for
export type DistributionMode = "linkedin" | "twitter";

// Post types as defined in the spec
export type PostType = 
  // LinkedIn post types
  | "educational_authority" 
  | "founder_story" 
  | "trend_translation" 
  | "system_principle" 
  | "contrarian_pov"
  // 𝕏 (Twitter) post types
  | "newsletter_section"
  | "twitter_pov"
  | "twitter_paradox"
  | "twitter_operator"
  // Raw Tweet mode
  | "raw_tweet";

// Contrarian angle sub-types
export type ContrarianAngle = "calm_reframe" | "operator_reality" | "systems_view" | "consequence_view";

// Raw tweet types (for variety in Raw Tweet Mode)
export type RawTweetType = 
  | "pov_statement"      // Clear belief or stance
  | "contrarian_reframe" // Disagrees with common assumption
  | "operator_reality"   // Observational, lived-in
  | "system_rule"        // Principle or constraint
  | "quiet_insight";     // Reflective, unfinished

// Post draft status
export type DraftStatus = "draft" | "edited" | "posted";

// Thinking Gate IDs
export type ThinkingGateId = 
  | "belief_stress_test"    // Gate 1: Pre-generation belief analysis
  | "experience_miner"      // Gate 2: Signal extraction bias
  | "clarity_destroyer"     // Gate 3: Post-generation vagueness detection
  | "content_infrastructure" // Gate 4: Metadata layer
  | "silent_sales_map"      // Gate 5: Pre-sales check
  | "weekly_operator_focus"; // Gate 6: Founder leverage

// Gate output types
export interface BeliefStressTestOutput {
  coreBelief: string;
  marketBelief: string;
  tensionWithWisdom: string;
  shortTermCost: string;
  longTermCompound: string;
}

export interface ExperienceMinerOutput {
  operatingPrinciples: string[];
  mistakesNotToRepeat: string[];
  defensiblePositions: string[];
}

export interface ClarityDestroyerOutput {
  draftId: string;
  verdict: "survives_scrutiny" | "collapses_under_precision";
  flags: string[];
}

export interface ContentInfrastructureOutput {
  draftId: string;
  coreThesis: string;
  misunderstandingCorrected: string;
  buyerSophisticationLevel: string;
  buyerTypeRepelled: string;
  objectionsQuietlyDissolved: string[];
  offersSupported: string[];
}

export interface SilentSalesMapOutput {
  beliefInstalled: string;
  objectionsRemoved: string[];
  buyerQualificationEffect: string;
  supportsRealOutcome: boolean;
  outcomeNote: string;
}

export interface WeeklyOperatorFocusOutput {
  deservesFocusThisWeek: string[];
  canWaitWithoutConsequence: string[];
  compoundsIfDoneOnceAndWell: string[];
  createsMotionWithoutLeverage: string[];
}

export interface ThinkingGatesOutput {
  beliefStressTest?: BeliefStressTestOutput;
  experienceMiner?: ExperienceMinerOutput;
  clarityDestroyer?: ClarityDestroyerOutput[];
  contentInfrastructure?: ContentInfrastructureOutput[];
  silentSalesMap?: SilentSalesMapOutput;
  weeklyOperatorFocus?: WeeklyOperatorFocusOutput;
}

// Weekly runs - a single weekly content generation run
export const weeklyRuns = pgTable("weekly_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekNumber: integer("week_number").notNull(),
  rawInput: text("raw_input").notNull(),
  selectedContextIds: text("selected_context_ids").array().notNull(),
  extractedSignals: jsonb("extracted_signals"), // { expertise: [], stories: [], trends: [], opinions: [] }
  distributionMode: text("distribution_mode").default("linkedin").notNull(), // linkedin or twitter
  isContrarianMode: boolean("is_contrarian_mode").default(false).notNull(),
  isRawTweetMode: boolean("is_raw_tweet_mode").default(false).notNull(), // For 𝕏 Raw Tweet Mode
  externalSignal: text("external_signal"), // The external post/article to respond to in contrarian mode
  framingNote: text("framing_note"), // Optional framing note for contrarian mode
  gateBeliefStressTest: boolean("gate_belief_stress_test").default(false).notNull(),
  gateExperienceMiner: boolean("gate_experience_miner").default(false).notNull(),
  gateClarityDestroyer: boolean("gate_clarity_destroyer").default(false).notNull(),
  gateContentInfrastructure: boolean("gate_content_infrastructure").default(false).notNull(),
  gateSilentSalesMap: boolean("gate_silent_sales_map").default(false).notNull(),
  gateWeeklyOperatorFocus: boolean("gate_weekly_operator_focus").default(false).notNull(),
  gateOutputs: jsonb("gate_outputs"), // ThinkingGatesOutput
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertWeeklyRunSchema = createInsertSchema(weeklyRuns).omit({
  id: true,
  createdAt: true,
  extractedSignals: true,
});

export type InsertWeeklyRun = z.infer<typeof insertWeeklyRunSchema>;
export type WeeklyRun = typeof weeklyRuns.$inferSelect;

// Phoenix metadata types (for 𝕏 algorithm optimization)
export type PhoenixLikelihood = "high" | "medium" | "low";
export type PhoenixFatigueRisk = "low" | "medium" | "high";

// Post drafts - the 4 posts generated per weekly run
export const postDrafts = pgTable("post_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weeklyRunId: varchar("weekly_run_id").notNull(),
  postType: text("post_type").notNull(), // educational_authority, founder_story, trend_translation, system_principle, contrarian_pov, raw_tweet
  contrarianAngle: text("contrarian_angle"), // calm_reframe, operator_reality, systems_view, consequence_view (only for contrarian_pov)
  rawTweetType: text("raw_tweet_type"), // pov_statement, contrarian_reframe, operator_reality, system_rule, quiet_insight (only for raw_tweet)
  hook: text("hook").notNull(), // Line 1
  rehook: text("rehook").notNull(), // Line 2
  body: text("body").notNull(),
  coreInsight: text("core_insight").notNull(),
  cta: text("cta"), // Optional CTA / engagement prompt
  status: text("status").default("draft").notNull(), // draft, edited, posted
  postUrl: text("post_url"), // Added manually later
  // Phoenix metadata (𝕏 algorithm optimization)
  replyLikelihood: text("reply_likelihood"), // high, medium, low - predicted reply probability
  dwellLikelihood: text("dwell_likelihood"), // high, medium, low - predicted read depth
  fatigueRisk: text("fatigue_risk"), // low, medium, high - risk of mute/not interested
  authorEngagementReminder: text("author_engagement_reminder"), // Reminder for author to engage
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

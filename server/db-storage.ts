import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  contextItems,
  weeklyRuns,
  postDrafts,
  feedbackEntries,
  type User,
  type InsertUser,
  type ContextItem,
  type InsertContextItem,
  type WeeklyRun,
  type InsertWeeklyRun,
  type PostDraft,
  type InsertPostDraft,
  type FeedbackEntry,
  type InsertFeedbackEntry,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllContextItems(): Promise<ContextItem[]> {
    return db.select().from(contextItems).orderBy(desc(contextItems.createdAt));
  }

  async getContextItem(id: string): Promise<ContextItem | undefined> {
    const [item] = await db.select().from(contextItems).where(eq(contextItems.id, id));
    return item;
  }

  async getActiveContextItems(): Promise<ContextItem[]> {
    return db.select().from(contextItems).where(eq(contextItems.isActive, true));
  }

  async createContextItem(item: InsertContextItem): Promise<ContextItem> {
    const [created] = await db.insert(contextItems).values(item).returning();
    return created;
  }

  async updateContextItem(id: string, data: Partial<InsertContextItem>): Promise<ContextItem | undefined> {
    const [updated] = await db.update(contextItems).set(data).where(eq(contextItems.id, id)).returning();
    return updated;
  }

  async deleteContextItem(id: string): Promise<void> {
    await db.delete(contextItems).where(eq(contextItems.id, id));
  }

  async getAllWeeklyRuns(): Promise<WeeklyRun[]> {
    return db.select().from(weeklyRuns).orderBy(desc(weeklyRuns.createdAt));
  }

  async getWeeklyRun(id: string): Promise<WeeklyRun | undefined> {
    const [run] = await db.select().from(weeklyRuns).where(eq(weeklyRuns.id, id));
    return run;
  }

  async createWeeklyRun(run: InsertWeeklyRun): Promise<WeeklyRun> {
    const [created] = await db.insert(weeklyRuns).values(run).returning();
    return created;
  }

  async updateWeeklyRun(id: string, data: Partial<WeeklyRun>): Promise<WeeklyRun | undefined> {
    const [updated] = await db.update(weeklyRuns).set(data).where(eq(weeklyRuns.id, id)).returning();
    return updated;
  }

  async getNextWeekNumber(): Promise<number> {
    const runs = await db.select().from(weeklyRuns).orderBy(desc(weeklyRuns.weekNumber)).limit(1);
    if (runs.length === 0) return 1;
    return runs[0].weekNumber + 1;
  }

  async getAllPostDrafts(): Promise<PostDraft[]> {
    return db.select().from(postDrafts).orderBy(desc(postDrafts.createdAt));
  }

  async getPostDraft(id: string): Promise<PostDraft | undefined> {
    const [draft] = await db.select().from(postDrafts).where(eq(postDrafts.id, id));
    return draft;
  }

  async getPostDraftsByRun(weeklyRunId: string): Promise<PostDraft[]> {
    return db.select().from(postDrafts).where(eq(postDrafts.weeklyRunId, weeklyRunId));
  }

  async createPostDraft(draft: InsertPostDraft): Promise<PostDraft> {
    const [created] = await db.insert(postDrafts).values(draft).returning();
    return created;
  }

  async updatePostDraft(id: string, data: Partial<InsertPostDraft>): Promise<PostDraft | undefined> {
    const [updated] = await db.update(postDrafts).set(data).where(eq(postDrafts.id, id)).returning();
    return updated;
  }

  async deletePostDraft(id: string): Promise<void> {
    await db.delete(postDrafts).where(eq(postDrafts.id, id));
  }

  async getAllFeedbackEntries(): Promise<FeedbackEntry[]> {
    return db.select().from(feedbackEntries).orderBy(desc(feedbackEntries.createdAt));
  }

  async getFeedbackEntry(id: string): Promise<FeedbackEntry | undefined> {
    const [entry] = await db.select().from(feedbackEntries).where(eq(feedbackEntries.id, id));
    return entry;
  }

  async createFeedbackEntry(entry: InsertFeedbackEntry): Promise<FeedbackEntry> {
    const [created] = await db.insert(feedbackEntries).values(entry).returning();
    return created;
  }

  async updateFeedbackEntry(id: string, data: Partial<FeedbackEntry>): Promise<FeedbackEntry | undefined> {
    const [updated] = await db.update(feedbackEntries).set(data).where(eq(feedbackEntries.id, id)).returning();
    return updated;
  }

  async getStrongFeedbackEntries(): Promise<FeedbackEntry[]> {
    return db.select().from(feedbackEntries).where(eq(feedbackEntries.performanceLabel, "strong"));
  }
}

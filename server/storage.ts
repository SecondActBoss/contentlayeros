import { type User, type InsertUser, type ContextItem, type InsertContextItem, type WeeklyRun, type InsertWeeklyRun, type PostDraft, type InsertPostDraft, type FeedbackEntry, type InsertFeedbackEntry, type ExtractedSignals, type ExtractedPatterns } from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface with all CRUD methods
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Context Items
  getAllContextItems(): Promise<ContextItem[]>;
  getContextItem(id: string): Promise<ContextItem | undefined>;
  getActiveContextItems(): Promise<ContextItem[]>;
  createContextItem(item: InsertContextItem): Promise<ContextItem>;
  updateContextItem(id: string, data: Partial<InsertContextItem>): Promise<ContextItem | undefined>;
  deleteContextItem(id: string): Promise<void>;

  // Weekly Runs
  getAllWeeklyRuns(): Promise<WeeklyRun[]>;
  getWeeklyRun(id: string): Promise<WeeklyRun | undefined>;
  createWeeklyRun(run: InsertWeeklyRun): Promise<WeeklyRun>;
  updateWeeklyRun(id: string, data: Partial<WeeklyRun>): Promise<WeeklyRun | undefined>;
  deleteWeeklyRun(id: string): Promise<void>;
  getNextWeekNumber(): Promise<number>;

  // Post Drafts
  getAllPostDrafts(): Promise<PostDraft[]>;
  getPostDraft(id: string): Promise<PostDraft | undefined>;
  getPostDraftsByRun(weeklyRunId: string): Promise<PostDraft[]>;
  createPostDraft(draft: InsertPostDraft): Promise<PostDraft>;
  updatePostDraft(id: string, data: Partial<InsertPostDraft>): Promise<PostDraft | undefined>;
  deletePostDraft(id: string): Promise<void>;

  // Feedback
  getAllFeedbackEntries(): Promise<FeedbackEntry[]>;
  getFeedbackEntry(id: string): Promise<FeedbackEntry | undefined>;
  createFeedbackEntry(entry: InsertFeedbackEntry): Promise<FeedbackEntry>;
  updateFeedbackEntry(id: string, data: Partial<FeedbackEntry>): Promise<FeedbackEntry | undefined>;
  getStrongFeedbackEntries(): Promise<FeedbackEntry[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contextItems: Map<string, ContextItem>;
  private weeklyRuns: Map<string, WeeklyRun>;
  private postDrafts: Map<string, PostDraft>;
  private feedbackEntries: Map<string, FeedbackEntry>;

  constructor() {
    this.users = new Map();
    this.contextItems = new Map();
    this.weeklyRuns = new Map();
    this.postDrafts = new Map();
    this.feedbackEntries = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Context Items
  async getAllContextItems(): Promise<ContextItem[]> {
    return Array.from(this.contextItems.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getContextItem(id: string): Promise<ContextItem | undefined> {
    return this.contextItems.get(id);
  }

  async getActiveContextItems(): Promise<ContextItem[]> {
    return Array.from(this.contextItems.values()).filter((item) => item.isActive);
  }

  async createContextItem(item: InsertContextItem): Promise<ContextItem> {
    const id = randomUUID();
    const contextItem: ContextItem = {
      ...item,
      id,
      isActive: item.isActive ?? true,
      createdAt: new Date(),
    };
    this.contextItems.set(id, contextItem);
    return contextItem;
  }

  async updateContextItem(id: string, data: Partial<InsertContextItem>): Promise<ContextItem | undefined> {
    const existing = this.contextItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.contextItems.set(id, updated);
    return updated;
  }

  async deleteContextItem(id: string): Promise<void> {
    this.contextItems.delete(id);
  }

  // Weekly Runs
  async getAllWeeklyRuns(): Promise<WeeklyRun[]> {
    return Array.from(this.weeklyRuns.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getWeeklyRun(id: string): Promise<WeeklyRun | undefined> {
    return this.weeklyRuns.get(id);
  }

  async createWeeklyRun(run: InsertWeeklyRun): Promise<WeeklyRun> {
    const id = randomUUID();
    const weeklyRun: WeeklyRun = {
      ...run,
      id,
      extractedSignals: null,
      createdAt: new Date(),
    };
    this.weeklyRuns.set(id, weeklyRun);
    return weeklyRun;
  }

  async updateWeeklyRun(id: string, data: Partial<WeeklyRun>): Promise<WeeklyRun | undefined> {
    const existing = this.weeklyRuns.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.weeklyRuns.set(id, updated);
    return updated;
  }

  async deleteWeeklyRun(id: string): Promise<void> {
    // Delete all associated post drafts first
    const drafts = await this.getPostDraftsByRun(id);
    for (const draft of drafts) {
      this.postDrafts.delete(draft.id);
    }
    // Then delete the weekly run
    this.weeklyRuns.delete(id);
  }

  async getNextWeekNumber(): Promise<number> {
    const runs = Array.from(this.weeklyRuns.values());
    if (runs.length === 0) return 1;
    const maxWeek = Math.max(...runs.map((r) => r.weekNumber));
    return maxWeek + 1;
  }

  // Post Drafts
  async getAllPostDrafts(): Promise<PostDraft[]> {
    return Array.from(this.postDrafts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getPostDraft(id: string): Promise<PostDraft | undefined> {
    return this.postDrafts.get(id);
  }

  async getPostDraftsByRun(weeklyRunId: string): Promise<PostDraft[]> {
    return Array.from(this.postDrafts.values()).filter((d) => d.weeklyRunId === weeklyRunId);
  }

  async createPostDraft(draft: InsertPostDraft): Promise<PostDraft> {
    const id = randomUUID();
    const postDraft: PostDraft = {
      ...draft,
      id,
      status: draft.status || "draft",
      cta: draft.cta || null,
      postUrl: draft.postUrl || null,
      createdAt: new Date(),
    };
    this.postDrafts.set(id, postDraft);
    return postDraft;
  }

  async updatePostDraft(id: string, data: Partial<InsertPostDraft>): Promise<PostDraft | undefined> {
    const existing = this.postDrafts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.postDrafts.set(id, updated);
    return updated;
  }

  async deletePostDraft(id: string): Promise<void> {
    this.postDrafts.delete(id);
  }

  // Feedback
  async getAllFeedbackEntries(): Promise<FeedbackEntry[]> {
    return Array.from(this.feedbackEntries.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getFeedbackEntry(id: string): Promise<FeedbackEntry | undefined> {
    return this.feedbackEntries.get(id);
  }

  async createFeedbackEntry(entry: InsertFeedbackEntry): Promise<FeedbackEntry> {
    const id = randomUUID();
    const feedbackEntry: FeedbackEntry = {
      ...entry,
      id,
      postDraftId: entry.postDraftId || null,
      performanceLabel: entry.performanceLabel || null,
      notes: entry.notes || null,
      extractedPatterns: null,
      createdAt: new Date(),
    };
    this.feedbackEntries.set(id, feedbackEntry);
    return feedbackEntry;
  }

  async updateFeedbackEntry(id: string, data: Partial<FeedbackEntry>): Promise<FeedbackEntry | undefined> {
    const existing = this.feedbackEntries.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.feedbackEntries.set(id, updated);
    return updated;
  }

  async getStrongFeedbackEntries(): Promise<FeedbackEntry[]> {
    return Array.from(this.feedbackEntries.values()).filter(
      (entry) => entry.performanceLabel === "strong"
    );
  }
}

import { DatabaseStorage } from "./db-storage";

// Use database storage for persistence
export const storage: IStorage = new DatabaseStorage();

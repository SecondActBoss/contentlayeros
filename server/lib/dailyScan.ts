// Daily Company Brain Scanner — journalist-style X scan producing Raw Materials
// for MondayCEOBrief / ContentLayerOS content generation.
import OpenAI from "openai";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { storage } from "../storage";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const connectors = new ReplitConnectors();

// Primary X searches (from the Daily Company Brain Scanner spec)
const SEARCH_QUERIES = [
  `("company brain" OR "enterprise brain" OR "organizational memory" OR "AI memory layer") (CEO OR "multi-branch" OR "multi-location" OR franchise OR distribution OR "multi unit") -is:retweet lang:en`,
  `("AI sovereignty" OR "own the memory" OR "rent the intelligence" OR "data alpha" OR "operational alpha") (CEO OR enterprise OR "multi branch" OR "multi-location") -is:retweet lang:en`,
  `("institutional memory" OR "operational intelligence" OR "event extraction" OR "company memory") (AI OR agent OR brain) -is:retweet lang:en`,
  `("token cost" OR "token tax" OR "surprise bill" OR "tokenmaxxing") (AI OR LLM) (CEO OR enterprise) -is:retweet lang:en`,
];

// Company Brain Beat — accounts to always check
const MONITORED_ACCOUNTS = ["palantirtech", "levie", "ashwingop"];

interface ScannedPost {
  id: string;
  text: string;
  author: string; // @handle
  createdAt: string;
  likes: number;
  replies: number;
  reposts: number;
  impressions: number;
  url: string;
  source: string; // which search / account it came from
}

async function xGet(pathAndQuery: string): Promise<any> {
  const res = await connectors.proxy("x", pathAndQuery, { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err: any = new Error(`X API ${res.status} on ${pathAndQuery.split("?")[0]}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function mapPosts(json: any, source: string): ScannedPost[] {
  const users = new Map<string, string>();
  for (const u of json.includes?.users || []) users.set(u.id, u.username);
  return (json.data || []).map((t: any) => {
    const handle = users.get(t.author_id) || "unknown";
    const m = t.public_metrics || {};
    return {
      id: t.id,
      text: t.text,
      author: `@${handle}`,
      createdAt: t.created_at || "",
      likes: m.like_count || 0,
      replies: m.reply_count || 0,
      reposts: m.retweet_count || 0,
      impressions: m.impression_count || 0,
      url: `https://x.com/${handle}/status/${t.id}`,
      source,
    };
  });
}

const POST_FIELDS = "tweet.fields=created_at,public_metrics,author_id&expansions=author_id";

async function collectPosts(): Promise<{ posts: ScannedPost[]; errors: string[] }> {
  const posts: ScannedPost[] = [];
  const errors: string[] = [];
  let authFailure = 0;
  let successfulCalls = 0;

  // 1. Run the four searches
  for (const query of SEARCH_QUERIES) {
    try {
      const json = await xGet(
        `/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=25&sort_order=relevancy&${POST_FIELDS}`
      );
      successfulCalls++;
      posts.push(...mapPosts(json, `search: ${query.slice(0, 60)}...`));
    } catch (e: any) {
      if (e.status === 401 || e.status === 403) authFailure++;
      errors.push(e.message);
    }
  }

  // 2. Check monitored accounts (last 24h of posts)
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  for (const username of MONITORED_ACCOUNTS) {
    try {
      const userJson = await xGet(`/2/users/by/username/${username}`);
      const userId = userJson.data?.id;
      if (!userId) continue;
      const json = await xGet(
        `/2/users/${userId}/tweets?max_results=20&exclude=retweets,replies&start_time=${encodeURIComponent(startTime)}&${POST_FIELDS}`
      );
      successfulCalls++;
      posts.push(...mapPosts(json, `monitored account: @${username}`));
    } catch (e: any) {
      if (e.status === 401 || e.status === 403) authFailure++;
      errors.push(e.message);
    }
  }

  // Never fake a "quiet day" when X was simply unreachable: if not a single
  // API call succeeded, the scan must fail loudly instead of producing a report.
  if (successfulCalls === 0) {
    if (authFailure > 0) {
      throw new Error(
        `X API authentication failed on every request. The API key stored in the X connection is invalid or lacks access. First error: ${errors[0]}`
      );
    }
    throw new Error(
      `Every X API request failed (rate limit or outage) — no scan report was produced. First error: ${errors[0] || "unknown"}`
    );
  }

  return { posts, errors };
}

function easternDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function quietDayReport(date: string): string {
  return `## Daily Company Brain Scan – ${date}

Quiet day – limited high-signal activity.

### High-Signal Conversations
- No qualifying posts found in today's searches or from monitored accounts.

### Emerging Themes
- None strong enough to report today.

### Positioning Opportunities for MondayCEOBrief
- Quiet days are a chance to lead the conversation rather than react to it: publish an original point of view on Company Brain vs personal Second Brains.

### Suggested Angles for Today's Content
- Short post idea: When nobody is talking about organizational memory, that silence is the story — most multi-branch CEOs still don't know what they're losing daily.
- Possible authority article angle: Why the "Company Brain" conversation hasn't reached multi-branch operators yet, and what the early movers are quietly doing about it.`;
}

async function synthesizeReport(date: string, posts: ScannedPost[]): Promise<{ report: string; postCount: number }> {
  // Dedupe by id, sort by engagement, cap at 40 for the prompt
  const seen = new Set<string>();
  const unique = posts.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  unique.sort((a, b) => b.likes + b.replies * 2 + b.reposts * 2 - (a.likes + a.replies * 2 + a.reposts * 2));
  const top = unique.slice(0, 40);

  if (top.length === 0) return { report: quietDayReport(date), postCount: 0 };

  const postsBlock = top
    .map(
      (p, i) =>
        `[${i + 1}] ${p.author} (${p.createdAt}) — likes:${p.likes} replies:${p.replies} reposts:${p.reposts}\nURL: ${p.url}\nFound via: ${p.source}\nText: ${p.text}`
    )
    .join("\n\n");

  const prompt = `You are a sharp journalist covering the "AI Company Brain" beat for multi-branch CEOs (3–15+ branches) who care about operational intelligence, AI sovereignty, institutional memory, and not leaking their competitive edge.

Below are real posts pulled from X today. Your job: filter them STRICTLY, then write the daily scan report.

FILTERING RULES (STRICT) — only keep posts relevant to at least one of:
- Multi-branch / multi-location / franchise / distribution operations
- AI sovereignty or data ownership concerns
- Organizational / company-level memory (not just personal Second Brains)
- Event extraction, pattern detection, or institutional knowledge
- Token costs vs predictable pricing for AI
- CEO cognitive load or operational clarity across locations

Discard pure personal productivity, pure technical research, or consumer AI content unless it has a clear multi-branch or enterprise angle. Prefer high-engagement or high-signal posts over volume. Prioritize posts that create a clear contrast between personal Second Brains / general AI tools and a real private Company Brain. Always ask: "Would a multi-branch CEO care about this today?"

NEVER invent posts. Only summarize posts that appear below, and always cite the real handle and URL given.

TODAY'S POSTS:
${postsBlock}

Produce the report in EXACTLY this markdown structure (be concise, high-signal, and practical):

## Daily Company Brain Scan – ${date}

### High-Signal Conversations
- [1–2 sentence summary of the post]
  Why it matters for multi-branch CEOs: [1 short sentence]
  Source: [handle + link]

(Include only posts that survive the filter — typically 3–8. If NONE survive, write "Quiet day – limited high-signal activity." here instead.)

### Emerging Themes
- Theme 1: [Name of theme]
- Theme 2: [Name of theme]
- Theme 3: [Name of theme] (only if strong)

### Positioning Opportunities for MondayCEOBrief
- Opportunity 1: [How this can be used in a post or article]
- Opportunity 2: [Another angle]

### Suggested Angles for Today's Content
- Short post idea: [1–2 sentence idea]
- Possible authority article angle: [1–2 sentence idea]

Return ONLY valid JSON: {"report": "the full markdown report", "keptCount": number of posts included in High-Signal Conversations}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");
  if (!parsed.report) throw new Error("Scan synthesis returned no report");
  return { report: parsed.report, postCount: parsed.keptCount ?? 0 };
}

let scanInProgress = false;

export async function runDailyScan(triggeredBy: "manual" | "scheduled") {
  if (scanInProgress) {
    throw new Error("A scan is already running. Wait for it to finish.");
  }
  scanInProgress = true;
  try {
    return await executeScan(triggeredBy);
  } finally {
    scanInProgress = false;
  }
}

async function executeScan(triggeredBy: "manual" | "scheduled") {
  const date = easternDate();

  const { posts, errors } = await collectPosts();
  if (errors.length > 0) {
    console.warn(`[daily-scan] ${errors.length} X API errors during collection:`, errors.slice(0, 3));
  }

  const { report, postCount } = await synthesizeReport(date, posts);

  // Save markdown file per spec
  try {
    const dir = path.join(process.cwd(), "daily_scans");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `Daily_Company_Brain_Scan_${date}.md`), report, "utf-8");
  } catch (e) {
    console.warn("[daily-scan] Failed to write markdown file:", e);
  }

  const scan = await storage.createDailyScan({
    scanDate: date,
    report,
    postCount,
    status: postCount === 0 ? "quiet" : "complete",
    triggeredBy,
  });

  console.log(`[daily-scan] Completed ${triggeredBy} scan for ${date}: ${postCount} high-signal posts`);
  return scan;
}

// 6:00 AM Eastern daily schedule
export function startDailyScanScheduler() {
  import("node-cron").then(({ default: cron }) => {
    cron.schedule(
      "0 6 * * *",
      async () => {
        try {
          const existing = await storage.getDailyScanByDate(easternDate());
          if (existing?.triggeredBy === "scheduled") return; // already ran today
          await runDailyScan("scheduled");
        } catch (e) {
          console.error("[daily-scan] Scheduled scan failed:", e);
        }
      },
      { timezone: "America/New_York" }
    );
    console.log("[daily-scan] Scheduler active: daily at 6:00 AM Eastern");
  });
}

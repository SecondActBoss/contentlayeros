// Daily Company Brain Scanner — journalist-style X scan producing Raw Materials
// for MondayCEOBrief / ContentLayerOS content generation.
//
// Powered by xAI (Grok) with the built-in x_search tool: Grok searches X live,
// grounds the report in real posts with citations, and returns the report in
// the exact required markdown structure.
import { storage } from "../storage";
import fs from "fs";
import path from "path";

const XAI_API_KEY = process.env.CONTENTLAYEROS_XAI;
const XAI_MODEL = "grok-4.6";

// Search beats from the Daily Company Brain Scanner spec
const SEARCH_BEATS = `
1. "company brain" / "enterprise brain" / "organizational memory" / "AI memory layer" — combined with CEO, multi-branch, multi-location, franchise, distribution, or multi-unit angles
2. "AI sovereignty" / "own the memory" / "rent the intelligence" / "data alpha" / "operational alpha" — combined with CEO, enterprise, multi-branch, or multi-location angles
3. "institutional memory" / "operational intelligence" / "event extraction" / "company memory" — in an AI / agent / brain context
4. "token cost" / "token tax" / "surprise bill" / "tokenmaxxing" — in an AI/LLM context relevant to CEOs or enterprises`;

const MONITORED_ACCOUNTS = `@palantirtech (and Alex Karp related accounts), @levie (Aaron Levie, Box), @ashwingop (Ashwin Gopinath, Sentra), plus any other relevant enterprise AI / memory / sovereignty voices that surface in the searches`;

function easternDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function buildPrompt(date: string): string {
  return `You are a sharp journalist covering the "AI Company Brain" beat for multi-branch CEOs (3–15+ branches) who care about operational intelligence, AI sovereignty, institutional memory, and not leaking their competitive edge.

Use X search to run today's scan. Search X for recent posts (last 24–48 hours, prefer the most recent) across these beats:
${SEARCH_BEATS}

Also check recent posts and high-engagement replies from these monitored accounts: ${MONITORED_ACCOUNTS}

FILTERING RULES (STRICT) — only keep posts relevant to at least one of:
- Multi-branch / multi-location / franchise / distribution operations
- AI sovereignty or data ownership concerns
- Organizational / company-level memory (not just personal Second Brains)
- Event extraction, pattern detection, or institutional knowledge
- Token costs vs predictable pricing for AI
- CEO cognitive load or operational clarity across locations

Discard pure personal productivity, pure technical research, or consumer AI content unless it has a clear multi-branch or enterprise angle. Prefer high-engagement or high-signal posts over volume. Prioritize posts that create a clear contrast between personal Second Brains / general AI tools and a real private Company Brain. Always ask: "Would a multi-branch CEO care about this today?"

CRITICAL RULES:
- NEVER invent posts. Only report posts you actually found via X search, with the real handle and the real post URL.
- Write plain URLs only (https://x.com/...). Do NOT include citation markers, citation IDs, or rendering instructions of any kind.
- Be concise, high-signal, and practical.
- If the day is quiet, still produce the full report and write "Quiet day – limited high-signal activity." under High-Signal Conversations.

Produce the report in EXACTLY this markdown structure:

## Daily Company Brain Scan – ${date}

### High-Signal Conversations
- [1–2 sentence summary of the post]
  Why it matters for multi-branch CEOs: [1 short sentence]
  Source: [@handle + URL]

(Typically 3–8 posts that survive the filter.)

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

After the search, respond with ONLY the markdown report — no preamble, no closing remarks. On the very last line, after the report, append exactly: POST_COUNT: <number of posts included in High-Signal Conversations, 0 if quiet day>`;
}

async function runGrokScan(date: string): Promise<{ report: string; postCount: number }> {
  if (!XAI_API_KEY) {
    throw new Error("CONTENTLAYEROS_XAI secret is not set — cannot run the X scan.");
  }

  const res = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      input: [{ role: "user", content: buildPrompt(date) }],
      tools: [{ type: "x_search" }],
      max_output_tokens: 12000,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`xAI API ${res.status}: ${body.slice(0, 300)}`);
  }

  const json: any = await res.json();
  if (json.error) {
    throw new Error(`xAI API error: ${typeof json.error === "string" ? json.error : JSON.stringify(json.error).slice(0, 300)}`);
  }

  // Extract the final message text from the Responses API output
  let text = "";
  for (const item of json.output || []) {
    if (item.type === "message") {
      for (const c of item.content || []) {
        if (c.type === "output_text" && c.text) text += c.text;
      }
    }
  }

  if (!text.trim() || !text.includes("Daily Company Brain Scan")) {
    throw new Error(`Scan produced no valid report (status: ${json.status}, output length: ${text.length})`);
  }

  // Pull the post count off the last line, then strip it from the report
  let postCount = 0;
  const match = text.match(/POST_COUNT:\s*(\d+)/);
  if (match) postCount = parseInt(match[1], 10);
  const report = text.replace(/\n?POST_COUNT:\s*\d+\s*$/, "").trim();

  return { report, postCount };
}

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

let scanInProgress = false;

async function executeScan(triggeredBy: "manual" | "scheduled") {
  const date = easternDate();
  const { report, postCount } = await runGrokScan(date);

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

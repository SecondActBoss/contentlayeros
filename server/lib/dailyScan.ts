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

// ── MondayCEOBrief lens ──────────────────────────────────────────────────────

const MCB_SEARCH_BEATS = `
1. "company brain" / "enterprise brain" / "organizational memory" / "AI memory layer" — combined with CEO, multi-branch, multi-location, franchise, distribution, or multi-unit angles
2. "AI sovereignty" / "own the memory" / "rent the intelligence" / "data alpha" / "operational alpha" — combined with CEO, enterprise, multi-branch, or multi-location angles
3. "institutional memory" / "operational intelligence" / "event extraction" / "company memory" — in an AI / agent / brain context
4. "token cost" / "token tax" / "surprise bill" / "tokenmaxxing" — in an AI/LLM context relevant to CEOs or enterprises`;

const MCB_MONITORED_ACCOUNTS = `@palantirtech (and Alex Karp related accounts), @levie (Aaron Levie, Box), @ashwingop (Ashwin Gopinath, Sentra), plus any other relevant enterprise AI / memory / sovereignty voices that surface in the searches`;

function buildMondayCEOBriefPrompt(date: string): string {
  return `You are a sharp journalist covering the "AI Company Brain" beat for multi-branch CEOs (3–15+ branches) who care about operational intelligence, AI sovereignty, institutional memory, and not leaking their competitive edge.

Use X search to run today's scan. Search X for recent posts (last 24–48 hours, prefer the most recent) across these beats:
${MCB_SEARCH_BEATS}

Also check recent posts and high-engagement replies from these monitored accounts: ${MCB_MONITORED_ACCOUNTS}

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

// ── AgentLayerOS lens ────────────────────────────────────────────────────────

function buildAgentLayerOSPrompt(date: string): string {
  return `You are an operational signal scanner for AgentLayerOS — not an AI news scanner.

You are scanning on behalf of owners and operators of 5–100 employee SMB and early mid-market businesses, with a commercial sweet spot around $3M–$30M in annual revenue. They run intentionally lean teams where revenue expectations have grown faster than headcount. They are personally absorbing the consequences of unanswered calls, slow speed-to-lead, forgotten follow-ups, stalled opportunities, repetitive busywork, coordination overload, and work that still depends on someone remembering what happens next. They do not need more software. They need important work handled reliably.

WHAT YOU ARE LOOKING FOR:
Do NOT search only for people already talking about AI Employees. Some of the highest-value signals will never mention AI. Look for evidence of: work not getting handled, revenue leaking, humans compensating for broken coordination, businesses adding people to solve repetitive work, or new technology changing what can now be delegated. The job is to translate those signals into the AgentLayerOS point of view.

Use X search to run today's scan. Search primarily within the last 24–48 hours across these 6 beats:

BEAT 1 — INBOUND REVENUE + VOICE (HIGHEST PRIORITY)
Look for conversations about: missed business calls, unanswered calls, after-hours calls, voicemail, call abandonment, receptionist coverage, answering services, phone lead conversion, inbound call handling, appointment booking by phone, voice AI for businesses, AI receptionists, customers calling competitors after no answer. Prioritize real operators describing what happens when the phone is not answered. This beat directly supports the Inbound Revenue Agent, AgentLayerOS's featured and lead AI Employee.

BEAT 2 — SPEED-TO-LEAD + REVENUE LEAKAGE
Look for: speed-to-lead, lead response time, unanswered leads, delayed responses, missed follow-ups, stale quotes, dormant leads, lost opportunities, appointment no-shows, pipeline leakage, lead conversion, revenue recovery. Prioritize posts containing actual experiences, numbers, experiments, or measurable outcomes.

BEAT 3 — COORDINATION DEBT
Look for operators describing: being the human glue, chasing employees, reminders, handoffs, dropped balls, repetitive follow-up, re-explaining context, status checking, inbox overload, work waiting on someone, things falling through cracks, owners unable to disconnect. The post does not need to use the phrase "Coordination Debt." Recognize the underlying pattern.

BEAT 4 — HEADCOUNT + HUMAN CAPACITY
Look for: flat headcount, lean teams, hiring freezes, difficulty hiring, receptionist hiring, admin hiring, SDR hiring, coordinator hiring, virtual assistants, answering services, outsourcing, offshore staffing, "we need another person", doing more with the same team, revenue growth without proportional hiring. Look especially for repetitive work businesses are solving by adding another human. Ask: Could defined portions of this work instead be owned by an AI Employee?

BEAT 5 — DELEGATED EXECUTION + AI EMPLOYEES
Look for: AI Employees, AI coworkers, AI workforce, AI agents for business, AI for small business, voice AI, autonomous business workflows, AI handling real customer interactions, AI completing defined business jobs, businesses moving from copilots to execution. Prioritize examples where AI actually performs work. Deprioritize demonstrations where AI merely answers questions, generates content, or gives recommendations. The important question is: What did the AI actually own?

BEAT 6 — EVIDENCE + CHANGING ECONOMICS
Look for new studies, benchmarks, surveys, case studies, operator experiments, company announcements, product shifts, labor data, response-time data, conversion data, staffing economics, or customer behavior data that change the economics of answering leads, following up, hiring, coordination, customer service, revenue operations, or AI labor. Prefer evidence that can support or challenge an AgentLayerOS belief. Contradictory evidence is also valuable.

VOICES WORTH WATCHING:
Monitor SMB owners, home-service operators, multi-location operators, revenue leaders, COOs, operations leaders, founders building AI-for-business products, voice AI companies, CRM / field-service / revenue software leaders, SMB investors and researchers, and people experimenting with new operating models. Do not prioritize someone merely because they have a large following. Prioritize: specificity + operational relevance + evidence + conversation potential.

SIGNAL QUALIFICATION:
A post survives if it provides at least one strong signal around: revenue execution, inbound calls, speed-to-lead, coordination relief, human capacity, staffing pressure, work being delegated, AI owning defined work, measurable operational ROI, or work continuing while humans step away. The original post does NOT need to mention AgentLayerOS, AI Employees, or AI at all.

CONTENT OPPORTUNITY TEST — for every surviving signal, ask:
1. What real work is being discussed?
2. Who currently owns that work?
3. What happens when it is delayed or dropped?
4. Is revenue or human capacity being lost?
5. Could an AI Employee own a defined portion of it?
6. What would change if that work continued while the operator was offline?
If these questions produce an interesting answer, the signal is valuable.

CONTRARIAN OPPORTUNITY TEST:
Also identify posts where the popular interpretation is incomplete. Examples: "SMBs need better software" → They may not need better software. They may need someone — human or AI — to own the work. "We need to hire another receptionist" → Before adding another full-time role, separate the human judgment from the repetitive execution. "AI agents are getting smarter" → For most SMBs, intelligence isn't the bottleneck. Reliable execution is. Do not manufacture disagreement. Only flag a contrarian opportunity when AgentLayerOS has a substantive operational reframe.

DISCARD content primarily about: AI model benchmarks, generic AI news, prompt engineering, MCP implementation, developer frameworks, RAG/vector databases, coding agents, AGI, AI consciousness, consumer productivity apps, generic entrepreneurship, enterprise AI transformation, AI fear / mass job replacement, technical architecture without an SMB operational consequence.
EXCEPTION: A technical or AI development may survive when it materially changes what SMBs can delegate, what execution costs, or what work can now be handled reliably.

THE GUT CHECK — do NOT ask only "Would an SMB owner care about this post?" Ask:
"Can this signal teach an SMB owner something useful about revenue execution, coordination, staffing, delegation, or getting work handled?"
If yes, keep it. If it makes the eventual content more about technology than the business, discard it.

CRITICAL RULES:
- NEVER invent posts. Only report posts you actually found via X search, with the real handle and the real post URL.
- Write plain URLs only (https://x.com/...). Do NOT include citation markers, citation IDs, or rendering instructions of any kind.
- Return only high-signal findings.
- If the day is quiet, still produce the full report and note limited activity in the High-Signal Findings section.

Produce the report in EXACTLY this markdown structure:

## AgentLayerOS Daily Scan – ${date}

### High-Signal Findings

For each finding:
**Finding [N]**
- Author: [Full name if known]
- Handle: [@handle]
- Link: [https://x.com/...]
- What happened / what they said: [1–3 sentences]
- Why it matters to AgentLayerOS: [1–2 sentences]
- Content territory: [Which beat this maps to]
- Underlying operator problem: [The real business pain]
- AgentLayerOS reframe or POV: [How AgentLayerOS sees this]
- Relevant AI Employee: [If any, e.g. Inbound Revenue Agent — or "None"]
- Recommended content format: [e.g. short post, authority article, contrarian post, carousel]
- Contrarian potential: [High / Medium / Low]
- Evidence strength: [High / Medium / Low]

(If the day is quiet, write "Quiet day – limited high-signal activity." and omit individual findings.)

### Emerging Themes
[Patterns appearing across multiple conversations. List 2–4 themes.]

### Authority Article Opportunities
[Signals strong enough to support long-form thought leadership. List 1–3 opportunities.]

### Be Contrary Opportunities
[Popular narratives where AgentLayerOS has a legitimate alternative operating view. List any found, or note "None identified today."]

### Inbound Revenue Agent Opportunities
[Signals specifically suited to content about answering inbound calls, capturing demand, booking next steps, or preventing missed-call revenue loss. List any found, or note "None identified today."]

After the search, respond with ONLY the markdown report — no preamble, no closing remarks. On the very last line, after the report, append exactly: POST_COUNT: <number of findings in High-Signal Findings, 0 if quiet day>`;
}

// ── Shared helpers ───────────────────────────────────────────────────────────

export type ScanBrand = "mondayceobrief" | "agentlayeros";

function easternDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function buildPrompt(date: string, brand: ScanBrand): string {
  return brand === "agentlayeros"
    ? buildAgentLayerOSPrompt(date)
    : buildMondayCEOBriefPrompt(date);
}

function reportHeading(brand: ScanBrand): string {
  return brand === "agentlayeros" ? "AgentLayerOS Daily Scan" : "Daily Company Brain Scan";
}

async function runGrokScan(date: string, brand: ScanBrand): Promise<{ report: string; postCount: number }> {
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
      input: [{ role: "user", content: buildPrompt(date, brand) }],
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

  const heading = reportHeading(brand);
  if (!text.trim() || !text.includes(heading)) {
    throw new Error(`Scan produced no valid report (status: ${json.status}, output length: ${text.length})`);
  }

  // Pull the post count off the last line, then strip it from the report
  let postCount = 0;
  const match = text.match(/POST_COUNT:\s*(\d+)/);
  if (match) postCount = parseInt(match[1], 10);
  const report = text.replace(/\n?POST_COUNT:\s*\d+\s*$/, "").trim();

  return { report, postCount };
}

// ── Public API ────────────────────────────────────────────────────────────────

let scanInProgress: Partial<Record<ScanBrand, boolean>> = {};

export async function runDailyScan(triggeredBy: "manual" | "scheduled", brand: ScanBrand = "mondayceobrief") {
  if (scanInProgress[brand]) {
    throw new Error(`A ${brand} scan is already running. Wait for it to finish.`);
  }
  scanInProgress[brand] = true;
  try {
    return await executeScan(triggeredBy, brand);
  } finally {
    scanInProgress[brand] = false;
  }
}

async function executeScan(triggeredBy: "manual" | "scheduled", brand: ScanBrand) {
  const date = easternDate();
  const { report, postCount } = await runGrokScan(date, brand);

  // Save markdown file per spec
  try {
    const dir = path.join(process.cwd(), "daily_scans");
    fs.mkdirSync(dir, { recursive: true });
    const brandSlug = brand === "agentlayeros" ? "AgentLayerOS" : "Daily_Company_Brain";
    fs.writeFileSync(path.join(dir, `${brandSlug}_Scan_${date}.md`), report, "utf-8");
  } catch (e) {
    console.warn("[daily-scan] Failed to write markdown file:", e);
  }

  const scan = await storage.createDailyScan({
    scanDate: date,
    brand,
    report,
    postCount,
    status: postCount === 0 ? "quiet" : "complete",
    triggeredBy,
  });

  console.log(`[daily-scan] Completed ${triggeredBy} ${brand} scan for ${date}: ${postCount} high-signal posts`);
  return scan;
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
// 6:00 AM Eastern daily schedule — runs both brand lenses
export function startDailyScanScheduler() {
  import("node-cron").then(({ default: cron }) => {
    cron.schedule(
      "0 6 * * *",
      async () => {
        const brands: ScanBrand[] = ["mondayceobrief", "agentlayeros"];
        for (const brand of brands) {
          try {
            const existing = await storage.getDailyScanByDateAndBrand(easternDate(), brand);
            if (existing?.triggeredBy === "scheduled") continue; // already ran today for this brand
            await runDailyScan("scheduled", brand);
          } catch (e) {
            console.error(`[daily-scan] Scheduled scan failed for ${brand}:`, e);
          }
        }
      },
      { timezone: "America/New_York" }
    );
    console.log("[daily-scan] Scheduler active: daily at 6:00 AM Eastern (both brands)");
  });
}

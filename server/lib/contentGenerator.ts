// Content generation using OpenAI for LinkedIn posts
import OpenAI from "openai";
import type { ContextItem, ExtractedSignals, PostDraft, FeedbackEntry, ExtractedPatterns, ContrarianAngle, RawTweetType } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Post types as defined in the spec with hook biases
const POST_TYPES = [
  {
    type: "educational_authority",
    name: "High-Level Educational Authority Post",
    description: "Clear stance, operator-safe, calm authority. Demonstrates monetizable expertise.",
    hookBias: "Strong stance or reframing. Take a clear position that challenges conventional thinking about the source article topic.",
    hookExamples: [
      "Most [industry] decisions destroy margins.",
      "Not more [resource]. Better [leverage].",
      "Speed isn't the bottleneck.",
    ],
  },
  {
    type: "founder_story",
    name: "Founder Storytelling Post",
    description: "One moment → one lesson → why it matters to the reader. Personal and authentic.",
    hookBias: "Emotional mirror or lived quote grounded in the source article's ideas. Reflect a real feeling or moment.",
    hookExamples: [
      "We almost missed it.",
      "I used to think hiring solved everything.",
      "The model was wrong. Not the team.",
    ],
  },
  {
    type: "trend_translation",
    name: "Trend Translation / Strategic Arbitrage Post",
    description: "Trend → operator lens → grounded POV. Reframes industry discourse.",
    hookBias: "Disagreement with a prevailing narrative in the source article's field. Challenge what everyone else is saying.",
    hookExamples: [
      "Most [field] signals are pointing the wrong way.",
      "The real shift isn't what you think.",
      "Everyone's optimizing. Few are rethinking.",
    ],
  },
  {
    type: "system_principle",
    name: "System Principle / Rule-Based Post",
    description: "A constraint, rule, or mental model that guides decisions.",
    hookBias: "A clear rule or principle derived from the source article. State it like obvious truth.",
    hookExamples: [
      "The bottleneck is always upstream.",
      "Systems break at handoff points.",
      "If it requires approval every time, it's not a system.",
    ],
  },
];

// Extract signals from raw input
export async function extractSignals(
  rawInput: string,
  contexts: ContextItem[]
): Promise<ExtractedSignals> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const prompt = `You are analyzing raw weekly materials from a founder to extract content signals for LinkedIn posts.

CONTEXT (ICP, Positioning, Language Rules):
${contextString || "No specific context provided."}

RAW WEEKLY MATERIALS:
${rawInput}

Extract and categorize the following signals from the raw input. Be specific and actionable.

Return a JSON object with these arrays:
- expertise: Monetizable insights that change outcomes or remove friction (2-4 items)
- stories: Founder decisions, tradeoffs, realizations that could become stories (2-4 items)
- trends: Industry trends or discourse that could be reframed (1-3 items)
- opinions: Strong opinions, rules, or constraints the founder enforces (2-3 items)

Each item should be a brief phrase (5-15 words) capturing the essence.

Return ONLY valid JSON, no markdown.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content);
    return {
      expertise: parsed.expertise || [],
      stories: parsed.stories || [],
      trends: parsed.trends || [],
      opinions: parsed.opinions || [],
    };
  } catch {
    return { expertise: [], stories: [], trends: [], opinions: [] };
  }
}

// ─── SHARED PIPELINE STEPS ────────────────────────────────────────────────────

// Step 2: Extract a single core idea from signals (shared across all modes)
export async function extractCoreIdea(
  rawInput: string,
  contexts: ContextItem[],
  signals: ExtractedSignals,
  isContrarianMode: boolean = false,
  externalSignal?: string,
  framingNote?: string
): Promise<{ coreIdea: string; paradox: string; implication: string }> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const signalsString = `
EXPERTISE SIGNALS: ${signals.expertise.join(", ")}
STORY SIGNALS: ${signals.stories.join(", ")}
TREND SIGNALS: ${signals.trends.join(", ")}
OPINION SIGNALS: ${signals.opinions.join(", ")}`;

  const contraryContext = isContrarianMode && externalSignal
    ? `\n=== CONTRARIAN MODE ===\nResponding to: ${externalSignal}\n${framingNote ? `Framing: ${framingNote}` : ""}\n`
    : "";

  const prompt = `You are a content strategist for a thoughtful founder building authority on their platforms.

Based on the raw input and signals below, identify ONE powerful core insight that would resonate with operators and founders.
${contraryContext}
=== RAW INPUT ===
${rawInput}

=== EXTRACTED SIGNALS ===
${signalsString}

=== CONTEXT ===
${contextString || "Write for a professional, operator-focused audience."}

Return a JSON object with:
- coreIdea: A single sentence capturing the core insight (this will drive all content)
- paradox: The tension or counterintuitive element in this idea
- implication: What this means for the reader's work

Return ONLY valid JSON, no markdown.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  try {
    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch {
    return { coreIdea: "Generation failed", paradox: "", implication: "" };
  }
}

// Step 3: Generate source article — the primary input for all downstream content
export async function generateSourceArticle(
  rawInput: string,
  contexts: ContextItem[],
  signals: ExtractedSignals,
  coreIdea: { coreIdea: string; paradox: string; implication: string },
  angle?: string
): Promise<string> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const icpContext = contexts
    .filter((c) => c.type === "icp" || c.type === "positioning")
    .map((c) => c.content)
    .join("\n");

  const signalsString = [
    signals.expertise.length > 0 ? `EXPERTISE: ${signals.expertise.join(" | ")}` : "",
    signals.stories.length > 0 ? `STORIES: ${signals.stories.join(" | ")}` : "",
    signals.trends.length > 0 ? `TRENDS: ${signals.trends.join(" | ")}` : "",
    signals.opinions.length > 0 ? `OPINIONS: ${signals.opinions.join(" | ")}` : "",
  ].filter(Boolean).join("\n");

  const prompt = `You are writing a source authority article for a founder. This document becomes the primary source of truth for all downstream content — posts, carousels, tweets, newsletters.

=== CORE IDEA (drive everything from this) ===
Core Insight: ${coreIdea.coreIdea}
Tension: ${coreIdea.paradox}
Implication: ${coreIdea.implication}

=== CONTEXT ===
${contextString || "Operator-focused audience."}

=== SIGNALS ===
${signalsString}

=== RAW MATERIALS ===
${rawInput}

${angle ? `=== ANGLE ===\n${angle}\n` : ""}
=== TARGET READER ===
${icpContext || "Founders and operators at 5–100 person businesses feeling coordination pressure."}

=== ARTICLE STRUCTURE (follow in order) ===
1. Hook — contrarian, 1–2 sentences, creates tension
2. The Problem — real operator pain, ICP language
3. What People Think Is Happening — common belief
4. What's Actually Happening — grounded reframe
5. Core Insight / Framework — introduce the NAMED CONCEPT from the core idea
6. Real Example — concrete SMB/operator scenario
7. Implication — what this means for operators (time, revenue, stress)
8. Closing Shift — clear mental reframe, calm authority

=== WRITING RULES ===
- Conversational, 5th–6th grade reading level
- Short sentences (under 20 words)
- 1–2 sentence paragraphs, use whitespace
- No emojis, no hype, no generic advice, no listicles
- 400–700 words total

=== OUTPUT FORMAT ===
Return a JSON object with:
{
  "title": "SEO-ready title, under 12 words",
  "namedConcept": "The named concept introduced in section 5",
  "articleBody": "Full article body. Use \\n\\n between paragraphs. No markdown headers."
}

Return ONLY valid JSON, no markdown.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const title = parsed.title || "Source Article";
    const namedConcept = parsed.namedConcept || "";
    const body = parsed.articleBody || "";

    return `TITLE: ${title}\n\n${body}${namedConcept ? `\n\nNAMED CONCEPT: ${namedConcept}` : ""}`;
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────

// Generate 4 LinkedIn post drafts
export async function generatePosts(
  rawInput: string,
  contexts: ContextItem[],
  signals: ExtractedSignals,
  strongExamples: FeedbackEntry[] = [],
  sourceArticle?: string
): Promise<Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[]> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const signalsString = `
MONETIZABLE EXPERTISE:
${signals.expertise.map((e) => `- ${e}`).join("\n")}

FOUNDER STORIES:
${signals.stories.map((s) => `- ${s}`).join("\n")}

TRENDS & ARBITRAGE:
${signals.trends.map((t) => `- ${t}`).join("\n")}

STRONG OPINIONS:
${signals.opinions.map((o) => `- ${o}`).join("\n")}`;

  const sourceArticleContext = sourceArticle
    ? `\n=== SOURCE ARTICLE (PRIMARY INPUT — all posts must derive ideas from this, maintain thematic consistency, and avoid conflicting with its thesis) ===\n${sourceArticle}\n`
    : "";

  const examplesString = strongExamples.length > 0
    ? `\nSTRONG-PERFORMING EXAMPLES (learn from tone and structure, do not copy):
${strongExamples.slice(0, 3).map((e) => `[${e.postType}]: ${e.finalContent.slice(0, 300)}...`).join("\n\n")}`
    : "";

  const posts: Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[] = [];
  
  // Track used elements for anti-repetition across this weekly run
  const usedAnchors: string[] = [];
  const usedMetaphors: string[] = [];
  const usedHookTypes: string[] = [];

  for (const postType of POST_TYPES) {
    // Build anti-repetition context from previously generated posts
    const antiRepetitionContext = posts.length > 0
      ? `
=== ANTI-REPETITION RULES (CRITICAL FOR THIS WEEKLY BATCH) ===

You are generating post ${posts.length + 1} of 4 in this weekly batch.
The reader may see all 4 posts this week. Each must feel distinct.

ALREADY USED IN THIS BATCH (DO NOT REUSE VERBATIM):
${usedAnchors.length > 0 ? `Anchor phrases: ${usedAnchors.map(a => `"${a}"`).join(", ")}` : ""}
${usedMetaphors.length > 0 ? `Metaphors/framings: ${usedMetaphors.map(m => `"${m}"`).join(", ")}` : ""}
${usedHookTypes.length > 0 ? `Hook types used: ${usedHookTypes.join(", ")}` : ""}

PREVIOUS POSTS IN THIS BATCH:
${posts.map((p, i) => `Post ${i + 1} (${p.postType}): "${p.hook}" / "${p.rehook}"`).join("\n")}

ANTI-REPETITION REQUIREMENTS:
- Use DIFFERENT anchor phrase than previous posts
- Use DIFFERENT metaphor or mental model
- Express similar ideas with DIFFERENT vocabulary
- Each post answers a different question:
  * Educational Authority → Why does this problem exist?
  * Founder Story → What moment made this real?
  * Trend Translation → What narrative is wrong?
  * System Principle → What rule do we enforce?

DO NOT weaken clarity to avoid repetition. Find a different angle, not a weaker synonym.
`
      : "";

    const prompt = `You are a LinkedIn ghostwriter for a founder. Generate a ${postType.name}.

CRITICAL RULE: All ideas, examples, and arguments in this post must come from the SOURCE ARTICLE below. Do not import themes, phrases, or vocabulary from the Voice/Tone Context unless they also appear in the source article. The Voice/Tone Context tells you HOW to write — not WHAT to write about.
${sourceArticleContext || `\n=== SOURCE ARTICLE (PRIMARY INPUT) ===\n${rawInput}\n`}
=== VOICE / TONE (style only — NOT the topic) ===
${contextString || "Operator-focused, calm, authoritative. Conversational but precise."}

${examplesString}
${antiRepetitionContext}
POST TYPE: ${postType.name}
${postType.description}

=== HOOK GENERATION RULES (CRITICAL) ===

The hook (Line 1) and rehook (Line 2) are the most important parts. They determine "See more" clicks.

HOOK BIAS FOR THIS POST TYPE:
${postType.hookBias}

EXAMPLE HOOKS (structural patterns only — fill in with ideas from the source article, do not copy these verbatim):
${postType.hookExamples.map((h: string) => `- "${h}"`).join("\n")}

HOOK STRUCTURE REQUIREMENTS:
- Line 1 (hook): 8 words or less, declarative statement drawn from the source article
- Line 2 (rehook): Adds clarity, tension, or narrows audience
- NO questions in Line 1
- NO emojis
- NO hype language ("game-changing", "revolutionary", "the future")
- NO generic openings ("Here's why...", "Let's talk about...", "I've learned...")

PREFERRED HOOK TYPES (use one, grounded in source article content):
A. Strong Contrarian: A clear position that challenges conventional thinking about the source article's topic
B. Pain Mirror: Reflect a real feeling or struggle that the source article addresses
C. Rule or Principle: A rule or mental model derived from the source article
D. Reframe / Contrast: A "not X, actually Y" framing grounded in the source article's argument

REHOOK REQUIREMENTS:
Line 2 should do ONE of these:
- Add specificity tied to the source article's argument
- Create tension around the source article's core idea
- Narrow audience: "If you [do X from the article's domain], you've felt this."
- Extend with consequence from the source article

SUCCESS CRITERIA:
A good hook makes the reader think: "That's exactly the thing I've been wondering about — keep going."
NOT: "That sounds smart but I'm not sure what it's about."

=== BODY WRITING CONSTRAINTS ===
- Short lines (aim for 8 words or less per line)
- Calm, authoritative tone
- NO emojis
- NO sales copy or buzzwords
- This is a DRAFT, not publish-ready copy

Return a JSON object with:
- hook: First line (8 words or less, specific stance - NOT generic)
- rehook: Second line (adds tension, clarity, or narrows audience)
- body: Main content (short paragraphs, line breaks between thoughts)
- coreInsight: The key takeaway in one sentence
- cta: Optional engagement prompt or question (can be empty string)
- anchorPhrase: The primary memorable phrase in this post (for tracking)
- metaphor: Any metaphor or mental model used (or empty string if none)
- hookType: Which hook type you used (Contrarian, Pain Mirror, Rule/Principle, or Reframe)

Return ONLY valid JSON, no markdown.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(content);
      
      // Track used elements for anti-repetition in subsequent posts
      if (parsed.anchorPhrase) usedAnchors.push(parsed.anchorPhrase);
      if (parsed.metaphor) usedMetaphors.push(parsed.metaphor);
      if (parsed.hookType) usedHookTypes.push(parsed.hookType);
      
      posts.push({
        postType: postType.type,
        contrarianAngle: null,
        rawTweetType: null,
        hook: parsed.hook || "",
        rehook: parsed.rehook || "",
        body: parsed.body || "",
        coreInsight: parsed.coreInsight || "",
        cta: parsed.cta || null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: null,
        carouselTheme: null,
      });
    } catch {
      posts.push({
        postType: postType.type,
        contrarianAngle: null,
        rawTweetType: null,
        hook: "Generation failed",
        rehook: "Please try again",
        body: "",
        coreInsight: "",
        cta: null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: null,
        carouselTheme: null,
      });
    }
  }

  return posts;
}

// Contrarian angle definitions
const CONTRARIAN_ANGLES: { angle: ContrarianAngle; name: string; description: string; hookBias: string; hookExamples: string[] }[] = [
  {
    angle: "calm_reframe",
    name: "Calm Reframe",
    description: "Educated disagreement with high trust. The popular narrative is understandable but incomplete.",
    hookBias: "Acknowledge the popular view, then gently redirect. Show you understand before disagreeing.",
    hookExamples: [
      "This advice works online. It breaks in operations.",
      "The take isn't wrong. It's just incomplete.",
      "Popular wisdom gets one thing right and one thing wrong.",
    ],
  },
  {
    angle: "operator_reality",
    name: "Operator Reality Check",
    description: "Ground theory in lived execution. What's true online often breaks in real work.",
    hookBias: "Contrast theory with execution reality. Appeal to founders and COOs who've tried this.",
    hookExamples: [
      "This sounds great in a tweet. It fails on day 30.",
      "I've shipped this approach. Here's what broke.",
      "The gap between this advice and operations is massive.",
    ],
  },
  {
    angle: "systems_view",
    name: "Systems-Level Contrarian",
    description: "Elevate above the discourse. The problem isn't the tool or tactic - it's the lack of constraints or systems.",
    hookBias: "Zoom out to the system. Show the real lever everyone is missing.",
    hookExamples: [
      "The problem isn't the tool. It's the lack of constraints.",
      "Everyone's debating tactics. The system is the issue.",
      "This discourse misses the architecture layer.",
    ],
  },
  {
    angle: "consequence_view",
    name: "Consequence-Based POV",
    description: "Practical caution without alarm. If you follow this advice, here's what quietly goes wrong.",
    hookBias: "Show the downstream effects. Non-alarmist warning about what breaks.",
    hookExamples: [
      "Follow this advice. Watch what quietly breaks.",
      "This works short-term. Long-term, it compounds badly.",
      "The hidden cost of this approach shows up later.",
    ],
  },
];

// Generate 4 contrarian LinkedIn post drafts
export async function generateContrarianPosts(
  externalSignal: string,
  framingNote: string | undefined,
  contexts: ContextItem[],
  strongExamples: FeedbackEntry[] = [],
  sourceArticle?: string
): Promise<Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[]> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const sourceArticleContext = sourceArticle
    ? `\n=== SOURCE ARTICLE (YOUR PERSPECTIVE — use this to ground your contrarian response in your own operator experience and thesis) ===\n${sourceArticle}\n`
    : "";

  const examplesString = strongExamples.length > 0
    ? `\nSTRONG-PERFORMING EXAMPLES (learn from tone and structure, do not copy):
${strongExamples.slice(0, 3).map((e) => `[${e.postType}]: ${e.finalContent.slice(0, 300)}...`).join("\n\n")}`
    : "";

  const posts: Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[] = [];
  
  // Track used elements for anti-repetition across this contrarian batch
  const usedAnchors: string[] = [];
  const usedFramings: string[] = [];

  for (const angleConfig of CONTRARIAN_ANGLES) {
    // Build anti-repetition context from previously generated posts
    const antiRepetitionContext = posts.length > 0
      ? `
=== ANTI-REPETITION RULES (CRITICAL FOR THIS CONTRARIAN BATCH) ===

You are generating contrarian post ${posts.length + 1} of 4.
The reader may see all 4 takes. Each must feel like a distinct angle, not rewording.

ALREADY USED IN THIS BATCH (DO NOT REUSE):
${usedAnchors.length > 0 ? `Key phrases: ${usedAnchors.map(a => `"${a}"`).join(", ")}` : ""}
${usedFramings.length > 0 ? `Framings used: ${usedFramings.map(f => `"${f}"`).join(", ")}` : ""}

PREVIOUS POSTS IN THIS BATCH:
${posts.map((p, i) => `Post ${i + 1} (${p.contrarianAngle}): "${p.hook}" / "${p.rehook}"`).join("\n")}

ANTI-REPETITION REQUIREMENTS:
- Use DIFFERENT key phrase than previous posts
- Use DIFFERENT framing angle
- Each post represents a genuinely different lens on the disagreement
`
      : "";

    const prompt = `You are a LinkedIn ghostwriter for a founder. Generate a CONTRARIAN response to an external post/narrative.

=== CRITICAL TONE RULES FOR CONTRARIAN POSTS ===

All contrarian posts MUST be:
- Calm, not combative
- Thoughtful disagreement, not dunking or mocking
- NEVER name or tag the original author
- NEVER use "everyone is wrong" framing
- NEVER use outrage language

The tone should feel like:
"I've seen this break in practice."

NOT like:
"This is stupid." or "They're wrong."

SUCCESS CRITERIA:
A strong contrarian post should make readers think:
"I hadn't considered it that way — and that matters."

NOT:
"This person is just being spicy."

=== EXTERNAL SIGNAL TO RESPOND TO ===
${externalSignal}

${framingNote ? `FRAMING GUIDANCE FROM USER:\n${framingNote}\n` : ""}
=== YOUR CONTEXT ===
${contextString || "Write for a professional, operator-focused audience."}
${sourceArticleContext}
${examplesString}
${antiRepetitionContext}

=== CONTRARIAN ANGLE: ${angleConfig.name} ===
${angleConfig.description}

HOOK BIAS FOR THIS ANGLE:
${angleConfig.hookBias}

EXAMPLE HOOKS (for tone/structure only, do not copy):
${angleConfig.hookExamples.map((h) => `- "${h}"`).join("\n")}

=== HOOK REQUIREMENTS ===
- Line 1 (hook): 8 words or less, declarative, signals disagreement or reframing
- Line 2 (rehook): Adds clarity, tension, or specificity
- NO questions in Line 1
- NO emojis
- NO hype language
- NO generic openings

=== BODY WRITING CONSTRAINTS ===
- Short lines (aim for 8 words or less per line)
- Calm, authoritative tone
- NO emojis
- NO personal attacks or naming
- This is a DRAFT, not publish-ready copy

Return a JSON object with:
- hook: First line (8 words or less, signals thoughtful disagreement)
- rehook: Second line (adds tension, clarity, or narrows audience)
- body: Main content (short paragraphs, line breaks between thoughts)
- coreInsight: The key contrarian insight in one sentence
- cta: Optional engagement prompt (can be empty string)
- anchorPhrase: The primary memorable phrase (for tracking)
- framingUsed: How you framed the disagreement (for tracking)

Return ONLY valid JSON, no markdown.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(content);
      
      // Track used elements for anti-repetition in subsequent posts
      if (parsed.anchorPhrase) usedAnchors.push(parsed.anchorPhrase);
      if (parsed.framingUsed) usedFramings.push(parsed.framingUsed);
      
      posts.push({
        postType: "contrarian_pov",
        contrarianAngle: angleConfig.angle,
        rawTweetType: null,
        hook: parsed.hook || "",
        rehook: parsed.rehook || "",
        body: parsed.body || "",
        coreInsight: parsed.coreInsight || "",
        cta: parsed.cta || null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: null,
        carouselTheme: null,
      });
    } catch {
      posts.push({
        postType: "contrarian_pov",
        contrarianAngle: angleConfig.angle,
        rawTweetType: null,
        hook: "Generation failed",
        rehook: "Please try again",
        body: "",
        coreInsight: "",
        cta: null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: null,
        carouselTheme: null,
      });
    }
  }

  return posts;
}

// LinkedIn Carousel theme definitions for generating 3 distinct carousels
const CAROUSEL_THEMES = [
  {
    theme: "step_by_step",
    name: "Step-by-Step Framework",
    description: "A practical, numbered guide that walks through a process or methodology. Easy to follow, highly actionable.",
    slideGuidance: "Each slide should be one clear step with a memorable headline and 1-2 sentence explanation.",
  },
  {
    theme: "myth_busting",
    name: "Myth vs Reality",
    description: "Challenges common misconceptions with operator-grounded truth. Each slide debunks one myth.",
    slideGuidance: "Slide format: 'Myth: [common belief]' then 'Reality: [what operators actually experience]'",
  },
  {
    theme: "lessons_learned",
    name: "Lessons from Experience",
    description: "First-person insights from building, operating, or scaling. Personal but universal.",
    slideGuidance: "Each slide is one lesson with context. Keep it honest and specific, not generic advice.",
  },
];

// Generate 3 LinkedIn Carousel drafts
export async function generateCarousels(
  rawInput: string,
  contexts: ContextItem[],
  signals: ExtractedSignals,
  strongExamples: FeedbackEntry[] = [],
  sourceArticle?: string
): Promise<Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[]> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const signalsString = `
MONETIZABLE EXPERTISE:
${signals.expertise.map((e) => `- ${e}`).join("\n")}

FOUNDER STORIES:
${signals.stories.map((s) => `- ${s}`).join("\n")}

TRENDS & ARBITRAGE:
${signals.trends.map((t) => `- ${t}`).join("\n")}

STRONG OPINIONS:
${signals.opinions.map((o) => `- ${o}`).join("\n")}`;

  const sourceArticleContext = sourceArticle
    ? `\n=== SOURCE ARTICLE (PRIMARY INPUT — carousel ideas must derive from this and maintain thematic consistency) ===\n${sourceArticle}\n`
    : "";

  const carousels: Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[] = [];

  for (const themeConfig of CAROUSEL_THEMES) {
    const prompt = `You are a LinkedIn carousel content creator for a founder. Generate a ${themeConfig.name} carousel.

CRITICAL RULE: All slide ideas, examples, and arguments must come from the SOURCE ARTICLE below. Do not import themes or vocabulary from the Voice/Tone Context. The Voice/Tone Context tells you HOW to write — not WHAT to write about.
${sourceArticleContext || `\n=== SOURCE ARTICLE (PRIMARY INPUT) ===\n${rawInput}\n`}
=== VOICE / TONE (style only — NOT the topic) ===
${contextString || "Operator-focused, calm, authoritative. Conversational but precise."}

=== CAROUSEL TYPE: ${themeConfig.name} ===
${themeConfig.description}

SLIDE GUIDANCE:
${themeConfig.slideGuidance}

=== CAROUSEL STRUCTURE REQUIREMENTS ===

Generate a 7-slide carousel with this structure:
1. HOOK SLIDE (Slide 1): A bold statement or question that stops the scroll. 4-8 words max.
2. CONTENT SLIDES (Slides 2-6): The core content following the theme format. Each slide has:
   - headline: 4-10 words, the key point
   - body: 1-3 sentences expanding on the headline
3. CTA SLIDE (Slide 7): A clear call-to-action. What should they do next?

=== TONE & STYLE RULES ===
- Calm, authoritative operator voice
- NO emojis
- NO hype language ("game-changing", "revolutionary")
- Short, punchy text (carousels are visual, text must be scannable)
- Each slide should stand alone but flow together

=== OUTPUT FORMAT ===
Return a JSON object with:
- theme: "${themeConfig.theme}"
- title: Overall carousel topic (5-12 words)
- coreInsight: The key takeaway in one sentence
- slides: Array of 7 objects, each with:
  - slideNumber: 1-7
  - headline: The main text (4-10 words)
  - body: Supporting text (1-3 sentences, keep brief for carousel format)
  - slideType: "hook" (slide 1), "content" (slides 2-6), or "cta" (slide 7)

Return ONLY valid JSON, no markdown.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(content);
      
      carousels.push({
        postType: "linkedin_carousel",
        contrarianAngle: null,
        rawTweetType: null,
        hook: parsed.title || `${themeConfig.name} Carousel`,
        rehook: themeConfig.name,
        body: "", // Body not used for carousels - slides contain the content
        coreInsight: parsed.coreInsight || "",
        cta: null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: parsed.slides || [],
        carouselTheme: themeConfig.theme,
      });
    } catch {
      carousels.push({
        postType: "linkedin_carousel",
        contrarianAngle: null,
        rawTweetType: null,
        hook: "Carousel Generation Failed",
        rehook: themeConfig.name,
        body: "",
        coreInsight: "",
        cta: null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: [],
        carouselTheme: themeConfig.theme,
      });
    }
  }

  return carousels;
}

// Generate 𝕏 (Twitter) content: 1 X Article + 9 posts
export async function generateTwitterContent(
  rawInput: string,
  contexts: ContextItem[],
  extractedSignals: ExtractedSignals,
  strongExamples: FeedbackEntry[] = [],
  isContrarianMode: boolean = false,
  externalSignal?: string,
  framingNote?: string,
  sharedCoreIdea?: { coreIdea: string; paradox: string; implication: string },
  sourceArticle?: string
): Promise<Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[]> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const signalsString = `
EXPERTISE SIGNALS: ${extractedSignals.expertise.join(", ")}
STORY SIGNALS: ${extractedSignals.stories.join(", ")}
TREND SIGNALS: ${extractedSignals.trends.join(", ")}
OPINION SIGNALS: ${extractedSignals.opinions.join(", ")}`;

  const contraryContext = isContrarianMode && externalSignal
    ? `
=== CONTRARIAN MODE ENABLED ===
You are responding thoughtfully to this external content:
${externalSignal}
${framingNote ? `\nFRAMING GUIDANCE: ${framingNote}` : ""}

Be calm (not combative), express thoughtful disagreement, never name the original author.
`
    : "";

  const sourceArticleContext = sourceArticle
    ? `\n=== SOURCE ARTICLE (PRIMARY INPUT — all 𝕏 content must derive from and be consistent with this) ===\n${sourceArticle}\n`
    : "";

  const posts: Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[] = [];

  // ── Pre-step: Extract 9 distinct, specific angles from raw input ───────────
  // Each angle must be grounded in a named/concrete detail — a specific company,
  // statistic, quote, or named concept — so the 9 posts all cover different ground.
  let twitterAngles: string[] = [];
  try {
    const anglesPrompt = `You are a content strategist reading this raw material to plan 9 distinct 𝕏 (Twitter) posts.

Your job: Extract exactly 9 DIFFERENT, SPECIFIC angles from the raw material below. Each angle must:
- Reference a NAMED, CONCRETE detail: a specific company, person, quoted phrase, precise statistic, market size, named concept, or counterintuitive fact
- Be UNIQUE — no two angles should overlap or cover the same idea
- Be written as a 1-sentence "post seed" that gives the writer something specific to work with
- NOT be a generic theme ("AI is changing work", "coordination pain", "smarter tools") — if a detail isn't named or concrete, it doesn't count

EXAMPLES of good angles:
- "Crosby started with NDAs — one well-defined, already-outsourced task — not the hardest problem but the clearest one"
- "For every dollar spent on software, six dollars go to services — that ratio is the real TAM"
- "More Cursor tasks are now started by agents than by humans — software engineering crossed the threshold first"

EXAMPLES of bad angles (too generic — reject these):
- "AI is moving from tools to outcomes"
- "Coordination pain is the signal"
- "Relief beats intelligence"

=== RAW MATERIAL ===
${rawInput}

Return a JSON object with:
- angles: An array of exactly 9 strings, each a 1-sentence specific post seed

Return ONLY valid JSON, no markdown.`;

    const anglesResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: anglesPrompt }],
      response_format: { type: "json_object" },
    });
    const anglesParsed = JSON.parse(anglesResponse.choices[0]?.message?.content || "{}");
    twitterAngles = Array.isArray(anglesParsed.angles) ? anglesParsed.angles : [];
  } catch {
    twitterAngles = [];
  }

  // Use shared coreIdea if provided (avoids duplicate API call), otherwise generate
  let coreIdea = sharedCoreIdea || { coreIdea: "", paradox: "", implication: "" };

  if (!sharedCoreIdea) {
    const coreIdeaPrompt = `You are a content strategist for a thoughtful founder building authority on 𝕏 (Twitter).

Based on the raw input and signals below, identify ONE powerful core insight that would resonate with operators and founders.
${contraryContext}
=== RAW INPUT ===
${rawInput}

=== EXTRACTED SIGNALS ===
${signalsString}

=== CONTEXT ===
${contextString || "Write for a professional, operator-focused audience."}

Return a JSON object with:
- coreIdea: A single sentence capturing the core insight (this will drive all content)
- paradox: The tension or counterintuitive element in this idea
- implication: What this means for the reader's work

Return ONLY valid JSON, no markdown.`;

    const coreResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: coreIdeaPrompt }],
      response_format: { type: "json_object" },
    });

    try {
      coreIdea = JSON.parse(coreResponse.choices[0]?.message?.content || "{}");
    } catch {
      coreIdea = { coreIdea: "Generation failed", paradox: "", implication: "" };
    }
  }

  // 1. Generate 𝕏 Article (600-850 words) — Greg Isenberg style
  const newsletterPrompt = `You are the world's best writer of viral 𝕏 Articles in the exact style of Greg Isenberg.

CRITICAL RULE: The article must be grounded in the RAW MATERIALS below. Use the specific ideas, examples, companies, statistics, and language from the raw materials. Do not import themes from outside the raw materials. The voice/tone context at the bottom tells you HOW to refine — not WHAT to write about.
${contraryContext}
=== RAW MATERIALS (PRIMARY SOURCE — this is what the article is about) ===
${rawInput}

Write every Article with this voice and structure:

- Calm, battle-tested operator / consultant tone. Direct, authoritative, and conversational — like a founder who has seen the same pattern 100 times and is quietly telling you the real reason it's happening.
- Use soft authority phrases like "I see this in almost every..." or "Most founders I talk to..." or "Here's what actually changes the game."
- Extremely short paragraphs: 1 sentence per paragraph most of the time. Never more than 2 sentences.
- Heavy use of line breaks and white space for scannability.
- One relatable opening scene or observation that makes the reader feel instantly seen.
- Bold subheads only when they add clarity (use sparingly).
- Occasional **bold** for emphasis inside paragraphs.
- Clear story arc: Hook → Pain → Why it's worse than you think → Failed old solutions → Breakthrough new solution → Moment of reflection → Inspiring future vision → Strong CTA.
- Make it feel like it came straight from a battle-tested operator who just figured something out.
- Total length: 600–850 words.

=== VOICE / TONE REFINEMENTS (style only — NOT the topic) ===
${contextString || "Operator-focused. No hype, no corporate speak, no emojis."}

TASK:
Now take the rough idea in the Raw Materials above and turn it into a complete, publication-ready 𝕏 Article at the highest level. Stay faithful to the specific details, names, and examples in the Raw Materials — do not abstract them into generalities or invent themes not present there.

Return a JSON object with:
- title: A punchy, curiosity-driven title (≤12 words)
- body: The full 𝕏 Article (600–850 words, publication-ready, in the Greg Isenberg style described above)
- coreInsight: The core idea in one sentence

Return ONLY valid JSON, no markdown.`;

  const newsletterResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: newsletterPrompt }],
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(newsletterResponse.choices[0]?.message?.content || "{}");
    posts.push({
      postType: "newsletter_section",
      contrarianAngle: null,
      rawTweetType: null,
      hook: parsed.title || "Newsletter Section",
      rehook: "",
      body: parsed.body || "",
      coreInsight: parsed.coreInsight || coreIdea.coreIdea,
      cta: null,
      status: "draft",
      postUrl: null,
      // Phoenix metadata - newsletter optimized for dwell time
      replyLikelihood: "medium",
      dwellLikelihood: "high",
      fatigueRisk: "low",
      authorEngagementReminder: "Reply to comments in the first 15-30 minutes to boost conversation signals.",
      carouselSlides: null,
      carouselTheme: null,
    });
  } catch {
    posts.push({
      postType: "newsletter_section",
      contrarianAngle: null,
      rawTweetType: null,
      hook: "Newsletter Section",
      rehook: "",
      body: "Generation failed. Please try again.",
      coreInsight: "",
      cta: null,
      status: "draft",
      postUrl: null,
      replyLikelihood: null,
      dwellLikelihood: null,
      fatigueRisk: null,
      authorEngagementReminder: null,
      carouselSlides: null,
      carouselTheme: null,
    });
  }

  // 2. Generate NINE 𝕏 Posts
  // Phoenix-optimized prompts for 𝕏 algorithm alignment
  const twitterPostTypes = [
    {
      type: "twitter_pov" as const,
      name: "POV Statement",
      description: "Declarative belief — single powerful statement, bookmarkable",
      prompt: `Compress the core idea into a single, declarative 𝕏 post.
- Must be ≤280 characters
- Single powerful statement of belief — no preamble
- Designed to be bookmarked
- No thread language
- No hashtags, emojis, or external links
- End with a thought that invites a quiet reply (avoid engagement bait like "thoughts?" or "agree?")
- Make it feel like a belief worth remembering, not content to consume`,
    },
    {
      type: "twitter_paradox" as const,
      name: "Paradox / Reframe",
      description: "Counterintuitive truth that challenges a popular assumption",
      prompt: `Write a 𝕏 post that presents the paradox or reframe.
- Must be ≤280 characters
- Challenges a popular assumption
- Counterintuitive truth
- Calm, non-combative tone
- No hashtags, emojis, or external links
- Use line breaks strategically to slow the reader down (dwell-time optimization)
- End with a statement that invites reflection, not explicit asks for engagement`,
    },
    {
      type: "twitter_operator" as const,
      name: "Operator Reality Check",
      description: "Grounded, lived insight focused on execution",
      prompt: `Write a 𝕏 post as an operator reality check.
- Must be ≤280 characters
- Grounded in lived experience
- Focus on execution, coordination, or relief
- No hashtags, emojis, or external links
- End with a phrase that naturally prompts replies (operators sharing their experience)
- Example endings: "still learning how to..." or "the fix was simpler than I expected" — not "what's your take?"`,
    },
    {
      type: "twitter_pov" as const,
      name: "System Rule",
      description: "Mental model or operating constraint that snaps a concept into place",
      prompt: `Write a 𝕏 post that reads like a discovered operating rule.
- Must be ≤280 characters
- State it like a law of physics for operators — blunt and precise
- Could start with: "The rule is..." / "Every time..." / "The faster you..." / "Most people think X. The real constraint is Y."
- No hashtags, emojis, or external links
- Should feel like a mental model worth screenshotting`,
    },
    {
      type: "twitter_paradox" as const,
      name: "Contrarian Truth",
      description: "Flips a widely-held belief with calm authority",
      prompt: `Write a 𝕏 post that flips a conventional take without being combative.
- Must be ≤280 characters
- Opens by acknowledging the popular belief, then pivots
- Example structure: "Everyone says X. The truth: Y." or "X sounds smart. It's actually the problem."
- Calm and confident — not cynical or provocative for its own sake
- No hashtags, emojis, or external links
- Leave the reader slightly unsettled — in a good way`,
    },
    {
      type: "twitter_operator" as const,
      name: "Quiet Insight",
      description: "Reflective, slower observation — the kind that makes people feel understood",
      prompt: `Write a 𝕏 post that reads like a quiet realization.
- Must be ≤280 characters
- Reflective, contemplative tone — not a declaration
- The reader should feel: "I've thought this but never said it"
- No hashtags, emojis, or external links
- Use line breaks to create breathing room
- Do not end with a question — let it land in silence`,
    },
    {
      type: "twitter_pov" as const,
      name: "Story Moment",
      description: "A specific scene or micro-story that makes the core idea tangible",
      prompt: `Write a 𝕏 post structured around a single moment or scene.
- Must be ≤280 characters
- Opens with a concrete moment: a conversation, a decision, a realization
- The scene implies the lesson — don't over-explain
- No hashtags, emojis, or external links
- Should feel cinematic and specific, not vague or generic
- End with the earned insight — 1 sentence`,
    },
    {
      type: "twitter_paradox" as const,
      name: "Future Vision",
      description: "A forward-looking statement about where this is heading",
      prompt: `Write a 𝕏 post that paints a near-future picture based on the core idea.
- Must be ≤280 characters
- Project 12–24 months out — confident, not speculative
- Ground it in operator reality, not hype
- No hashtags, emojis, or external links
- Could open with: "In 18 months..." / "The founders who figure this out now..." / "This is what separates..."
- Should feel inevitable in hindsight`,
    },
    {
      type: "twitter_operator" as const,
      name: "Mirror / Recognition",
      description: "Makes the reader feel seen — describes their exact situation",
      prompt: `Write a 𝕏 post that mirrors the reader's unspoken experience.
- Must be ≤280 characters
- Describes a feeling, struggle, or moment the reader hasn't articulated yet
- Could open with: "You know that feeling when..." / "If your [problem] feels like..." / "The frustrating part is..."
- No hashtags, emojis, or external links
- Should prompt the reader to save it or send it to someone who needs to see it
- Do not offer a solution — just make them feel understood`,
    },
  ];

  for (let i = 0; i < twitterPostTypes.length; i++) {
    const postConfig = twitterPostTypes[i];
    const assignedAngle = twitterAngles[i] || "";
    const angleInstruction = assignedAngle
      ? `=== YOUR ASSIGNED ANGLE (write THIS post about THIS specific detail) ===
${assignedAngle}

You MUST write about this specific angle. Do not substitute a different angle or generalize it into a broader theme.`
      : `=== FIND YOUR OWN SPECIFIC ANGLE ===
Pick ONE concrete, named detail from the Raw Materials (a specific company, stat, quote, or named concept). Do NOT write about generic themes like "coordination pain" or "smarter tools".`;

    const prompt = `You are a founder writing a single 𝕏 (Twitter) post.

${angleInstruction}

=== POST TYPE: ${postConfig.name} ===
${postConfig.description}

${postConfig.prompt}

=== RAW MATERIALS (for reference and context) ===
${rawInput}

=== VOICE / TONE (how to write — NOT what to write about) ===
${contextString || "Operator-focused, calm, authoritative tone. No hype."}

CRITICAL CONSTRAINTS:
- ≤280 characters (STRICT LIMIT)
- Must be grounded in the specific assigned angle above
- No hashtags
- No emojis
- No engagement bait
- No "thread 🧵" language
- No hype or outrage framing
- Clarity > cleverness

Return a JSON object with:
- post: The complete 𝕏 post (≤280 characters)
- coreInsight: The key insight in one sentence
- characterCount: Number of characters in the post

Return ONLY valid JSON, no markdown.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    try {
      const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
      // Determine Phoenix metadata based on post type
      const isOperatorReality = postConfig.type === "twitter_operator";
      const isParadox = postConfig.type === "twitter_paradox";
      posts.push({
        postType: postConfig.type,
        contrarianAngle: null,
        rawTweetType: null,
        hook: parsed.post || "",
        rehook: "",
        body: "",
        coreInsight: parsed.coreInsight || coreIdea.coreIdea,
        cta: null,
        status: "draft",
        postUrl: null,
        // Phoenix metadata
        replyLikelihood: isOperatorReality ? "high" : (isParadox ? "medium" : "medium"),
        dwellLikelihood: isParadox ? "high" : "medium",
        fatigueRisk: "low",
        authorEngagementReminder: "Reply to comments in the first 15-30 minutes to boost conversation signals.",
        carouselSlides: null,
        carouselTheme: null,
      });
    } catch {
      posts.push({
        postType: postConfig.type,
        contrarianAngle: null,
        rawTweetType: null,
        hook: "Generation failed",
        rehook: "",
        body: "",
        coreInsight: "",
        cta: null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: null,
        carouselTheme: null,
      });
    }
  }

  return posts;
}

// Extract patterns from approved content for learning
export async function extractPatterns(content: string): Promise<ExtractedPatterns> {
  const prompt = `Analyze this LinkedIn post and extract writing patterns:

POST:
${content}

Return a JSON object with:
- tone: Describe the overall tone (e.g., "calm authority", "conversational", "direct")
- hookStructure: How the hook is structured (e.g., "specific claim", "question", "observation")
- sentenceLength: Characterize sentence length (e.g., "very short", "mixed", "punchy")
- framingStyle: How ideas are framed (e.g., "contrarian", "story-driven", "principle-based")

Return ONLY valid JSON, no markdown.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const responseContent = response.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(responseContent);
    return {
      tone: parsed.tone || "",
      hookStructure: parsed.hookStructure || "",
      sentenceLength: parsed.sentenceLength || "",
      framingStyle: parsed.framingStyle || "",
    };
  } catch {
    return {
      tone: "",
      hookStructure: "",
      sentenceLength: "",
      framingStyle: "",
    };
  }
}

// Phoenix Guardrail: Detect content fatigue by analyzing semantic similarity
export interface FatigueAnalysis {
  overallFatigueRisk: "low" | "medium" | "high";
  similarPosts: Array<{
    hookPreview: string;
    similarityReason: string;
  }>;
  recommendations: string[];
}

export async function detectContentFatigue(
  newDraft: { hook: string; body: string; coreInsight: string },
  recentApprovedPosts: Array<{ hook: string; body: string; coreInsight: string }>
): Promise<FatigueAnalysis> {
  if (recentApprovedPosts.length === 0) {
    return {
      overallFatigueRisk: "low",
      similarPosts: [],
      recommendations: [],
    };
  }

  const prompt = `Analyze this new draft for content fatigue by comparing it to recent approved posts.

=== NEW DRAFT ===
Hook: ${newDraft.hook}
Body: ${newDraft.body.slice(0, 300)}...
Core Insight: ${newDraft.coreInsight}

=== RECENT APPROVED POSTS (Last 7) ===
${recentApprovedPosts.slice(0, 7).map((post, i) => `
${i + 1}. Hook: ${post.hook}
   Core Insight: ${post.coreInsight}
`).join("\n")}

Analyze for:
1. Semantic similarity (same core idea expressed differently)
2. Structural repetition (same hook patterns, same frameworks)
3. Thematic overuse (same topics appearing too often)
4. Audience fatigue risk (will readers feel déjà vu?)

Return a JSON object with:
- overallFatigueRisk: "low" | "medium" | "high"
- similarPosts: Array of { hookPreview: string (first 50 chars), similarityReason: string } - only include if similarity found
- recommendations: Array of strings with specific suggestions to differentiate

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      overallFatigueRisk: parsed.overallFatigueRisk || "low",
      similarPosts: parsed.similarPosts || [],
      recommendations: parsed.recommendations || [],
    };
  } catch {
    return {
      overallFatigueRisk: "low",
      similarPosts: [],
      recommendations: [],
    };
  }
}

// Raw Tweet types for variety
const RAW_TWEET_TYPES: Array<{
  type: RawTweetType;
  name: string;
  description: string;
  examples: string[];
}> = [
  {
    type: "pov_statement",
    name: "POV Statement",
    description: "Clear belief or stance. Declarative, calm.",
    examples: [
      "Most startup advice is written by people who never operated.",
      "Speed is not the goal. Removing friction is.",
      "The best tools disappear. You just get results.",
    ],
  },
  {
    type: "contrarian_reframe",
    name: "Contrarian Reframe",
    description: "Disagrees with a common assumption. Non-combative.",
    examples: [
      "Product-market fit isn't a moment. It's a process that never ends.",
      "Hustle culture optimizes for motion, not progress.",
      "AI won't replace you. Someone using AI well might.",
    ],
  },
  {
    type: "operator_reality",
    name: "Operator Reality",
    description: "Observational. Feels lived-in.",
    examples: [
      "The meeting was about the meeting.",
      "Half the tools we bought are unused. The team built their own.",
      "Shipped fast. Fixed faster. Still fixing.",
    ],
  },
  {
    type: "system_rule",
    name: "System Rule",
    description: "Principle or constraint. Short and memorable.",
    examples: [
      "If it needs a meeting, it's not automated.",
      "One owner. One decision. One source of truth.",
      "Document what breaks, not what works.",
    ],
  },
  {
    type: "quiet_insight",
    name: "Quiet Insight",
    description: "Reflective. Slightly unfinished (invites thought).",
    examples: [
      "Maybe the roadmap isn't the point.",
      "Clarity feels slow until you realize how much time confusion cost.",
      "The best founders I know ask fewer questions, but better ones.",
    ],
  },
];

// Generate Raw Tweets: 5-7 single tweets ≤280 chars
export async function generateRawTweets(
  rawInput: string,
  contexts: ContextItem[],
  extractedSignals: ExtractedSignals,
  externalSignal?: string,
  framingNote?: string,
  sourceArticle?: string
): Promise<Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[]> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const signalsString = `
EXPERTISE SIGNALS: ${extractedSignals.expertise.join(", ")}
STORY SIGNALS: ${extractedSignals.stories.join(", ")}
TREND SIGNALS: ${extractedSignals.trends.join(", ")}
OPINION SIGNALS: ${extractedSignals.opinions.join(", ")}`;

  const externalContext = externalSignal
    ? `
=== EXTERNAL SIGNAL (Optional reference) ===
${externalSignal}
${framingNote ? `FRAMING: ${framingNote}` : ""}
`
    : "";

  const sourceArticleContext = sourceArticle
    ? `\n=== SOURCE ARTICLE (PRIMARY INPUT — tweets must be thematically consistent with this article's ideas) ===\n${sourceArticle}\n`
    : "";

  const tweetTypeDescriptions = RAW_TWEET_TYPES.map(
    (t) => `- ${t.name}: ${t.description}\n  Examples: ${t.examples.map((e) => `"${e}"`).join(", ")}`
  ).join("\n\n");

  const prompt = `You are generating raw tweets for a founder's 𝕏 (Twitter) account.

=== RAW MATERIALS ===
${rawInput}

=== EXTRACTED SIGNALS (secondary input) ===
${signalsString}
${externalContext}${sourceArticleContext}
=== CONTEXT ===
${contextString || "Write for a professional, operator-focused audience."}

=== TWEET TYPE VARIETY (MUST USE MIX) ===
${tweetTypeDescriptions}

=== STRICT REQUIREMENTS ===
Generate 6 single tweets that:
- Are each ≤ 280 characters (CRITICAL - count carefully)
- Stand alone (no threads, no "1/", no "🧵")
- Contain one clear idea only
- Are immediately postable
- Use a VARIETY of tweet types (at least 4 different types)
- Never use the same tweet type back-to-back

=== PHOENIX ALGORITHM OPTIMIZATION (MANDATORY) ===
- End at least 2 tweets with reply-inviting closings (not bait):
  - Good: "still figuring this out" / "took me too long to see this"
  - Bad: "thoughts?" / "agree?" / "what do you think?"
- Use line breaks in at least 1 tweet for dwell-time (slow the reader down)
- At least 1 tweet should be a quiet insight that makes readers pause and think

=== PLATFORM RETENTION CONSTRAINTS (MANDATORY) ===
- NO emojis
- NO hashtags
- NO thread language
- NO external links (keeps readers on platform)
- NO engagement bait ("Thoughts?", "Agree?", "RT if...")
- NO hype or outrage framing
- Tone: "Typed by a founder between meetings"
- NOT: "Crafted by a creator"

=== ANTI-OVERPOLISH RULE ===
- Prefer short sentences
- Avoid metaphors that require setup
- Avoid marketing language
- Avoid full explanations
- These are idea sparks, not essays

=== OUTPUT FORMAT ===
Return a JSON object with:
{
  "tweets": [
    {
      "text": "The tweet text (≤280 chars)",
      "type": "pov_statement|contrarian_reframe|operator_reality|system_rule|quiet_insight",
      "charCount": 123
    }
  ]
}

Each tweet should make a reader think: "That's true — and I hadn't named it."
NOT: "This feels like content."

Return ONLY valid JSON, no markdown.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const posts: Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[] = [];

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const tweets = parsed.tweets || [];

    for (const tweet of tweets) {
      // Ensure tweet is within character limit
      const tweetText = tweet.text?.slice(0, 280) || "";
      
      // Determine Phoenix metadata based on tweet type
      const tweetType = tweet.type as RawTweetType || "pov_statement";
      const isOperatorReality = tweetType === "operator_reality";
      const isContrarianReframe = tweetType === "contrarian_reframe";
      const isQuietInsight = tweetType === "quiet_insight";
      
      posts.push({
        postType: "raw_tweet",
        contrarianAngle: null,
        rawTweetType: tweetType,
        hook: tweetText,
        rehook: "",
        body: "",
        coreInsight: `${tweet.type} tweet`,
        cta: null,
        status: "draft",
        postUrl: null,
        // Phoenix metadata based on tweet type
        replyLikelihood: isOperatorReality ? "high" : (isContrarianReframe ? "medium" : "medium"),
        dwellLikelihood: isQuietInsight ? "high" : "medium",
        fatigueRisk: "low",
        authorEngagementReminder: "Reply to comments in the first 15-30 minutes to boost conversation signals.",
        carouselSlides: null,
        carouselTheme: null,
      });
    }
  } catch {
    // Generate placeholder if parsing fails
    posts.push({
      postType: "raw_tweet",
      contrarianAngle: null,
      rawTweetType: "pov_statement",
      hook: "Generation failed. Please try again.",
      rehook: "",
      body: "",
      coreInsight: "",
      cta: null,
      status: "draft",
      postUrl: null,
      replyLikelihood: null,
      dwellLikelihood: null,
      fatigueRisk: null,
      authorEngagementReminder: null,
      carouselSlides: null,
      carouselTheme: null,
    });
  }

  return posts;
}

// ─── TRI-PUBLISH PACK ────────────────────────────────────────────────────────

// Generate 3 platform-adapted versions of the source article
export async function generateTriPublishPack(
  sourceArticle: string,
  contexts: ContextItem[],
  includeLlmOptimization?: boolean
): Promise<Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[]> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const llmOptBlock = includeLlmOptimization
    ? `\n=== LLM CITATION REINFORCEMENT ===\n- Define each named concept explicitly: "[Concept] is when [plain-English explanation]."\n- Replace abstract phrases with concrete equivalents.\n- Each paragraph has one job — no orphaned thoughts.\n- Tone: authoritative and natural, not robotic.\n`
    : "";

  const [xResult, linkedinResult, websiteResult] = await Promise.all([
    // ── 1. X Article (virality + engagement) ─────────────────────────────────
    openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `You are adapting an authority article for 𝕏 (Twitter) — the algorithm rewards dwell time, scroll-stopping hooks, and genuine engagement.

=== SOURCE ARTICLE (adapt this — do not invent new ideas) ===
${sourceArticle}

=== CONTEXT ===
${contextString || "Operator-focused founders and builders."}

=== X ARTICLE ADAPTATION RULES ===
- Target length: 700–1200 words
- Hook: Sharper, more contrarian than the original first sentence. Must stop scroll.
- Paragraphs: 1-2 sentences max. Aggressive line breaks to slow the reader.
- Language: More punchy and direct. Less academic.
- Tension: Dial up contrast throughout. Show what breaks, what's hard.
- Ending: Invite a quiet reply (not "thoughts?"). Something that makes operators reflect.
- No emojis, no hashtags, no external links.
${llmOptBlock}
=== SAME THESIS ===
The core idea must remain identical — this is adaptation, not reinvention.

Return a JSON object:
{
  "title": "Sharp X-native title (under 10 words, declarative)",
  "articleBody": "Full adapted article. Use \\n\\n between paragraphs."
}

Return ONLY valid JSON, no markdown.`,
        },
      ],
      response_format: { type: "json_object" },
    }),

    // ── 2. LinkedIn Pulse Article (SEO + LLM citation) ─────────────────────
    openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `You are adapting an authority article for LinkedIn Pulse — the goal is SEO ranking and LLM citation as a credible source.

=== SOURCE ARTICLE (adapt this — do not invent new ideas) ===
${sourceArticle}

=== CONTEXT ===
${contextString || "Operator-focused founders and builders."}

=== LINKEDIN PULSE ADAPTATION RULES ===
- Target length: 900–1500 words
- Structure: Clear, well-organized. Use natural paragraph breaks.
- Definitions: Explicitly define any named concepts for clarity.
- Keywords: Naturally include 1–2 keyword phrases that operators would search for.
- Explanations: Slightly more explicit than the original — help new readers follow.
- Tone: Professional but still conversational. No jargon without definition.
${llmOptBlock}
=== SEO REQUIREMENTS ===
- SEO title: Different from the main title. Optimized for search queries (under 60 chars).
- Meta description: 1–2 sentence summary including the keyword phrase (under 155 chars).

=== SAME THESIS ===
The core idea must remain identical.

Return a JSON object:
{
  "title": "Main article title (human-readable H1, under 12 words)",
  "seoTitle": "SEO-optimized title (under 60 characters, includes searchable keyword)",
  "metaDescription": "1–2 sentence summary for search engines (under 155 chars)",
  "articleBody": "Full adapted article. Use \\n\\n between paragraphs."
}

Return ONLY valid JSON, no markdown.`,
        },
      ],
      response_format: { type: "json_object" },
    }),

    // ── 3. Website Article (ownership + depth) ────────────────────────────────
    openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `You are adapting an authority article for a founder's owned website — this is the definitive, most comprehensive version. It lives permanently and drives search traffic.

=== SOURCE ARTICLE (adapt this — do not invent new ideas) ===
${sourceArticle}

=== CONTEXT ===
${contextString || "Operator-focused founders and builders."}

=== WEBSITE ARTICLE ADAPTATION RULES ===
- Target length: 1200–2000 words
- Add 1–2 NEW sections not in the source:
  * Option: Deeper explanation of the named concept
  * Option: Extended real-world scenario/case study
  * Option: Common misconceptions addressed
- Expand examples with more specifics and context.
- Broader keyword coverage throughout.
- Headings: Use clear section headings (write them in plain text like "The Problem With Coordination" not markdown — just label them clearly in the text).
- Tone: Authoritative, permanent. Written to last.
${llmOptBlock}
=== SAME THESIS ===
The core idea must remain identical — this is the deepest expression of the same truth.

Return a JSON object:
{
  "title": "Definitive article title (under 12 words)",
  "articleBody": "Full website article. Use \\n\\n between paragraphs. Section headings written as bold opening sentences like: 'The Real Problem: Coordination, Not Intelligence.'"
}

Return ONLY valid JSON, no markdown.`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  ]);

  const results: Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[] = [];

  // Parse X Article
  try {
    const x = JSON.parse(xResult.choices[0]?.message?.content || "{}");
    results.push({
      postType: "tripack_x_article",
      contrarianAngle: null,
      rawTweetType: null,
      hook: x.title || "X Article",
      rehook: null,
      body: x.articleBody || "",
      coreInsight: null,
      cta: null,
      status: "draft",
      postUrl: null,
      replyLikelihood: null,
      dwellLikelihood: null,
      fatigueRisk: null,
      authorEngagementReminder: null,
      carouselSlides: null,
      carouselTheme: null,
    });
  } catch {
    results.push({
      postType: "tripack_x_article",
      contrarianAngle: null,
      rawTweetType: null,
      hook: "X Article",
      rehook: null,
      body: "Generation failed. Please try again.",
      coreInsight: null,
      cta: null,
      status: "draft",
      postUrl: null,
      replyLikelihood: null,
      dwellLikelihood: null,
      fatigueRisk: null,
      authorEngagementReminder: null,
      carouselSlides: null,
      carouselTheme: null,
    });
  }

  // Parse LinkedIn Pulse Article
  try {
    const li = JSON.parse(linkedinResult.choices[0]?.message?.content || "{}");
    results.push({
      postType: "tripack_linkedin_pulse",
      contrarianAngle: null,
      rawTweetType: null,
      hook: li.title || "LinkedIn Pulse Article",
      rehook: li.seoTitle || null,
      body: li.articleBody || "",
      coreInsight: li.metaDescription || null,
      cta: null,
      status: "draft",
      postUrl: null,
      replyLikelihood: null,
      dwellLikelihood: null,
      fatigueRisk: null,
      authorEngagementReminder: null,
      carouselSlides: null,
      carouselTheme: null,
    });
  } catch {
    results.push({
      postType: "tripack_linkedin_pulse",
      contrarianAngle: null,
      rawTweetType: null,
      hook: "LinkedIn Pulse Article",
      rehook: null,
      body: "Generation failed. Please try again.",
      coreInsight: null,
      cta: null,
      status: "draft",
      postUrl: null,
      replyLikelihood: null,
      dwellLikelihood: null,
      fatigueRisk: null,
      authorEngagementReminder: null,
      carouselSlides: null,
      carouselTheme: null,
    });
  }

  // Parse Website Article
  try {
    const web = JSON.parse(websiteResult.choices[0]?.message?.content || "{}");
    results.push({
      postType: "tripack_website",
      contrarianAngle: null,
      rawTweetType: null,
      hook: web.title || "Website Article",
      rehook: null,
      body: web.articleBody || "",
      coreInsight: null,
      cta: null,
      status: "draft",
      postUrl: null,
      replyLikelihood: null,
      dwellLikelihood: null,
      fatigueRisk: null,
      authorEngagementReminder: null,
      carouselSlides: null,
      carouselTheme: null,
    });
  } catch {
    results.push({
      postType: "tripack_website",
      contrarianAngle: null,
      rawTweetType: null,
      hook: "Website Article",
      rehook: null,
      body: "Generation failed. Please try again.",
      coreInsight: null,
      cta: null,
      status: "draft",
      postUrl: null,
      replyLikelihood: null,
      dwellLikelihood: null,
      fatigueRisk: null,
      authorEngagementReminder: null,
      carouselSlides: null,
      carouselTheme: null,
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────

// Generate ONE Authority Article (800–1500 words, 8-part structure)
export async function generateAuthorityArticle(
  rawInput: string,
  contexts: ContextItem[],
  extractedSignals: ExtractedSignals,
  angle?: string
): Promise<Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[]> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const icpContext = contexts
    .filter((c) => c.type === "icp" || c.type === "positioning")
    .map((c) => c.content)
    .join("\n");

  const signalsString = [
    extractedSignals.expertise.length > 0
      ? `EXPERTISE: ${extractedSignals.expertise.join(" | ")}`
      : "",
    extractedSignals.stories.length > 0
      ? `STORIES: ${extractedSignals.stories.join(" | ")}`
      : "",
    extractedSignals.trends.length > 0
      ? `TRENDS: ${extractedSignals.trends.join(" | ")}`
      : "",
    extractedSignals.opinions.length > 0
      ? `OPINIONS: ${extractedSignals.opinions.join(" | ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are writing a long-form authority article for a founder. This article becomes the primary source for all downstream content — LinkedIn posts, carousels, X content, SEO, and LLM citation.

CRITICAL RULE: The article must be grounded in the RAW MATERIALS below. All ideas, named concepts, examples, and arguments must come FROM the raw materials. Do not import themes, frameworks, or vocabulary from outside the raw materials. The Voice/Tone section tells you HOW to write — not WHAT to write about.

=== RAW MATERIALS (PRIMARY SOURCE — this is what the article is about) ===
${rawInput}

${angle ? `=== ANGLE / FOCUS ===\n${angle}\n` : ""}
=== VOICE / TONE (style only — NOT the topic) ===
${contextString || "Operator-focused, calm, authoritative. Conversational but precise. No hype or corporate speak."}

=== ARTICLE STRUCTURE (MANDATORY — follow in order, grounded in the raw materials) ===
1. Hook (contrarian, 1–2 sentences max)
   - Strong opinion drawn from the raw materials. No questions. Should create tension.

2. The Problem
   - Grounded in what the raw materials identify as the core problem.

3. What People Think Is Happening
   - Present the common belief or narrative the raw materials push back against.

4. What's Actually Happening
   - The reframe from the raw materials.

5. Core Insight / Framework
   - Introduce 1–2 NAMED CONCEPTS derived FROM the raw materials. Coin or surface a name for the central idea in the raw materials.
   - Immediately after naming the concept, include an explicit definition sentence:
     "[Named Concept] is when [clear, plain-English explanation]."
   - The definition must stand alone — one sentence, no metaphor, no abstraction.

6. Real Example or Scenario
   - Use concrete examples from the raw materials where available.

7. Implication
   - What the raw materials' argument means for the reader in practical terms.

8. Closing Shift
   - Clear mental reframe. Calm, authoritative tone.

=== WRITING RULES (MANDATORY) ===
- Conversational tone (5th–6th grade reading level)
- Short sentences (under 20 words)
- Use whitespace (1–2 sentence paragraphs only)
- No emojis
- No hype language ("game-changing", "revolutionary", "unlock")
- No generic advice ("communicate better", "just focus")
- No listicles or bullet points in the body
- No "tips" or "strategies"
- Total length: 800–1500 words
- No slang or overly creative metaphors — prefer precise, professional language
- Avoid vague abstractions: replace them with concrete, specific meaning

=== LLM CITATION OPTIMIZATION (MANDATORY) ===
LLMs (ChatGPT, Perplexity, Google AI) cite articles that are clear, structured, and definitional. Follow these rules:
1. NAMED CONCEPTS: Introduce 1–2 clearly named concepts derived from the raw materials. The name must be specific and memorable.
2. EXPLICIT DEFINITION: Immediately define each named concept in a standalone sentence:
   Format: "[Concept] is when [plain-English explanation without metaphor]."
3. CONCRETE LANGUAGE: Replace every abstract phrase with a concrete equivalent.
   Bad: "operational inefficiency" → Good: "two hours a day chasing status updates"
4. STRUCTURAL CLARITY: Short paragraphs, clear transitions, no orphaned thoughts.
5. PROFESSIONAL PRECISION: Authoritative and natural — not robotic. Think operator report, not blog post.

=== CONTENT REQUIREMENTS ===
- Must be opinionated (not neutral)
- Must include 1–2 named concepts (from section 5) derived from the raw materials
- Must feel like lived experience, not theory
- Must be citable — specific enough that an LLM can extract and attribute the concept
- Stay faithful to the raw materials — do not invent arguments not present there

=== OUTPUT FORMAT ===
Return a JSON object with exactly these fields:
{
  "title": "SEO-ready but natural title (not clickbait, under 12 words)",
  "namedConcept": "The primary named concept or framework introduced. If two concepts are introduced, list both separated by ' + '.",
  "articleBody": "The full article body text. Use \\n\\n between paragraphs. No markdown headers — flowing prose only. Each named concept must have an explicit definition sentence immediately following its introduction."
}

Return ONLY valid JSON, no markdown, no explanation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(
      response.choices[0]?.message?.content || "{}"
    );

    const title = parsed.title || "Authority Article";
    const articleBody = parsed.articleBody || "";
    const namedConcept = parsed.namedConcept || "";

    return [
      {
        postType: "authority_article",
        contrarianAngle: null,
        rawTweetType: null,
        hook: title,
        rehook: "",
        body: articleBody,
        coreInsight: namedConcept,
        cta: null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: null,
        carouselTheme: null,
      },
    ];
  } catch {
    return [
      {
        postType: "authority_article",
        contrarianAngle: null,
        rawTweetType: null,
        hook: "Authority Article",
        rehook: "",
        body: "Generation failed. Please try again.",
        coreInsight: "",
        cta: null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: null,
        carouselTheme: null,
      },
    ];
  }
}

// ─── QUOTE REPOST ENGINE ──────────────────────────────────────────────────────

const QUOTE_REPOST_TYPES = [
  { key: "agreement_with_twist", label: "Agreement with Twist" },
  { key: "thoughtful_disagreement", label: "Thoughtful Disagreement" },
  { key: "operator_experience", label: "Operator Experience Validation" },
  { key: "expansion_of_idea", label: "Expansion of Idea" },
  { key: "contrarian_angle", label: "Contrarian Angle" },
];

export async function generateQuoteReposts(
  sourceArticle: string,
  contexts: ContextItem[]
): Promise<Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[]> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

  const typeDescriptions = QUOTE_REPOST_TYPES.map(
    (t) => `- ${t.label}: A line that ${
      t.key === "agreement_with_twist" ? "agrees with the core idea but adds a nuance or condition" :
      t.key === "thoughtful_disagreement" ? "respectfully pushes back on one part of the argument" :
      t.key === "operator_experience" ? "validates the idea through lived operator or founder experience" :
      t.key === "expansion_of_idea" ? "extends the idea one step further with a related insight" :
      "flips the premise in a calm, non-combative way"
    }`
  ).join("\n");

  const prompt = `You are writing 5 quote-repost lines for a founder's 𝕏 (Twitter) article. These lines encourage others to share and react naturally — not to bait engagement.

=== SOURCE ARTICLE ===
${sourceArticle}

=== CONTEXT ===
${contextString || "Operator-focused founders and builders."}

=== FIVE TYPES REQUIRED ===
${typeDescriptions}

=== RULES FOR ALL LINES ===
- 1–2 sentences max
- No emojis, no hashtags
- No bait language ("thoughts?", "do you agree?", "comment below")
- Each should feel like something a real operator would naturally say
- Calm, direct, authoritative tone
- Must feel natural to repost — like a genuine reaction, not a prompt

=== STRONG EXAMPLES (style only — do not copy) ===
- "This is right, but only if you're past the first 10 hires."
- "We tried this. It broke in week 3."
- "The real issue isn't mentioned here…"
- "This hits, but misses one key piece."
- "Operators will understand this immediately."

=== OUTPUT FORMAT ===
Return a JSON object with exactly 5 items:
{
  "agreement_with_twist": "the line",
  "thoughtful_disagreement": "the line",
  "operator_experience": "the line",
  "expansion_of_idea": "the line",
  "contrarian_angle": "the line"
}

Return ONLY valid JSON, no markdown.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const results: Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[] = [];

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");

    for (const type of QUOTE_REPOST_TYPES) {
      const line = parsed[type.key] || "Generation failed for this type.";
      results.push({
        postType: "quote_repost",
        contrarianAngle: type.key,
        rawTweetType: null,
        hook: line,
        rehook: type.label,
        body: "",
        coreInsight: null,
        cta: null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: null,
        carouselTheme: null,
      });
    }
  } catch {
    for (const type of QUOTE_REPOST_TYPES) {
      results.push({
        postType: "quote_repost",
        contrarianAngle: type.key,
        rawTweetType: null,
        hook: "Generation failed. Please try again.",
        rehook: type.label,
        body: "",
        coreInsight: null,
        cta: null,
        status: "draft",
        postUrl: null,
        replyLikelihood: null,
        dwellLikelihood: null,
        fatigueRisk: null,
        authorEngagementReminder: null,
        carouselSlides: null,
        carouselTheme: null,
      });
    }
  }

  return results;
}

export async function generateArticleAnalysis(
  articleTitle: string,
  articleBody: string
): Promise<{
  namedConcepts: string[];
  coreThesis: string;
  keyPhrases: string[];
  linkedinHooks: string[];
  xHooks: string[];
  contrarianAngles: string[];
}> {
  const prompt = `You are a content strategist analyzing an authority article to extract key assets and generate repurpose suggestions.

=== ARTICLE TITLE ===
${articleTitle}

=== ARTICLE BODY ===
${articleBody}

=== TASK ===
Extract and generate the following:

1. NAMED CONCEPTS: Any explicitly named frameworks, concepts, or models introduced in the article (e.g., "Coordination Debt", "Silent Revenue Loss"). List 1–3.

2. CORE THESIS: A single declarative sentence that captures the article's central argument. No hedge words.

3. KEY PHRASES: 4–6 memorable short phrases or lines from the article worth reusing in other content. Prefer concrete, punchy language.

4. LINKEDIN HOOKS: 3 strong opening lines for LinkedIn posts derived from this article. Each should be 1–2 sentences. Conversational, opinionated, no emojis.

5. X HOOKS: 3 single tweets (≤280 chars) derived from this article. Operator tone. No hashtags, no emojis, no thread language.

6. CONTRARIAN ANGLES: 2 thoughtful counter-perspectives or tensions someone could argue against this article. Not refutations — productive disagreements that deepen the thinking.

=== OUTPUT FORMAT ===
Return a JSON object:
{
  "namedConcepts": ["concept 1", "concept 2"],
  "coreThesis": "The central argument in one declarative sentence.",
  "keyPhrases": ["phrase 1", "phrase 2", "phrase 3", "phrase 4"],
  "linkedinHooks": ["hook 1", "hook 2", "hook 3"],
  "xHooks": ["tweet 1", "tweet 2", "tweet 3"],
  "contrarianAngles": ["angle 1", "angle 2"]
}

Return ONLY valid JSON, no markdown, no explanation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      namedConcepts: parsed.namedConcepts || [],
      coreThesis: parsed.coreThesis || "",
      keyPhrases: parsed.keyPhrases || [],
      linkedinHooks: parsed.linkedinHooks || [],
      xHooks: parsed.xHooks || [],
      contrarianAngles: parsed.contrarianAngles || [],
    };
  } catch {
    return {
      namedConcepts: [],
      coreThesis: "",
      keyPhrases: [],
      linkedinHooks: [],
      xHooks: [],
      contrarianAngles: [],
    };
  }
}

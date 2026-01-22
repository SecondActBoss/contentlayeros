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
    hookBias: "Strong stance or reframing. Take a clear position that challenges conventional thinking.",
    hookExamples: [
      "AI agents won't replace departments.",
      "Not smarter AI. Quieter execution.",
      "Relief beats innovation.",
    ],
  },
  {
    type: "founder_story",
    name: "Founder Storytelling Post",
    description: "One moment → one lesson → why it matters to the reader. Personal and authentic.",
    hookBias: "Emotional mirror or lived quote. Reflect a feeling or moment operators know well.",
    hookExamples: [
      "Busy all day. Nothing moved.",
      "I used to think speed was the problem.",
      "The team was stressed. The system was fine.",
    ],
  },
  {
    type: "trend_translation",
    name: "Trend Translation / Strategic Arbitrage Post",
    description: "Trend → operator lens → grounded POV. Reframes industry discourse.",
    hookBias: "Disagreement with prevailing narrative. Challenge what everyone else is saying.",
    hookExamples: [
      "Early AI adoption isn't about intelligence.",
      "The AI hype cycle missed the point.",
      "Everyone's building agents. Few are deploying them.",
    ],
  },
  {
    type: "system_principle",
    name: "System Principle / Rule-Based Post",
    description: "A constraint, rule, or mental model that guides decisions.",
    hookBias: "Clear rule, constraint, or belief. State a principle like it's obvious truth.",
    hookExamples: [
      "Coordination pain is the real trigger.",
      "AI only sticks when chaos disappears.",
      "If it needs a meeting, it's not automated.",
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

// Generate 4 LinkedIn post drafts
export async function generatePosts(
  rawInput: string,
  contexts: ContextItem[],
  signals: ExtractedSignals,
  strongExamples: FeedbackEntry[] = []
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

CONTEXT:
${contextString || "Write for a professional audience."}

EXTRACTED SIGNALS:
${signalsString}
${examplesString}
${antiRepetitionContext}
POST TYPE: ${postType.name}
${postType.description}

=== HOOK GENERATION RULES (CRITICAL) ===

The hook (Line 1) and rehook (Line 2) are the most important parts. They determine "See more" clicks.

HOOK BIAS FOR THIS POST TYPE:
${postType.hookBias}

EXAMPLE HOOKS (for tone/structure, do not copy verbatim):
${postType.hookExamples.map((h: string) => `- "${h}"`).join("\n")}

HOOK STRUCTURE REQUIREMENTS:
- Line 1 (hook): 8 words or less, declarative statement
- Line 2 (rehook): Adds clarity, tension, or narrows audience
- NO questions in Line 1
- NO emojis
- NO hype language ("game-changing", "revolutionary", "the future")
- NO generic openings ("Here's why...", "Let's talk about...", "I've learned...")

PREFERRED HOOK TYPES (use one):
A. Strong Contrarian: "AI agents won't replace departments."
B. Operator Pain Mirror: "Busy all day. Nothing moved."
C. Rule or Principle: "Coordination pain is the real trigger."
D. Reframe / Contrast: "Not smarter AI. Quieter execution."

REHOOK REQUIREMENTS:
Line 2 should do ONE of these:
- Add specificity: "That's why operators adopt AI first."
- Create tension: "This is where most AI strategies break."
- Narrow audience: "If you run ops, you've felt this."
- Extend with consequence: "The cost shows up in meetings."

SUCCESS CRITERIA:
A good hook makes operators think: "That's exactly what I'm dealing with — keep going."
NOT: "That sounds smart."

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
  strongExamples: FeedbackEntry[] = []
): Promise<Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[]> {
  const contextString = contexts
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n\n");

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
      });
    }
  }

  return posts;
}

// Generate 𝕏 (Twitter) content: 1 newsletter section + 3 posts
export async function generateTwitterContent(
  rawInput: string,
  contexts: ContextItem[],
  extractedSignals: ExtractedSignals,
  strongExamples: FeedbackEntry[] = [],
  isContrarianMode: boolean = false,
  externalSignal?: string,
  framingNote?: string
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

  const posts: Omit<PostDraft, "id" | "weeklyRunId" | "createdAt">[] = [];

  // First, generate the core insight that all outputs will be derived from
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

  let coreIdea = { coreIdea: "", paradox: "", implication: "" };
  try {
    coreIdea = JSON.parse(coreResponse.choices[0]?.message?.content || "{}");
  } catch {
    coreIdea = { coreIdea: "Generation failed", paradox: "", implication: "" };
  }

  // 1. Generate Newsletter Section (300-500 words)
  const newsletterPrompt = `You are a thoughtful founder writing a newsletter section for operators and builders.

=== CORE IDEA ===
${coreIdea.coreIdea}
Paradox: ${coreIdea.paradox}
Implication: ${coreIdea.implication}
${contraryContext}
=== CONTEXT ===
${contextString || "Write for a professional, operator-focused audience."}

=== NEWSLETTER SECTION REQUIREMENTS ===
Write a 300-500 word newsletter section structured as:
1. Open with the paradox or tension
2. Context: Why this matters now
3. Core idea: The main insight
4. Implication: What this means for the reader
5. Open loop: Leave them thinking

TONE CONSTRAINTS:
- Calm, thoughtful tone
- No hype, no listicles
- No engagement bait
- No emojis
- Clarity over cleverness

Return a JSON object with:
- title: A clear, non-clickbait title (5-10 words)
- body: The full newsletter section (300-500 words)
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
    });
  }

  // 2. Generate THREE 𝕏 Posts
  const twitterPostTypes = [
    {
      type: "twitter_pov" as const,
      name: "POV Compression",
      description: "Single declarative idea, ≤280 characters, bookmarkable",
      prompt: `Compress the core idea into a single, declarative 𝕏 post.
- Must be ≤280 characters
- Single powerful statement
- Designed to be bookmarked
- No thread language
- No hashtags or emojis`,
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
- No hashtags or emojis`,
    },
    {
      type: "twitter_operator" as const,
      name: "Operator Reality Check",
      description: "Grounded, lived insight focused on execution",
      prompt: `Write a 𝕏 post as an operator reality check.
- Must be ≤280 characters
- Grounded in lived experience
- Focus on execution, coordination, or relief
- Designed to prompt replies
- No hashtags or emojis`,
    },
  ];

  for (const postConfig of twitterPostTypes) {
    const prompt = `You are a founder writing a single 𝕏 (Twitter) post.

=== CORE IDEA ===
${coreIdea.coreIdea}
Paradox: ${coreIdea.paradox}
Implication: ${coreIdea.implication}
${contraryContext}
=== CONTEXT ===
${contextString || "Write for a professional, operator-focused audience."}

=== POST TYPE: ${postConfig.name} ===
${postConfig.description}

${postConfig.prompt}

CRITICAL CONSTRAINTS:
- ≤280 characters (STRICT LIMIT)
- No hashtags
- No emojis
- No engagement bait
- No "thread 🧵" language
- No hype or outrage framing
- Clarity > cleverness

SUCCESS CRITERIA:
A reader should think: "This is a clear idea worth following."
NOT: "This is trying to go viral."

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
  framingNote?: string
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

  const tweetTypeDescriptions = RAW_TWEET_TYPES.map(
    (t) => `- ${t.name}: ${t.description}\n  Examples: ${t.examples.map((e) => `"${e}"`).join(", ")}`
  ).join("\n\n");

  const prompt = `You are generating raw tweets for a founder's 𝕏 (Twitter) account.

=== RAW MATERIALS ===
${rawInput}

=== EXTRACTED SIGNALS ===
${signalsString}
${externalContext}
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

=== TONE CONSTRAINTS (MANDATORY) ===
- NO emojis
- NO hashtags
- NO thread language
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
      
      posts.push({
        postType: "raw_tweet",
        contrarianAngle: null,
        rawTweetType: tweet.type as RawTweetType || "pov_statement",
        hook: tweetText,
        rehook: "",
        body: "",
        coreInsight: `${tweet.type} tweet`,
        cta: null,
        status: "draft",
        postUrl: null,
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
    });
  }

  return posts;
}

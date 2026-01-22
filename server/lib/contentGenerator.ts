// Content generation using OpenAI for LinkedIn posts
import OpenAI from "openai";
import type { ContextItem, ExtractedSignals, PostDraft, FeedbackEntry, ExtractedPatterns } from "@shared/schema";

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

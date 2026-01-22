// Content generation using OpenAI for LinkedIn posts
import OpenAI from "openai";
import type { ContextItem, ExtractedSignals, PostDraft, FeedbackEntry, ExtractedPatterns } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Post types as defined in the spec
const POST_TYPES = [
  {
    type: "educational_authority",
    name: "High-Level Educational Authority Post",
    description: "Clear stance, operator-safe, calm authority. Demonstrates monetizable expertise.",
  },
  {
    type: "founder_story",
    name: "Founder Storytelling Post",
    description: "One moment → one lesson → why it matters to the reader. Personal and authentic.",
  },
  {
    type: "trend_translation",
    name: "Trend Translation / Strategic Arbitrage Post",
    description: "Trend → operator lens → grounded POV. Reframes industry discourse.",
  },
  {
    type: "system_principle",
    name: "System Principle / Rule-Based Post",
    description: "A constraint, rule, or mental model that guides decisions.",
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

  for (const postType of POST_TYPES) {
    const prompt = `You are a LinkedIn ghostwriter for a founder. Generate a ${postType.name}.

CONTEXT:
${contextString || "Write for a professional audience."}

EXTRACTED SIGNALS:
${signalsString}
${examplesString}

POST TYPE: ${postType.name}
${postType.description}

WRITING CONSTRAINTS (MANDATORY):
- Short lines (aim for 8 words or less per line)
- Calm, authoritative tone
- NO emojis
- NO hype language
- NO sales copy
- NO tool lists or buzzwords
- Hook: First 2 lines optimized for "See more" (clear stance, specific)
- NO mystery hooks
- This is a DRAFT, not publish-ready copy

Return a JSON object with:
- hook: First line (8 words or less, clear stance)
- rehook: Second line (continues the hook, creates tension or curiosity)
- body: Main content (short paragraphs, line breaks between thoughts)
- coreInsight: The key takeaway in one sentence
- cta: Optional engagement prompt or question (can be empty string)

Return ONLY valid JSON, no markdown.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(content);
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

import OpenAI from "openai";
import type {
  BeliefStressTestOutput,
  ExperienceMinerOutput,
  ClarityDestroyerOutput,
  ContentInfrastructureOutput,
  SilentSalesMapOutput,
  WeeklyOperatorFocusOutput,
  ThinkingGatesOutput,
  PostDraft,
  ContextItem,
} from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface GateConfig {
  beliefStressTest: boolean;
  experienceMiner: boolean;
  clarityDestroyer: boolean;
  contentInfrastructure: boolean;
  silentSalesMap: boolean;
  weeklyOperatorFocus: boolean;
}

export async function runBeliefStressTest(
  rawInput: string,
  contexts: ContextItem[]
): Promise<BeliefStressTestOutput> {
  const contextSummary = contexts.map(c => `[${c.type}] ${c.title}: ${c.content}`).join("\n");

  const prompt = `You are a sharp advisor helping a founder pressure-test their beliefs before creating content.

Analyze this raw input and context to identify:
1. The CORE BELIEF the content is built on (be specific, not generic)
2. The MARKET BELIEF that most people still hold that this belief rejects
3. Where this belief creates TENSION WITH CONVENTIONAL WISDOM
4. Where holding this belief COSTS THE AUTHOR SHORT-TERM (honesty required)
5. Where it COMPOUNDS LONG-TERM if correct

Rules:
- No softening language
- No validation
- Force explicit positions
- Be direct and specific

RAW INPUT:
${rawInput}

CONTEXT:
${contextSummary}

Return a JSON object with these exact fields:
{
  "coreBelief": "The specific belief driving this content",
  "marketBelief": "What the market still believes that this rejects",
  "tensionWithWisdom": "Where this creates friction with conventional advice",
  "shortTermCost": "What this belief costs in the short term",
  "longTermCompound": "How this compounds if correct over time"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content || "{}") as BeliefStressTestOutput;
}

export async function runExperienceMiner(
  rawInput: string,
  contexts: ContextItem[]
): Promise<ExperienceMinerOutput> {
  const contextSummary = contexts.map(c => `[${c.type}] ${c.title}: ${c.content}`).join("\n");

  const prompt = `You are mining this founder's raw input for REAL EXPERIENCE, not advice.

Focus extraction on:
- Decisions made with incomplete information
- Tradeoffs consciously accepted
- Mistakes that produced durable learning
- Rules created because of pain or failure
- Positions the author can defend from experience

Rules:
- Do NOT invent experiences
- Only extract what's explicitly or implicitly present
- Be specific, not generic

RAW INPUT:
${rawInput}

CONTEXT:
${contextSummary}

Return a JSON object with:
{
  "operatingPrinciples": ["3 specific operating principles derived from experience"],
  "mistakesNotToRepeat": ["3 specific mistakes with learnings"],
  "defensiblePositions": ["3 positions they can defend from lived experience"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content || "{}") as ExperienceMinerOutput;
}

export async function runClarityDestroyer(
  drafts: PostDraft[]
): Promise<ClarityDestroyerOutput[]> {
  const results: ClarityDestroyerOutput[] = [];

  for (const draft of drafts) {
    const fullContent = `${draft.hook}\n${draft.rehook}\n${draft.body}`;

    const prompt = `You are a clarity destroyer. Your job is to eliminate vague thinking.

Analyze this draft to:
1. Flag sentences that sound intelligent but lack substance
2. Identify abstract language avoiding commitment
3. Highlight generalizations that could apply to anyone
4. Test whether the idea collapses under specificity

Rules:
- Precision over politeness
- If an idea fails, say so
- Do NOT rewrite content
- Only analyze and flag

DRAFT CONTENT:
${fullContent}

Return a JSON object:
{
  "verdict": "survives_scrutiny" or "collapses_under_precision",
  "flags": ["List of specific issues found, or empty if clean"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    results.push({
      draftId: draft.id,
      verdict: result.verdict || "survives_scrutiny",
      flags: result.flags || [],
    });
  }

  return results;
}

export async function runContentInfrastructure(
  drafts: PostDraft[],
  contexts: ContextItem[]
): Promise<ContentInfrastructureOutput[]> {
  const contextSummary = contexts.map(c => `[${c.type}] ${c.title}: ${c.content}`).join("\n");
  const results: ContentInfrastructureOutput[] = [];

  for (const draft of drafts) {
    const fullContent = `${draft.hook}\n${draft.rehook}\n${draft.body}`;

    const prompt = `You are treating content as a durable business asset. Attach metadata to this draft.

For each piece, identify:
1. Core thesis (1 sentence max)
2. What misunderstanding it corrects
3. Buyer sophistication level it attracts (beginner/intermediate/advanced)
4. Buyer type it repels
5. Objections it quietly dissolves
6. Which offers or conversations it supports

DRAFT CONTENT:
${fullContent}

CONTEXT:
${contextSummary}

Return a JSON object:
{
  "coreThesis": "One sentence thesis",
  "misunderstandingCorrected": "What wrong belief this fixes",
  "buyerSophisticationLevel": "beginner/intermediate/advanced",
  "buyerTypeRepelled": "Who this content filters out",
  "objectionsQuietlyDissolved": ["List of objections addressed"],
  "offersSupported": ["List of offers/conversations this supports"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    results.push({
      draftId: draft.id,
      ...result,
    });
  }

  return results;
}

export async function runSilentSalesMap(
  drafts: PostDraft[],
  contexts: ContextItem[]
): Promise<SilentSalesMapOutput> {
  const contextSummary = contexts.map(c => `[${c.type}] ${c.title}: ${c.content}`).join("\n");
  const draftsContent = drafts.map(d => `[${d.postType}]\n${d.hook}\n${d.rehook}\n${d.body}`).join("\n\n---\n\n");

  const prompt = `You are checking if this week's content reduces friction before a sales conversation.

Analyze all drafts together to identify:
1. What belief is installed in the reader after consuming this?
2. What objections are removed?
3. What buyer qualification effect does this create?
4. Does this support a real business outcome? If not, state that clearly.

Rules:
- Do NOT add CTAs
- Selling should remain implicit and quiet
- Be honest if content doesn't support real outcomes

DRAFTS:
${draftsContent}

CONTEXT:
${contextSummary}

Return a JSON object:
{
  "beliefInstalled": "The belief readers will hold after this content",
  "objectionsRemoved": ["List of objections this content addresses"],
  "buyerQualificationEffect": "How this filters/qualifies potential buyers",
  "supportsRealOutcome": true/false,
  "outcomeNote": "What outcome it supports, or why it doesn't"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  return JSON.parse(response.choices[0].message.content || "{}") as SilentSalesMapOutput;
}

export async function runWeeklyOperatorFocus(
  rawInput: string,
  drafts: PostDraft[],
  contexts: ContextItem[]
): Promise<WeeklyOperatorFocusOutput> {
  const contextSummary = contexts.map(c => `[${c.type}] ${c.title}: ${c.content}`).join("\n");
  const draftsContent = drafts.map(d => `[${d.postType}] ${d.hook}`).join("\n");

  const prompt = `You are a sharp advisor helping a founder protect their time and focus under constraint.

Based on this week's raw input and generated content, output:
1. What deserves focus THIS WEEK (not someday)
2. What can wait without consequence
3. What compounds if done once and well
4. What creates motion without leverage (busy work)

Rules:
- Direction > activity
- Short, actionable items
- Be honest about what doesn't matter

RAW INPUT:
${rawInput}

GENERATED DRAFTS:
${draftsContent}

CONTEXT:
${contextSummary}

Return a JSON object:
{
  "deservesFocusThisWeek": ["2-3 specific items"],
  "canWaitWithoutConsequence": ["2-3 specific items"],
  "compoundsIfDoneOnceAndWell": ["2-3 specific items"],
  "createsMotionWithoutLeverage": ["2-3 specific items to avoid"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content || "{}") as WeeklyOperatorFocusOutput;
}

export async function runThinkingGates(
  config: GateConfig,
  rawInput: string,
  contexts: ContextItem[],
  drafts: PostDraft[]
): Promise<ThinkingGatesOutput> {
  const output: ThinkingGatesOutput = {};

  const preGenGates: Promise<void>[] = [];
  const postGenGates: Promise<void>[] = [];

  if (config.beliefStressTest) {
    preGenGates.push(
      runBeliefStressTest(rawInput, contexts).then(result => {
        output.beliefStressTest = result;
      })
    );
  }

  if (config.experienceMiner) {
    preGenGates.push(
      runExperienceMiner(rawInput, contexts).then(result => {
        output.experienceMiner = result;
      })
    );
  }

  await Promise.all(preGenGates);

  if (config.clarityDestroyer && drafts.length > 0) {
    postGenGates.push(
      runClarityDestroyer(drafts).then(result => {
        output.clarityDestroyer = result;
      })
    );
  }

  if (config.contentInfrastructure && drafts.length > 0) {
    postGenGates.push(
      runContentInfrastructure(drafts, contexts).then(result => {
        output.contentInfrastructure = result;
      })
    );
  }

  if (config.silentSalesMap && drafts.length > 0) {
    postGenGates.push(
      runSilentSalesMap(drafts, contexts).then(result => {
        output.silentSalesMap = result;
      })
    );
  }

  if (config.weeklyOperatorFocus) {
    postGenGates.push(
      runWeeklyOperatorFocus(rawInput, drafts, contexts).then(result => {
        output.weeklyOperatorFocus = result;
      })
    );
  }

  await Promise.all(postGenGates);

  return output;
}

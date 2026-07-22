import { getPersonaById } from "@/lib/personas";

export interface PersonaResponse {
  content: string;
}

export async function generatePersonaResponse(
  personaId: string,
  topic: string,
  userArgument: string,
  round: number,
  side: string
): Promise<PersonaResponse> {
  const persona = getPersonaById(personaId);
  if (!persona) {
    return { content: "I'm not sure how to respond to that." };
  }

  // Try OpenRouter first (free Llama 3.1 70B), then Gemini, then local fallback
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (openRouterKey) {
    try {
      return await callOpenRouter(openRouterKey, persona, topic, userArgument, round, side);
    } catch (err) {
      console.error("OpenRouter failed, trying Gemini:", err);
    }
  }

  if (geminiKey) {
    try {
      return await callGemini(geminiKey, persona, topic, userArgument, round, side);
    } catch (err) {
      console.error("Gemini failed, using local fallback:", err);
    }
  }

  return generateFallbackResponse(persona, topic, userArgument, round);
}

async function callOpenRouter(
  apiKey: string,
  persona: { id: string; name: string; title: string; systemPrompt: string; avatar: string; color: string },
  topic: string,
  userArgument: string,
  round: number,
  side: string
): Promise<PersonaResponse> {
  const position = side === "for" ? "FOR" : "AGAINST";
  const roundContext =
    round === 1
      ? `OPENING STATEMENT. You are arguing ${position} the motion. State your core argument and give 2-3 specific reasons about why the motion is ${side === "for" ? "correct" : "wrong"}.`
      : round === 2
        ? "REBUTTAL. Counter their specific points about the motion, then add a NEW argument they haven't addressed."
        : "CLOSING. Summarize your strongest arguments about the motion, dismantle their weakest point, end strong.";

  const systemPrompt = `You are ${persona.name} — "${persona.title}".
${persona.systemPrompt}

You are in a formal debate. Every response must directly reference the motion "${topic}". Never go off-topic. Be specific, use evidence, examples, and logical reasoning. Stay in character at all times.`;

  const userPrompt = `MOTION: "${topic}"
YOU ARE ARGUING: ${position}
ROUND ${round}: ${roundContext}

OPPONENT SAID:
"${userArgument}"

Write your response. Rules:
- Every sentence must relate back to the motion "${topic}"
- Start by addressing something specific your opponent said
- Then make your own argument about the motion with evidence or reasoning
- End with a challenge or question
- 3-5 sentences. Be substantive, not generic.
- Stay in character as ${persona.name}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pitch-rouge-omega.vercel.app",
      "X-Title": "Pitch Debate App",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 600,
    }),
  });

  const rawText = await res.text();
  console.log(`[OpenRouter] status=${res.status} len=${rawText.length}`);

  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${rawText.slice(0, 500)}`);
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`OpenRouter invalid JSON: ${rawText.slice(0, 300)}`);
  }

  // Extract content — some models return it in reasoning field
  const message = data.choices?.[0]?.message;
  let text = message?.content?.trim();
  if (!text && message?.reasoning) {
    text = message.reasoning.trim();
  }

  console.log(`[OpenRouter] content len=${text?.length || 0}`);

  if (!text) {
    throw new Error(`OpenRouter empty. Keys: ${Object.keys(data).join(",")}`);
  }

  return { content: text };
}

async function callGemini(
  apiKey: string,
  persona: { id: string; name: string; title: string; systemPrompt: string; avatar: string; color: string },
  topic: string,
  userArgument: string,
  round: number,
  side: string
): Promise<PersonaResponse> {
  const position = side === "for" ? "FOR" : "AGAINST";
  const roundContext =
    round === 1
      ? `OPENING STATEMENT. You are arguing ${position} the motion. State your core argument and give 2-3 specific reasons.`
      : round === 2
        ? "REBUTTAL. Counter their specific points about the motion, then add a NEW argument."
        : "CLOSING. Summarize your strongest arguments, dismantle their weakest point.";

  const prompt = `You are debating the motion: "${topic}"
You are arguing ${position} the motion.

YOUR CHARACTER: You are ${persona.name} — "${persona.title}".
${persona.systemPrompt}

ROUND ${round}: ${roundContext}

OPPONENT SAID:
"${userArgument}"

Write your response. Rules:
- Every sentence must relate back to the motion "${topic}"
- Start by addressing something specific your opponent said
- Then make your own argument about the motion
- End with a challenge
- 3-5 sentences. Be specific, not generic.`;

  const { GoogleGenAI } = await import("@google/genai");
  const genai = new GoogleGenAI({ apiKey });
  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      temperature: 0.85,
      maxOutputTokens: 500,
    },
  });

  const text = response.text || "";
  if (!text.trim() || text.trim().length < 30) {
    throw new Error("Response too short");
  }

  return { content: text.trim() };
}

function generateFallbackResponse(
  persona: { id: string; name: string; style: string },
  topic: string,
  userArgument: string,
  round: number
): PersonaResponse {
  const topicLower = topic.toLowerCase();

  const responses: Record<string, string[]> = {
    "the-rookie": [
      `You're oversimplifying ${topicLower}. The real world doesn't work like that — there are consequences you're not considering. When you actually look at what happens after ${topicLower} takes effect, the picture gets a lot less clean. I think the practical costs outweigh your theoretical benefits, and here's why: people affected by ${topicLower} don't experience it the way you describe.`,
      `That sounds good in theory, but what about when ${topicLower} meets reality? People don't behave the way your model predicts. When we look at actual outcomes of ${topicLower}, the results are messy and unpredictable. Your argument ignores the second-order effects — the things that happen AFTER ${topicLower} takes effect. That's where the real debate is, and that's where your side falls apart.`,
      `I've made my case against ${topicLower}, and I stand by it. You haven't addressed the human cost, the practical failures, or the unpredictable outcomes. When you zoom out and look at the full impact of ${topicLower}, the answer becomes clear: the risks far outweigh the rewards.`,
    ],
    "the-contrarian": [
      `Wrong about ${topicLower}. That argument sounds good but falls apart when you examine the evidence. Everyone repeats the same talking points about ${topicLower}, and everyone is wrong. The actual data tells a very different story. You've presented correlation as causation, which is a fatal error.`,
      `That's exactly what everyone says about ${topicLower}, and it's exactly why everyone is wrong. Your position relies on assumptions that crumble under scrutiny. When you strip away the rhetoric, what's left is wishful thinking. The moment you separate the variables that actually matter in ${topicLower}, your argument evaporates.`,
      `I'll say it plainly: ${topicLower} is not what you think it is. You've been sold a narrative, and you've bought it without checking the receipts. The evidence against your position on ${topicLower} is overwhelming, and the fact that you haven't engaged with it tells me everything I need to know.`,
    ],
    "the-academic": [
      `Your argument about ${topicLower} rests on a logical error. You've assumed correlation implies causation, which the literature on ${topicLower} has debunked. When you apply proper methodology, the effect you're describing reverses. The peer-reviewed research on ${topicLower} is unambiguous on this.`,
      `The evidence base for your claim about ${topicLower} is considerably weaker than presented. When we control for confounding variables, your conclusion doesn't follow. The empirical data on ${topicLower} actually suggests the opposite of what you're arguing.`,
      `You've committed an ecological inference error in the context of ${topicLower}. Individual-level data contradicts your aggregate conclusion. When we examine actual outcomes of ${topicLower} with proper controls, your framework doesn't hold.`,
    ],
    "the-devils-advocate": [
      `What if the opposite is true about ${topicLower}? You've built your argument on an assumption you haven't tested. Let me challenge that assumption right now. When we actually examine ${topicLower} without bias, the picture changes dramatically.`,
      `Your argument about ${topicLower} depends on a definition you haven't examined. Once we question that definition, everything unravels. You've rigged the game by controlling how you define the terms of ${topicLower}.`,
      `Your position on ${topicLower} requires a chain of assumptions. If any link breaks — and several do — the whole thing collapses. Let me show you exactly where your reasoning about ${topicLower} fails.`,
    ],
    "the-storyteller": [
      `Your argument about ${topicLower} is logical. But let me paint a picture. Imagine a world where your position on ${topicLower} is taken to its extreme. Now imagine the people living in that world. Their lived experience is the counter-argument you haven't considered.`,
      `I once knew someone who believed exactly what you're saying about ${topicLower}. Then reality proved them wrong — not through logic, but through lived experience. That's the thing about ${topicLower} — theory meets reality, and reality always wins.`,
      `You're making a logical case about ${topicLower}, but stories reveal what data can't. When you zoom in on the individual lives affected by ${topicLower}, your neat framework falls apart. Real people's experiences don't match your model.`,
    ],
    "the-philosopher": [
      `What do you actually mean by your claim about ${topicLower}? Your argument hinges on a definition you haven't examined. If we can't agree on what ${topicLower} means, how can we agree on what's true?`,
      `Your conclusion about ${topicLower} is actually a premise in disguise. You've assumed the very thing you're trying to prove. That's circular reasoning, no matter how elegantly you present it.`,
      `If your argument about ${topicLower} is correct, what follows? Have you considered the implications? When I trace your logic to its conclusion, I arrive somewhere uncomfortable.`,
    ],
    "the-prosecutor": [
      `Let me cross-examine your claim about ${topicLower}. You said one thing but your evidence says another. Which is it? You can't have it both ways, and the contradiction is fatal.`,
      `Your argument about ${topicLower} has three pillars, and I'm going to knock each one down. Your premise is incomplete, your logic has gaps, and your conclusion doesn't follow.`,
      `I'm going to press you on ${topicLower}. You made an assertion without evidence. You've presented opinion as fact, and the burden of proof is on you.`,
    ],
    "the-diplomat": [
      `I see merit in your position on ${topicLower}, but there's a more balanced view. Your argument captures part of the truth, but it's not the whole truth. When you include both sides, a more nuanced picture emerges.`,
      `You've raised valid concerns about ${topicLower}. Let me suggest a framing that addresses both sides. The problem with your position isn't that it's wrong — it's that it's incomplete.`,
      `Both sides have a point about ${topicLower}. The truth usually lies in the middle. Your argument captures something real, but it misses important perspectives.`,
    ],
  };

  const pool = responses[persona.id] || responses["the-rookie"];
  const idx = (round - 1) % pool.length;
  return { content: pool[idx] };
}

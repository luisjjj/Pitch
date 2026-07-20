import { GoogleGenAI } from "@google/genai";
import { getPersonaById } from "@/lib/personas";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateFallbackResponse(persona, topic, round);
  }

  const roundContext =
    round === 1
      ? "This is the opening statement round. Make your case."
      : round === 2
        ? "This is the rebuttal round. Respond to their arguments and strengthen your position."
        : "This is the closing round. Summarize your strongest points and deliver a final blow.";

  const prompt = [
    `${persona.systemPrompt}`,
    ``,
    `DEBATE TOPIC: "${topic}"`,
    `YOUR POSITION: You are arguing ${side === "for" ? "FOR" : "AGAINST"} the motion.`,
    `ROUND: ${roundContext}`,
    ``,
    `YOUR OPPONENT JUST SAID:`,
    `"${userArgument}"`,
    ``,
    `Respond to their argument. Stay in character. Be concise (2-4 sentences). Do not break character or mention you are AI.`,
  ].join("\n");

  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 200,
      },
    });

    const text = response.text || "";
    return { content: text.trim() || "I need to think about that." };
  } catch (err) {
    console.error("Persona response error:", err);
    return generateFallbackResponse(persona, topic, round);
  }
}

function generateFallbackResponse(
  persona: { name: string; style: string },
  topic: string,
  round: number
): PersonaResponse {
  const responses: Record<string, string[]> = {
    "the-rookie": [
      "That's an interesting point, but I think there's more to consider here. My gut tells me the other side has some valid concerns too.",
      "Hmm, you make a good case. But I've been thinking about this and I feel like there are practical implications you're missing.",
      "I'll admit, that's a strong argument. But I still believe my position holds up when you look at the bigger picture.",
    ],
    "the-contrarian": [
      "Hard disagree. That argument sounds good on paper but falls apart when you actually think about it.",
      "That's exactly what everyone says, and it's exactly why everyone is wrong. Let me explain.",
      "Sure, if you ignore half the evidence. But when you look at the full picture, your argument crumbles.",
    ],
    "the-academic": [
      "While that perspective has some merit, the empirical evidence actually suggests a more nuanced conclusion. Studies consistently show the opposite trend.",
      "I appreciate the logical framework, but your premises need examination. The data doesn't support the causal link you're implying.",
      "Your argument relies on an appeal to common intuition, but rigorous analysis reveals significant flaws in that reasoning.",
    ],
    "the-devils-advocate": [
      "I'm going to challenge that directly. Your argument assumes something that isn't proven, and once you see that, the whole thing falls apart.",
      "You're making this too easy. The moment you examine your core assumption, your entire position collapses.",
      "Let me play devil's advocate — oh wait, that's literally what I do. Your argument has a fundamental flaw you haven't addressed.",
    ],
    "the-storyteller": [
      "That reminds me of a story. There was once a person who believed exactly what you're saying — until reality proved them wrong in the most unexpected way.",
      "Your argument is logical, but let me paint you a picture. Imagine a world where your position is taken to its extreme. What does that look like?",
      "Numbers and facts are important, but stories are what change minds. Let me tell you one that illustrates my point perfectly.",
    ],
    "the-philosopher": [
      "Before we continue, I need to ask: what do you mean by that? Your argument hinges on a definition you haven't examined.",
      "You've built a compelling case, but you've overlooked something fundamental. Let me ask you this — is your conclusion actually a premise?",
      "The strength of your argument depends entirely on an assumption you haven't questioned. Let's examine that first.",
    ],
    "the-prosecutor": [
      "Let me cross-examine that claim. You said one thing but your evidence says another. Which is it?",
      "I'm going to press you on that point. You made a assertion without evidence. In any serious debate, that would be struck from the record.",
      "Your argument has a critical weakness — you've conflated correlation with causation. Let me show you exactly where.",
    ],
    "the-diplomat": [
      "I see the merit in your position, and I want to acknowledge that. But I think there's a more balanced perspective we're both missing.",
      "You've raised valid concerns. Rather than dismiss them, let me suggest a framing that actually addresses both sides.",
      "The truth usually lies in the middle. Your argument captures part of the picture, but misses the other half entirely.",
    ],
  };

  const pool = responses[persona.name] || responses["the-rookie"];
  const idx = round % pool.length;
  return { content: pool[idx] };
}

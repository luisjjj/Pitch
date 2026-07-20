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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateFallbackResponse(persona, topic, userArgument, round);
  }

  const roundContext =
    round === 1
      ? "This is the opening statement round. Make your case."
      : round === 2
        ? "This is the rebuttal round. Respond to their arguments and strengthen your position."
        : "This is the closing round. Summarize your strongest points and deliver a final blow.";

  const prompt = [
    `You are ${persona.name} — ${persona.title}.`,
    persona.systemPrompt,
    ``,
    `DEBATE TOPIC: "${topic}"`,
    `YOUR POSITION: You are arguing ${side === "for" ? "FOR" : "AGAINST"} the motion.`,
    `ROUND ${round}: ${roundContext}`,
    ``,
    `YOUR OPPONENT JUST SAID:`,
    `"${userArgument}"`,
    ``,
    `Rules:`,
    `- Respond DIRECTLY to what they said. Reference their specific points.`,
    `- Stay in character as ${persona.name}.`,
    `- Be concise (2-4 sentences max).`,
    `- Do NOT break character or mention you are AI.`,
    `- Do NOT repeat yourself across rounds.`,
  ].join("\n");

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const genai = new GoogleGenAI({ apiKey });
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 200,
      },
    });

    const text = response.text || "";
    if (text.trim()) {
      return { content: text.trim() };
    }
  } catch (err) {
    console.error("Gemini API error:", err);
  }

  // Always fall back to contextual response
  return generateFallbackResponse(persona, topic, userArgument, round);
}

function generateFallbackResponse(
  persona: { id: string; name: string; style: string },
  topic: string,
  userArgument: string,
  round: number
): PersonaResponse {
  // Extract key words from user's argument to reference
  const words = userArgument
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const keyPhrase = words.slice(0, 3).join(" ") || topic.split(" ").slice(0, 3).join(" ");

  const responses: Record<string, string[][]> = {
    "the-rookie": [
      [
        `Okay I hear you on "${keyPhrase}" but honestly I think there's a simpler way to look at this.`,
        `You make a fair point, but my gut says you're overlooking the practical side of things.`,
        `I get what you're saying, but from where I stand, the evidence points the other direction.`,
      ],
      [
        `That's a solid argument, but I've been thinking and I feel like the real issue is broader than that.`,
        `You're right about some of it, but you're missing the bigger picture here.`,
        `Hmm, interesting take. But I think when you zoom out, my position still holds.`,
      ],
      [
        `Look, I respect that point, but I think we both know it's not the whole story.`,
        `You've given me something to think about, but I'm not convinced yet.`,
        `That's well said, but I still believe the other side has the stronger case overall.`,
      ],
    ],
    "the-contrarian": [
      [
        `You literally just proved my point. "${keyPhrase}" — that's exactly the kind of thinking that falls apart under scrutiny.`,
        `Hard no. That sounds good but it's built on a foundation that crumbles the moment you question it.`,
        `That's the popular take, and the popular take is usually wrong. Let me show you why.`,
      ],
      [
        `Everyone says that. Everyone is wrong. Your argument about "${keyPhrase}" ignores the obvious counter-evidence.`,
        `That's a nice narrative, but narratives aren't facts. Your premise doesn't hold up.`,
        `I disagree, and here's the thing — the moment you examine your core assumption, the whole thing collapses.`,
      ],
      [
        `You're confident, I'll give you that. But confidence isn't evidence.`,
        `Sure, if you only look at half the data. But we're not doing that here.`,
        `That argument works if you ignore context. Unfortunately, context matters.`,
      ],
    ],
    "the-academic": [
      [
        `While your point about "${keyPhrase}" has surface-level appeal, the empirical literature actually suggests otherwise. Multiple studies have demonstrated the opposite trend.`,
        `Your argument contains a logical structure that appears sound but relies on an unstated assumption. Let me examine that.`,
        `I appreciate the reasoning, but your conclusion doesn't follow from your premises. The data tells a different story.`,
      ],
      [
        `The evidence base for "${keyPhrase}" is considerably weaker than you're suggesting. Peer-reviewed research consistently points in the other direction.`,
        `You've constructed a compelling narrative, but narratives aren't data. Your claim requires evidence you haven't provided.`,
        `Your framework is interesting, but it fails to account for the confounding variables that undermine your conclusion.`,
      ],
      [
        `That's a common misconception in this field. The actual research on this is quite clear.`,
        `Your argument rests on correlation, not causation. That's a fundamental methodological error.`,
        `I'd encourage you to look at the meta-analyses on this. They paint a very different picture than the one you're describing.`,
      ],
    ],
    "the-devils-advocate": [
      [
        `Oh, you think "${keyPhrase}" is settled? Let me flip that entirely. What if the opposite is true?`,
        `I'm going to challenge that directly. Your argument assumes something you haven't proven, and that assumption is doing all the heavy lifting.`,
        `You've made my job easy. The moment you examine what you just said, your entire position falls apart.`,
      ],
      [
        `That's a great example of confirmation bias. You're seeing what you want to see in "${keyPhrase}".`,
        `Your argument has a fatal flaw: it depends on a definition you haven't examined. Once we question that, everything unravels.`,
        `I love how confident you are. But let me ask you this — what happens when we apply your logic to its extreme?`,
      ],
      [
        `You've built a house of cards. Beautiful structure, but one breeze and it's over.`,
        `That's the kind of argument that sounds brilliant in a debate club. In reality? Not so much.`,
        `Interesting. Now let me show you exactly where your reasoning breaks down.`,
      ],
    ],
    "the-storyteller": [
      [
        `Your point about "${keyPhrase}" reminds me of something. There was once a person who believed exactly that — until reality proved them wrong in the most unexpected way.`,
        `You're making a logical case, but let me paint you a picture. Imagine a world where your position is taken to its absolute extreme. What does that look like?`,
        `Facts and logic are important, but stories change minds. Let me tell you one that illustrates why I see this differently.`,
      ],
      [
        `I once knew someone who argued exactly what you're saying now. You know what changed their mind? Not data — experience.`,
        `Your argument about "${keyPhrase}" is well-structured. But there's a human element you're not accounting for, and that element changes everything.`,
        `Numbers don't lie, but they don't tell the whole truth either. Let me share a perspective that complicates your narrative.`,
      ],
      [
        `Every great argument has a blind spot. Yours is right there in "${keyPhrase}".`,
        `You're painting with broad strokes. Let me zoom in on the detail you're missing.`,
        `That's a story you're telling yourself. But there's another version of that story, and it leads somewhere very different.`,
      ],
    ],
    "the-philosopher": [
      [
        `Before we go further, I need to ask: what do you actually mean by "${keyPhrase}"? Your argument hinges on a definition you haven't examined.`,
        `You've built a case, but you've overlooked something fundamental. Is your conclusion actually a premise in disguise?`,
        `The strength of your argument depends entirely on an assumption you haven't questioned. Let's examine that first.`,
      ],
      [
        `You've given me "${keyPhrase}" as if it's self-evident. But is it? What does that actually mean in this context?`,
        `Your reasoning is internally consistent, but your starting point is questionable. If we challenge that, the whole structure shifts.`,
        `There's a paradox in what you're saying. You argue for one thing but your reasoning implies the opposite.`,
      ],
      [
        `Let me ask you something: if your argument is correct, what follows from that? Have you considered the implications?`,
        `You're treating "${keyPhrase}" as a conclusion when it's actually an unexamined assumption.`,
        `The unexamined argument is not worth making. Let's look at what you're really saying here.`,
      ],
    ],
    "the-prosecutor": [
      [
        `Let me cross-examine that claim. You said "${keyPhrase}" — but your evidence says something different. Which is it?`,
        `I'm going to press you on this. You made a claim without sufficient evidence. In any serious forum, that would be challenged.`,
        `Your argument has a critical weakness: you've conflated correlation with causation. Let me show you exactly where.`,
      ],
      [
        `Your Honor — I mean, your attention — please. The witness, I mean the debater, has just contradicted themselves on "${keyPhrase}".`,
        `That assertion doesn't survive cross-examination. You've presented opinion as fact, and I won't let that stand.`,
        `You're relying on the audience not looking too closely at "${keyPhrase}". But I'm looking closely, and it doesn't hold up.`,
      ],
      [
        `The evidence doesn't support your conclusion. Let me walk you through exactly why.`,
        `You've made a series of claims. Let me address each one, starting with the weakest — which is "${keyPhrase}".`,
        `Your argument sounds compelling until you examine the facts. And the facts tell a different story.`,
      ],
    ],
    "the-diplomat": [
      [
        `I see the merit in what you're saying about "${keyPhrase}", and I want to acknowledge that. But I think there's a more balanced view we're both missing.`,
        `You've raised valid concerns. Rather than dismiss them, let me suggest a framing that actually addresses both sides of this.`,
        `The truth usually lies in the middle. Your argument captures part of the picture, but misses the other half entirely.`,
      ],
      [
        `There's common ground here that we're both overlooking. Your point about "${keyPhrase}" has merit, but so does the counter-position.`,
        `I appreciate your perspective. Let me try to bridge the gap between where you are and where I think the evidence points.`,
        `This isn't a zero-sum debate. Your argument and mine can both contain truth. Let me show you where they intersect.`,
      ],
      [
        `You've made a compelling case for your side. Let me make an equally compelling case for the other, and let the audience decide.`,
        `I respect your position on "${keyPhrase}". Now let me offer a perspective that might shift how you see this.`,
        `Both sides have a point. The question isn't who's right — it's which framing serves us better.`,
      ],
    ],
  };

  const pool = responses[persona.id] || responses["the-rookie"];
  const roundIdx = (round - 1) % pool.length;
  const options = pool[roundIdx];
  const textIdx = Math.floor(Math.random() * options.length);
  return { content: options[textIdx] };
}

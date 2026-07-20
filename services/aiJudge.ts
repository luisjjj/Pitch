import { GoogleGenAI } from "@google/genai";
import { AIRoundResult, RoundSubmission } from "@/types";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildJudgePrompt(
  topic: string,
  roundTitle: string,
  submissions: RoundSubmission[]
): string {
  const parts = [
    `You are an impartial debate judge. Score the following debate round.`,
    ``,
    `TOPIC: "${topic}"`,
    `ROUND: ${roundTitle}`,
    ``,
  ];

  submissions.forEach((sub, i) => {
    const label = sub.type === "audio" ? "Audio argument" : "Text argument";
    const content = sub.content || sub.transcription || "[audio only, no transcription available]";
    parts.push(`--- ARGUMENT ${i + 1} (${label}, ${sub.side?.toUpperCase()}) ---`);
    parts.push(content);
    parts.push(``);
  });

  parts.push(`Score each argument on these dimensions (1-10 scale):`);
  parts.push(`- logic: How sound and well-structured is the reasoning?`);
  parts.push(`- clarity: How clear and articulate is the argument?`);
  parts.push(`- relevance: How well does it address the topic?`);
  parts.push(`- persuasion: How compelling is it overall?`);
  parts.push(``);
  parts.push(`Return ONLY valid JSON in this exact shape (no markdown, no extra text):`);
  parts.push(`{`);
  parts.push(`  "scores": {`);
  submissions.forEach((_, i) => {
    parts.push(`    "argument${i + 1}": { "logic": N, "clarity": N, "relevance": N, "persuasion": N },`);
  });
  parts.push(`  },`);
  parts.push(`  "feedback": "Overall assessment of the round",`);
  parts.push(`  "highlights": ["best moment 1", "best moment 2"],`);
  parts.push(`  "bestQuote": "most memorable line from the arguments"`);
  parts.push(`}`);

  return parts.join("\n");
}

class AIJudgeService {
  async judgeRound(
    topic: string,
    roundTitle: string,
    submissions: RoundSubmission[]
  ): Promise<AIRoundResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return this.generateMockResult(submissions);
    }

    try {
      const prompt = buildJudgePrompt(topic, roundTitle, submissions);
      const response = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.generateMockResult(submissions);

      const parsed = JSON.parse(jsonMatch[0]);
      const scores: AIRoundResult["scores"] = {};

      submissions.forEach((sub, i) => {
        const key = `argument${i + 1}`;
        const s = parsed.scores?.[key] || {};
        const logic = Math.min(10, Math.max(1, Number(s.logic) || 5));
        const clarity = Math.min(10, Math.max(1, Number(s.clarity) || 5));
        const relevance = Math.min(10, Math.max(1, Number(s.relevance) || 5));
        const persuasion = Math.min(10, Math.max(1, Number(s.persuasion) || 5));
        scores[sub.userId] = {
          logic,
          clarity,
          relevance,
          persuasion,
          total: Math.round((logic + clarity + relevance + persuasion) / 4),
        };
      });

      return {
        scores,
        feedback: parsed.feedback || "Round judged successfully.",
        highlights: parsed.highlights || [],
        bestQuote: parsed.bestQuote || "",
        judgedAt: new Date(),
      };
    } catch (err) {
      console.error("Gemini judge error:", err);
      return this.generateMockResult(submissions);
    }
  }

  private generateMockResult(submissions: RoundSubmission[]): AIRoundResult {
    const scores: AIRoundResult["scores"] = {};
    submissions.forEach((sub) => {
      const logic = Math.floor(Math.random() * 4) + 6;
      const clarity = Math.floor(Math.random() * 4) + 6;
      const relevance = Math.floor(Math.random() * 4) + 6;
      const persuasion = Math.floor(Math.random() * 4) + 6;
      scores[sub.userId] = {
        logic,
        clarity,
        relevance,
        persuasion,
        total: Math.floor((logic + clarity + relevance + persuasion) / 4),
      };
    });
    return {
      scores,
      feedback: "Great debate! Both participants showed strong arguments.",
      highlights: ["Strong opening statements", "Clear rebuttal points"],
      bestQuote: "The best argument was...",
      judgedAt: new Date(),
    };
  }
}

export const aiJudge = new AIJudgeService();

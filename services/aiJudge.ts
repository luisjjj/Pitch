import { AIRoundResult, RoundSubmission } from "@/types";

export type AIEngine = "openai" | "gemini" | "claude" | "local" | "custom";

interface AIEngineConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

class AIJudgeService {
  private engine: AIEngine;
  private config: AIEngineConfig;

  constructor(engine: AIEngine = "openai", config: AIEngineConfig = {}) {
    this.engine = engine;
    this.config = config;
  }

  async judgeRound(
    topic: string,
    roundTitle: string,
    submissions: RoundSubmission[]
  ): Promise<AIRoundResult> {
    // TODO: Implement actual AI calling logic here
    // For now, return mock results
    return this.generateMockResult(submissions);
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

  setEngine(engine: AIEngine, config?: AIEngineConfig) {
    this.engine = engine;
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }
}

export const aiJudge = new AIJudgeService();

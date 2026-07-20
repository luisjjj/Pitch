export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  wins: number;
  losses: number;
  draws: number;
  elo: number;
  streak: number;
  badges: string[];
  createdAt: Date;
  lastActive: Date;
}

export interface DebateRoom {
  id: string;
  topic: string;
  category: string;
  mode: "text" | "voice";
  type: "casual" | "ranked" | "friendly" | "fast";
  participants: string[];
  status: "waiting" | "active" | "completed";
  currentRound: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebateRound {
  id: string;
  debateId: string;
  roundNumber: 1 | 2 | 3;
  title: string;
  duration: number;
  submissions: Record<string, RoundSubmission>;
  aiResults?: AIRoundResult;
  status: "pending" | "active" | "voting" | "completed";
  startTime?: Date;
  endTime?: Date;
}

export interface RoundSubmission {
  userId: string;
  type: "text" | "audio";
  content?: string;
  audioUrl?: string;
  duration?: number;
  submittedAt: Date;
}

export interface AIRoundResult {
  scores: {
    [userId: string]: {
      logic: number;
      clarity: number;
      relevance: number;
      persuasion: number;
      total: number;
    };
  };
  feedback: string;
  highlights: string[];
  bestQuote: string;
  judgedAt: Date;
}

export interface DebateCategory {
  id: string;
  name: string;
  icon: string;
  activePlayers: number;
  difficulty: "easy" | "medium" | "hard";
  color: string;
}

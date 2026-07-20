import { DebateCategory } from "@/types";

export const DEBATE_CATEGORIES: DebateCategory[] = [
  { id: "politics", name: "Politics", icon: "landmark", activePlayers: 124, difficulty: "hard", color: "#ef4444" },
  { id: "movies", name: "Movies", icon: "film", activePlayers: 89, difficulty: "easy", color: "#f59e0b" },
  { id: "tech", name: "Tech", icon: "code", activePlayers: 156, difficulty: "medium", color: "#3b82f6" },
  { id: "gaming", name: "Gaming", icon: "gamepad2", activePlayers: 203, difficulty: "easy", color: "#8b5cf6" },
  { id: "philosophy", name: "Philosophy", icon: "brain", activePlayers: 45, difficulty: "hard", color: "#10b981" },
  { id: "relationships", name: "Relationships", icon: "heart", activePlayers: 98, difficulty: "medium", color: "#ec4899" },
  { id: "sports", name: "Sports", icon: "trophy", activePlayers: 167, difficulty: "easy", color: "#14b8a6" },
  { id: "music", name: "Music", icon: "music", activePlayers: 112, difficulty: "easy", color: "#f97316" },
  { id: "anime", name: "Anime", icon: "sparkles", activePlayers: 178, difficulty: "medium", color: "#a855f7" },
  { id: "random", name: "Random", icon: "shuffle", activePlayers: 234, difficulty: "medium", color: "#6b7280" },
];

export const TOPICS_BY_CATEGORY: Record<string, string[]> = {
  politics: [
    "Should governments regulate AI?",
    "Is democracy the best form of government?",
    "Should climate change be a top priority?",
  ],
  movies: [
    "Marvel vs DC: Which is better?",
    "Is cinema dying?",
    "Should remakes be banned?",
  ],
  tech: [
    "Will AI replace programmers?",
    "Apple vs Android: Which is superior?",
    "Should social media be regulated?",
  ],
  gaming: [
    "PC vs Console: Which is better?",
    "Are microtransactions ruining gaming?",
    "Single player vs Multiplayer?",
  ],
  philosophy: [
    "Is free will an illusion?",
    "What is the meaning of life?",
    "Is morality objective?",
  ],
  relationships: [
    "Is monogamy natural?",
    "Should couples live together before marriage?",
    "Is love at first sight real?",
  ],
  sports: [
    "Is soccer the best sport?",
    "Should athletes be paid more?",
    "GOAT debates in sports",
  ],
  music: [
    "Is music getting worse?",
    "Rock vs Hip Hop",
    "Are music festivals worth it?",
  ],
  anime: [
    "Is anime mainstream now?",
    "Sub vs Dub",
    "Best anime of all time",
  ],
  random: [
    "Pizza vs Burgers",
    "Is water wet?",
    "Does pineapple belong on pizza?",
  ],
};

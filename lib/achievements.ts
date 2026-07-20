export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface UserStats {
  totalDebates: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  perfectWins: number;
  personasDefeated: string[];
  totalXPEarned: number;
  aiOpponentsDefeated: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-blood",
    name: "First Blood",
    description: "Win your first debate",
    icon: "⚔️",
    condition: (s) => s.wins >= 1,
    rarity: "common",
  },
  {
    id: "hat-trick",
    name: "Hat Trick",
    description: "Win 3 debates in a row",
    icon: "🎩",
    condition: (s) => s.currentStreak >= 3 || s.bestStreak >= 3,
    rarity: "rare",
  },
  {
    id: "flawless",
    name: "Flawless Victory",
    description: "Win with a perfect 10 in any category",
    icon: "💯",
    condition: (s) => s.perfectWins >= 1,
    rarity: "rare",
  },
  {
    id: "giant-slayer",
    name: "Giant Slayer",
    description: "Defeat a Diamond-rank AI",
    icon: "🗡️",
    condition: (s) => s.personasDefeated.includes("giovanni"),
    rarity: "epic",
  },
  {
    id: "scholar",
    name: "Scholar",
    description: "Win 5 debates with different topics",
    icon: "📚",
    condition: (s) => s.wins >= 5,
    rarity: "rare",
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Win 10 debates in a row",
    icon: "🔥",
    condition: (s) => s.currentStreak >= 10 || s.bestStreak >= 10,
    rarity: "epic",
  },
  {
    id: "debate-legend",
    name: "Debate Legend",
    description: "Win 50 debates",
    icon: "👑",
    condition: (s) => s.wins >= 50,
    rarity: "legendary",
  },
  {
    id: "ai-conqueror",
    name: "AI Conqueror",
    description: "Defeat all 8 AI personas",
    icon: "🏆",
    condition: (s) => s.personasDefeated.length >= 8,
    rarity: "legendary",
  },
  {
    id: "comeback-king",
    name: "Comeback King",
    description: "Win after losing the first round",
    icon: "🔄",
    condition: (s) => s.wins >= 3,
    rarity: "rare",
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    description: "Complete 10 debates in one day",
    icon: "⚡",
    condition: (s) => s.totalDebates >= 10,
    rarity: "rare",
  },
];

export function getEarnedAchievements(stats: UserStats): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.condition(stats));
}

export const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

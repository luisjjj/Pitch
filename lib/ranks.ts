export interface RankTier {
  name: string;
  minXP: number;
  color: string;
  icon: string;
  glow: string;
}

export const RANK_TIERS: RankTier[] = [
  { name: "Bronze", minXP: 0, color: "#cd7f32", icon: "🥉", glow: "rgba(205,127,50,0.3)" },
  { name: "Silver", minXP: 500, color: "#c0c0c0", icon: "🥈", glow: "rgba(192,192,192,0.3)" },
  { name: "Gold", minXP: 1500, color: "#ffd700", icon: "🥇", glow: "rgba(255,215,0,0.3)" },
  { name: "Platinum", minXP: 3500, color: "#00e5ff", icon: "💎", glow: "rgba(0,229,255,0.3)" },
  { name: "Diamond", minXP: 7000, color: "#b388ff", icon: "👑", glow: "rgba(179,136,255,0.4)" },
];

export function getRankForXP(xp: number): RankTier {
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (xp >= t.minXP) tier = t;
  }
  return tier;
}

export function getXPProgress(xp: number): { current: RankTier; next: RankTier | null; progress: number } {
  const current = getRankForXP(xp);
  const currentIdx = RANK_TIERS.indexOf(current);
  const next = currentIdx < RANK_TIERS.length - 1 ? RANK_TIERS[currentIdx + 1] : null;
  const progress = next
    ? Math.min(100, ((xp - current.minXP) / (next.minXP - current.minXP)) * 100)
    : 100;
  return { current, next, progress };
}

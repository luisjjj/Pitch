import { pool } from "@/lib/db";
import { type UserStats, getEarnedAchievements } from "@/lib/achievements";

export function calculateXP(result: {
  won: boolean;
  personaDifficulty: number;
  rounds: number;
  perfectScore: boolean;
}): number {
  let xp = 0;

  // Base XP for participating
  xp += 50;

  // Win bonus
  if (result.won) xp += 100;

  // Difficulty multiplier (1-6 scale)
  const multipliers: Record<number, number> = {
    1: 1.0,
    2: 1.1,
    3: 1.2,
    4: 1.5,
    5: 1.8,
    6: 2.0,
  };
  xp = Math.round(xp * (multipliers[result.personaDifficulty] || 1));

  // Perfect score bonus
  if (result.perfectScore) xp += 50;

  // Round efficiency bonus (more rounds = more XP)
  xp += Math.min(result.rounds * 10, 50);

  return xp;
}

export async function awardXP(
  userId: string,
  xp: number,
  reason: string,
  debateId?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO xp_log (user_id, amount, reason, debate_id) VALUES ($1, $2, $3, $4)`,
    [userId, xp, reason, debateId]
  );

  await pool.query(
    `UPDATE "user" SET xp = xp + $1 WHERE id = $2`,
    [xp, userId]
  );
}

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  // Fetch user stats
  const statsResult = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM debates WHERE created_by = $1 AND status = 'completed') as total_debates,
      (SELECT COUNT(*) FROM debates WHERE created_by = $1 AND status = 'completed' AND winner_id = $1) as wins,
      (SELECT COUNT(*) FROM debates WHERE created_by = $1 AND status = 'completed' AND winner_id != $1) as losses,
      (SELECT best_streak FROM "user" WHERE id = $1) as best_streak,
      (SELECT current_streak FROM "user" WHERE id = $1) as current_streak`,
    [userId]
  );

  const row = statsResult.rows[0];

  // Get personas defeated
  const personasResult = await pool.query(
    `SELECT DISTINCT d.persona_id
     FROM debates d
     WHERE d.created_by = $1
       AND d.status = 'completed'
       AND d.winner_id = $1
       AND d.persona_id IS NOT NULL`,
    [userId]
  );

  const stats: UserStats = {
    totalDebates: parseInt(row.total_debates) || 0,
    wins: parseInt(row.wins) || 0,
    losses: parseInt(row.losses) || 0,
    currentStreak: parseInt(row.current_streak) || 0,
    bestStreak: parseInt(row.best_streak) || 0,
    perfectWins: 0,
    personasDefeated: personasResult.rows.map((r: any) => r.persona_id),
    totalXPEarned: 0,
    aiOpponentsDefeated: personasResult.rows.length,
  };

  const earned = getEarnedAchievements(stats);

  // Check which are already earned
  const existingResult = await pool.query(
    `SELECT achievement_id FROM user_achievements WHERE user_id = $1`,
    [userId]
  );
  const existing = new Set(existingResult.rows.map((r: any) => r.achievement_id));

  const newAchievements: string[] = [];

  for (const a of earned) {
    if (!existing.has(a.id)) {
      await pool.query(
        `INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, a.id]
      );
      newAchievements.push(a.name);
    }
  }

  return newAchievements;
}

export async function updateStreak(userId: string, won: boolean): Promise<void> {
  if (won) {
    await pool.query(
      `UPDATE "user" SET
        current_streak = current_streak + 1,
        best_streak = GREATEST(best_streak, current_streak + 1)
       WHERE id = $1`,
      [userId]
    );
  } else {
    await pool.query(
      `UPDATE "user" SET current_streak = 0 WHERE id = $1`,
      [userId]
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";
import { calculateXP, awardXP, checkAndAwardAchievements, updateStreak } from "@/services/xpRewards";
import { getPersonaById, type Persona } from "@/lib/personas";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get debate
  const debateResult = await pool.query(
    `SELECT * FROM debates WHERE id = $1 AND created_by = $2`,
    [params.id, session.user.id]
  );

  if (debateResult.rows.length === 0) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }

  const debate = debateResult.rows[0];

  if (debate.status === "completed") {
    return NextResponse.json({ message: "Debate already completed" });
  }

  // Get all arguments
  const argsResult = await pool.query(
    `SELECT * FROM debate_arguments WHERE debate_id = $1 ORDER BY round ASC`,
    [params.id]
  );

  const args = argsResult.rows;
  const rounds = Math.max(...args.map((a: any) => a.round));

  // For AI debates, determine winner (simplified: user wins if they completed all rounds)
  // In production, this would use AI judge scoring
  const userArgs = args.filter((a: any) => a.user_id === session.user.id);
  const aiArgs = args.filter((a: any) => a.user_id.startsWith("ai-"));

  // Simple winner logic for now
  const won = userArgs.length >= aiArgs.length;
  const winnerId = won ? session.user.id : `ai-${debate.persona_id}`;

  // Update debate status
  await pool.query(
    `UPDATE debates SET status = 'completed', winner_id = $1 WHERE id = $2`,
    [winnerId, params.id]
  );

  // Calculate and award XP
  const persona = debate.persona_id ? getPersonaById(debate.persona_id) : null;
  const xp = calculateXP({
    won,
    personaDifficulty: persona?.difficulty ?? 3,
    rounds,
    perfectScore: false,
  });

  await awardXP(session.user.id, xp, won ? "Won debate" : "Completed debate", params.id);

  // Update streak
  await updateStreak(session.user.id, won);

  // Check for new achievements
  const newAchievements = await checkAndAwardAchievements(session.user.id);

  // Update user rank based on total XP
  const xpResult = await pool.query(`SELECT xp FROM "user" WHERE id = $1`, [session.user.id]);
  const totalXP = xpResult.rows[0]?.xp || 0;

  let rank = "Bronze";
  if (totalXP >= 7000) rank = "Diamond";
  else if (totalXP >= 3500) rank = "Platinum";
  else if (totalXP >= 1500) rank = "Gold";
  else if (totalXP >= 500) rank = "Silver";

  await pool.query(`UPDATE "user" SET rank = $1 WHERE id = $2`, [rank, session.user.id]);

  return NextResponse.json({
    won,
    xp,
    rank,
    newAchievements,
    totalXP,
  });
}

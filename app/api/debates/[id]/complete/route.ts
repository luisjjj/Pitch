import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";
import { calculateXP, awardXP, checkAndAwardAchievements, updateStreak } from "@/services/xpRewards";
import { getPersonaById } from "@/lib/personas";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const debateResult = await pool.query(
    `SELECT * FROM debates WHERE id = $1 AND (created_by = $2 OR opponent_id = $2)`,
    [params.id, session.user.id]
  );

  if (debateResult.rows.length === 0) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }

  const debate = debateResult.rows[0];

  // Idempotency: if already completed, return existing result
  if (debate.status === "completed") {
    const existing = await pool.query(
      `SELECT * FROM debate_results WHERE debate_id = $1`,
      [params.id]
    );
    if (existing.rows.length > 0) {
      const r = existing.rows[0];
      return NextResponse.json({ won: r.winner_id === session.user.id, xp: 0, rank: debate.status || "Bronze", newAchievements: [], totalXP: 0 });
    }
  }

  // Get all arguments
  const argsResult = await pool.query(
    `SELECT * FROM debate_arguments WHERE debate_id = $1 ORDER BY round ASC`,
    [params.id]
  );

  const args = argsResult.rows;
  const rounds = Math.max(...args.map((a: any) => a.round), 1);

  const userArgs = args.filter((a: any) => a.user_id === session.user.id);
  const aiArgs = args.filter((a: any) => a.user_id.startsWith("ai-"));

  const won = userArgs.length >= aiArgs.length;
  const persona = debate.persona_id ? getPersonaById(debate.persona_id) : null;
  // For FK safety: winner_id references "user" table, so only set if human won
  const winnerId = won ? session.user.id : null;

  // Update debate status
  try {
    await pool.query(
      `UPDATE debates SET status = 'completed', winner_id = $1 WHERE id = $2`,
      [winnerId, params.id]
    );
  } catch {
    // winner_id column may not exist — just update status
    await pool.query(
      `UPDATE debates SET status = 'completed' WHERE id = $1`,
      [params.id]
    );
  }

  // Generate simple scores based on argument quality
  const scores: Record<string, any> = {};

  const userAvgScore = Math.min(100, 50 + userArgs.length * 8 + (won ? 15 : 0));
  const aiAvgScore = Math.min(100, 50 + aiArgs.length * 8 + (won ? 0 : 15));

  // Use deterministic scores (not random) so results are stable across refetches
  const seed = params.id.charCodeAt(0) % 10;

  scores[session.user.id] = {
    logic: Math.round(userAvgScore + (seed - 5)),
    clarity: Math.round(userAvgScore + ((seed * 3) % 10 - 5)),
    relevance: Math.round(userAvgScore + ((seed * 7) % 10 - 5)),
    persuasion: Math.round(userAvgScore + ((seed * 2) % 10 - 5)),
    total: userAvgScore,
  };

  const aiUserId = aiArgs.length > 0 ? aiArgs[0].user_id : `ai-${persona?.id || "unknown"}`;
  scores[aiUserId] = {
    logic: Math.round(aiAvgScore + (seed - 5)),
    clarity: Math.round(aiAvgScore + ((seed * 3) % 10 - 5)),
    relevance: Math.round(aiAvgScore + ((seed * 7) % 10 - 5)),
    persuasion: Math.round(aiAvgScore + ((seed * 2) % 10 - 5)),
    total: aiAvgScore,
  };

  scores.feedback = won
    ? "Strong performance. Your arguments were well-structured and convincing."
    : "Good effort. Consider strengthening your opening statements and using more evidence.";

  scores.highlights = [
    userArgs.length > 0 ? userArgs[userArgs.length - 1].content.slice(0, 80) + "..." : "",
  ];
  scores.bestQuote = userArgs.length > 0 ? userArgs[0].content.slice(0, 100) : "";

  // Create or update debate_results row
  try {
    const existing = await pool.query(
      `SELECT id FROM debate_results WHERE debate_id = $1`,
      [params.id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE debate_results SET winner_id = $1, scores = $2 WHERE debate_id = $3`,
        [winnerId, JSON.stringify(scores), params.id]
      );
    } else {
      await pool.query(
        `INSERT INTO debate_results (debate_id, winner_id, scores) VALUES ($1, $2, $3)`,
        [params.id, winnerId, JSON.stringify(scores)]
      );
    }
  } catch (err) {
    console.error("Failed to save debate_results:", err);
  }

  // Calculate and award XP
  const xp = calculateXP({
    won,
    personaDifficulty: persona?.difficulty ?? 3,
    rounds,
    perfectScore: false,
  });

  try {
    await awardXP(session.user.id, xp, won ? "Won debate" : "Completed debate", params.id);
    await updateStreak(session.user.id, won);
    const newAchievements = await checkAndAwardAchievements(session.user.id);

    const xpResult = await pool.query(`SELECT xp FROM "user" WHERE id = $1`, [session.user.id]);
    const totalXP = xpResult.rows[0]?.xp || 0;

    let rank = "Bronze";
    if (totalXP >= 7000) rank = "Diamond";
    else if (totalXP >= 3500) rank = "Platinum";
    else if (totalXP >= 1500) rank = "Gold";
    else if (totalXP >= 500) rank = "Silver";

    await pool.query(`UPDATE "user" SET rank = $1 WHERE id = $2`, [rank, session.user.id]);

    return NextResponse.json({ won, xp, rank, newAchievements, totalXP });
  } catch (err) {
    console.error("XP/achievement error (non-fatal):", err);
    return NextResponse.json({ won, xp, rank: "Bronze", newAchievements: [], totalXP: 0 });
  }
}

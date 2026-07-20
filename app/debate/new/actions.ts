"use server";

import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function createDebate(formData: {
  topic: string;
  category: string;
  format: string;
  side: string;
  personaId?: string;
}) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect("/auth?next=/debate/new");

  const opponentType = formData.personaId ? "ai" : "human";

  const result = await pool.query(
    `INSERT INTO debates (topic, category, format, status, created_by, persona_id, opponent_type)
     VALUES ($1, $2, $3, 'active', $4, $5, $6)
     RETURNING id`,
    [formData.topic, formData.category, formData.format, session.user.id, formData.personaId || null, opponentType]
  );

  const debateId = result.rows[0].id;

  await pool.query(
    `INSERT INTO debate_arguments (debate_id, user_id, content, round, side)
     VALUES ($1, $2, '', 1, $3)`,
    [debateId, session.user.id, formData.side === "Random" ? "for" : formData.side.toLowerCase()]
  );

  return debateId;
}

export async function getActiveDebates() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return [];

  try {
    const result = await pool.query(
      `SELECT d.*, u.name as opponent_name
       FROM debates d
       LEFT JOIN "user" u ON u.id = d.opponent_id
       WHERE d.created_by = $1 AND d.status IN ('pending', 'active')
       ORDER BY d.created_at DESC
       LIMIT 10`,
      [session.user.id]
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function getDebateStats() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return { total: 0, wins: 0, losses: 0, points: 0, winRate: 0 };

  try {
    const total = await pool.query(
      `SELECT COUNT(*) FROM debates WHERE created_by = $1 AND status = 'completed'`,
      [session.user.id]
    );

    const wins = await pool.query(
      `SELECT COUNT(*) FROM debate_results WHERE winner_id = $1`,
      [session.user.id]
    );

    const losses = await pool.query(
      `SELECT COUNT(*) FROM debate_results dr
       JOIN debates d ON d.id = dr.debate_id
       WHERE d.created_by = $1 AND dr.winner_id != $1 AND dr.winner_id IS NOT NULL`,
      [session.user.id]
    );

    const totalDebates = parseInt(total.rows[0].count);
    const totalWins = parseInt(wins.rows[0].count);
    const totalLosses = parseInt(losses.rows[0].count);
    const points = totalWins * 100 + totalDebates * 10;

    return {
      total: totalDebates,
      wins: totalWins,
      losses: totalLosses,
      winRate: totalDebates > 0 ? Math.round((totalWins / totalDebates) * 100) : 0,
      points,
    };
  } catch {
    return { total: 0, wins: 0, losses: 0, points: 0, winRate: 0 };
  }
}

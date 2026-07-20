import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Get debate history with results
  const historyResult = await pool.query(
    `SELECT d.*,
      u.name as opponent_user_name,
      (SELECT content FROM debate_arguments da WHERE da.debate_id = d.id AND da.user_id = d.created_by ORDER BY da.round ASC LIMIT 1) as user_first_argument,
      (SELECT COUNT(*) FROM debate_arguments da WHERE da.debate_id = d.id) as argument_count
     FROM debates d
     LEFT JOIN users u ON d.opponent_id = u.id
     WHERE d.created_by = $1 AND d.status = 'completed'
     ORDER BY d.created_at DESC
     LIMIT $2 OFFSET $3`,
    [session.user.id, limit, offset]
  );

  // Get stats
  const statsResult = await pool.query(
    `SELECT
      COUNT(*) as total_debates,
      COUNT(*) FILTER (WHERE winner_id = $1) as wins,
      COUNT(*) FILTER (WHERE winner_id != $1 AND winner_id IS NOT NULL) as losses,
      COUNT(DISTINCT persona_id) as personas_faced,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
     FROM debates
     WHERE created_by = $1 AND status = 'completed'`,
    [session.user.id]
  );

  const stats = statsResult.rows[0];

  return NextResponse.json({
    debates: historyResult.rows,
    stats: {
      totalDebates: parseInt(stats.total_debates) || 0,
      wins: parseInt(stats.wins) || 0,
      losses: parseInt(stats.losses) || 0,
      personasFaced: parseInt(stats.personas_faced) || 0,
      avgDuration: Math.round(parseFloat(stats.avg_duration_seconds) || 0),
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get debate
  const debateResult = await pool.query(
    `SELECT d.* FROM debates d
     WHERE d.id = $1 AND (d.created_by = $2 OR d.opponent_id = $2)`,
    [params.id, session.user.id]
  );

  if (debateResult.rows.length === 0) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }

  const debate = debateResult.rows[0];

  // Get all arguments
  const argsResult = await pool.query(
    `SELECT * FROM debate_arguments
     WHERE debate_id = $1
     ORDER BY round ASC, created_at ASC`,
    [params.id]
  );

  // Get results
  const resultsResult = await pool.query(
    `SELECT * FROM debate_results WHERE debate_id = $1`,
    [params.id]
  );

  return NextResponse.json({
    debate,
    arguments: argsResult.rows,
    results: resultsResult.rows[0] || null,
  });
}

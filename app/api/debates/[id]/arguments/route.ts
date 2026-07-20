import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await pool.query(
    `SELECT * FROM debate_arguments
     WHERE debate_id = $1
     ORDER BY round ASC, created_at ASC`,
    [params.id]
  );

  return NextResponse.json({ arguments: result.rows });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const debateId = params.id;
  const body = await request.json();
  const { content, audioUrl, audioDuration, transcription, side, round } = body;

  if (!side || !round) {
    return NextResponse.json({ error: "side and round are required" }, { status: 400 });
  }

  if (!content && !audioUrl) {
    return NextResponse.json({ error: "Either content or audioUrl is required" }, { status: 400 });
  }

  // Verify user is part of this debate
  const debateCheck = await pool.query(
    `SELECT id, created_by, opponent_id FROM debates WHERE id = $1`,
    [debateId]
  );

  if (debateCheck.rows.length === 0) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }

  const debate = debateCheck.rows[0];
  if (debate.created_by !== session.user.id && debate.opponent_id !== session.user.id) {
    return NextResponse.json({ error: "Not part of this debate" }, { status: 403 });
  }

  // Try to update existing argument first
  const result = await pool.query(
    `UPDATE debate_arguments
     SET content = COALESCE(NULLIF($1, ''), content)
     WHERE debate_id = $2 AND user_id = $3 AND round = $4
     RETURNING id`,
    [content || "", debateId, session.user.id, round]
  );

  if (result.rows.length === 0) {
    // No existing argument, insert new
    try {
      await pool.query(
        `INSERT INTO debate_arguments (debate_id, user_id, content, round, side)
         VALUES ($1, $2, $3, $4, $5)`,
        [debateId, session.user.id, content || "", round, side]
      );
    } catch (err: any) {
      // If column doesn't exist, try minimal insert
      if (err.code === "42703") {
        await pool.query(
          `INSERT INTO debate_arguments (debate_id, user_id, content, round, side)
           VALUES ($1, $2, $3, $4, $5)`,
          [debateId, session.user.id, content || "", round, side]
        );
      } else {
        throw err;
      }
    }
  }

  return NextResponse.json({ success: true });
}

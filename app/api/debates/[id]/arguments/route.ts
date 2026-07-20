import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

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

  // Upsert argument (placeholder was created at debate creation)
  const result = await pool.query(
    `UPDATE debate_arguments
     SET content = COALESCE($1, content),
         audio_url = COALESCE($2, audio_url),
         audio_duration = COALESCE($3, audio_duration),
         transcription = COALESCE($4, transcription)
     WHERE debate_id = $5 AND user_id = $6 AND round = $7
     RETURNING id`,
    [content || null, audioUrl || null, audioDuration || null, transcription || null, debateId, session.user.id, round]
  );

  if (result.rows.length === 0) {
    // No placeholder exists, insert new
    await pool.query(
      `INSERT INTO debate_arguments (debate_id, user_id, content, audio_url, audio_duration, transcription, round, side)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [debateId, session.user.id, content || null, audioUrl || null, audioDuration || null, transcription || null, round, side]
    );
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";
import { generatePersonaResponse } from "@/services/aiPersona";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { personaId, topic, userArgument, round, side } = body;

  if (!personaId || !topic || !userArgument) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify user is part of this debate
  const debateCheck = await pool.query(
    `SELECT id, created_by, opponent_id FROM debates WHERE id = $1`,
    [params.id]
  );

  if (debateCheck.rows.length === 0) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }

  const debate = debateCheck.rows[0];
  if (debate.created_by !== session.user.id && debate.opponent_id !== session.user.id) {
    return NextResponse.json({ error: "Not part of this debate" }, { status: 403 });
  }

  // Generate AI response
  const response = await generatePersonaResponse(
    personaId,
    topic,
    userArgument,
    round,
    side || "against"
  );

  // Save AI argument to database
  // For AI persona, we use a special user_id pattern: "ai-{personaId}"
  const aiUserId = `ai-${personaId}`;

  // Upsert or insert AI argument
  const existing = await pool.query(
    `SELECT id FROM debate_arguments WHERE debate_id = $1 AND user_id = $2 AND round = $3`,
    [params.id, aiUserId, round]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE debate_arguments SET content = $1, side = $2 WHERE debate_id = $3 AND user_id = $4 AND round = $5`,
      [response.content, side || "against", params.id, aiUserId, round]
    );
  } else {
    await pool.query(
      `INSERT INTO debate_arguments (debate_id, user_id, content, round, side)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.id, aiUserId, response.content, round, side || "against"]
    );
  }

  return NextResponse.json({ content: response.content });
}

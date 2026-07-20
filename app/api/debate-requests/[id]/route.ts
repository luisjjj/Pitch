import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

// PATCH: Accept or decline a request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await request.json(); // "accept" or "decline"

  if (!["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Get the request
  const reqResult = await pool.query(
    `SELECT * FROM debate_requests WHERE id = $1`,
    [params.id]
  );

  if (reqResult.rows.length === 0) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const req = reqResult.rows[0];

  // Only the recipient can accept/decline
  if (req.to_user_id !== session.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (req.status !== "pending") {
    return NextResponse.json({ error: "Request already handled" }, { status: 409 });
  }

  const newStatus = action === "accept" ? "accepted" : "declined";

  await pool.query(
    `UPDATE debate_requests SET status = $1, responded_at = NOW() WHERE id = $2`,
    [newStatus, params.id]
  );

  // Notify the sender
  const toUser = await pool.query(`SELECT name FROM "user" WHERE id = $1`, [session.user.id]);
  const toName = toUser.rows[0]?.name || "Someone";

  await pool.query(
    `INSERT INTO user_notifications (user_id, type, title, body, data)
     VALUES ($1, 'debate_request_$2', $3, $4, $5)`,
    [
      req.from_user_id,
      newStatus,
      action === "accept" ? "Challenge accepted!" : "Challenge declined",
      `${toName} ${action === "accept" ? "accepted" : "declined"} your debate: "${req.topic}"`,
      JSON.stringify({ requestId: params.id, topic: req.topic }),
    ]
  );

  let debateId = null;

  // If accepted, create the debate
  if (action === "accept") {
    const debateResult = await pool.query(
      `INSERT INTO debates (topic, category, format, status, created_by, opponent_id, opponent_type)
       VALUES ($1, $2, $3, 'active', $4, $5, 'human')
       RETURNING id`,
      [req.topic, req.category, req.format, req.from_user_id, req.to_user_id]
    );
    debateId = debateResult.rows[0].id;

    // Update the opponent_id on the creator's side
    await pool.query(
      `UPDATE debates SET opponent_id = $1 WHERE id = $2`,
      [req.to_user_id, debateId]
    );

    // Create initial argument placeholder for both
    await pool.query(
      `INSERT INTO debate_arguments (debate_id, user_id, content, round, side)
       VALUES ($1, $2, '', 1, 'for'), ($1, $3, '', 1, 'against')`,
      [debateId, req.from_user_id, req.to_user_id]
    );
  }

  return NextResponse.json({ success: true, debateId });
}

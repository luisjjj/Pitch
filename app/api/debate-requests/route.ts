import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

// GET: Fetch my requests (incoming + outgoing)
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all"; // incoming, outgoing, all

  let query = "";
  const params: any[] = [session.user.id];

  if (type === "incoming") {
    query = `
      SELECT dr.*,
        u.name as from_user_name, u.email as from_user_email
      FROM debate_requests dr
      JOIN "user" u ON u.id = dr.from_user_id
      WHERE dr.to_user_id = $1 AND dr.status = 'pending' AND dr.expires_at > NOW()
      ORDER BY dr.created_at DESC
    `;
  } else if (type === "outgoing") {
    query = `
      SELECT dr.*,
        u.name as to_user_name, u.email as to_user_email
      FROM debate_requests dr
      JOIN "user" u ON u.id = dr.to_user_id
      WHERE dr.from_user_id = $1 AND dr.status = 'pending' AND dr.expires_at > NOW()
      ORDER BY dr.created_at DESC
    `;
  } else {
    query = `
      SELECT dr.*,
        fu.name as from_user_name, fu.email as from_user_email,
        tu.name as to_user_name, tu.email as to_user_email
      FROM debate_requests dr
      JOIN "user" fu ON fu.id = dr.from_user_id
      JOIN "user" tu ON tu.id = dr.to_user_id
      WHERE (dr.from_user_id = $1 OR dr.to_user_id = $1)
        AND dr.expires_at > NOW()
      ORDER BY dr.created_at DESC
    `;
  }

  const result = await pool.query(query, params);
  return NextResponse.json({ requests: result.rows });
}

// POST: Send a debate request
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { toUserId, topic, category, format, message } = await request.json();

  if (!toUserId || !topic) {
    return NextResponse.json({ error: "toUserId and topic are required" }, { status: 400 });
  }

  if (toUserId === session.user.id) {
    return NextResponse.json({ error: "Can't challenge yourself" }, { status: 400 });
  }

  // Check for existing pending request
  const existing = await pool.query(
    `SELECT id FROM debate_requests
     WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending' AND expires_at > NOW()`,
    [session.user.id, toUserId]
  );

  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Already sent a request to this user" }, { status: 409 });
  }

  const result = await pool.query(
    `INSERT INTO debate_requests (from_user_id, to_user_id, topic, category, format, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [session.user.id, toUserId, topic, category || "General", format || "Text", message || null]
  );

  // Create in-app notification
  const fromUser = await pool.query(`SELECT name FROM "user" WHERE id = $1`, [session.user.id]);
  const fromName = fromUser.rows[0]?.name || "Someone";

  await pool.query(
    `INSERT INTO user_notifications (user_id, type, title, body, data)
     VALUES ($1, 'debate_request', $2, $3, $4)`,
    [
      toUserId,
      "New debate challenge!",
      `${fromName} wants to debate: "${topic}"`,
      JSON.stringify({ requestId: result.rows[0].id, fromUserId: session.user.id, topic }),
    ]
  );

  return NextResponse.json({ request: result.rows[0] });
}

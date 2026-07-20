import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

// GET: Fetch notifications
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const result = await pool.query(
    `SELECT * FROM user_notifications
     WHERE user_id = $1 ${unreadOnly ? "AND read = FALSE" : ""}
     ORDER BY created_at DESC
     LIMIT 30`,
    [session.user.id]
  );

  const unreadCount = await pool.query(
    `SELECT COUNT(*) FROM user_notifications WHERE user_id = $1 AND read = FALSE`,
    [session.user.id]
  );

  return NextResponse.json({
    notifications: result.rows,
    unreadCount: parseInt(unreadCount.rows[0].count),
  });
}

// POST: Mark notifications as read
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await request.json(); // array of notification IDs, or null for all

  if (ids && Array.isArray(ids)) {
    await pool.query(
      `UPDATE user_notifications SET read = TRUE WHERE id = ANY($1) AND user_id = $2`,
      [ids, session.user.id]
    );
  } else {
    await pool.query(
      `UPDATE user_notifications SET read = TRUE WHERE user_id = $1`,
      [session.user.id]
    );
  }

  return NextResponse.json({ success: true });
}

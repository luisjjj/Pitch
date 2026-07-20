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

  const result = await pool.query(
    `SELECT d.*, u.name as opponent_name
     FROM debates d
     LEFT JOIN "user" u ON u.id = d.opponent_id
     WHERE d.id = $1 AND (d.created_by = $2 OR d.opponent_id = $2)`,
    [params.id, session.user.id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}

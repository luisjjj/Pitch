import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

// Update user location
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { latitude, longitude, locationName } = await request.json();

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "Latitude and longitude required" }, { status: 400 });
  }

  await pool.query(
    `UPDATE "user" SET latitude = $1, longitude = $2, location_name = $3, location_updated_at = NOW() WHERE id = $4`,
    [latitude, longitude, locationName || null, session.user.id]
  );

  return NextResponse.json({ success: true });
}

// Search nearby users
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const radius = parseInt(searchParams.get("radius") || "50"); // km
  const q = searchParams.get("q") || "";

  // Get current user location
  const me = await pool.query(
    `SELECT latitude, longitude FROM "user" WHERE id = $1`,
    [session.user.id]
  );

  const myLoc = me.rows[0];

  let query: string;
  let params: any[];

  if (myLoc?.latitude && myLoc?.longitude) {
    // Distance-based search using Haversine
    query = `
      SELECT id, name, email,
        latitude, longitude, location_name,
        ROUND(
          (6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          ))::numeric, 1
        ) as distance_km
      FROM "user"
      WHERE id != $3
        AND latitude IS NOT NULL AND longitude IS NOT NULL
        ${q ? `AND (name ILIKE $4 OR email ILIKE $4)` : ""}
      HAVING
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )) < $${q ? 5 : 4}
      ORDER BY distance_km ASC
      LIMIT 20
    `;
    params = q
      ? [myLoc.latitude, myLoc.longitude, session.user.id, `%${q}%`, radius]
      : [myLoc.latitude, myLoc.longitude, session.user.id, radius];
  } else {
    // No location set, just search by name
    query = `
      SELECT id, name, email, latitude, longitude, location_name,
        NULL::numeric as distance_km
      FROM "user"
      WHERE id != $1
        ${q ? `AND (name ILIKE $2 OR email ILIKE $2)` : ""}
      ORDER BY name ASC
      LIMIT 20
    `;
    params = q ? [session.user.id, `%${q}%`] : [session.user.id];
  }

  const result = await pool.query(query, params);

  // Check for existing requests between users
  const userIds = result.rows.map((r: any) => r.id);
  let existingRequests: any[] = [];
  if (userIds.length > 0) {
    const reqResult = await pool.query(
      `SELECT from_user_id, to_user_id, status FROM debate_requests
       WHERE (from_user_id = $1 AND to_user_id = ANY($2))
          OR (to_user_id = $1 AND from_user_id = ANY($2))`,
      [session.user.id, userIds]
    );
    existingRequests = reqResult.rows;
  }

  const users = result.rows.map((u: any) => {
    const req = existingRequests.find(
      (r) =>
        (r.from_user_id === session.user.id && r.to_user_id === u.id) ||
        (r.to_user_id === session.user.id && r.from_user_id === u.id)
    );
    return {
      ...u,
      requestStatus: req?.status || null,
      requestSentByMe: req?.from_user_id === session.user.id,
    };
  });

  return NextResponse.json({ users });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

// POST: Join the matchmaker queue
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { category } = await request.json();

  // Clean up expired entries for this user
  await pool.query(
    `DELETE FROM matchmaker WHERE user_id = $1 AND status = 'waiting'`,
    [session.user.id]
  );

  // Check if there's someone waiting in the same category (or general)
  const match = await pool.query(
    `SELECT * FROM matchmaker
     WHERE status = 'waiting'
       AND user_id != $1
       AND (category = $2 OR category = 'General' OR $2 = 'General')
     ORDER BY created_at ASC
     LIMIT 1`,
    [session.user.id, category || "General"]
  );

  if (match.rows.length > 0) {
    // Found a match! Create debate
    const opponent = match.rows[0];

    // Remove both from queue
    await pool.query(
      `DELETE FROM matchmaker WHERE id IN ($1, $2)`,
      [opponent.id, opponent.id] // will be replaced below
    );
    await pool.query(
      `UPDATE matchmaker SET status = 'matched' WHERE user_id = $1 AND status = 'waiting'`,
      [opponent.user_id]
    );
    await pool.query(
      `UPDATE matchmaker SET status = 'matched' WHERE user_id = $1 AND status = 'waiting'`,
      [session.user.id]
    );

    // Create debate — challenger goes first (FOR), opponent goes AGAINST
    const topic = getRandomTopic(category || opponent.category || "General");
    const debateResult = await pool.query(
      `INSERT INTO debates (topic, category, format, status, created_by, opponent_id, opponent_type)
       VALUES ($1, $2, 'text', 'active', $3, $4, 'human')
       RETURNING id`,
      [topic, category || "General", opponent.user_id, session.user.id]
    );

    const debateId = debateResult.rows[0].id;

    // Notify the opponent
    await pool.query(
      `INSERT INTO user_notifications (user_id, type, title, body, data)
       VALUES ($1, 'match_found', 'Match found!', $2, $3)`,
      [
        opponent.user_id,
        `You've been matched! Debate starting: "${topic}"`,
        JSON.stringify({ debateId, topic }),
      ]
    );

    // Notify the requester
    await pool.query(
      `INSERT INTO user_notifications (user_id, type, title, body, data)
       VALUES ($1, 'match_found', 'Match found!', $2, $3)`,
      [
        session.user.id,
        `You've been matched! Debate starting: "${topic}"`,
        JSON.stringify({ debateId, topic }),
      ]
    );

    return NextResponse.json({ matched: true, debateId, topic });
  }

  // No match found — add to queue
  await pool.query(
    `INSERT INTO matchmaker (user_id, category) VALUES ($1, $2)`,
    [session.user.id, category || "General"]
  );

  return NextResponse.json({ matched: false, queued: true });
}

// GET: Check if matched
export async function GET() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has a recent active debate
  const recent = await pool.query(
    `SELECT id, topic FROM debates
     WHERE (created_by = $1 OR opponent_id = $1)
       AND status = 'active'
       AND created_at > NOW() - INTERVAL '5 minutes'
     ORDER BY created_at DESC
     LIMIT 1`,
    [session.user.id]
  );

  if (recent.rows.length > 0) {
    return NextResponse.json({ matched: true, debateId: recent.rows[0].id, topic: recent.rows[0].topic });
  }

  // Clean up expired queue entries
  await pool.query(
    `DELETE FROM matchmaker WHERE user_id = $1 AND status = 'waiting' AND expires_at < NOW()`,
    [session.user.id]
  );

  return NextResponse.json({ matched: false, queued: false });
}

// DELETE: Leave queue
export async function DELETE() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await pool.query(
    `DELETE FROM matchmaker WHERE user_id = $1 AND status = 'waiting'`,
    [session.user.id]
  );

  return NextResponse.json({ success: true });
}

function getRandomTopic(category: string): string {
  const topics: Record<string, string[]> = {
    General: [
      "Social media does more harm than good",
      "Remote work is better than office work",
      "AI will replace most jobs within 20 years",
      "University education is not worth the cost",
      "Cash will become obsolete within 10 years",
    ],
    Technology: [
      "AI regulation will stifle innovation",
      "Open source software is superior to proprietary",
      "Cryptocurrency will replace traditional banking",
      "Tech companies have too much power",
      "Privacy is more important than security",
    ],
    Politics: [
      "Democracy is the best form of government",
      "Universal basic income should be implemented",
      "Climate change requires authoritarian measures",
      "Immigration benefits the economy",
      "The voting age should be lowered to 16",
    ],
    Philosophy: [
      "Free will is an illusion",
      "The death penalty is never justified",
      "Animals have the same moral rights as humans",
      "Happiness is the ultimate goal of life",
      "Truth is always subjective",
    ],
  };

  const pool = topics[category] || topics["General"];
  return pool[Math.floor(Math.random() * pool.length)];
}

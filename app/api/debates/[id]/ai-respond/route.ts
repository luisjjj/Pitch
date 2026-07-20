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
  let response;
  try {
    response = await generatePersonaResponse(
      personaId,
      topic,
      userArgument,
      round,
      side || "against"
    );
  } catch (err) {
    console.error("AI generation failed, using fallback:", err);
    response = { content: getFallback(personaId, round) };
  }

  if (!response.content || !response.content.trim()) {
    response.content = getFallback(personaId, round);
  }

  // Save AI argument to database
  const aiUserId = `ai-${personaId}`;

  try {
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
  } catch (err) {
    console.error("Failed to save AI argument:", err);
    // Still return the response even if DB save fails
  }

  return NextResponse.json({ content: response.content });
}

function getFallback(personaId: string, round: number): string {
  const fallbacks: Record<string, string[]> = {
    "the-rookie": [
      "That's an interesting point, but I think there's more to consider here. My gut tells me the other side has some valid concerns too.",
      "Hmm, you make a good case. But I've been thinking about this and I feel like there are practical implications you're missing.",
      "I'll admit, that's a strong argument. But I still believe my position holds up when you look at the bigger picture.",
    ],
    "the-contrarian": [
      "Hard disagree. That argument sounds good on paper but falls apart when you actually think about it.",
      "That's exactly what everyone says, and it's exactly why everyone is wrong.",
      "Sure, if you ignore half the evidence. But when you look at the full picture, your argument crumbles.",
    ],
    "the-academic": [
      "While that perspective has some merit, the empirical evidence actually suggests a more nuanced conclusion.",
      "I appreciate the logical framework, but your premises need examination.",
      "Your argument relies on an appeal to common intuition, but rigorous analysis reveals significant flaws.",
    ],
    "the-devils-advocate": [
      "I'm going to challenge that directly. Your argument assumes something that isn't proven.",
      "You're making this too easy. The moment you examine your core assumption, your position collapses.",
      "Your argument has a fundamental flaw you haven't addressed.",
    ],
    "the-storyteller": [
      "That reminds me of a story. There was once a person who believed exactly what you're saying — until reality proved them wrong.",
      "Your argument is logical, but let me paint you a picture. Imagine your position taken to its extreme.",
      "Numbers and facts are important, but stories are what change minds.",
    ],
    "the-philosopher": [
      "Before we continue, I need to ask: what do you mean by that?",
      "You've built a compelling case, but you've overlooked something fundamental.",
      "The strength of your argument depends entirely on an assumption you haven't questioned.",
    ],
    "the-prosecutor": [
      "Let me cross-examine that claim. You said one thing but your evidence says another.",
      "I'm going to press you on that point. You made an assertion without evidence.",
      "Your argument has a critical weakness — you've conflated correlation with causation.",
    ],
    "the-diplomat": [
      "I see the merit in your position. But there's a more balanced perspective we're both missing.",
      "You've raised valid concerns. Let me suggest a framing that addresses both sides.",
      "The truth usually lies in the middle. Your argument captures part of the picture, but misses the other half.",
    ],
  };
  const pool = fallbacks[personaId] || fallbacks["the-rookie"];
  const idx = (round - 1) % pool.length;
  return pool[idx];
}

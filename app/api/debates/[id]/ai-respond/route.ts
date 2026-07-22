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
    response = { content: getFallback(personaId, topic, round) };
  }

  if (!response.content || !response.content.trim()) {
    response.content = getFallback(personaId, topic, round);
  }

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
  }

  return NextResponse.json({ content: response.content });
}

function getFallback(personaId: string, topic: string, round: number): string {
  const t = topic.toLowerCase();
  const fallbacks: Record<string, string[]> = {
    "the-rookie": [
      `You're oversimplifying ${t}. The real world doesn't work like that — there are consequences you're not considering. When you actually look at what happens after ${t} takes effect, the picture gets a lot less clean. I think the practical costs outweigh your theoretical benefits.`,
      `That sounds good in theory, but what about when ${t} meets reality? People don't behave the way your model predicts. When we look at actual outcomes of ${t}, the results are messy and unpredictable. That's exactly why your side of this argument doesn't hold up.`,
      `I hear your point, but you're ignoring the human cost of ${t}. Real people are affected by this, and your framework doesn't account for that. When you zoom out and look at the full impact of ${t}, the answer becomes much less clear.`,
    ],
    "the-contrarian": [
      `Hard disagree on ${t}. That argument sounds good but falls apart when you examine the evidence. Everyone repeats the same talking points about ${t}, and everyone is wrong. The actual data tells a very different story.`,
      `That's exactly what everyone says about ${t}, and it's exactly why everyone is wrong. Your position on ${t} relies on assumptions that crumble under scrutiny. When you strip away the rhetoric, what's left is wishful thinking.`,
      `Wrong about ${t}. You've presented correlation as causation, which is a fatal error. The moment you separate the variables that actually matter in ${t}, your argument evaporates.`,
    ],
    "the-academic": [
      `Your argument about ${t} rests on a logical error. You've assumed correlation implies causation, which the literature on ${t} has debunked. When you apply proper methodology, the effect you're describing reverses. The peer-reviewed research on ${t} is unambiguous on this.`,
      `The evidence base for your claim about ${t} is considerably weaker than presented. When we control for confounding variables, your conclusion doesn't follow. The empirical data on ${t} actually suggests the opposite of what you're arguing.`,
      `You've made an ecological inference error in the context of ${t}. Individual-level data contradicts your aggregate conclusion. When we examine actual outcomes of ${t} with proper controls, your framework doesn't hold.`,
    ],
    "the-devils-advocate": [
      `What if the opposite is true about ${t}? You've built your argument on an assumption you haven't tested. Let me challenge that assumption and show you what happens when we actually examine ${t} without bias.`,
      `Your argument about ${t} depends on a definition you haven't examined. Once we question that definition, everything unravels. You've rigged the game by controlling how you define the terms of ${t}.`,
      `Your position on ${t} requires a chain of assumptions. If any link breaks — and several do — the whole thing collapses. Let me show you exactly where your reasoning about ${t} fails.`,
    ],
    "the-storyteller": [
      `Your argument about ${t} is logical. But let me paint a picture. Imagine a world where your position on ${t} is taken to its extreme. Now imagine the people living in that world — the ones who don't fit your neat categories. Their existence is the counter-argument.`,
      `I once knew someone who believed what you're saying about ${t}. They were so convinced. Then reality proved them wrong — not through logic, but through lived experience. That's the thing about ${t} — theory meets reality and reality wins.`,
      `You're making a logical case about ${t}, but stories reveal what data can't. When you look at the individual lives affected by ${t}, your neat framework falls apart. Real people's experiences don't match your model.`,
    ],
    "the-philosopher": [
      `What do you actually mean by your claim about ${t}? Your argument hinges on a definition you haven't examined. If we can't agree on what ${t} means, how can we agree on what's true? The unexamined argument is not worth making.`,
      `Your conclusion about ${t} is actually a premise in disguise. You've assumed the very thing you're trying to prove. That's circular reasoning, no matter how elegantly you present it about ${t}.`,
      `If your argument about ${t} is correct, what follows? Have you considered the implications? When I trace your logic to its conclusion, I arrive somewhere uncomfortable. The implications of your position on ${t} are more radical than you acknowledge.`,
    ],
    "the-prosecutor": [
      `Let me cross-examine your claim about ${t}. You said one thing but your evidence says another. Which is it? You can't have it both ways, and the contradiction is fatal to your argument.`,
      `Your argument about ${t} has three pillars, and I'm going to knock each one down. Your premise is incomplete, your logic has gaps, and your conclusion doesn't follow. The evidence simply doesn't support your position on ${t}.`,
      `I'm going to press you on ${t}. You made an assertion without evidence. You've presented opinion as fact, and the burden of proof is on you. You haven't met it.`,
    ],
    "the-diplomat": [
      `I see merit in your position on ${t}, but there's a more balanced view. Your argument captures part of the truth about ${t}, but it's not the whole truth. When you include both sides, a more nuanced picture emerges.`,
      `You've raised valid concerns about ${t}. Let me suggest a framing that addresses both sides. The problem with your position isn't that it's wrong — it's that it's incomplete. The full picture of ${t} is more complex.`,
      `Both sides have a point about ${t}. The truth usually lies in the middle. Your argument captures something real, but it misses important perspectives. Let me offer a view that includes both.`,
    ],
  };

  const pool = fallbacks[personaId] || fallbacks["the-rookie"];
  const idx = (round - 1) % pool.length;
  return pool[idx];
}

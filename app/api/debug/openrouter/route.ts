import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const logs: string[] = [];

  logs.push(`Key exists: ${!!apiKey}`);
  logs.push(`Key length: ${apiKey?.length || 0}`);
  logs.push(`Key prefix: ${apiKey?.slice(0, 12)}...`);

  if (!apiKey) {
    return NextResponse.json({ error: "No OPENROUTER_API_KEY", logs });
  }

  try {
    logs.push("Calling OpenRouter...");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b:free",
        messages: [{ role: "user", content: "Say hi" }],
        max_tokens: 20,
      }),
    });

    logs.push(`Status: ${res.status}`);
    const text = await res.text();
    logs.push(`Body: ${text.slice(0, 500)}`);

    return NextResponse.json({ status: res.status, logs });
  } catch (err: any) {
    logs.push(`Error: ${err.message}`);
    logs.push(`Cause: ${err.cause?.message || "none"}`);
    return NextResponse.json({ error: err.message, logs });
  }
}

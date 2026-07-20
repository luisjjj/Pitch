"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Send, LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/web/AppShell";
import { AudioRecorder } from "@/components/web/AudioRecorder";
import { getPersonaById } from "@/lib/personas";

interface Debate {
  id: string;
  topic: string;
  category: string;
  format: string;
  status: string;
  created_by: string;
  opponent_id: string | null;
  opponent_name: string | null;
  persona_id: string | null;
  opponent_type: string;
}

interface DebateArgument {
  id: string;
  debate_id: string;
  user_id: string;
  content: string;
  audio_url: string | null;
  round: number;
  side: string;
}

const ROUND_TIME = 180; // 3 minutes in seconds

export default function DebateRoom() {
  const [text, setText] = useState("");
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [arguments_, setArguments] = useState<DebateArgument[]>([]);
  const r = useRouter();
  const params = useParams();
  const debateId = params.id as string;
  const transcriberRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const persona = debate?.persona_id ? getPersonaById(debate.persona_id) : null;

  // Load debate + existing arguments
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/debates/${debateId}`);
        if (res.ok) {
          const data = await res.json();
          setDebate(data.debate || data);
        }
      } catch {
        // debate not found
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [debateId]);

  // Load existing arguments for this debate
  useEffect(() => {
    if (!debate) return;
    async function loadArgs() {
      try {
        const res = await fetch(`/api/debates/${debateId}/arguments?all=true`);
        if (res.ok) {
          const data = await res.json();
          const args = data.arguments || data || [];
          setArguments(args);

          // Restore state from DB
          const myArgs = args.filter((a: DebateArgument) => a.user_id === debate!.created_by);
          const aiArgs = args.filter((a: DebateArgument) => a.user_id.startsWith("ai-"));

          const maxRound = Math.max(...args.map((a: DebateArgument) => a.round), 0);
          setRound(maxRound || 1);

          // If we have our args for current round, mark as submitted
          const currentMyArg = myArgs.find((a: DebateArgument) => a.round === maxRound);
          const currentAiArg = aiArgs.find((a: DebateArgument) => a.round === maxRound);

          if (currentMyArg && currentMyArg.content && currentMyArg.content.trim() !== "") {
            setText(currentMyArg.content);
          }
          if (currentAiArg && currentAiArg.content) {
            setAiResponse(currentAiArg.content);
          }
        }
      } catch {
        // ignore
      }
    }
    loadArgs();
  }, [debate, debateId]);

  // Countdown timer
  useEffect(() => {
    if (loading || completed) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, completed, round]);

  // Reset timer on round change
  useEffect(() => {
    setTimeLeft(ROUND_TIME);
  }, [round]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleAudioComplete = useCallback((blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);
  }, []);

  const transcribeAudio = useCallback(async (blob: Blob): Promise<string> => {
    setTranscribing(true);
    setTranscribeProgress("Loading transcription model...");
    try {
      const { BrowserWhisper } = await import("browser-whisper");
      if (!transcriberRef.current) {
        setTranscribeProgress("Downloading whisper model (first time only)...");
        transcriberRef.current = new BrowserWhisper({ model: "whisper-base", language: "en" });
      }
      setTranscribeProgress("Transcribing audio...");
      const file = new File([blob], "argument.webm", { type: "audio/webm" });
      const segments = await transcriberRef.current.transcribe(file).collect();
      const fullText = segments.map((s: any) => s.text).join(" ").trim();
      setTranscribing(false);
      setTranscribeProgress("");
      return fullText;
    } catch (err) {
      console.error("Transcription failed:", err);
      setTranscribing(false);
      setTranscribeProgress("");
      return "";
    }
  }, []);

  const completeDebate = useCallback(async () => {
    try {
      const res = await fetch(`/api/debates/${debateId}/complete`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setResultData(data);
        setCompleted(true);
      }
    } catch (err) {
      console.error("Failed to complete debate:", err);
    }
  }, [debateId]);

  const generateAIResponse = useCallback(async (userArgument: string) => {
    if (!debate || !persona) return;
    setAiThinking(true);
    setAiResponse(null);
    try {
      const res = await fetch(`/api/debates/${debateId}/ai-respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id,
          topic: debate.topic,
          userArgument,
          round,
          side: "against",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.content);
      } else {
        // If API fails, use a fallback response
        setAiResponse(getLocalFallback(persona.name, round));
      }
    } catch (err) {
      console.error("AI response failed:", err);
      setAiResponse(getLocalFallback(persona.name, round));
    } finally {
      setAiThinking(false);
    }
  }, [debate, persona, debateId, round]);

  const handleSubmit = useCallback(async () => {
    if (!debate) return;
    setSubmitting(true);
    try {
      let content = text;
      let audioUrl = "";
      let transcription = "";

      if (debate.format === "Audio" && audioBlob) {
        transcription = await transcribeAudio(audioBlob);
        setTranscribeProgress("Uploading audio...");
        const formData = new FormData();
        formData.append("file", audioBlob, "argument.webm");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { url } = await uploadRes.json();
        audioUrl = url;
        content = transcription || text;
      }

      if (!content || !content.trim()) {
        alert("Please write your argument before submitting.");
        setSubmitting(false);
        return;
      }

      // Save user argument
      const res = await fetch(`/api/debates/${debateId}/arguments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          audioUrl: audioUrl || undefined,
          audioDuration: audioDuration || undefined,
          transcription: transcription || undefined,
          side: "for",
          round,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit argument");

      // If AI opponent, generate response
      if (debate.opponent_type === "ai" && persona) {
        await generateAIResponse(content);
      }
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
      setTranscribeProgress("");
    }
  }, [debate, text, audioBlob, audioDuration, debateId, round, persona, transcribeAudio, generateAIResponse]);

  const handleNextRound = useCallback(() => {
    setRound((r) => r + 1);
    setAiResponse(null);
    setText("");
    setAudioBlob(null);
    setTimeLeft(ROUND_TIME);
  }, []);

  const isAudio = debate?.format === "Audio";
  const canSubmit = isAudio ? !!audioBlob : !!text.trim();
  const userSubmitted = arguments_.some(
    (a) => a.user_id === debate?.created_by && a.round === round && a.content && a.content.trim() !== ""
  );
  const aiSubmitted = arguments_.some(
    (a) => a.user_id.startsWith("ai-") && a.round === round && a.content
  );
  const bothDone = userSubmitted && (aiSubmitted || debate?.opponent_type !== "ai");

  if (loading) {
    return (
      <AppShell>
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
          <LoaderCircle className="spin" size={24} />
          <p style={{ marginTop: 12 }}>Loading debate...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="topic-bar">
        <div>
          <div className="eyebrow">Round {round} of 3</div>
          <strong>{debate?.topic || `Debate #${debateId}`}</strong>
        </div>
        <div className="timer" style={{ color: timeLeft < 30 ? "var(--red-light)" : "var(--gold)" }}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="room-grid">
        {/* User card */}
        <article className={`card fighter ${!userSubmitted ? "active" : ""}`}>
          <div className="fighter-head">
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              <div className="avatar">Y</div>
              <div>
                <strong>You</strong>
                <div className="eyebrow">
                  {debate?.format === "Audio" ? "AUDIO" : "TEXT"} &middot; {userSubmitted ? "DONE" : "YOUR TURN"}
                </div>
              </div>
            </div>
            <span className="tag">{userSubmitted ? "DONE" : "ACTIVE"}</span>
          </div>
          <div className="argument">
            {userSubmitted
              ? (text || arguments_.find((a) => a.user_id === debate?.created_by && a.round === round)?.content || "Your argument has been submitted.")
              : "Make your opening case. The most convincing argument takes the round."}
          </div>
        </article>

        {/* Opponent card */}
        <article className={`card fighter ${aiThinking || (!userSubmitted && !aiResponse) ? "muted" : ""}`}>
          <div className="fighter-head">
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              {persona ? (
                <div
                  style={{
                    width: 43, height: 43, borderRadius: 14,
                    background: `${persona.color}22`, color: persona.color,
                    display: "grid", placeItems: "center",
                    fontWeight: 900, fontSize: 18,
                  }}
                >
                  {persona.avatar}
                </div>
              ) : (
                <div className="avatar" style={{ background: "linear-gradient(135deg,#4768aa,#132142)" }}>?</div>
              )}
              <div>
                <strong>{persona?.name || debate?.opponent_name || "Opponent"}</strong>
                <div className="eyebrow">
                  {persona ? (
                    <span style={{ color: persona.color }}>{persona.title}</span>
                  ) : (
                    <>AGAINST &middot; WAITING</>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="argument">
            {aiThinking ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <LoaderCircle className="spin" size={16} />
                <span>{persona?.name} is thinking...</span>
              </div>
            ) : aiResponse ? (
              aiResponse
            ) : (
              <span style={{ color: "var(--muted)" }}>
                {debate?.opponent_type === "ai"
                  ? `${persona?.name || "AI"} will respond after your argument.`
                  : "Waiting for opponent to join\u2026"}
              </span>
            )}
          </div>
        </article>
      </div>

      {/* Input area */}
      {!userSubmitted ? (
        <section className="card editor">
          <div className="eyebrow">
            Your {round === 1 ? "opening" : round === 2 ? "rebuttal" : "closing"} statement {isAudio ? "(audio)" : "(text)"}
          </div>

          {isAudio ? (
            <div style={{ padding: "12px 0" }}>
              <AudioRecorder onRecordingComplete={handleAudioComplete} maxDuration={180} disabled={submitting} />
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={700}
              placeholder="Build your argument. Be clear, be specific, make it count."
            />
          )}

          <div className="editor-foot">
            <span>
              {isAudio
                ? audioBlob
                  ? `${audioDuration}s recorded`
                  : "Record your argument"
                : `${text.length}/700 characters`}
            </span>
            <button className="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? (
                <>
                  <LoaderCircle className="spin" size={16} />
                  {transcribing ? transcribeProgress : "Submitting..."}
                </>
              ) : (
                <>
                  Submit round <Send size={16} />
                </>
              )}
            </button>
          </div>

          {transcribing && transcribeProgress && (
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>{transcribeProgress}</p>
          )}
        </section>
      ) : (
        <section className="card" style={{ textAlign: "center", padding: 32 }}>
          <div className="eyebrow">Round {round} submitted</div>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            {debate?.opponent_type === "ai" && aiResponse
              ? `${persona?.name} has responded. Ready for the next round.`
              : debate?.opponent_type === "ai"
                ? "Waiting for AI response..."
                : "Waiting for opponent..."}
          </p>
          {completed && resultData ? (
            <div style={{ marginTop: 24, padding: "20px 24px", background: "#0c0d10", borderRadius: 16, textAlign: "center" }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                {resultData.won ? "VICTORY" : "DEFEAT"}
              </div>
              <div style={{ font: "700 32px var(--font-display)", color: resultData.won ? "var(--gold)" : "var(--muted)", marginBottom: 8 }}>
                +{resultData.xp} XP
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                Rank: <strong style={{ color: "var(--gold)" }}>{resultData.rank}</strong>
              </div>
              {resultData.newAchievements?.length > 0 && (
                <div style={{ marginTop: 12, padding: "10px 16px", background: "rgba(255,215,0,0.07)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.2)" }}>
                  <span style={{ fontSize: 13, color: "var(--gold)" }}>
                    New achievements: {resultData.newAchievements.join(", ")}
                  </span>
                </div>
              )}
              <button
                className="button"
                style={{ marginTop: 16 }}
                onClick={() => r.push(`/debate/${debateId}/results`)}
              >
                See full results
              </button>
            </div>
          ) : aiResponse ? (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
              {round < 3 ? (
                <button className="button" onClick={handleNextRound}>
                  Next round &rarr;
                </button>
              ) : (
                <button className="button" onClick={completeDebate} disabled={completed}>
                  {completed ? "Completed!" : "End debate & see results"}
                </button>
              )}
            </div>
          ) : null}
        </section>
      )}
    </AppShell>
  );
}

function getLocalFallback(personaName: string, round: number): string {
  const fallbacks: Record<string, string[]> = {
    "Alex": [
      "That's an interesting point, but I think there's more to consider here. My gut tells me the other side has some valid concerns too.",
      "Hmm, you make a good case. But I've been thinking about this and I feel like there are practical implications you're missing.",
      "I'll admit, that's a strong argument. But I still believe my position holds up when you look at the bigger picture.",
    ],
    "Dr. Vex": [
      "Hard disagree. That argument sounds good on paper but falls apart when you actually think about it.",
      "That's exactly what everyone says, and it's exactly why everyone is wrong. Let me explain.",
      "Sure, if you ignore half the evidence. But when you look at the full picture, your argument crumbles.",
    ],
    "Prof. Hartley": [
      "While that perspective has some merit, the empirical evidence actually suggests a more nuanced conclusion.",
      "I appreciate the logical framework, but your premises need examination. The data doesn't support the causal link you're implying.",
      "Your argument relies on an appeal to common intuition, but rigorous analysis reveals significant flaws.",
    ],
    "Morgan": [
      "I'm going to challenge that directly. Your argument assumes something that isn't proven.",
      "You're making this too easy. The moment you examine your core assumption, your entire position collapses.",
      "Let me play devil's advocate — your argument has a fundamental flaw you haven't addressed.",
    ],
    "Luna": [
      "That reminds me of a story. There was once a person who believed exactly what you're saying — until reality proved them wrong.",
      "Your argument is logical, but let me paint you a picture. Imagine your position taken to its extreme.",
      "Numbers and facts are important, but stories are what change minds.",
    ],
    "Socrates": [
      "Before we continue, I need to ask: what do you mean by that? Your argument hinges on a definition you haven't examined.",
      "You've built a compelling case, but you've overlooked something fundamental.",
      "The strength of your argument depends entirely on an assumption you haven't questioned.",
    ],
    "Ada": [
      "Let me cross-examine that claim. You said one thing but your evidence says another.",
      "I'm going to press you on that point. You made an assertion without evidence.",
      "Your argument has a critical weakness — you've conflated correlation with causation.",
    ],
    "Nova": [
      "I see the merit in your position, and I want to acknowledge that. But there's a more balanced perspective.",
      "You've raised valid concerns. Rather than dismiss them, let me suggest a framing that addresses both sides.",
      "The truth usually lies in the middle. Your argument captures part of the picture, but misses the other half.",
    ],
  };
  const pool = fallbacks[personaName] || fallbacks["Alex"];
  const idx = (round - 1) % pool.length;
  return pool[idx];
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Send, LoaderCircle, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/web/AppShell";
import { getPersonaById } from "@/lib/personas";

interface Debate {
  id: string;
  topic: string;
  category: string;
  format: string;
  status: string;
  created_by: string;
  opponent_id: string | null;
  persona_id: string | null;
  opponent_type: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai" | "system";
  name: string;
  avatar: string;
  color: string;
  content: string;
  round: number;
  timestamp: Date;
}

const ROUND_TIME = 180;

export default function DebateRoom() {
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [completed, setCompleted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [roundOver, setRoundOver] = useState(false);
  const r = useRouter();
  const params = useParams();
  const debateId = params.id as string;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const persona = debate?.persona_id ? getPersonaById(debate.persona_id) : null;

  // Load debate
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/debates/${debateId}`);
        if (res.ok) setDebate(await res.json());
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, [debateId]);

  // Load existing messages
  useEffect(() => {
    if (!debate) return;
    async function loadMessages() {
      try {
        const res = await fetch(`/api/debates/${debateId}/arguments?all=true`);
        if (res.ok) {
          const data = await res.json();
          const args = data.arguments || data || [];
          const chatMsgs: ChatMessage[] = [];

          for (const arg of args) {
            const isUser = arg.user_id === debate!.created_by;
            const isAi = arg.user_id.startsWith("ai-");
            if (!arg.content || !arg.content.trim()) continue;

            chatMsgs.push({
              id: arg.id,
              sender: isUser ? "user" : isAi ? "ai" : "system",
              name: isUser ? "You" : persona?.name || "Opponent",
              avatar: isUser ? "Y" : persona?.avatar || "?",
              color: isUser ? "var(--red-light)" : persona?.color || "#4768aa",
              content: arg.content,
              round: arg.round,
              timestamp: new Date(arg.created_at || Date.now()),
            });
          }

          setMessages(chatMsgs);

          const maxRound = Math.max(...args.map((a: any) => a.round), 1);
          setRound(maxRound);

          // Check if current round is complete (both sides submitted)
          const userInRound = args.find((a: any) => a.user_id === debate!.created_by && a.round === maxRound && a.content?.trim());
          const aiInRound = args.find((a: any) => a.user_id.startsWith("ai-") && a.round === maxRound);
          if (userInRound && aiInRound) {
            setRoundOver(true);
          } else if (userInRound && !aiInRound) {
            // User submitted but AI hasn't responded yet - trigger AI response
            setRoundOver(false);
            triggerAiResponse(userInRound.content, maxRound);
          }
        }
      } catch {}
    }
    loadMessages();
  }, [debate, debateId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Timer
  useEffect(() => {
    if (loading || completed || roundOver) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, completed, roundOver, round]);

  useEffect(() => {
    setTimeLeft(ROUND_TIME);
    setRoundOver(false);
  }, [round]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: "system",
        name: "System",
        avatar: "",
        color: "",
        content,
        round: 0,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const triggerAiResponse = useCallback(async (userArgument: string, currentRound: number) => {
    if (!debate || !persona) return;
    setSending(true);

    try {
      const res = await fetch(`/api/debates/${debateId}/ai-respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id,
          topic: debate.topic,
          userArgument,
          round: currentRound,
          side: "against",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            name: persona.name,
            avatar: persona.avatar,
            color: persona.color,
            content: data.content,
            round: currentRound,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("AI response failed:", err);
    } finally {
      setSending(false);
      setRoundOver(true);
    }
  }, [debate, persona, debateId]);

  const handleTimeUp = useCallback(() => {
    if (roundOver) return;
    addSystemMessage(`Time's up for round ${round}! Moving to next round.`);
    setRoundOver(true);
  }, [round, roundOver, addSystemMessage]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !debate || sending) return;

    const content = input.trim();
    setInput("");
    setSending(true);

    // Add user message to chat immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      name: "You",
      avatar: "Y",
      color: "var(--red-light)",
      content,
      round,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Save to DB
    try {
      await fetch(`/api/debates/${debateId}/arguments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          side: "for",
          round,
        }),
      });
    } catch (err) {
      console.error("Failed to save argument:", err);
    }

    // Generate AI response
    if (debate.opponent_type === "ai" && persona) {
      await triggerAiResponse(content, round);
    } else {
      setSending(false);
      setRoundOver(true);
    }

    if (timerRef.current) clearInterval(timerRef.current);
  }, [input, debate, sending, round, persona, debateId, triggerAiResponse]);

  const handleNextRound = useCallback(() => {
    if (round >= 3) {
      // End debate
      completeDebate();
      return;
    }
    setRound((r) => r + 1);
    setRoundOver(false);
    setTimeLeft(ROUND_TIME);
    addSystemMessage(`Round ${round + 1} begins. Make your case.`);
    inputRef.current?.focus();
  }, [round, addSystemMessage]);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

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
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", maxWidth: 800, margin: "0 auto" }}>
        {/* Chat header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
          borderBottom: "1px solid var(--line)", marginBottom: 0, flexShrink: 0,
        }}>
          <button
            onClick={() => r.push("/dashboard")}
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}
          >
            <ArrowLeft size={20} />
          </button>

          {persona && (
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${persona.color}22`, color: persona.color,
              display: "grid", placeItems: "center",
              fontWeight: 900, fontSize: 14, flexShrink: 0,
            }}>
              {persona.avatar}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {persona?.name || "Opponent"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
              {debate?.topic?.slice(0, 50)}{debate?.topic && debate.topic.length > 50 ? "..." : ""}
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 900, color: "var(--muted)",
              textTransform: "uppercase", letterSpacing: ".08em",
            }}>
              Round {round}/3
            </div>
            <div style={{
              font: "700 16px var(--font-mono)",
              color: timeLeft < 30 ? "var(--red-light)" : "var(--gold)",
            }}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 0",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} isOwn={msg.sender === "user"} />
          ))}

          {sending && persona && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", paddingLeft: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${persona.color}22`, color: persona.color,
                display: "grid", placeItems: "center",
                fontWeight: 900, fontSize: 11, flexShrink: 0,
              }}>
                {persona.avatar}
              </div>
              <div style={{
                padding: "10px 14px", borderRadius: 14, borderTopLeftRadius: 4,
                background: "#1a1c22", color: "var(--muted)", fontSize: 13,
              }}>
                <LoaderCircle className="spin" size={14} style={{ marginRight: 6 }} />
                typing...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          borderTop: "1px solid var(--line)", padding: "12px 0", flexShrink: 0,
        }}>
          {completed && resultData ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{
                font: "700 24px var(--font-display)",
                color: resultData.won ? "var(--gold)" : "var(--muted)",
                marginBottom: 8,
              }}>
                {resultData.won ? "VICTORY" : "DEFEAT"} — +{resultData.xp} XP
              </div>
              <button className="button" onClick={() => r.push(`/debate/${debateId}/results`)}>
                See full results
              </button>
            </div>
          ) : roundOver ? (
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {round < 3 ? (
                <button className="button" onClick={handleNextRound}>
                  Next round &rarr;
                </button>
              ) : (
                <button className="button" onClick={completeDebate}>
                  End debate
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={700}
                placeholder={`Round ${round}: ${round === 1 ? "Opening statement..." : round === 2 ? "Rebuttal..." : "Closing argument..."}`}
                rows={1}
                style={{
                  flex: 1, resize: "none", background: "#0c0d10", border: "1px solid var(--line)",
                  borderRadius: 14, padding: "10px 14px", color: "white", fontSize: 14,
                  outline: "none", fontFamily: "var(--font-body), Arial, sans-serif",
                  maxHeight: 120, minHeight: 42,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--red-light)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--line)";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: input.trim() ? "var(--red-light)" : "#1a1c22",
                  border: "none", color: input.trim() ? "white" : "var(--muted)",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  display: "grid", placeItems: "center", flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                <Send size={18} />
              </button>
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, textAlign: "center", fontWeight: 700 }}>
            {input.length}/700 &middot; Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ChatBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  if (msg.sender === "system") {
    return (
      <div style={{ textAlign: "center", padding: "4px 0" }}>
        <span style={{
          fontSize: 11, color: "var(--muted)", fontWeight: 700,
          background: "#1a1c22", padding: "4px 12px", borderRadius: 10,
        }}>
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "flex-end",
      flexDirection: isOwn ? "row-reverse" : "row",
      paddingLeft: isOwn ? 40 : 4,
      paddingRight: isOwn ? 4 : 40,
    }}>
      {!isOwn && (
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${msg.color}22`, color: msg.color,
          display: "grid", placeItems: "center",
          fontWeight: 900, fontSize: 11, flexShrink: 0,
        }}>
          {msg.avatar}
        </div>
      )}

      <div>
        {!isOwn && (
          <div style={{
            fontSize: 11, fontWeight: 800, color: msg.color,
            marginBottom: 2, paddingLeft: 2,
          }}>
            {msg.name}
          </div>
        )}
        <div style={{
          padding: "10px 14px", borderRadius: 14,
          borderTopLeftRadius: isOwn ? 14 : 4,
          borderTopRightRadius: isOwn ? 4 : 14,
          background: isOwn ? "var(--red-light)" : "#1a1c22",
          color: isOwn ? "white" : "#d7d9dd",
          fontSize: 14, lineHeight: 1.5,
          wordBreak: "break-word",
        }}>
          {msg.content}
        </div>
        <div style={{
          fontSize: 10, color: "var(--muted)", marginTop: 2,
          textAlign: isOwn ? "right" : "left", paddingLeft: 2, paddingRight: 2,
        }}>
          R{msg.round} &middot; {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

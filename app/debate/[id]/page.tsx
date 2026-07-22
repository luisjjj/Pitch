"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Send, Mic, MicOff, ChevronLeft } from "lucide-react";
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
  color: string;
  content: string;
  round: number;
  timestamp: Date;
}

const ROUND_TIME = 180;

const bubbleKeyframes = `
  @keyframes bubbleIn {
    from { opacity: 0; transform: scale(0.92) translateY(6px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes typingDot {
    0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
    30% { opacity: 1; transform: translateY(-3px); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const r = useRouter();
  const params = useParams();
  const debateId = params.id as string;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const persona = debate?.persona_id ? getPersonaById(debate.persona_id) : null;
  const isHumanOpponent = debate?.opponent_type === "human";
  const myUserId = debate?.created_by; // creator always goes first (FOR)
  const isMyTurn = !isHumanOpponent || debate?.created_by === myUserId; // simplified

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
              color: isUser ? "var(--red-light)" : persona?.color || "#4768aa",
              content: arg.content,
              round: arg.round,
              timestamp: new Date(arg.created_at || Date.now()),
            });
          }

          setMessages(chatMsgs);

          const maxRound = Math.max(...args.map((a: any) => a.round), 1);
          setRound(maxRound);

          const userInRound = args.find((a: any) => a.user_id === debate!.created_by && a.round === maxRound && a.content?.trim());
          const opponentInRound = args.find((a: any) => a.user_id !== debate!.created_by && a.round === maxRound && a.content?.trim());

          if (userInRound && opponentInRound) {
            setRoundOver(true);
          } else if (userInRound && !opponentInRound) {
            if (debate!.opponent_type === "ai" && persona) {
              setRoundOver(false);
              triggerAiResponse(userInRound.content, maxRound);
            } else if (debate!.opponent_type === "human") {
              // Waiting for human opponent
              setRoundOver(false);
              setSending(false);
            }
          } else if (!userInRound) {
            setRoundOver(false);
          }
        }
      } catch {}
    }
    loadMessages();
  }, [debate, debateId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for opponent's arguments in human debates
  useEffect(() => {
    if (!debate || debate.opponent_type !== "human" || completed || roundOver) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/debates/${debateId}/arguments?all=true`);
        if (!res.ok) return;
        const data = await res.json();
        const args = data.arguments || data || [];

        const userInRound = args.find((a: any) => a.user_id === debate!.created_by && a.round === round && a.content?.trim());
        const opponentInRound = args.find((a: any) => a.user_id !== debate!.created_by && a.round === round && a.content?.trim());

        if (userInRound && opponentInRound) {
          // Both submitted — show opponent's message
          setMessages((prev) => {
            const alreadyHas = prev.some(m => m.id === opponentInRound.id);
            if (alreadyHas) return prev;
            return [...prev, {
              id: opponentInRound.id,
              sender: "ai" as const,
              name: "Opponent",
              color: "#4768aa",
              content: opponentInRound.content,
              round: round,
              timestamp: new Date(opponentInRound.created_at || Date.now()),
            }];
          });
          setRoundOver(true);
          setSending(false);
        } else if (!userInRound && opponentInRound) {
          // Opponent submitted but we haven't — show their message, it's our turn
          setMessages((prev) => {
            const alreadyHas = prev.some(m => m.id === opponentInRound.id);
            if (alreadyHas) return prev;
            return [...prev, {
              id: opponentInRound.id,
              sender: "ai" as const,
              name: "Opponent",
              color: "#4768aa",
              content: opponentInRound.content,
              round: round,
              timestamp: new Date(opponentInRound.created_at || Date.now()),
            }];
          });
        }
      } catch {}
    }, 3000);

    return () => clearInterval(poll);
  }, [debate, debateId, completed, roundOver, round]);

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

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      name: "You",
      color: "var(--red-light)",
      content,
      round,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      let audioUrl: string | null = null;
      if (audioBlob) {
        audioUrl = await uploadAudio(audioBlob);
      }

      await fetch(`/api/debates/${debateId}/arguments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          side: "for",
          round,
          audioUrl: audioUrl || undefined,
        }),
      });

      // Clear audio state
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (err) {
      console.error("Failed to save argument:", err);
    }

    if (debate.opponent_type === "ai" && persona) {
      await triggerAiResponse(content, round);
    } else if (debate.opponent_type === "human") {
      // For human opponents, wait for them to respond via polling
      setSending(false);
      setRoundOver(false);
      addSystemMessage("Argument submitted. Waiting for opponent...");
    } else {
      setSending(false);
      setRoundOver(true);
    }

    if (timerRef.current) clearInterval(timerRef.current);
  }, [input, debate, sending, round, persona, debateId, triggerAiResponse, addSystemMessage]);

  const handleNextRound = useCallback(() => {
    if (round >= 3) {
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
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Complete debate failed:", err);
        // Even if API fails, navigate to results which can handle partial state
        r.push(`/debate/${debateId}/results`);
      }
    } catch (err) {
      console.error("Failed to complete debate:", err);
      // Navigate anyway — results page will show what exists
      r.push(`/debate/${debateId}/results`);
    }
  }, [debateId, r]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Voice recording with Web Speech API + MediaRecorder
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start MediaRecorder for audio blob
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();

      // Start Web Speech API for live transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        let finalTranscript = input;

        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setInput((finalTranscript + interim).trim());
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error !== "no-speech") {
            setIsRecording(false);
          }
        };

        recognition.onend = () => {
          // Restart if still recording
          if (mediaRecorderRef.current?.state === "recording") {
            try { recognition.start(); } catch {}
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
        setIsRecording(true);
      } else {
        // Fallback: just record audio without transcription
        setIsRecording(true);
      }
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, [isRecording, input]);

  const uploadAudio = useCallback(async (blob: Blob): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", blob, `debate-${debateId}-round${round}.webm`);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (err) {
      console.error("Audio upload failed:", err);
    }
    return null;
  }, [debateId, round]);

  if (loading) {
    return (
      <AppShell>
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
          <div className="spin" style={{ width: 24, height: 24, border: "2px solid var(--line)", borderTopColor: "var(--red-light)", borderRadius: "50%", margin: "0 auto 12px" }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Loading debate...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <style>{bubbleKeyframes}</style>
      <div style={{
        display: "flex", flexDirection: "column", height: "calc(100vh - 80px)",
        maxWidth: 720, margin: "0 auto", position: "relative",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
          borderBottom: "1px solid var(--line)", flexShrink: 0, zIndex: 2,
        }}>
          <button
            onClick={() => r.push("/dashboard")}
            style={{
              background: "none", border: "none", color: "var(--muted)",
              cursor: "pointer", padding: 4, display: "grid", placeItems: "center",
            }}
          >
            <ChevronLeft size={22} />
          </button>

          {persona && (
            <div style={{
              width: 38, height: 38, borderRadius: 50,
              background: `linear-gradient(135deg, ${persona.color}44, ${persona.color}22)`,
              color: persona.color,
              display: "grid", placeItems: "center",
              fontWeight: 900, fontSize: 15, flexShrink: 0,
            }}>
              {persona.avatar}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 800, fontSize: 15,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {persona?.name || "Opponent"}
            </div>
            <div style={{
              fontSize: 11, color: "var(--muted)", fontWeight: 700,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {debate?.topic}
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 900, color: "var(--muted)",
              textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 1,
            }}>
              R{round}/3
            </div>
            <div style={{
              font: "700 15px var(--font-mono)",
              color: timeLeft < 30 ? "var(--red-light)" : "var(--gold)",
            }}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "12px 8px",
          display: "flex", flexDirection: "column", gap: 2,
          scrollBehavior: "smooth",
        }}>
          {messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const isFirstInGroup = !prev || prev.sender !== msg.sender || msg.sender === "system";
            const isLastInGroup = idx === messages.length - 1 || messages[idx + 1]?.sender !== msg.sender;
            return (
              <Bubble
                key={msg.id}
                msg={msg}
                isOwn={msg.sender === "user"}
                isFirst={isFirstInGroup}
                isLast={isLastInGroup}
              />
            );
          })}

          {sending && persona && (
            <div style={{
              display: "flex", gap: 6, alignItems: "flex-end",
              paddingLeft: 8, paddingRight: 48,
              animation: "bubbleIn 0.2s ease-out",
            }}>
              <div style={{
                padding: "12px 16px", borderRadius: 20, borderTopLeftRadius: 4,
                background: "#1a1c22", display: "flex", gap: 4, alignItems: "center",
              }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: persona.color || "var(--muted)",
                    animation: `typingDot 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "8px 0 6px", flexShrink: 0,
          background: "linear-gradient(transparent, var(--ink) 30%)",
        }}>
          {completed && resultData ? (
            <div style={{
              textAlign: "center", padding: 20,
              animation: "fadeUp 0.3s ease-out",
            }}>
              <div style={{
                font: "800 22px var(--font-display)",
                color: resultData.won ? "var(--gold)" : "var(--muted)",
                marginBottom: 10,
              }}>
                {resultData.won ? "VICTORY" : "DEFEAT"} &mdash; +{resultData.xp} XP
              </div>
              <button className="button" onClick={() => r.push(`/debate/${debateId}/results`)}>
                See full results
              </button>
            </div>
          ) : roundOver ? (
            <div style={{
              display: "flex", gap: 10, justifyContent: "center",
              animation: "fadeUp 0.3s ease-out",
            }}>
              {round < 3 ? (
                <button className="button" onClick={handleNextRound}>
                  Next round &rarr;
                </button>
              ) : (
                <button className="button gold" onClick={completeDebate}>
                  End debate
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-end",
              background: "#13151a", border: "1px solid var(--line)",
              borderRadius: 24, padding: "4px 4px 4px 16px",
              transition: "border-color 0.15s, box-shadow 0.15s",
              ...(input ? { borderColor: "var(--red-light)", boxShadow: "0 0 0 1px var(--red-light)" } : {}),
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={700}
                rows={1}
                placeholder={`Round ${round}: ${round === 1 ? "Opening statement..." : round === 2 ? "Rebuttal..." : "Closing argument..."}`}
                style={{
                  flex: 1, resize: "none", background: "transparent",
                  border: "none", padding: "10px 0", color: "white",
                  fontSize: 15, outline: "none", lineHeight: 1.4,
                  fontFamily: "var(--font-body), Arial, sans-serif",
                  maxHeight: 100, minHeight: 24,
                }}
              />
              <button
                onClick={toggleRecording}
                title={isRecording ? "Stop recording" : "Record voice"}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: isRecording ? "var(--red-light)" : "transparent",
                  border: "none", color: isRecording ? "white" : "var(--muted)",
                  cursor: "pointer", display: "grid", placeItems: "center",
                  flexShrink: 0, transition: "all 0.2s ease",
                  animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none",
                }}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: input.trim() ? "var(--red-light)" : "transparent",
                  border: "none", color: input.trim() ? "white" : "var(--muted)",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  display: "grid", placeItems: "center", flexShrink: 0,
                  transition: "all 0.2s ease",
                  transform: input.trim() ? "scale(1)" : "scale(0.85)",
                  opacity: input.trim() ? 1 : 0.4,
                }}
              >
                <Send size={16} style={{ marginLeft: -1 }} />
              </button>
            </div>
          )}
          <div style={{
            fontSize: 10, color: "var(--muted)", marginTop: 5,
            textAlign: "center", fontWeight: 700, opacity: 0.6,
          }}>
            {isRecording ? (
              <span style={{ color: "var(--red-light)" }}>Recording... Click mic to stop</span>
            ) : input.length > 0 ? (
              `${input.length}/700`
            ) : (
              "Enter to send"
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Bubble({
  msg,
  isOwn,
  isFirst,
  isLast,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  if (msg.sender === "system") {
    return (
      <div style={{
        textAlign: "center", padding: "6px 0",
        animation: "fadeUp 0.25s ease-out",
      }}>
        <span style={{
          fontSize: 11, color: "var(--muted)", fontWeight: 700,
          background: "rgba(255,255,255,0.04)", padding: "4px 14px",
          borderRadius: 12, display: "inline-block",
        }}>
          {msg.content}
        </span>
      </div>
    );
  }

  const bg = isOwn ? "var(--red-light)" : "#1a1c22";
  const textColor = isOwn ? "white" : "#e2e4e8";

  // iMessage bubble tail: round the corner that faces away
  const radius = 20;
  const tailSmall = 6;
  const borderRadius = isOwn
    ? `${radius}px ${tailSmall}px ${radius}px ${radius}px`
    : `${tailSmall}px ${radius}px ${radius}px ${radius}px`;

  const groupRadius = isFirst && isLast
    ? `${radius}px`
    : isFirst
      ? isOwn
        ? `${radius}px ${tailSmall}px ${tailSmall}px ${radius}px`
        : `${tailSmall}px ${radius}px ${radius}px ${tailSmall}px`
      : isLast
        ? isOwn
          ? `${radius}px ${radius}px ${tailSmall}px ${radius}px`
          : `${radius}px ${radius}px ${radius}px ${tailSmall}px`
        : `${radius}px`;

  return (
    <div style={{
      display: "flex",
      flexDirection: isOwn ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: 6,
      paddingLeft: isOwn ? 48 : 4,
      paddingRight: isOwn ? 4 : 48,
      marginTop: isFirst ? 8 : 1,
      animation: "bubbleIn 0.25s ease-out",
    }}>
      <div style={{
        padding: "9px 14px",
        borderRadius: groupRadius,
        background: bg,
        color: textColor,
        fontSize: 14.5,
        lineHeight: 1.45,
        wordBreak: "break-word",
        position: "relative",
        maxWidth: "100%",
      }}>
        {msg.content}
      </div>
      {isLast && (
        <div style={{
          fontSize: 9,
          color: "var(--muted)",
          fontWeight: 700,
          opacity: 0.5,
          whiteSpace: "nowrap",
          alignSelf: "flex-end",
          paddingBottom: 2,
        }}>
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}

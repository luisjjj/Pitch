"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MapPin, Send, Check, X, Search, Clock } from "lucide-react";
import { AppShell } from "@/components/web/AppShell";

type Tab = "search" | "requests";

interface NearbyUser {
  id: string;
  name: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  distance_km: number | null;
  requestStatus: string | null;
  requestSentByMe: boolean;
}

interface DebateRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  topic: string;
  category: string;
  format: string;
  message: string | null;
  status: string;
  created_at: string;
  from_user_name?: string;
  to_user_name?: string;
}

const TOPIC_SUGGESTIONS = [
  "Is social media destroying real communication?",
  "Should voting be mandatory?",
  "Is remote work better than office work?",
  "Should AI be regulated more strictly?",
  "Is capitalism the best economic system?",
  "Should university education be free?",
];

export default function Friends() {
  const [tab, setTab] = useState<Tab>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [requests, setRequests] = useState<DebateRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [challengeModal, setChallengeModal] = useState<NearbyUser | null>(null);
  const [challengeTopic, setChallengeTopic] = useState("");
  const [challengeMessage, setChallengeMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [requestTab, setRequestTab] = useState<"incoming" | "outgoing">("incoming");
  const r = useRouter();

  // Get location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // Reverse geocode roughly
          setMyLocation({ lat, lng, name: "Your location" });
          // Save to server
          await fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: lat, longitude: lng, locationName: "My location" }),
          });
        },
        () => {
          // Location denied - that's fine, just search by name
        }
      );
    }
  }, []);

  // Search users
  const handleSearch = useCallback(async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (myLocation) params.set("radius", "100");
      const res = await fetch(`/api/location?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNearbyUsers(data.users);
      }
    } catch {} finally {
      setSearching(false);
    }
  }, [searchQuery, myLocation]);

  // Load users on mount + when tab changes to search
  useEffect(() => {
    if (tab === "search") handleSearch();
  }, [tab, handleSearch]);

  // Load requests
  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/debate-requests?type=all");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } catch {} finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "requests") loadRequests();
  }, [tab, loadRequests]);

  // Send challenge
  const sendChallenge = async () => {
    if (!challengeModal || !challengeTopic.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/debate-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: challengeModal.id,
          topic: challengeTopic.trim(),
          category: "General",
          format: "Text",
          message: challengeMessage.trim() || null,
        }),
      });
      if (res.ok) {
        setChallengeModal(null);
        setChallengeTopic("");
        setChallengeMessage("");
        handleSearch();
        // Request permission for web notifications
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      }
    } catch {} finally {
      setSending(false);
    }
  };

  // Respond to request
  const respondToRequest = async (requestId: string, action: "accept" | "decline") => {
    const res = await fetch(`/api/debate-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const data = await res.json();
      loadRequests();
      if (action === "accept" && data.debateId) {
        r.push(`/debate/${data.debateId}`);
      }
    }
  };

  const incomingRequests = requests.filter((r) => r.to_user_id && r.status === "pending");
  const outgoingRequests = requests.filter((r) => r.from_user_id && r.status === "pending");

  return (
    <AppShell>
      <div className="eyebrow">Connect & challenge</div>
      <h1 className="page-title">FRIENDS</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className={`option ${tab === "search" ? "selected" : ""}`}
          onClick={() => setTab("search")}
        >
          <Search size={14} style={{ marginRight: 6 }} />
          Find opponents
        </button>
        <button
          className={`option ${tab === "requests" ? "selected" : ""}`}
          onClick={() => setTab("requests")}
          style={{ position: "relative" }}
        >
          <Send size={14} style={{ marginRight: 6 }} />
          Requests
          {incomingRequests.length > 0 && (
            <span style={{
              marginLeft: 6, padding: "1px 6px", borderRadius: 8,
              background: "var(--red-light)", color: "white",
              fontSize: 10, fontWeight: 900,
            }}>
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* SEARCH TAB */}
      {tab === "search" && (
        <>
          {/* Location status */}
          <div style={{
            marginBottom: 16,
            display: "flex", alignItems: "center", gap: 6, fontSize: 12,
          }}>
            <MapPin size={13} style={{ color: myLocation ? "var(--green)" : "var(--muted)" }} />
            {myLocation ? (
              <span style={{ color: "var(--muted)", fontWeight: 700 }}>Location active — showing nearby users</span>
            ) : (
              <span style={{ color: "var(--muted)" }}>
                Enable location to find nearby debaters, or search by name
              </span>
            )}
          </div>

          {/* Search bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name or email..."
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 12,
                background: "#0c0d10", border: "1px solid var(--line)",
                color: "white", fontSize: 14, outline: "none",
                fontFamily: "var(--font-body), Arial, sans-serif",
              }}
            />
            <button className="button" onClick={handleSearch} style={{ padding: "10px 16px" }}>
              {searching ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}
            </button>
          </div>

          {/* User list */}
          {searching ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              <LoaderCircle className="spin" size={20} />
              <p style={{ marginTop: 8 }}>Searching...</p>
            </div>
          ) : nearbyUsers.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <p style={{ color: "var(--muted)" }}>
                {searchQuery ? "No users found matching your search." : "No other users yet. Be the first to invite someone!"}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {nearbyUsers.map((user) => (
                <div
                  key={user.id}
                  style={{
                    padding: "12px 0",
                    display: "flex", alignItems: "center", gap: 12,
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: "linear-gradient(135deg, var(--red) 0%, var(--red-light) 100%)",
                    display: "grid", placeItems: "center",
                    fontWeight: 900, fontSize: 16, flexShrink: 0,
                  }}>
                    {(user.name || user.email || "?")[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{user.name || user.email}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 8, alignItems: "center" }}>
                      {user.distance_km != null && (
                        <span>{user.distance_km < 1 ? "<1" : user.distance_km} km away</span>
                      )}
                      {user.location_name && <span>{user.location_name}</span>}
                    </div>
                  </div>

                  {user.requestStatus ? (
                    <span style={{
                      fontSize: 11, fontWeight: 900, padding: "4px 10px", borderRadius: 8,
                      background: user.requestStatus === "accepted" ? "rgba(111,209,140,0.15)" : "rgba(255,255,255,0.05)",
                      color: user.requestStatus === "accepted" ? "var(--green)" : "var(--muted)",
                    }}>
                      {user.requestStatus === "accepted" ? "Accepted" : user.requestStatus === "pending" ? "Pending" : "Declined"}
                    </span>
                  ) : (
                    <button
                      className="button"
                      style={{ padding: "6px 14px", fontSize: 12, fontWeight: 900 }}
                      onClick={() => setChallengeModal(user)}
                    >
                      Challenge
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* REQUESTS TAB */}
      {tab === "requests" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              className={`option ${requestTab === "incoming" ? "selected" : ""}`}
              onClick={() => setRequestTab("incoming")}
            >
              Incoming ({incomingRequests.length})
            </button>
            <button
              className={`option ${requestTab === "outgoing" ? "selected" : ""}`}
              onClick={() => setRequestTab("outgoing")}
            >
              Sent ({outgoingRequests.length})
            </button>
          </div>

          {loadingRequests ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              <LoaderCircle className="spin" size={20} />
            </div>
          ) : (
            <>
              {requestTab === "incoming" && (
                <>
                  {incomingRequests.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center" }}>
                      <p style={{ color: "var(--muted)" }}>No incoming challenges yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {incomingRequests.map((req) => (
                        <div key={req.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 14 }}>{req.from_user_name || "Someone"}</div>
                              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                                {new Date(req.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <span style={{
                              fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 6,
                              background: "rgba(255,200,87,0.12)", color: "var(--gold)",
                            }}>
                              {req.category}
                            </span>
                          </div>

                          <div style={{
                            padding: "10px 14px", borderRadius: 10,
                            background: "#0c0d10", marginBottom: 10,
                          }}>
                            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2 }}>&ldquo;{req.topic}&rdquo;</div>
                            {req.message && (
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>
                                {req.message}
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="button"
                              style={{ flex: 1, padding: "8px 12px", fontSize: 12 }}
                              onClick={() => respondToRequest(req.id, "accept")}
                            >
                              <Check size={14} style={{ marginRight: 4 }} /> Accept
                            </button>
                            <button
                              className="button secondary"
                              style={{ flex: 1, padding: "8px 12px", fontSize: 12 }}
                              onClick={() => respondToRequest(req.id, "decline")}
                            >
                              <X size={14} style={{ marginRight: 4 }} /> Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {requestTab === "outgoing" && (
                <>
                  {outgoingRequests.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center" }}>
                      <p style={{ color: "var(--muted)" }}>No outgoing challenges. Find opponents to challenge!</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {outgoingRequests.map((req) => (
                        <div key={req.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 13 }}>&ldquo;{req.topic}&rdquo;</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>to {req.to_user_name || "Someone"}</div>
                            </div>
                            <span style={{
                              display: "flex", alignItems: "center", gap: 4,
                              fontSize: 11, fontWeight: 900,
                              color: "var(--muted)",
                            }}>
                              <Clock size={12} /> Pending
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* CHALLENGE MODAL */}
      {challengeModal && (
        <div className="modal-overlay" onClick={() => setChallengeModal(null)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">Challenge</div>
                <h2 style={{ font: "700 20px var(--font-display)", margin: "4px 0 0" }}>
                  {challengeModal.name || challengeModal.email}
                </h2>
              </div>
              <button className="modal-close" onClick={() => setChallengeModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>
                Debate topic
              </label>
              <input
                value={challengeTopic}
                onChange={(e) => setChallengeTopic(e.target.value)}
                placeholder="What do you want to debate?"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  background: "#0c0d10", border: "1px solid var(--line)",
                  color: "white", fontSize: 14, outline: "none",
                  fontFamily: "var(--font-body), Arial, sans-serif",
                }}
              />
            </div>

            {/* Quick topics */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {TOPIC_SUGGESTIONS.slice(0, 4).map((t) => (
                <button
                  key={t}
                  onClick={() => setChallengeTopic(t)}
                  style={{
                    padding: "4px 10px", borderRadius: 8,
                    background: challengeTopic === t ? "var(--red-light)" : "#1a1c22",
                    border: `1px solid ${challengeTopic === t ? "var(--red-light)" : "var(--line)"}`,
                    color: challengeTopic === t ? "white" : "var(--muted)",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                    fontFamily: "var(--font-body), Arial, sans-serif",
                  }}
                >
                  {t.length > 35 ? t.slice(0, 35) + "..." : t}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>
                Message (optional)
              </label>
              <input
                value={challengeMessage}
                onChange={(e) => setChallengeMessage(e.target.value)}
                placeholder="Good luck, you'll need it..."
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  background: "#0c0d10", border: "1px solid var(--line)",
                  color: "white", fontSize: 14, outline: "none",
                  fontFamily: "var(--font-body), Arial, sans-serif",
                }}
              />
            </div>

            <button
              className="button"
              style={{ width: "100%" }}
              disabled={!challengeTopic.trim() || sending}
              onClick={sendChallenge}
            >
              {sending ? (
                <><LoaderCircle className="spin" size={16} /> Sending...</>
              ) : (
                <><Send size={16} style={{ marginRight: 6 }} /> Send challenge</>
              )}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

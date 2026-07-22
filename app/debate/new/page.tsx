"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AppShell } from "@/components/web/AppShell";
import { createDebate } from "./actions";
import { personas, getDifficultyLabel, getDifficultyColor, type Persona } from "@/lib/personas";
import {
  FireIcon, BuildingIcon, ClapperIcon, BallIcon, BulbIcon, GlobeIcon,
  BrainIcon, AtomIcon, ForkKnifeIcon, MusicIcon, HourglassIcon, SpeechIcon,
} from "@/components/web/Icons";

const cats: [React.ReactNode, string, string][] = [
  [<BrainIcon key="brain" size={31} />, "Philosophy", "Mind, meaning & madness"],
  [<AtomIcon key="atom" size={31} />, "Science", "The universe is weird"],
  [<FireIcon key="fire" size={31} />, "Culture", "Art, identity & vibes"],
  [<BuildingIcon key="building" size={31} />, "Politics", "Power, theory & systems"],
  [<ClapperIcon key="clapper" size={31} />, "Entertainment", "Stories, screens & obsessions"],
  [<BallIcon key="ball" size={31} />, "Sport", "Glory, rules & chaos"],
  [<BulbIcon key="bulb" size={31} />, "Technology", "Code, AI & the future"],
  [<GlobeIcon key="globe" size={31} />, "Society", "Culture, norms & collapse"],
  [<ForkKnifeIcon key="food" size={31} />, "Food", "Taste, war & hierarchy"],
  [<MusicIcon key="music" size={31} />, "Music", "Sound, taste & tribalism"],
  [<HourglassIcon key="history" size={31} />, "History", "What if? & hindsight"],
  [<SpeechIcon key="psych" size={31} />, "Psychology", "Brains, biases & breakdowns"],
];

const topics: Record<string, string[]> = {
  Philosophy: [
    "If a debate happens and nobody wins, did it matter?",
    "Is free will just a comforting illusion?",
    "The Ship of Theseus: if you replace every part of a thing, is it the same thing?",
    "Would a perfectly rational being still choose to be kind?",
    "Is there a moral difference between killing and letting die?",
    "Could a truly objective moral system exist, or is all morality performative?",
    "The trolley problem is overused and we need better ethical dilemmas.",
    "Is infinity a real concept or just a math trick humans invented?",
    "If you could upload your consciousness to a machine, would the copy be you?",
    "Does the universe have a purpose, or are we just projecting?",
    "Is truth valuable if it makes people miserable?",
    "The paradox of tolerance: should a tolerant society tolerate intolerance?",
    "Could there be things that are true but permanently unknowable?",
    "Is consciousness a spectrum or a binary switch?",
    "If everyone agreed on everything, would philosophy die?",
  ],
  Science: [
    "The multiverse theory is unfalsifiable and therefore unscientific.",
    "Dark matter is just a placeholder for our ignorance.",
    "We should stop treating Einstein like he can't be wrong.",
    "String theory has been a 50-year dead end.",
    "The Big Bang didn't happen the way we think.",
    "Consciousness might be a fundamental property of matter.",
    "Evolution is not a ladder of progress, it's a drunk stumble.",
    "Time doesn't flow, we just perceive it that way.",
    "Quantum mechanics proves the universe is fundamentally absurd.",
    "The anthropic principle is a cop-out explanation.",
    "Free will is compatible with determinism and physicists need to relax.",
    "Science can never explain why anything exists at all.",
    "The placebo effect proves the mind can hack the body.",
    "Panspermia is more plausible than abiogenesis.",
    "Mathematics is discovered, not invented.",
  ],
  Culture: [
    "Abstract art is a scam run by galleries.",
    "The death of the author makes literature more interesting.",
    "Tattoos are the last form of genuine self-expression.",
    "Fashion is just socially accepted conformity.",
    "Weird core and dark academia are aesthetic movements, not trends.",
    "Nostalgia is a drug and we're all addicted.",
    "Internet culture has replaced real culture.",
    "Luxury brands are just expensive logos with no substance.",
    "The concept of 'taste' is just class warfare.",
    "Fan fiction is legitimate literature.",
    "The death of the monoculture is a good thing.",
    "Memes are the folk art of the 21st century.",
    "Thrift store finds are just other people's garbage with better marketing.",
    "The word 'cringe' has lost all meaning.",
    "Cancel culture is just accountability with worse PR.",
  ],
  Politics: [
    "The perfect government is one that never makes news.",
    "All political systems eventually become oligarchies.",
    "Democracy is just mob rule with extra steps.",
    "The best leaders are the ones who never want power.",
    "Political parties are more like sports teams than ideologies.",
    "Revolution always makes things worse before they get better.",
    "The concept of the nation-state is obsolete.",
    "Corruption isn't a bug, it's a feature of every system.",
    "The best form of government is sortition, not elections.",
    "Political correctness is just manners with a rebrand.",
    "The left-right spectrum is a lie to keep you fighting.",
    "Laws should expire every 20 years and be re-voted on.",
    "The most dangerous person in politics is the one who seems reasonable.",
    "Utopian thinking has caused more suffering than pragmatism.",
  ],
  Entertainment: [
    "The golden age of television is over and we're in the denouement.",
    "Most prestige TV is just violence with good cinematography.",
    "Anime is the most philosophically ambitious storytelling medium.",
    "The superhero genre is cinema's most successful Ponzi scheme.",
    "Video game narratives will never match film because interactivity kills pacing.",
    "Horror is the most underrated genre for exploring the human condition.",
    "The reboot is the death of creative risk.",
    "Streaming algorithms have created monocultures disguised as choice.",
    "Nostalgia sequels are Hollywood admitting it has no new ideas.",
    "The best ending to a story is the one that upsets the audience.",
    "Comedy is the only art form where being offensive is a career strategy.",
    "Theatre will always be more powerful than film because it's unrepeatable.",
    "The most important cultural artifact of our time is the meme.",
    "True crime is exploitation dressed up as journalism.",
  ],
  Sport: [
    "Winning ugly is better than losing beautifully.",
    "Home advantage is just crowd-sourced intimidation.",
    "The concept of a 'natural athlete' is a myth.",
    "Divegrass is more of a sport than golf.",
    "The most skilled athletes are in esports, not physical sports.",
    "A draw in football is a beautiful thing and should be celebrated.",
    "The Olympics exist to justify nationalism, not athletic achievement.",
    "The offside rule ruins football and should be abolished.",
    "Team sports teach conformity more than collaboration.",
    "The toughest endurance event is the one nobody's heard of.",
    "Boxing is just assault with a referee.",
    "The greatest trick in sport is making it look easy.",
    "Athletic peak age is completely arbitrary and mostly wrong.",
  ],
  Technology: [
    "We don't have a tech addiction, we have a boredom allergy.",
    "The singularity is just the rapture for nerds.",
    "Most 'AI breakthroughs' are just better pattern matching.",
    "The best technology is the kind you forget you're using.",
    "Social media didn't change human nature, it just removed the filter.",
    "The internet was a mistake and we should have stayed analog.",
    "Cyberpunk is a warning, not an aesthetic to aspire to.",
    "Privacy is already dead, we're just negotiating the funeral.",
    "The best programmer is the one who writes the least code.",
    "Autonomous vehicles will never be fully trusted because humans are irrational.",
    "The cloud is just someone else's computer with better marketing.",
    "We're building AI faster than we can understand it.",
    "Quantum computing will break encryption before it fixes anything.",
    "The best app is the one you delete.",
    "Technology doesn't create new problems, it just creates new versions of old ones.",
  ],
  Society: [
    "Loneliness is the defining condition of modern life.",
    "Meritocracy is a myth that benefits the privileged.",
    "The concept of 'adulting' is just infantilizing competence.",
    "We worship busyness and call it productivity.",
    "The middle class is a marketing demographic, not an economic reality.",
    "Retirement was a 20th-century experiment that's failing.",
    "The most radical act in modern society is doing nothing.",
    "We're living in the most peaceful time in history and nobody believes it.",
    "The concept of 'work-life balance' implies work is antithetical to life.",
    "Conspiracy theories are just pattern recognition gone wrong.",
    "Generational labels are marketing tools, not identities.",
    "The attention economy is literally what it says it is.",
    "We confuse being informed with being engaged.",
    "Civilization is three meals away from anarchy.",
  ],
  Food: [
    "A hot dog is a taco and a burger is a sandwich.",
    "Cereal is soup and nobody can convince me otherwise.",
    "MSG is perfectly safe and the fear is xenophobic.",
    "Ketchup is a smoothie made of tomatoes.",
    "Fancy restaurants are just vibes with markup.",
    "Pineapple on pizza is a legitimate flavor profile.",
    "Coffee is just bean water we've collectively agreed to worship.",
    "The best food in the world comes from the least pretentious places.",
    "Sushi is overrated and overpriced in most cities.",
    "Water has a taste and anyone who says otherwise isn't paying attention.",
    "Microwave food is just as valid as oven food.",
    "The concept of a 'guilty pleasure' in food is elitist.",
    "Instant noodles are the greatest invention of the 20th century.",
    "The best meals are the ones you didn't plan.",
  ],
  Music: [
    "Autotune is a legitimate instrument, not a crutch.",
    "The best musicians are the ones who can't read sheet music.",
    "Albums are dead and the single is the future.",
    "Classical music is just the original EDM.",
    "Vinyl collectors are just hoarding with better branding.",
    "The best songs are the ones you hear once and can't forget.",
    "Jazz is the most intellectually demanding art form.",
    "Most music is better live, no matter the production quality.",
    "The best bands are the ones you discover before anyone else.",
    "Lyrics matter less than we pretend they do.",
    "The genre is dead, long live the playlist.",
    "Musical taste is not a personality, despite what TikTok says.",
    "The best instrument is the one that makes you feel something.",
    "Background music is the truest measure of a song's quality.",
    "The music industry is the world's most successful gatekeeping operation.",
  ],
  History: [
    "History is written by the survivors, not the victors.",
    "The Library of Alexandria burning set humanity back 1,000 years.",
    "If the Roman Empire hadn't fallen, we'd have Mars colonies by now.",
    "World War I was the most pointless war in human history.",
    "The concept of 'discovery' is just colonialism with better PR.",
    "Napoleon was overrated and his legacy is mostly propaganda.",
    "The Dark Ages weren't actually that dark.",
    "The most important invention in history is the plow.",
    "If Cleopatra had Instagram, Rome would have fallen sooner.",
    "The printing press was more disruptive than the internet.",
    "We romanticize the past because we've forgotten how bad it was.",
    "The Cold War was just two superpowers too proud to admit they were scared.",
    "The most interesting historical figures are the ones who failed.",
    "If history repeats itself, we should at least learn from the pattern.",
  ],
  Psychology: [
    "The Dunning-Kruger effect explains most of the internet.",
    "Everyone is a little bit narcissistic and denial is proof.",
    "Overthinking is just the brain's way of keeping you entertained.",
    "Trauma bonding is just trauma Stockholm syndrome.",
    "The Myers-Briggs is astrology for people who read LinkedIn.",
    "Anxiety is your brain's security software being too aggressive.",
    "We all have imposter syndrome because we're all winging it.",
    "The human brain wasn't designed for this much information.",
    "Confirmation bias is the operating system of the human mind.",
    "The smartest people are the ones who know how little they know.",
    "Mental health labels are useful maps, not territories.",
    "We're all unreliable narrators of our own lives.",
    "Therapy is just structured overthinking with a professional audience.",
    "The ego is a story the brain tells itself to feel important.",
    "Cognitive dissonance is the brain's immune system for bad ideas.",
  ],
};

type Step = "category" | "opponent" | "persona" | "configure";

export default function NewDebate() {
  const [step, setStep] = useState<Step>("category");
  const [cat, setCat] = useState("Philosophy");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("Text");
  const [side, setSide] = useState("For");
  const [showPicker, setShowPicker] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [opponentType, setOpponentType] = useState<"ai" | "human">("ai");
  const [selectedTier, setSelectedTier] = useState<"easy" | "medium" | "hard" | null>(null);
  const router = useRouter();

  const filteredPersonas = selectedTier
    ? personas.filter((p) => p.tier === selectedTier)
    : personas;

  function handleCategoryPick(name: string) {
    setCat(name);
    setShowPicker(true);
  }

  function handleTopicPick(t: string) {
    setTopic(t);
    setShowPicker(false);
    setStep("opponent");
  }

  function handleOpponentPick(type: "ai" | "human") {
    setOpponentType(type);
    if (type === "ai") {
      setStep("persona");
    } else {
      // Redirect to matchmaking for human opponents
      router.push("/debate/matchmaking");
    }
  }

  function handlePersonaPick(p: Persona) {
    setSelectedPersona(p);
    setStep("configure");
  }

  async function handleStart() {
    try {
      const id = await createDebate({
        topic,
        category: cat,
        format,
        side,
        personaId: selectedPersona?.id,
      });
      if (id) router.push(`/debate/${id}`);
    } catch (err) {
      console.error("Failed to create debate:", err);
      alert("Failed to start debate. Please try again.");
    }
  }

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>
        <span style={{ color: step === "category" ? "var(--red-light)" : undefined, cursor: "pointer" }} onClick={() => setStep("category")}>Category</span>
        <span>&rsaquo;</span>
        <span style={{ color: step === "opponent" ? "var(--red-light)" : undefined, cursor: "pointer" }} onClick={() => topic && setStep("opponent")}>Opponent</span>
        <span>&rsaquo;</span>
        <span style={{ color: step === "persona" ? "var(--red-light)" : undefined }}>Persona</span>
        <span>&rsaquo;</span>
        <span style={{ color: step === "configure" ? "var(--red-light)" : undefined }}>Configure</span>
      </div>

      {/* STEP: Category + Topic */}
      {step === "category" && (
        <>
          <div className="eyebrow">Start a new showdown</div>
          <h1 className="page-title">PICK YOUR BATTLEFIELD</h1>
          <div className="picker-grid picker-grid-wide">
            {cats.map(([icon, name, desc]) => (
              <button
                key={name}
                onClick={() => handleCategoryPick(name)}
                className={`card choice ${cat === name ? "selected" : ""}`}
              >
                <span className="category-icon">{icon}</span>
                <strong>{name}</strong>
                <p>{desc}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* STEP: Opponent Type */}
      {step === "opponent" && (
        <>
          <div className="eyebrow">Choose your opponent</div>
          <h1 className="page-title">WHO DO YOU WANT TO FIGHT?</h1>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
            <button
              className="card choice"
              onClick={() => handleOpponentPick("ai")}
              style={{ textAlign: "left", cursor: "pointer", minHeight: 180 }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
              <strong style={{ fontSize: 20 }}>AI PERSONA</strong>
              <p style={{ color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
                Debate against a styled AI opponent with unique personality and tactics.
              </p>
              <span style={{ color: "var(--green)", fontWeight: 900, fontSize: 12 }}>STARTS INSTANTLY</span>
            </button>
            <button
              className="card choice"
              onClick={() => handleOpponentPick("human")}
              style={{ textAlign: "left", cursor: "pointer", minHeight: 180 }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
              <strong style={{ fontSize: 20 }}>HUMAN OPPONENT</strong>
              <p style={{ color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
                Get matched with another real player or challenge a friend.
              </p>
              <span style={{ color: "var(--gold)", fontWeight: 900, fontSize: 12 }}>LIVE NOW</span>
            </button>
          </div>
          <button className="pill" style={{ marginTop: 20 }} onClick={() => setStep("category")}>
            &larr; Back
          </button>
        </>
      )}

      {/* STEP: Persona Selection */}
      {step === "persona" && (
        <>
          <div className="eyebrow">Pick your opponent</div>
          <h1 className="page-title">CHOOSE YOUR CHALLENGE</h1>

          {/* Tier selector */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {(["easy", "medium", "hard"] as const).map((tier) => (
              <button
                key={tier}
                className={`option ${selectedTier === tier ? "selected" : ""}`}
                onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
                style={{ textTransform: "capitalize" }}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Persona grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {filteredPersonas.map((p) => (
              <button
                key={p.id}
                className="card choice"
                onClick={() => handlePersonaPick(p)}
                style={{ textAlign: "left", cursor: "pointer", borderLeft: `3px solid ${p.color}` }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: `${p.color}22`, color: p.color,
                      display: "grid", placeItems: "center",
                      fontWeight: 900, fontSize: 18,
                    }}
                  >
                    {p.avatar}
                  </div>
                  <div>
                    <strong style={{ fontSize: 16 }}>{p.name}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>{p.title}</div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: 11, fontWeight: 900,
                      color: getDifficultyColor(p.difficulty),
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: `${getDifficultyColor(p.difficulty)}15`,
                    }}
                  >
                    {getDifficultyLabel(p.difficulty)}
                  </div>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  {p.style}
                </p>
              </button>
            ))}
          </div>
          <button className="pill" style={{ marginTop: 20 }} onClick={() => setStep("opponent")}>
            &larr; Back
          </button>
        </>
      )}

      {/* STEP: Configure (format + side) */}
      {step === "configure" && (
        <>
          <div className="eyebrow">Configure your debate</div>
          <h1 className="page-title">SET THE RULES</h1>

          {/* Selected info */}
          <div className="card" style={{ marginBottom: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            {selectedPersona && (
              <div
                style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${selectedPersona.color}22`, color: selectedPersona.color,
                  display: "grid", placeItems: "center",
                  fontWeight: 900, fontSize: 20, flexShrink: 0,
                }}
              >
                {selectedPersona.avatar}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
                Topic
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.4, marginTop: 2 }}>
                &ldquo;{topic}&rdquo;
              </div>
            </div>
            {selectedPersona && (
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>VS</div>
                <div style={{ fontWeight: 900, color: selectedPersona.color }}>{selectedPersona.name}</div>
              </div>
            )}
          </div>

          <section className="card">
            <div style={{ display: "grid", gap: 20 }}>
              {/* Format */}
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Format</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {["Text", "Audio"].map((x) => (
                    <button
                      onClick={() => setFormat(x)}
                      className={`option ${format === x ? "selected" : ""}`}
                      key={x}
                    >
                      {x} debate
                    </button>
                  ))}
                </div>
              </div>

              {/* Side */}
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Your side</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {["For", "Against", "Random"].map((x) => (
                    <button
                      onClick={() => setSide(x)}
                      className={`option ${side === x ? "selected" : ""}`}
                      key={x}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start */}
              <div style={{ display: "flex", gap: 12 }}>
                <button className="pill" onClick={() => setStep(selectedPersona ? "persona" : "opponent")}>
                  &larr; Back
                </button>
                <button className="button" style={{ flex: 1 }} onClick={handleStart}>
                  Start debate
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Topic picker modal */}
      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">Pick a motion</div>
                <h2 style={{ font: "700 24px var(--font-display)", margin: "4px 0 0" }}>
                  {cat}
                </h2>
              </div>
              <button className="modal-close" onClick={() => setShowPicker(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="topic-list">
              {(topics[cat] || []).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTopicPick(t)}
                  className={`topic-option ${topic === t ? "selected" : ""}`}
                >
                  &ldquo;{t}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

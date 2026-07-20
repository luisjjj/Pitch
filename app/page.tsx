import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { ArenaCanvas } from "@/components/web/ArenaCanvas";
import { FireIcon, BuildingIcon, ClapperIcon, BallIcon, BulbIcon, MoneyIcon, GlobeIcon, CapIcon } from "@/components/web/Icons";

const categories: [React.ReactNode, string, string][] = [
  [<FireIcon key="fire" size={31} />, "Culture", "2,840 debating"],
  [<BuildingIcon key="building" size={31} />, "Politics", "1,920 debating"],
  [<ClapperIcon key="clapper" size={31} />, "Entertainment", "1,560 debating"],
  [<BallIcon key="ball" size={31} />, "Sport", "1,280 debating"],
  [<BulbIcon key="bulb" size={31} />, "Technology", "1,104 debating"],
  [<MoneyIcon key="money" size={31} />, "Money", "860 debating"],
  [<GlobeIcon key="globe" size={31} />, "Society", "746 debating"],
  [<CapIcon key="cap" size={31} />, "Campus", "489 debating"],
];

export default function Home() {
  return (
    <>
      <header className="shell nav">
        <Link href="/" className="brand"><i className="brand-mark" />PITCH</Link>
        <nav className="nav-links">
          <Link href="/dashboard">Leaderboard</Link>
          <Link href="/debate/new">Watch debates</Link>
          <Link className="pill" href="/auth">Log in</Link>
        </nav>
      </header>
      <main>
        <section className="shell hero">
          <div>
            <div className="eyebrow"><Sparkles size={13} style={{ verticalAlign: "-2px" }} /> The debate arena is live</div>
            <h1 className="display">MAKE YOUR<br /><span style={{ color: "#e5424d" }}>CASE.</span> OWN<br />THE ROOM.</h1>
            <p>Pitch turns hot takes into high-stakes debates. Pick a side, battle it out, and let AI crown the winner.</p>
            <div className="hero-actions">
              <Link className="button" href="/debate/new">Find a debate <ArrowRight size={18} /></Link>
              <Link className="button secondary" href="/debate/new">Challenge a friend</Link>
            </div>
          </div>
          <div className="hero-visual">
            <ArenaCanvas />
            <div className="orb-label"><b>12,492</b><span>voices in the arena</span></div>
          </div>
        </section>
        <div className="live-strip">
          <div className="shell">
            <span><i className="live-dot" /> 326 debates happening now</span>
            <span>12,492 arguments made today</span>
            <span>AI judgment in under 30 seconds</span>
          </div>
        </div>
        <section className="shell section">
          <div className="section-head">
            <div>
              <div className="eyebrow">Pick your battlefield</div>
              <h2>WHAT WILL YOU DEFEND?</h2>
            </div>
            <Link className="pill" href="/debate/new">See all topics</Link>
          </div>
          <div className="category-grid">
            {categories.map(([icon, name, count]) => (
              <Link href="/debate/new" key={name} className="card category">
                <span className="category-icon">{icon}</span>
                <strong>{name}</strong>
                <small>{count}</small>
              </Link>
            ))}
          </div>
        </section>
        <section className="shell section">
          <div className="section-head">
            <div>
              <div className="eyebrow">It&apos;s simple</div>
              <h2>YOUR TAKE. THE VERDICT.</h2>
            </div>
          </div>
          <div className="how">
            {[
              ["01", "Pick a motion", "Choose a category and take a side—or let Pitch decide."],
              ["02", "Make your case", "Write or record your argument. Three rounds, one winner."],
              ["03", "Get the verdict", "AI judges score logic, clarity, evidence, and delivery."],
            ].map(([num, title, desc]) => (
              <div key={num}>
                <div className="step-num">{num}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

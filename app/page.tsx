"use client";

import { useEffect, useState } from "react";

type View = "home" | "active" | "summary";

const selfPoint = { name: "Your private session", x: 82, y: 42 };

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function WorldMap({ active = false }: { active?: boolean }) {
  return (
    <div className="map-shell" aria-label="Realtime anonymous world map">
      <div className="map-grid" />
      <svg className="world-lines" viewBox="0 0 100 64" role="img">
        <path d="M7 28 C16 18, 24 17, 34 23 C42 27, 42 36, 32 40 C21 45, 10 39, 7 28Z" />
        <path d="M42 22 C49 13, 62 15, 66 25 C70 35, 63 43, 52 41 C42 39, 36 30, 42 22Z" />
        <path d="M58 45 C63 40, 72 42, 75 50 C78 58, 70 63, 62 59 C56 56, 53 50, 58 45Z" />
        <path d="M70 28 C77 18, 89 20, 93 32 C97 44, 86 52, 76 46 C68 41, 65 35, 70 28Z" />
        <path d="M79 54 C86 50, 94 54, 96 60" />
      </svg>
      {active && (
        <span
          className="map-point is-you"
          style={
            {
              "--x": `${selfPoint.x}%`,
              "--y": `${selfPoint.y}%`,
              "--delay": "0s",
            } as React.CSSProperties
          }
          title={selfPoint.name}
        />
      )}
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (view !== "active") {
      return;
    }

    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [view]);

  const activeCount = view === "active" ? 1 : 0;
  const overlapCount = 0;
  const peakCount = view === "summary" ? 1 : 0;

  function startSession() {
    setSeconds(0);
    setView("active");
  }

  function finishSession() {
    setView("summary");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <span>WITHYOU</span>
        </div>
        <span className="signal">LIVE</span>
      </header>

      {view === "home" && (
        <section className="hero" aria-labelledby="home-title">
          <p className="eyebrow">YOU'RE NEVER POOPING ALONE.</p>
          <h1 id="home-title">0</h1>
          <p className="subtitle">people are pooping right now</p>
          <WorldMap />
          <button className="primary-action" onClick={startSession}>
            START POOPING
          </button>
        </section>
      )}

      {view === "active" && (
        <section className="session" aria-labelledby="session-title">
          <p className="eyebrow">ACTIVE SESSION</p>
          <h1 id="session-title">{formatDuration(seconds)}</h1>
          <p className="subtitle">waiting for the first overlap</p>
          <WorldMap active />
          <div className="metrics">
            <div>
              <span>{formatNumber(activeCount)}</span>
              <p>POOPING NOW</p>
            </div>
            <div>
              <span>{formatNumber(overlapCount)}</span>
              <p>WITH YOU</p>
            </div>
            <div>
              <span>0</span>
              <p>NEARBY</p>
            </div>
          </div>
          <p className="quiet-note">
            You are the first visible session. The world has not joined yet.
          </p>
          <button className="secondary-action" onClick={finishSession}>
            FINISH
          </button>
        </section>
      )}

      {view === "summary" && (
        <section className="summary" aria-labelledby="summary-title">
          <p className="eyebrow">SESSION COMPLETE</p>
          <h1 id="summary-title">{formatDuration(seconds)}</h1>
          <p className="subtitle">first session recorded</p>
          <div className="summary-panel">
            <div>
              <span>{formatNumber(overlapCount)}</span>
              <p>simultaneous people</p>
            </div>
            <div>
              <span>0</span>
              <p>countries unlocked</p>
            </div>
            <div>
              <span>{formatNumber(peakCount)}</span>
              <p>maximum global active users</p>
            </div>
            <div>
              <span>First Session</span>
              <p>achievement unlocked</p>
            </div>
          </div>
          <button className="primary-action" onClick={startSession}>
            START AGAIN
          </button>
        </section>
      )}
    </main>
  );
}

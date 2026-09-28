"use client";

import { useEffect, useMemo, useState } from "react";

type View = "home" | "active" | "summary";

const cities = [
  { name: "Tokyo", country: "Japan", x: 82, y: 42, people: 428 },
  { name: "Seoul", country: "Korea", x: 78, y: 40, people: 261 },
  { name: "Singapore", country: "Singapore", x: 73, y: 61, people: 119 },
  { name: "Paris", country: "France", x: 48, y: 38, people: 312 },
  { name: "London", country: "United Kingdom", x: 45, y: 34, people: 386 },
  { name: "New York", country: "United States", x: 27, y: 39, people: 502 },
  { name: "Sao Paulo", country: "Brazil", x: 36, y: 72, people: 237 },
  { name: "Sydney", country: "Australia", x: 84, y: 76, people: 171 },
  { name: "Cairo", country: "Egypt", x: 55, y: 48, people: 142 },
  { name: "Lagos", country: "Nigeria", x: 50, y: 59, people: 198 },
  { name: "Mexico City", country: "Mexico", x: 20, y: 51, people: 154 },
  { name: "Mumbai", country: "India", x: 66, y: 52, people: 340 },
];

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
      {cities.map((city, index) => (
        <span
          className={`map-point ${active && index === 0 ? "is-you" : ""}`}
          key={city.name}
          style={
            {
              "--x": `${city.x}%`,
              "--y": `${city.y}%`,
              "--delay": `${index * 0.28}s`,
            } as React.CSSProperties
          }
          title={`${city.name}, ${city.country}`}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [globalCount, setGlobalCount] = useState(18624);
  const [seconds, setSeconds] = useState(0);
  const [bestCount, setBestCount] = useState(24812);

  useEffect(() => {
    const id = window.setInterval(() => {
      setGlobalCount((current) => {
        const next = Math.max(14000, current + Math.floor(Math.random() * 39) - 14);
        setBestCount((best) => Math.max(best, next));
        return next;
      });
    }, 1800);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (view !== "active") {
      return;
    }

    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [view]);

  const overlapCount = useMemo(
    () => Math.max(0, globalCount - 1 + Math.floor(seconds * 2.4)),
    [globalCount, seconds],
  );

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
          <h1 id="home-title">{formatNumber(globalCount)}</h1>
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
          <p className="subtitle">37 countries with you</p>
          <WorldMap active />
          <div className="metrics">
            <div>
              <span>{formatNumber(globalCount)}</span>
              <p>POOPING NOW</p>
            </div>
            <div>
              <span>{formatNumber(overlapCount)}</span>
              <p>WITH YOU</p>
            </div>
            <div>
              <span>12</span>
              <p>NEARBY</p>
            </div>
          </div>
          <p className="quiet-note">
            Someone 8,430 km away started within the same minute.
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
          <p className="subtitle">you were not alone</p>
          <div className="summary-panel">
            <div>
              <span>{formatNumber(overlapCount)}</span>
              <p>simultaneous people</p>
            </div>
            <div>
              <span>37</span>
              <p>countries unlocked</p>
            </div>
            <div>
              <span>{formatNumber(bestCount)}</span>
              <p>maximum global active users</p>
            </div>
            <div>
              <span>Not Alone</span>
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

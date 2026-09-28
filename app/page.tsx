"use client";

import { geoEqualEarth, geoPath } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

type View = "idle" | "active" | "summary";

type GeometryCollection = {
  type: "FeatureCollection";
  features: Array<{
    id?: string | number;
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: unknown;
  }>;
};

const mapWidth = 1000;
const mapHeight = 720;
const projection = geoEqualEarth().fitSize([mapWidth, mapHeight], {
  type: "Sphere",
});
const path = geoPath(projection);

const countries = feature(
  world as unknown as Parameters<typeof feature>[0],
  (world as { objects: { countries: unknown } }).objects.countries as Parameters<
    typeof feature
  >[1],
) as unknown as GeometryCollection;

const selfLocation = {
  label: "Your session",
  coordinates: [139.767, 35.681] as [number, number],
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatStartTime(date: Date | null) {
  if (!date) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function WorldMap({ active }: { active: boolean }) {
  const point = projection(selfLocation.coordinates);

  return (
    <div className="map-stage" aria-label="Realtime global session map">
      <svg className="world-map" viewBox={`0 0 ${mapWidth} ${mapHeight}`} role="img">
        <defs>
          <radialGradient id="pointGlow">
            <stop offset="0%" stopColor="#0b5dff" stopOpacity="0.88" />
            <stop offset="45%" stopColor="#5ba8ff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#5ba8ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path className="sphere" d={path({ type: "Sphere" }) ?? undefined} />
        {countries.features.map((country) => (
          <path
            className="country"
            d={path(country as Parameters<typeof path>[0]) ?? undefined}
            key={country.id}
          />
        ))}
        {active && point && (
          <g className="session-point" transform={`translate(${point[0]} ${point[1]})`}>
            <circle className="point-glow" r="34" />
            <circle className="point-core" r="5.8" />
          </g>
        )}
      </svg>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("idle");
  const [seconds, setSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  const isActive = view === "active";
  const withYouNow = isActive ? 0 : 0;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [isActive]);

  const statusLabel = useMemo(() => {
    if (view === "summary") {
      return "SESSION COMPLETE";
    }

    return isActive ? "SESSION ACTIVE" : "GLOBAL SESSION";
  }, [isActive, view]);

  function startSession() {
    setSeconds(0);
    setStartedAt(new Date());
    setView("active");
  }

  function finishSession() {
    setView("summary");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <span className="brand">P∞P</span>
        <span className="screen-title">{statusLabel}</span>
      </header>

      <section className="session-panel" aria-labelledby="with-you-title">
        <div className="hero-stat">
          <p className="stat-label">WITH YOU NOW</p>
          <h1 id="with-you-title">{withYouNow}</h1>
        </div>

        <div className="time-row">
          <div>
            <span>START</span>
            <strong>{formatStartTime(startedAt)}</strong>
          </div>
          <div>
            <span>DURATION</span>
            <strong>{formatDuration(seconds)}</strong>
          </div>
        </div>
      </section>

      <WorldMap active={isActive} />

      <div className="bottom-action">
        {isActive ? (
          <button className="secondary-action" onClick={finishSession}>
            FINISH
          </button>
        ) : (
          <button className="primary-action" onClick={startSession}>
            START
          </button>
        )}
      </div>
    </main>
  );
}

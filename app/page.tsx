"use client";

import { geoEqualEarth, geoPath } from "d3-geo";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

type Tab = "home" | "stats" | "settings";

type GeometryCollection = {
  type: "FeatureCollection";
  features: Array<{
    id?: string | number;
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: unknown;
  }>;
};

type LivePoint = {
  id: string;
  coordinates: [number, number];
  self?: boolean;
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

const selfPoint: LivePoint = {
  id: "self",
  coordinates: [139.767, 35.681],
  self: true,
};

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

function formatTotal(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

function WorldMap({
  full = false,
  points,
  resonating = false,
}: {
  full?: boolean;
  points: LivePoint[];
  resonating?: boolean;
}) {
  const projected = points
    .map((point) => ({ ...point, xy: projection(point.coordinates) }))
    .filter((point): point is LivePoint & { xy: [number, number] } =>
      Boolean(point.xy),
    );

  const [first, second] = projected;

  return (
    <svg
      className={full ? "world-map world-map-full" : "world-map"}
      viewBox={`0 0 ${mapWidth} ${mapHeight}`}
      role="img"
    >
      <defs>
        <radialGradient id="pointGlow">
          <stop offset="0%" stopColor="#0b5dff" stopOpacity="0.88" />
          <stop offset="48%" stopColor="#68a8ff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#68a8ff" stopOpacity="0" />
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
      {resonating && first && second && (
        <path
          className="resonance-arc"
          d={`M${first.xy[0]},${first.xy[1]} Q${mapWidth / 2},${mapHeight * 0.16} ${
            second.xy[0]
          },${second.xy[1]}`}
        />
      )}
      {projected.map((point) => (
        <g
          className={`session-point ${point.self ? "is-self" : ""} ${
            resonating ? "is-resonating" : ""
          }`}
          key={point.id}
          transform={`translate(${point.xy[0]} ${point.xy[1]})`}
        >
          <circle className="point-glow" r={full ? 34 : 24} />
          <circle className="point-core" r={full ? 5.8 : 4.6} />
        </g>
      ))}
    </svg>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [active, setActive] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [togetherTotal] = useState(0);
  const touchStartY = useRef<number | null>(null);

  const livePoints = useMemo(() => (active ? [selfPoint] : []), [active]);
  const withYouNow = Math.max(0, livePoints.length - 1);

  useEffect(() => {
    if (!mapOpen) {
      return;
    }

    const onPopState = () => setMapOpen(false);
    window.history.pushState({ map: true }, "", "#map");
    window.addEventListener("popstate", onPopState);

    return () => window.removeEventListener("popstate", onPopState);
  }, [mapOpen]);

  function toggleSession() {
    if (!active) {
      setStartedAt(new Date());
      setActive(true);
      return;
    }

    const duration = startedAt
      ? Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 1000))
      : 0;
    setTotalSessions((value) => value + 1);
    setTotalSeconds((value) => value + duration);
    setActive(false);
  }

  function openMap() {
    setMapOpen(true);
  }

  function closeMap() {
    if (window.location.hash === "#map") {
      window.history.back();
      return;
    }

    setMapOpen(false);
  }

  function handleTouchStart(event: React.TouchEvent) {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartY.current == null) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? touchStartY.current;
    if (endY - touchStartY.current > 72) {
      closeMap();
    }
    touchStartY.current = null;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <span className="brand">P∞P</span>
      </header>

      {tab === "home" && (
        <section className="home-screen" aria-labelledby="with-you-title">
          <div className="hero-stat">
            <p className="stat-label">WITH YOU NOW</p>
            <h1 id="with-you-title">{withYouNow}</h1>
          </div>

          <button
            className={active ? "secondary-action" : "primary-action"}
            onClick={toggleSession}
          >
            {active ? "FINISH" : "POOP"}
          </button>

          <div className="start-time">
            <span>START</span>
            <strong>{formatStartTime(startedAt)}</strong>
          </div>

          <button
            aria-label="Open full-screen world map"
            className="map-preview"
            onClick={openMap}
          >
            <WorldMap points={livePoints} />
          </button>
        </section>
      )}

      {tab === "stats" && (
        <section className="subscreen" aria-labelledby="stats-title">
          <h2 id="stats-title">Stats</h2>
          <div className="stat-list">
            <div>
              <span>Total Poops</span>
              <strong>{totalSessions}</strong>
            </div>
            <div>
              <span>Total Time</span>
              <strong>{formatTotal(totalSeconds)}</strong>
            </div>
            <div>
              <span>People With You</span>
              <strong>{togetherTotal}</strong>
            </div>
          </div>
        </section>
      )}

      {tab === "settings" && (
        <section className="subscreen" aria-labelledby="settings-title">
          <h2 id="settings-title">Settings</h2>
          <div className="settings-list">
            {["Language", "Notifications", "Account", "Privacy", "About"].map(
              (item) => (
                <button key={item}>{item}</button>
              ),
            )}
          </div>
        </section>
      )}

      <nav className="tabbar" aria-label="Primary">
        {(["home", "stats", "settings"] as const).map((item) => (
          <button
            className={tab === item ? "is-selected" : ""}
            key={item}
            onClick={() => setTab(item)}
          >
            {item === "home" ? "Home" : item === "stats" ? "Stats" : "Settings"}
          </button>
        ))}
      </nav>

      {mapOpen && (
        <div
          className="map-overlay"
          onClick={closeMap}
          onTouchEnd={handleTouchEnd}
          onTouchStart={handleTouchStart}
        >
          <WorldMap full points={livePoints} />
        </div>
      )}
    </main>
  );
}

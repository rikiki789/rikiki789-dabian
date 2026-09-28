"use client";

import { geoEqualEarth, geoPath } from "d3-geo";
import { useEffect, useState } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

type Mode = "idle" | "active" | "map";

type GeometryCollection = {
  type: "FeatureCollection";
  features: Array<{
    id?: string | number;
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: unknown;
  }>;
};

type Totals = {
  sessions: number;
  seconds: number;
  together: number;
};

type LivePoint = {
  id: string;
  coordinates: [number, number];
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

function formatTotalTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function WorldMap({ points }: { points: LivePoint[] }) {
  const projected = points
    .map((point) => ({ ...point, xy: projection(point.coordinates) }))
    .filter((point): point is LivePoint & { xy: [number, number] } =>
      Boolean(point.xy),
    );

  return (
    <svg className="world-map" viewBox={`0 0 ${mapWidth} ${mapHeight}`} role="img">
      <defs>
        <radialGradient id="pointGlow">
          <stop offset="0%" stopColor="#0b5dff" stopOpacity="0.92" />
          <stop offset="48%" stopColor="#6facff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#6facff" stopOpacity="0" />
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
      {projected.map((point) => (
        <g className="session-point" key={point.id} transform={`translate(${point.xy[0]} ${point.xy[1]})`}>
          <circle className="point-glow" r="36" />
          <circle className="point-core" r="5.8" />
        </g>
      ))}
    </svg>
  );
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("idle");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [totals, setTotals] = useState<Totals>({
    sessions: 0,
    seconds: 0,
    together: 0,
  });

  const active = mode === "active" || mode === "map";
  const livePoints = active ? [selfPoint] : [];
  const withYouNow = 0;

  useEffect(() => {
    const saved = window.localStorage.getItem("poop-totals");
    if (!saved) {
      return;
    }

    try {
      setTotals(JSON.parse(saved) as Totals);
    } catch {
      window.localStorage.removeItem("poop-totals");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("poop-totals", JSON.stringify(totals));
  }, [totals]);

  useEffect(() => {
    if (mode !== "map") {
      return;
    }

    const closeOnBack = () => setMode("active");
    window.history.pushState({ map: true }, "", "#map");
    window.addEventListener("popstate", closeOnBack);

    return () => window.removeEventListener("popstate", closeOnBack);
  }, [mode]);

  function startSession() {
    setStartedAt(new Date());
    setMode("active");
  }

  function finishSession() {
    const elapsed = startedAt
      ? Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 1000))
      : 0;

    setTotals((current) => ({
      sessions: current.sessions + 1,
      seconds: current.seconds + elapsed,
      together: current.together + withYouNow,
    }));
    setStartedAt(null);
    setMode("idle");
  }

  function openMap() {
    if (active) {
      setMode("map");
    }
  }

  function closeMap() {
    if (window.location.hash === "#map") {
      window.history.back();
      return;
    }

    setMode("active");
  }

  return (
    <main className={`app-shell mode-${mode}`}>
      <header className="topbar">
        <span className="brand">P∞P</span>
      </header>

      <section className="state-stage" aria-live="polite">
        {mode === "idle" && (
          <div className="idle-state">
            <div className="identity-stack">
              <span>{totals.sessions}</span>
              <span>{formatTotalTime(totals.seconds)}</span>
              <span>{totals.together}</span>
            </div>
            <button className="poop-action" onClick={startSession}>
              Poop
            </button>
          </div>
        )}

        {mode === "active" && (
          <div className="active-state">
            <button className="active-surface" onClick={openMap}>
              <span className="active-number">{withYouNow}</span>
              <span className="active-context">with you</span>
              <span className="active-start">{formatStartTime(startedAt)}</span>
            </button>
            <button className="finish-action" onClick={finishSession}>
              Finish
            </button>
          </div>
        )}
      </section>

      {mode === "map" && (
        <button className="map-state" onClick={closeMap}>
          <WorldMap points={livePoints} />
        </button>
      )}
    </main>
  );
}

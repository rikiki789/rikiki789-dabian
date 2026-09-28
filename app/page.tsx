"use client";

import { geoOrthographic, geoPath } from "d3-geo";
import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

type Mode = "idle" | "active" | "map" | "settings";

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

const globeSize = 1000;
const storageKey = "poop-totals";
const tokyoPoint: [number, number] = [139.767, 35.681];

const countries = feature(
  world as unknown as Parameters<typeof feature>[0],
  (world as { objects: { countries: unknown } }).objects.countries as Parameters<
    typeof feature
  >[1],
) as unknown as GeometryCollection;

function formatClock(date: Date | null) {
  if (!date) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatMinutes(seconds: number) {
  return Math.floor(seconds / 60).toLocaleString("zh-CN");
}

function getElapsedSeconds(startedAt: Date | null, now: number) {
  if (!startedAt) {
    return 0;
  }

  return Math.max(0, Math.floor((now - startedAt.getTime()) / 1000));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function loadTotals(): Totals {
  if (typeof window === "undefined") {
    return {
      sessions: 0,
      seconds: 0,
      together: 0,
    };
  }

  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    return {
      sessions: 0,
      seconds: 0,
      together: 0,
    };
  }

  try {
    return JSON.parse(saved) as Totals;
  } catch {
    window.localStorage.removeItem(storageKey);
    return {
      sessions: 0,
      seconds: 0,
      together: 0,
    };
  }
}

function pointIsVisible(
  [lon, lat]: [number, number],
  [rotationLon, rotationLat]: [number, number, number],
) {
  const toRad = Math.PI / 180;
  const centerLon = -rotationLon * toRad;
  const centerLat = -rotationLat * toRad;
  const lonRad = lon * toRad;
  const latRad = lat * toRad;

  const visibility =
    Math.sin(latRad) * Math.sin(centerLat) +
    Math.cos(latRad) * Math.cos(centerLat) * Math.cos(lonRad - centerLon);

  return visibility > 0;
}

function WorldGlobe({
  points,
  onTap,
}: {
  points: LivePoint[];
  onTap: () => void;
}) {
  const [rotation, setRotation] = useState<[number, number, number]>([
    -135,
    -24,
    0,
  ]);
  const dragRef = useRef<{
    x: number;
    y: number;
    rotation: [number, number, number];
    moved: boolean;
  } | null>(null);

  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate([globeSize / 2, globeSize / 2])
        .scale(455)
        .rotate(rotation)
        .clipAngle(90),
    [rotation],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const projected = points
    .filter((point) => pointIsVisible(point.coordinates, rotation))
    .map((point) => ({ ...point, xy: projection(point.coordinates) }))
    .filter((point): point is LivePoint & { xy: [number, number] } =>
      Boolean(point.xy),
    );

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      rotation,
      moved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      drag.moved = true;
    }

    setRotation([
      drag.rotation[0] + dx * 0.35,
      clamp(drag.rotation[1] - dy * 0.25, -68, 68),
      0,
    ]);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const shouldTap = dragRef.current && !dragRef.current.moved;
    dragRef.current = null;

    if (shouldTap) {
      onTap();
    }
  }

  return (
    <div
      className="globe-stage"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="button"
      tabIndex={0}
      aria-label="Live map"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTap();
        }
      }}
    >
      <svg
        className="world-globe"
        viewBox={`0 0 ${globeSize} ${globeSize}`}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="oceanTone" cx="48%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
            <stop offset="70%" stopColor="#edf3f2" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#dce7e6" stopOpacity="0.96" />
          </radialGradient>
          <radialGradient id="pointGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a5bff" stopOpacity="0.9" />
            <stop offset="46%" stopColor="#4fa7ff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#4fa7ff" stopOpacity="0" />
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
          <g
            className="session-point"
            key={point.id}
            transform={`translate(${point.xy[0]} ${point.xy[1]})`}
          >
            <circle className="point-glow" r="38" />
            <circle className="point-core" r="6.2" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("idle");
  const [previousMode, setPreviousMode] = useState<Mode>("idle");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(0);
  const [selfCoordinates, setSelfCoordinates] =
    useState<[number, number]>(tokyoPoint);
  const [totals, setTotals] = useState<Totals>(loadTotals);

  const active = mode === "active" || mode === "map";
  const withYouNow = 0;
  const elapsedSeconds = getElapsedSeconds(startedAt, now);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const livePoints = active
    ? [{ id: "self", coordinates: selfCoordinates }]
    : [];

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(totals));
  }, [totals]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (mode !== "map") {
      return;
    }

    window.history.pushState({ map: true }, "", "#map");
    const closeOnBack = () => setMode("active");
    window.addEventListener("popstate", closeOnBack);

    return () => window.removeEventListener("popstate", closeOnBack);
  }, [mode]);

  function openSettings() {
    setPreviousMode(mode);
    setMode("settings");
  }

  function closeSettings() {
    setMode(previousMode === "settings" ? "idle" : previousMode);
  }

  function startSession() {
    setStartedAt(new Date());
    setNow(Date.now());
    setMode("active");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSelfCoordinates([
            position.coords.longitude,
            position.coords.latitude,
          ]);
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 4500, maximumAge: 600000 },
      );
    }
  }

  function finishSession() {
    const elapsed = Math.max(1, elapsedSeconds);

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
      {mode !== "map" && (
        <header className="topbar">
          <button
            className="brand-button"
            onClick={() => setMode(active ? "active" : "idle")}
          >
            P∞P
          </button>
          {mode !== "settings" ? (
            <button className="quiet-nav" onClick={openSettings}>
              Settings
            </button>
          ) : (
            <button className="quiet-nav" onClick={closeSettings}>
              Done
            </button>
          )}
        </header>
      )}

      <section className="state-stage" aria-live="polite">
        {mode === "idle" && (
          <div className="idle-state">
            <div className="home-stats" aria-label="Personal totals">
              <div className="home-primary-stat">
                <span className="stat-value">
                  {totals.together.toLocaleString("zh-CN")}
                </span>
                <span className="stat-label">
                  到现在为止和 {totals.together.toLocaleString("zh-CN")} 人一起拉过屎
                </span>
              </div>
              <div className="home-secondary-stats">
                <div>
                  <span>{totals.sessions.toLocaleString("zh-CN")}</span>
                  <small>一共拉过 {totals.sessions.toLocaleString("zh-CN")} 次</small>
                </div>
                <div>
                  <span>{formatMinutes(totals.seconds)}</span>
                  <small>一共拉了 {formatMinutes(totals.seconds)} 分钟</small>
                </div>
              </div>
            </div>
            <button className="poop-action" onClick={startSession}>
              Poop
            </button>
          </div>
        )}

        {mode === "active" && (
          <div className="active-state">
            <button className="active-surface" onClick={openMap}>
              <span className="active-kicker">
                开始拉屎 {elapsedMinutes.toLocaleString("zh-CN")} 分钟
              </span>
              <span className="active-number">
                {withYouNow.toLocaleString("zh-CN")}
              </span>
              <span className="active-context">人和你一起拉屎</span>
              <span className="active-start">Start {formatClock(startedAt)}</span>
            </button>
            <button className="finish-action" onClick={finishSession}>
              Finish
            </button>
          </div>
        )}

        {mode === "settings" && (
          <div className="settings-state">
            <div className="settings-title">
              <span>Settings</span>
              <small>P∞P</small>
            </div>
            <div className="settings-list">
              {["Language", "Notifications", "Account", "Privacy", "About"].map(
                (item) => (
                  <button className="settings-row" key={item}>
                    <span>{item}</span>
                    <span aria-hidden="true">›</span>
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </section>

      {mode === "map" && (
        <div className="map-state">
          <WorldGlobe points={livePoints} onTap={closeMap} />
        </div>
      )}
    </main>
  );
}

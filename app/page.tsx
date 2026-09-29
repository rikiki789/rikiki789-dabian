"use client";

import { geoEquirectangular, geoPath } from "d3-geo";
import type { PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

type Screen = "home" | "session" | "flush" | "settings";
type SessionPane = "paper" | "world";

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

type PublicPaper = {
  id: string;
  text: string;
  likes: number;
  createdAt: number;
};

type LivePoint = {
  id: string;
  coordinates: [number, number];
};

const totalsKey = "poop-totals";
const publicPapersKey = "poop-public-papers";
const oneDay = 24 * 60 * 60 * 1000;
const mapWidth = 1000;
const mapHeight = 680;
const maxPaperLength = 200;

const countries = feature(
  world as unknown as Parameters<typeof feature>[0],
  (world as { objects: { countries: unknown } }).objects.countries as Parameters<
    typeof feature
  >[1],
) as unknown as GeometryCollection;

const projection = geoEquirectangular().fitExtent(
  [
    [34, 118],
    [966, 562],
  ],
  { type: "Sphere" },
);
const path = geoPath(projection);

function emptyTotals(): Totals {
  return {
    sessions: 0,
    seconds: 0,
    together: 0,
  };
}

function loadTotals(): Totals {
  if (typeof window === "undefined") {
    return emptyTotals();
  }

  const saved = window.localStorage.getItem(totalsKey);
  if (!saved) {
    return emptyTotals();
  }

  try {
    return JSON.parse(saved) as Totals;
  } catch {
    window.localStorage.removeItem(totalsKey);
    return emptyTotals();
  }
}

function loadPublicPapers(): PublicPaper[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = window.localStorage.getItem(publicPapersKey);
  if (!saved) {
    return [];
  }

  try {
    return (JSON.parse(saved) as PublicPaper[]).filter(
      (paper) => Date.now() - paper.createdAt < oneDay,
    );
  } catch {
    window.localStorage.removeItem(publicPapersKey);
    return [];
  }
}

function formatTotalTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}小时${rest}分钟` : `${hours}小时`;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}分${rest}秒`;
}

function getElapsedSeconds(startedAt: number | null, now: number) {
  if (!startedAt || !now) {
    return 0;
  }

  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

function WorldMap({
  points,
  onOpenPaper,
}: {
  points: LivePoint[];
  onOpenPaper: () => void;
}) {
  const projected = points
    .map((point) => ({ ...point, xy: projection(point.coordinates) }))
    .filter((point): point is LivePoint & { xy: [number, number] } =>
      Boolean(point.xy),
    );

  return (
    <button className="world-pane" onClick={onOpenPaper} aria-label="世界">
      <svg
        className="world-map"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="mapPointGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6b93c5" stopOpacity="0.64" />
            <stop offset="52%" stopColor="#7fa7d6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7fa7d6" stopOpacity="0" />
          </radialGradient>
        </defs>
        {countries.features.map((country) => (
          <path
            className="map-country"
            d={path(country as Parameters<typeof path>[0]) ?? undefined}
            key={country.id}
          />
        ))}
        {projected.map((point) => (
          <g
            className="map-point"
            key={point.id}
            transform={`translate(${point.xy[0]} ${point.xy[1]})`}
          >
            <circle className="map-point-glow" r="28" />
            <circle className="map-point-core" r="4.4" />
          </g>
        ))}
      </svg>
    </button>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [sessionPane, setSessionPane] = useState<SessionPane>("paper");
  const [paperOpen, setPaperOpen] = useState(false);
  const [thoughtOpen, setThoughtOpen] = useState(false);
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [paperText, setPaperText] = useState("");
  const [totals, setTotals] = useState<Totals>(loadTotals);
  const [publicPapers, setPublicPapers] =
    useState<PublicPaper[]>(loadPublicPapers);
  const [selfCoordinates, setSelfCoordinates] =
    useState<[number, number] | null>(null);
  const horizontalSwipe = useRef<{ x: number; y: number } | null>(null);
  const verticalSwipe = useRef<{ y: number } | null>(null);

  const active = screen === "session" || screen === "flush";
  const elapsedSeconds = getElapsedSeconds(startedAt, now);
  const globalCompanions = 0;
  const currentThought = publicPapers[thoughtIndex] ?? null;
  const livePoints =
    screen === "session" && selfCoordinates
      ? [{ id: "self", coordinates: selfCoordinates }]
      : [];
  const flushText = paperText.trim()
    ? "一些厕中奇思和大便一起被冲走了"
    : "一些烦恼和大便一起被冲走了";

  useEffect(() => {
    window.localStorage.setItem(totalsKey, JSON.stringify(totals));
  }, [totals]);

  useEffect(() => {
    window.localStorage.setItem(publicPapersKey, JSON.stringify(publicPapers));
  }, [publicPapers]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  function startSession() {
    setStartedAt(Date.now());
    setNow(Date.now());
    setSessionPane("paper");
    setPaperOpen(false);
    setThoughtOpen(false);
    setPaperText("");
    setScreen("session");

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

  function enterFlush() {
    setPaperOpen(false);
    setThoughtOpen(false);
    setScreen("flush");
  }

  function flushSession() {
    const endedAt = Date.now();
    const elapsed = startedAt
      ? Math.max(1, Math.round((endedAt - startedAt) / 1000))
      : 0;
    const text = paperText.trim();

    if (text) {
      setPublicPapers((current) => [
        {
          id: `${endedAt}`,
          text,
          likes: 0,
          createdAt: endedAt,
        },
        ...current,
      ]);
    }

    setTotals((current) => ({
      sessions: current.sessions + 1,
      seconds: current.seconds + elapsed,
      together: current.together + globalCompanions,
    }));
    setStartedAt(null);
    setPaperText("");
    setSelfCoordinates(null);
    setScreen("home");
  }

  function handleHorizontalStart(event: PointerEvent<HTMLDivElement>) {
    if (paperOpen || thoughtOpen) {
      return;
    }

    horizontalSwipe.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handleHorizontalEnd(event: PointerEvent<HTMLDivElement>) {
    const start = horizontalSwipe.current;
    horizontalSwipe.current = null;
    if (!start || paperOpen || thoughtOpen) {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) {
      return;
    }

    setSessionPane(dx < 0 ? "world" : "paper");
  }

  function openWorldPaper() {
    if (publicPapers.length === 0) {
      return;
    }

    setThoughtIndex((index) => Math.min(index, publicPapers.length - 1));
    setThoughtOpen(true);
  }

  function handleThoughtStart(event: PointerEvent<HTMLDivElement>) {
    verticalSwipe.current = { y: event.clientY };
  }

  function handleThoughtEnd(event: PointerEvent<HTMLDivElement>) {
    const start = verticalSwipe.current;
    verticalSwipe.current = null;
    if (!start || publicPapers.length < 2) {
      return;
    }

    const dy = event.clientY - start.y;
    if (Math.abs(dy) < 42) {
      return;
    }

    setThoughtIndex((index) =>
      dy < 0
        ? (index + 1) % publicPapers.length
        : (index - 1 + publicPapers.length) % publicPapers.length,
    );
  }

  function reactToThought() {
    if (!currentThought) {
      return;
    }

    setPublicPapers((papers) =>
      papers.map((paper) =>
        paper.id === currentThought.id
          ? { ...paper, likes: paper.likes + 1 }
          : paper,
      ),
    );
  }

  return (
    <main className={`app-shell screen-${screen}`}>
      {screen === "home" && (
        <>
          <header className="home-top">
            <span className="brand">P∞P</span>
            <button className="settings-entry" onClick={() => setScreen("settings")}>
              设置
            </button>
          </header>

          <section className="home-screen" aria-label="首页">
            <div className="totals-list">
              <p>
                <span>{totals.sessions.toLocaleString("zh-CN")}</span>
                一共拉了几次
              </p>
              <p>
                <span>{formatTotalTime(totals.seconds)}</span>
                一共拉了多长时间
              </p>
              <p>
                <span>{totals.together.toLocaleString("zh-CN")}人</span>
                已经和多少人一起拉过
              </p>
            </div>
            <button className="start-button" onClick={startSession}>
              开拉
            </button>
          </section>
        </>
      )}

      {screen === "settings" && (
        <section className="settings-screen" aria-label="设置">
          <header className="settings-top">
            <span>P∞P</span>
            <button onClick={() => setScreen("home")}>完成</button>
          </header>
          <div className="settings-list">
            {["语言", "通知", "账号", "隐私", "关于"].map((item) => (
              <button className="settings-row" key={item}>
                <span>{item}</span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {screen === "session" && (
        <section
          className="session-screen"
          onPointerDown={handleHorizontalStart}
          onPointerUp={handleHorizontalEnd}
          aria-label="拉屎进行中"
        >
          <div
            className="session-track"
            style={{
              transform:
                sessionPane === "world" ? "translateX(-50%)" : "translateX(0)",
            }}
          >
            <div className="session-slide">
              {!paperOpen ? (
                <div className="pooping-panel">
                  <button
                    className="paper-roll"
                    onClick={() => setPaperOpen(true)}
                    aria-label="厕纸"
                  >
                    <span className="roll-core" />
                    <span className="paper-sheet">
                      <span>{paperText}</span>
                    </span>
                  </button>
                  <div className="session-lines">
                    <p>开拉 {formatElapsed(elapsedSeconds)}</p>
                    <p>和全球 {globalCompanions.toLocaleString("zh-CN")} 人一起拉</p>
                  </div>
                  <button className="done-button" onClick={enterFlush}>
                    已拉完
                  </button>
                </div>
              ) : (
                <div
                  className="paper-expanded"
                  onClick={() => setPaperOpen(false)}
                  role="button"
                  tabIndex={0}
                  aria-label="厕纸"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setPaperOpen(false);
                    }
                  }}
                >
                  <textarea
                    value={paperText}
                    maxLength={maxPaperLength}
                    onChange={(event) => setPaperText(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
              )}
            </div>

            <div className="session-slide">
              {!thoughtOpen ? (
                <WorldMap points={livePoints} onOpenPaper={openWorldPaper} />
              ) : (
                <div
                  className="thought-view"
                  onPointerDown={handleThoughtStart}
                  onPointerUp={handleThoughtEnd}
                >
                  <button
                    className="thought-paper"
                    onClick={() => setThoughtOpen(false)}
                    aria-label="匿名厕纸"
                  >
                    <span>{currentThought?.text}</span>
                  </button>
                  {currentThought && (
                    <button className="reaction-button" onClick={reactToThought}>
                      ☺ {currentThought.likes.toLocaleString("zh-CN")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {screen === "flush" && (
        <section className="flush-screen" aria-label="冲水">
          <p>{flushText}</p>
          <button className="flush-button" onClick={flushSession} aria-label="冲水">
            <span />
          </button>
        </section>
      )}
    </main>
  );
}

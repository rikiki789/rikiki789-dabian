"use client";

import { geoEquirectangular, geoPath } from "d3-geo";
import type { PointerEvent } from "react";
import { useEffect, useReducer, useRef } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import {
  MAX_PAPER_LENGTH,
  LivePoint,
  createInitialState,
  formatElapsed,
  formatTotalTime,
  getElapsedSeconds,
  getFlushText,
  productReducer,
} from "./lib/poop-core";
import {
  loadPublicPapersFromDevice,
  loadTotalsFromDevice,
  savePublicPapersToDevice,
  saveTotalsToDevice,
} from "./lib/poop-storage";

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
const mapHeight = 680;

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
  const [state, dispatch] = useReducer(
    productReducer,
    undefined,
    () =>
      createInitialState({
        totals: loadTotalsFromDevice(),
        publicPapers: loadPublicPapersFromDevice(),
      }),
  );
  const horizontalSwipe = useRef<{ x: number; y: number } | null>(null);
  const verticalSwipe = useRef<{ y: number } | null>(null);

  const active = state.screen === "session" || state.screen === "flush";
  const elapsedSeconds = getElapsedSeconds(state.startedAt, state.now);
  const currentThought = state.publicPapers[state.thoughtIndex] ?? null;
  const livePoints =
    state.screen === "session" && state.selfCoordinates
      ? [{ id: "self", coordinates: state.selfCoordinates }]
      : [];
  const flushText = getFlushText(state.paperText);

  useEffect(() => {
    saveTotalsToDevice(state.totals);
  }, [state.totals]);

  useEffect(() => {
    savePublicPapersToDevice(state.publicPapers);
  }, [state.publicPapers]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = window.setInterval(
      () => dispatch({ type: "tick", now: Date.now() }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [active]);

  function startSession() {
    dispatch({ type: "startSession", now: Date.now() });

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          dispatch({
            type: "setCoordinates",
            coordinates: [position.coords.longitude, position.coords.latitude],
          });
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 4500, maximumAge: 600000 },
      );
    }
  }

  function enterFlush() {
    dispatch({ type: "enterFlush" });
  }

  function flushSession() {
    dispatch({ type: "flush", now: Date.now() });
  }

  function handleHorizontalStart(event: PointerEvent<HTMLDivElement>) {
    if (state.paperOpen || state.thoughtOpen) {
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
    if (!start || state.paperOpen || state.thoughtOpen) {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) {
      return;
    }

    dispatch({ type: "setPane", pane: dx < 0 ? "world" : "paper" });
  }

  function openWorldPaper() {
    dispatch({ type: "openThought" });
  }

  function handleThoughtStart(event: PointerEvent<HTMLDivElement>) {
    verticalSwipe.current = { y: event.clientY };
  }

  function handleThoughtEnd(event: PointerEvent<HTMLDivElement>) {
    const start = verticalSwipe.current;
    verticalSwipe.current = null;
    if (!start || state.publicPapers.length < 2) {
      return;
    }

    const dy = event.clientY - start.y;
    if (Math.abs(dy) < 42) {
      return;
    }

    dispatch({ type: dy < 0 ? "nextThought" : "previousThought" });
  }

  function reactToThought() {
    dispatch({ type: "reactToThought" });
  }

  return (
    <main className={`app-shell screen-${state.screen}`}>
      {state.screen === "home" && (
        <>
          <header className="home-top">
            <span className="brand">P∞P</span>
            <button
              className="settings-entry"
              onClick={() => dispatch({ type: "openSettings" })}
            >
              设置
            </button>
          </header>

          <section className="home-screen" aria-label="首页">
            <div className="totals-list">
              <p>
                <span>{state.totals.sessions.toLocaleString("zh-CN")}</span>
                一共拉了几次
              </p>
              <p>
                <span>{formatTotalTime(state.totals.seconds)}</span>
                一共拉了多长时间
              </p>
              <p>
                <span>{state.totals.together.toLocaleString("zh-CN")}人</span>
                已经和多少人一起拉过
              </p>
            </div>
            <button className="start-button" onClick={startSession}>
              开拉
            </button>
          </section>
        </>
      )}

      {state.screen === "settings" && (
        <section className="settings-screen" aria-label="设置">
          <header className="settings-top">
            <span>P∞P</span>
            <button onClick={() => dispatch({ type: "closeSettings" })}>
              完成
            </button>
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

      {state.screen === "session" && (
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
                state.sessionPane === "world"
                  ? "translateX(-50%)"
                  : "translateX(0)",
            }}
          >
            <div className="session-slide">
              {!state.paperOpen ? (
                <div className="pooping-panel">
                  <button
                    className="paper-roll"
                    onClick={() => dispatch({ type: "openPaper" })}
                    aria-label="厕纸"
                  >
                    <span className="roll-core" />
                    <span className="paper-sheet">
                      <span>{state.paperText}</span>
                    </span>
                  </button>
                  <div className="session-lines">
                    <p>开拉 {formatElapsed(elapsedSeconds)}</p>
                    <p>
                      和全球 {state.activeTogether.toLocaleString("zh-CN")} 人一起拉
                    </p>
                  </div>
                  <button className="done-button" onClick={enterFlush}>
                    已拉完
                  </button>
                </div>
              ) : (
                <div
                  className="paper-expanded"
                  onClick={() => dispatch({ type: "closePaper" })}
                  role="button"
                  tabIndex={0}
                  aria-label="厕纸"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      dispatch({ type: "closePaper" });
                    }
                  }}
                >
                  <textarea
                    value={state.paperText}
                    maxLength={MAX_PAPER_LENGTH}
                    onChange={(event) =>
                      dispatch({ type: "updatePaper", text: event.target.value })
                    }
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
              )}
            </div>

            <div className="session-slide">
              {!state.thoughtOpen ? (
                <WorldMap points={livePoints} onOpenPaper={openWorldPaper} />
              ) : (
                <div
                  className="thought-view"
                  onPointerDown={handleThoughtStart}
                  onPointerUp={handleThoughtEnd}
                >
                  <button
                    className="thought-paper"
                    onClick={() => dispatch({ type: "closeThought" })}
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

      {state.screen === "flush" && (
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

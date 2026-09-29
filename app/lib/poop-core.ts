export type Screen = "home" | "session" | "flush" | "settings";
export type SessionPane = "paper" | "world";

export type Totals = {
  sessions: number;
  seconds: number;
  together: number;
};

export type PublicPaper = {
  id: string;
  text: string;
  likes: number;
  createdAt: number;
};

export type LivePoint = {
  id: string;
  coordinates: [number, number];
};

export type ProductState = {
  screen: Screen;
  previousScreen: Screen;
  sessionPane: SessionPane;
  paperOpen: boolean;
  thoughtOpen: boolean;
  thoughtIndex: number;
  startedAt: number | null;
  now: number;
  paperText: string;
  totals: Totals;
  publicPapers: PublicPaper[];
  selfCoordinates: [number, number] | null;
  activeTogether: number;
};

export type ProductAction =
  | { type: "openSettings" }
  | { type: "closeSettings" }
  | { type: "startSession"; now: number }
  | { type: "tick"; now: number }
  | { type: "setCoordinates"; coordinates: [number, number] }
  | { type: "openPaper" }
  | { type: "closePaper" }
  | { type: "updatePaper"; text: string }
  | { type: "setPane"; pane: SessionPane }
  | { type: "openThought" }
  | { type: "closeThought" }
  | { type: "nextThought" }
  | { type: "previousThought" }
  | { type: "reactToThought" }
  | { type: "enterFlush" }
  | { type: "flush"; now: number };

export const MAX_PAPER_LENGTH = 200;
export const PUBLIC_PAPER_TTL_MS = 24 * 60 * 60 * 1000;

export function emptyTotals(): Totals {
  return {
    sessions: 0,
    seconds: 0,
    together: 0,
  };
}

export function createInitialState(input?: {
  totals?: Totals;
  publicPapers?: PublicPaper[];
  now?: number;
}): ProductState {
  const now = input?.now ?? 0;

  return {
    screen: "home",
    previousScreen: "home",
    sessionPane: "paper",
    paperOpen: false,
    thoughtOpen: false,
    thoughtIndex: 0,
    startedAt: null,
    now,
    paperText: "",
    totals: input?.totals ?? emptyTotals(),
    publicPapers: prunePublicPapers(input?.publicPapers ?? [], now || Date.now()),
    selfCoordinates: null,
    activeTogether: 0,
  };
}

export function productReducer(
  state: ProductState,
  action: ProductAction,
): ProductState {
  switch (action.type) {
    case "openSettings":
      return {
        ...state,
        previousScreen: state.screen,
        screen: "settings",
      };

    case "closeSettings":
      return {
        ...state,
        screen: state.previousScreen === "settings" ? "home" : state.previousScreen,
        previousScreen: "home",
      };

    case "startSession":
      return {
        ...state,
        screen: "session",
        sessionPane: "paper",
        paperOpen: false,
        thoughtOpen: false,
        thoughtIndex: 0,
        startedAt: action.now,
        now: action.now,
        paperText: "",
        selfCoordinates: null,
        activeTogether: 0,
      };

    case "tick":
      if (state.screen !== "session" && state.screen !== "flush") {
        return state;
      }

      return {
        ...state,
        now: action.now,
      };

    case "setCoordinates":
      if (state.screen !== "session") {
        return state;
      }

      return {
        ...state,
        selfCoordinates: action.coordinates,
      };

    case "openPaper":
      if (state.screen !== "session" || state.sessionPane !== "paper") {
        return state;
      }

      return {
        ...state,
        paperOpen: true,
      };

    case "closePaper":
      return {
        ...state,
        paperOpen: false,
      };

    case "updatePaper":
      return {
        ...state,
        paperText: action.text.slice(0, MAX_PAPER_LENGTH),
      };

    case "setPane":
      if (state.screen !== "session" || state.paperOpen || state.thoughtOpen) {
        return state;
      }

      return {
        ...state,
        sessionPane: action.pane,
      };

    case "openThought":
      if (state.screen !== "session" || state.sessionPane !== "world") {
        return state;
      }

      if (state.publicPapers.length === 0) {
        return state;
      }

      return {
        ...state,
        thoughtOpen: true,
        thoughtIndex: Math.min(state.thoughtIndex, state.publicPapers.length - 1),
      };

    case "closeThought":
      return {
        ...state,
        thoughtOpen: false,
      };

    case "nextThought":
      if (state.publicPapers.length < 2) {
        return state;
      }

      return {
        ...state,
        thoughtIndex: (state.thoughtIndex + 1) % state.publicPapers.length,
      };

    case "previousThought":
      if (state.publicPapers.length < 2) {
        return state;
      }

      return {
        ...state,
        thoughtIndex:
          (state.thoughtIndex - 1 + state.publicPapers.length) %
          state.publicPapers.length,
      };

    case "reactToThought": {
      const current = state.publicPapers[state.thoughtIndex];
      if (!current) {
        return state;
      }

      return {
        ...state,
        publicPapers: state.publicPapers.map((paper) =>
          paper.id === current.id ? { ...paper, likes: paper.likes + 1 } : paper,
        ),
      };
    }

    case "enterFlush":
      if (state.screen !== "session") {
        return state;
      }

      return {
        ...state,
        screen: "flush",
        paperOpen: false,
        thoughtOpen: false,
      };

    case "flush": {
      if (state.screen !== "flush") {
        return state;
      }

      const elapsed = state.startedAt
        ? Math.max(1, Math.round((action.now - state.startedAt) / 1000))
        : 0;
      const text = state.paperText.trim();
      const uploadedPaper = text
        ? [
            {
              id: `${action.now}`,
              text,
              likes: 0,
              createdAt: action.now,
            },
          ]
        : [];

      return {
        ...state,
        screen: "home",
        sessionPane: "paper",
        paperOpen: false,
        thoughtOpen: false,
        thoughtIndex: 0,
        startedAt: null,
        now: action.now,
        paperText: "",
        totals: {
          sessions: state.totals.sessions + 1,
          seconds: state.totals.seconds + elapsed,
          together: state.totals.together + state.activeTogether,
        },
        publicPapers: prunePublicPapers(
          [...uploadedPaper, ...state.publicPapers],
          action.now,
        ),
        selfCoordinates: null,
        activeTogether: 0,
      };
    }

    default:
      return state;
  }
}

export function prunePublicPapers(papers: PublicPaper[], now: number) {
  return papers.filter((paper) => now - paper.createdAt < PUBLIC_PAPER_TTL_MS);
}

export function getElapsedSeconds(startedAt: number | null, now: number) {
  if (!startedAt || !now) {
    return 0;
  }

  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}分${rest}秒`;
}

export function formatTotalTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}小时${rest}分钟` : `${hours}小时`;
}

export function getFlushText(paperText: string) {
  return paperText.trim()
    ? "一些厕中奇思和大便一起被冲走了"
    : "一些烦恼和大便一起被冲走了";
}

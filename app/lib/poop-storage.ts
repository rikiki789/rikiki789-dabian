import {
  PublicPaper,
  Totals,
  emptyTotals,
  prunePublicPapers,
} from "./poop-core";

export const totalsStorageKey = "poop-totals";
export const publicPapersStorageKey = "poop-public-papers";

export function loadTotalsFromDevice(): Totals {
  if (typeof window === "undefined") {
    return emptyTotals();
  }

  return readJson<Totals>(totalsStorageKey, emptyTotals());
}

export function saveTotalsToDevice(totals: Totals) {
  writeJson(totalsStorageKey, totals);
}

export function loadPublicPapersFromDevice(now = Date.now()): PublicPaper[] {
  if (typeof window === "undefined") {
    return [];
  }

  return prunePublicPapers(
    readJson<PublicPaper[]>(publicPapersStorageKey, []),
    now,
  );
}

export function savePublicPapersToDevice(papers: PublicPaper[]) {
  writeJson(publicPapersStorageKey, papers);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

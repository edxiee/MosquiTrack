import { lazy, type ComponentType } from "react";

const RELOAD_STORAGE_KEY = "mosquitrack_chunk_reload";
const RELOAD_COOLDOWN_MS = 15_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Unable to preload CSS") ||
    error.name === "ChunkLoadError"
  );
}

export function tryReloadForChunkError(): boolean {
  try {
    const raw = sessionStorage.getItem(RELOAD_STORAGE_KEY);
    const now = Date.now();

    if (raw) {
      const parsed = JSON.parse(raw) as { path?: string; timestamp?: number };
      if (
        parsed.path === window.location.pathname &&
        typeof parsed.timestamp === "number" &&
        now - parsed.timestamp < RELOAD_COOLDOWN_MS
      ) {
        return false;
      }
    }

    sessionStorage.setItem(
      RELOAD_STORAGE_KEY,
      JSON.stringify({ path: window.location.pathname, timestamp: now })
    );
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error) && tryReloadForChunkError()) {
        // Hold rendering while the browser performs a full reload
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}


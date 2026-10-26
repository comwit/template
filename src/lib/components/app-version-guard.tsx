"use client";

import { useEffect } from "react";

const CURRENT_APP_VERSION = process.env.NEXT_PUBLIC_COMWIT_APP_VERSION?.trim() || "";
const RELOAD_STORAGE_PREFIX = "comwit-app-version-reload:";

type VersionPayload = {
  version?: unknown;
};

function getReloadStorageKey(currentVersion: string, latestVersion: string) {
  return `${RELOAD_STORAGE_PREFIX}${currentVersion}->${latestVersion}`;
}

function hasReloadedForVersion(currentVersion: string, latestVersion: string) {
  try {
    return sessionStorage.getItem(getReloadStorageKey(currentVersion, latestVersion)) === "1";
  } catch {
    return false;
  }
}

function markReloadedForVersion(currentVersion: string, latestVersion: string) {
  try {
    sessionStorage.setItem(getReloadStorageKey(currentVersion, latestVersion), "1");
  } catch {
    // sessionStorage can be unavailable in restricted browser modes.
  }
}

export function AppVersionGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!CURRENT_APP_VERSION) return;

    let stopped = false;

    const checkLatestVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "cache-control": "no-cache",
            pragma: "no-cache",
          },
        });
        if (!res.ok || stopped) return;

        const payload = (await res.json()) as VersionPayload;
        const latestVersion =
          typeof payload.version === "string" ? payload.version.trim() : "";
        if (!latestVersion || latestVersion === CURRENT_APP_VERSION) return;
        if (hasReloadedForVersion(CURRENT_APP_VERSION, latestVersion)) return;

        markReloadedForVersion(CURRENT_APP_VERSION, latestVersion);
        window.location.reload();
      } catch {
        // Checks are best-effort; offline and flaky networks should keep working.
      }
    };

    // Check once per document load, including loads in a background tab.
    // Focus and visibility changes must not keep an idle backend awake.
    void checkLatestVersion();

    return () => {
      stopped = true;
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  emitNavigation,
  emitReady,
  type ParentCommand,
} from "@/lib/utils/sandbox-events";

/**
 * Sandbox Bridge
 * Connect an iframe to its parent window (MVPStar).
 * Publish navigation events from pushState/popstate, handle parent commands,
 * and announce when the app is ready.
 */

export function SandboxBridge() {
  const router = useRouter();

  // Publish the current path.
  const emitCurrentNavigation = useCallback(() => {
    emitNavigation({
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    });
  }, []);

  // Handle commands from the parent.
  const handleParentCommand = useCallback(
    (event: MessageEvent) => {
      // Accept only messages from mvpstar-parent.
      if (event.data?.source !== "mvpstar-parent") return;

      const { type, payload } = event.data as ParentCommand;

      switch (type) {
        case "navigate-back":
          router.back();
          break;
        case "navigate-forward":
          router.forward();
          break;
        case "navigate-to":
          if (payload?.path && typeof payload.path === "string") {
            router.push(payload.path);
          }
          break;
        case "refresh":
          router.refresh();
          break;
      }
    },
    [router]
  );

  useEffect(() => {
    // Do not run outside an iframe.
    if (window.parent === window) return;

    // Subscribe to parent commands.
    window.addEventListener("message", handleParentCommand);

    // Announce app readiness.
    emitReady({ path: window.location.pathname });

    // Publish initial navigation.
    emitCurrentNavigation();

    // popstate handles back/forward navigation.
    const handlePopState = () => {
      emitCurrentNavigation();
    };
    window.addEventListener("popstate", handlePopState);

    // Detect pushState/replaceState (including Next.js App Router).
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function (...args) {
      originalPushState(...args);
      // Publish after a short delay so Next.js can finish updating the URL.
      setTimeout(emitCurrentNavigation, 0);
    };

    history.replaceState = function (...args) {
      originalReplaceState(...args);
      setTimeout(emitCurrentNavigation, 0);
    };

    return () => {
      window.removeEventListener("message", handleParentCommand);
      window.removeEventListener("popstate", handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [emitCurrentNavigation, handleParentCommand]);

  return null;
}


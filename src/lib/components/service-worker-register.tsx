"use client";

import { useEffect } from "react";
import { toast } from "@/lib/components/ui/toast";
import { uiText } from "@/lib/ui-text";
import { observeControllerChanges, setupServiceWorkerUpdates } from "@/lib/service-worker/updates";

/**
 * Registers the production service worker after load. Development unregisters
 * old workers and removes their caches so local debugging never uses stale code.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void disableServiceWorkerInDevelopment();
      return;
    }

    // Native app embeds have their own offline/cache behavior.
    try {
      if (window.parent !== window) return;
    } catch {
      return;
    }

    const stopObserving = observeControllerChanges();
    let cancelled = false;
    let cleanupRegistration: (() => void) | undefined;
    let removeLoadListener: (() => void) | undefined;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          if (cancelled) return;
          cleanupRegistration = setupServiceWorkerUpdates(registration, (apply, status) => {
            toast(uiText.appUpdate.title, {
              id: "comwit-app-update",
              duration: Infinity,
              description: uiText.appUpdate[status],
              action: {
                label: uiText.appUpdate.action,
                onClick: (event) => { event.preventDefault(); void apply(); },
              },
            });
          });
        })
        .catch(() => {
          // Registration failure is non-fatal; the app continues as a normal web app.
        });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      removeLoadListener = () => window.removeEventListener("load", register);
    }

    return () => {
      cancelled = true;
      stopObserving();
      toast.dismiss("comwit-app-update");
      removeLoadListener?.();
      cleanupRegistration?.();
    };
  }, []);

  return null;
}

async function disableServiceWorkerInDevelopment() {
  const wasControlled = navigator.serviceWorker.controller !== null;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("comwit-"))
          .map((cacheName) => window.caches.delete(cacheName)),
      );
    }

    const reloadKey = "comwit-dev-service-worker-cleanup";
    if (!wasControlled) {
      window.sessionStorage.removeItem(reloadKey);
      return;
    }

    if (window.sessionStorage.getItem(reloadKey) !== "done") {
      window.sessionStorage.setItem(reloadKey, "done");
      window.location.reload();
    }
  } catch {
    // Development cleanup is best-effort.
  }
}

type UpdateStatus = "ready" | "blocked" | "failed";
type NotifyUpdate = (apply: () => Promise<void>, status: UpdateStatus) => void;

/** Subscribe before registration so a worker activated by another tab is observed. */
export function observeControllerChanges() {
  let hadController = navigator.serviceWorker.controller !== null;
  let reloaded = false;
  const onChange = () => {
    if (!navigator.serviceWorker.controller) return;
    if (hadController && !reloaded) {
      reloaded = true;
      window.location.reload();
    }
    hadController = true;
  };
  navigator.serviceWorker.addEventListener("controllerchange", onChange);
  return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
}

export function setupServiceWorkerUpdates(registration: ServiceWorkerRegistration, notify: NotifyUpdate) {
  let stopped = false;
  let checking = false;
  let applying = false;
  let announced: ServiceWorker | null = null;
  const tracked = new Map<ServiceWorker, () => void>();
  let cancelMessage: (() => void) | undefined;

  const apply = async () => {
    const waiting = registration.waiting;
    if (stopped || applying || !waiting) return;
    applying = true;
    const channel = new MessageChannel();
    try {
      const result = await new Promise<unknown>((resolve, reject) => {
        // A single request timeout, never an update polling timer.
        const timeout = window.setTimeout(() => reject(new Error("Worker did not respond")), 5000);
        cancelMessage = () => {
          window.clearTimeout(timeout);
          channel.port1.close();
          channel.port2.close();
          resolve("cancelled");
        };
        channel.port1.onmessage = (event) => resolve(event.data);
        waiting.postMessage({ type: "COMWIT_APPLY_UPDATE" }, [channel.port2]);
      });
      if (!stopped && result !== "activating") notify(apply, result === "blocked" ? "blocked" : "failed");
    } catch {
      if (!stopped) notify(apply, "failed");
    } finally {
      cancelMessage?.();
      cancelMessage = undefined;
      applying = false;
    }
  };

  const announce = () => {
    const waiting = registration.waiting;
    if (stopped || !waiting || waiting === announced || !navigator.serviceWorker.controller) return;
    announced = waiting;
    notify(apply, "ready");
  };

  const trackInstalling = () => {
    const worker = registration.installing;
    if (!worker || tracked.has(worker)) return;
    const onStateChange = () => {
      if (worker.state !== "installed" && worker.state !== "redundant") return;
      worker.removeEventListener("statechange", onStateChange);
      tracked.delete(worker);
      announce();
    };
    tracked.set(worker, onStateChange);
    worker.addEventListener("statechange", onStateChange);
    onStateChange();
  };

  const check = async () => {
    if (stopped || checking || document.visibilityState !== "visible" || navigator.onLine === false) return;
    checking = true;
    try {
      await registration.update();
      announce();
    } catch {
      // Keep the current worker and cache on offline or installation failures.
    } finally {
      checking = false;
    }
  };

  // register() performs the initial check. There is no interval or idle retry.
  registration.addEventListener("updatefound", trackInstalling);
  window.addEventListener("focus", check);
  window.addEventListener("online", check);
  document.addEventListener("visibilitychange", check);
  trackInstalling();
  announce();

  return () => {
    stopped = true;
    cancelMessage?.();
    registration.removeEventListener("updatefound", trackInstalling);
    window.removeEventListener("focus", check);
    window.removeEventListener("online", check);
    document.removeEventListener("visibilitychange", check);
    for (const [worker, listener] of tracked) worker.removeEventListener("statechange", listener);
    tracked.clear();
  };
}

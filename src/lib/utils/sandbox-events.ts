/**
 * Sandbox Events System
 * Forward iframe events to the parent window (MVPStar), which handles them via postMessage.
 *
 * @example
 * emitNavigation({ path: "/dashboard" });
 * emitReactGrab({ content: "<div>...", path: "/page" });
 * iframe.contentWindow?.postMessage(
 *   { source: "mvpstar-parent", type: "react-grab-activate", timestamp: Date.now() },
 *   "*"
 * );
 */

// Events sent to the parent.
export type SandboxEventType =
  | "navigation" // URL changed.
  | "ready" // App ready.
  | "error" // Error occurred.
  | "action" // User action.
  | "react-grab"; // Element selected with react-grab.

// Commands received from the parent.
export type ParentCommandType =
  | "navigate-back" // Go back.
  | "navigate-forward" // Go forward.
  | "navigate-to" // Navigate to a path.
  | "refresh" // Reload.
  | "react-grab-activate"; // Activate react-grab element selection.

// Event payload types.
export interface SandboxEventPayloads {
  navigation: {
    path: string;
    search?: string;
    hash?: string;
  };
  ready: {
    path: string;
  };
  error: {
    message: string;
    code?: string;
  };
  action: {
    name: string;
    data?: unknown;
  };
  "react-grab": {
    content: string; // Selected element HTML.
    elementTag?: string; // Element tag name.
    path: string; // Current page path.
    position?: { x: number; y: number }; // Selected element position.
    prompt?: string; // User prompt in agent mode.
  };
}

export interface ParentMessage<T extends SandboxEventType = SandboxEventType> {
  source: "mvpstar-sandbox";
  type: T;
  payload: SandboxEventPayloads[T];
  timestamp: number;
}

export interface ParentCommand {
  source: "mvpstar-parent";
  type: ParentCommandType;
  payload?: Record<string, unknown>;
  timestamp: number;
}

/** Send an event to the parent window. */
function emit<T extends SandboxEventType>(
  type: T,
  payload: SandboxEventPayloads[T]
): void {
  if (typeof window === "undefined") return;
  if (window.parent === window) return; // Outside an iframe.

  const message: ParentMessage<T> = {
    source: "mvpstar-sandbox",
    type,
    payload,
    timestamp: Date.now(),
  };

  window.parent.postMessage(message, "*");
}

// Event publishing functions.
export const emitNavigation = (
  payload: SandboxEventPayloads["navigation"]
): void => emit("navigation", payload);

export const emitReady = (payload: SandboxEventPayloads["ready"]): void =>
  emit("ready", payload);

export const emitError = (payload: SandboxEventPayloads["error"]): void =>
  emit("error", payload);

export const emitAction = (payload: SandboxEventPayloads["action"]): void =>
  emit("action", payload);

export const emitReactGrab = (
  payload: SandboxEventPayloads["react-grab"]
): void => emit("react-grab", payload);

"use client";

import type { ReactGrabAPI } from "react-grab/core";
import { useEffect } from "react";
import { emitReactGrab } from "@/lib/utils/sandbox-events";
import type { ParentCommand } from "@/lib/utils/sandbox-events";

type Point = { x: number; y: number };
type GenerateSnippet = typeof import("react-grab/core").generateSnippet;

/**
 * React Grab Initializer
 *
 * The parent workspace activates element selection with a `react-grab-activate`
 * command, and the selected element is sent back as a `react-grab` event.
 * Works with mouse and touch: selection never depends on the clipboard.
 */
export function ReactGrabInit() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let reactGrab: ReactGrabAPI | null = null;
    let generateSnippet: GenerateSnippet | null = null;
    let activateWhenReady = false;
    let disposed = false;
    let lastPointer: Point | null = null;
    let pendingSelection: Element[] | null = null;

    // Capture phase: react-grab stops propagation of the pointer events it handles.
    const handlePointer = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      lastPointer = { x: event.clientX, y: event.clientY };
    };

    const activateReactGrab = () => {
      if (!reactGrab) {
        activateWhenReady = true;
        return;
      }

      lastPointer = null;
      reactGrab.activate();
    };

    const handleParentCommand = (event: MessageEvent) => {
      const expectedSource = window.parent === window ? window : window.parent;
      if (event.source !== expectedSource) return;

      const command = event.data as Partial<ParentCommand> | undefined;
      if (
        command?.source !== "mvpstar-parent" ||
        command.type !== "react-grab-activate"
      ) {
        return;
      }

      activateReactGrab();
    };

    const sendSelection = async (elements: Element[]) => {
      const element = elements[elements.length - 1];
      const rect = element.getBoundingClientRect();
      // Prefer the pointer that made the selection; fall back to the element's bottom center.
      const position = lastPointer ?? {
        x: rect.left + rect.width / 2,
        y: rect.bottom,
      };
      lastPointer = null;
      reactGrab?.deactivate();

      let content = "";
      try {
        const snippets = (await generateSnippet?.(elements)) ?? [];
        content = snippets.filter(Boolean).join("\n\n");
      } catch (error) {
        console.error("Failed to describe the selected element:", error);
      }

      emitReactGrab({
        content: content.trim() ? content : element.outerHTML.slice(0, 2000),
        elementTag: element.tagName.toLowerCase(),
        path: window.location.pathname,
        position,
      });
    };

    // Intercepting the selection skips react-grab's clipboard copy, which mobile
    // browsers reject inside the preview iframe. A drag selection calls this once
    // per element in the same task, so the elements are sent as one event.
    const handleElementSelect = (element: Element) => {
      if (!pendingSelection) {
        const elements: Element[] = [];
        pendingSelection = elements;
        queueMicrotask(() => {
          pendingSelection = null;
          void sendSelection(elements);
        });
      }
      pendingSelection.push(element);
      return true;
    };

    const pointerOptions = { capture: true, passive: true };
    window.addEventListener("pointerdown", handlePointer, pointerOptions);
    window.addEventListener("pointermove", handlePointer, pointerOptions);
    window.addEventListener("pointerup", handlePointer, pointerOptions);
    window.addEventListener("message", handleParentCommand);

    const initReactGrab = async () => {
      try {
        const core = await import("react-grab/core");
        if (disposed) return;

        generateSnippet = core.generateSnippet;
        // `enabled: false` returns an inert API, so stay enabled and only
        // activate on the parent's command (no keyboard shortcut, no toolbar).
        reactGrab = core.init({
          activationKey: () => false,
          telemetry: false,
        });
        reactGrab.registerPlugin({
          name: "mvpstar-sandbox",
          theme: {
            hue: 53,
            toolbar: {
              enabled: false,
            },
          },
          hooks: {
            onElementSelect: handleElementSelect,
          },
        });

        if (activateWhenReady) activateReactGrab();
      } catch (error) {
        console.error("Failed to initialize react-grab:", error);
      }
    };

    void initReactGrab();

    return () => {
      disposed = true;
      window.removeEventListener("pointerdown", handlePointer, true);
      window.removeEventListener("pointermove", handlePointer, true);
      window.removeEventListener("pointerup", handlePointer, true);
      window.removeEventListener("message", handleParentCommand);
      reactGrab?.dispose();
    };
  }, []);

  return null;
}

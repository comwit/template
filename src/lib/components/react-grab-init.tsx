"use client";

import type { ReactGrabAPI } from "react-grab/core";
import { useEffect, useRef } from "react";
import { emitReactGrab } from "@/lib/utils/sandbox-events";
import type { ParentCommand } from "@/lib/utils/sandbox-events";

/**
 * React Grab Initializer
 *
 * MVPStar Editorial Style Theme
 * - Primary Red: #dc2626
 * - Wine: #881337
 * - Stone-900: #1c1917
 */

export function ReactGrabInit() {
  const lastMousePositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let reactGrab: ReactGrabAPI | null = null;
    let activateWhenReady = false;
    let disposed = false;

    const handleMouseMove = (event: MouseEvent) => {
      lastMousePositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const activateReactGrab = () => {
      if (!reactGrab) {
        activateWhenReady = true;
        return;
      }

      reactGrab.setEnabled(true);
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

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("message", handleParentCommand);

    const initReactGrab = async () => {
      try {
        const { init } = await import("react-grab/core");
        if (disposed) return;

        reactGrab = init({
          enabled: false,
          activationKey: () => false,
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
            onCopySuccess: (elements, content) => {
              const element = elements?.[elements.length - 1];

              // Prefer the saved pointer position; fall back to the element's bottom center.
              let position: { x: number; y: number } | undefined =
                lastMousePositionRef.current ?? undefined;
              if (!position) {
                const rect = element?.getBoundingClientRect?.();
                position = rect
                  ? { x: rect.left + rect.width / 2, y: rect.bottom }
                  : undefined;
              }

              // Send the react-grab event to the parent window.
              emitReactGrab({
                content,
                elementTag: element?.tagName?.toLowerCase(),
                path: window.location.pathname,
                position,
              });

              // Reset after use.
              lastMousePositionRef.current = null;
            },
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
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("message", handleParentCommand);
      reactGrab?.dispose();
    };
  }, []);

  return null;
}

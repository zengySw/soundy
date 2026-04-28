"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const DEFAULT_LEFT = 260;
const DEFAULT_RIGHT = 360;
const MIN_LEFT = 200;
const MAX_LEFT = 320;
const MIN_RIGHT = 260;
const MAX_RIGHT = 420;
const MIN_MAIN = 520;
const GUTTER = 80;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function useResizableSidebars() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT);
  const resizeRef = useRef<{
    mode: "left" | "right";
    startX: number;
    startLeft: number;
    startRight: number;
    gridWidth: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const savedLeft = Number(localStorage.getItem("sidebarLeftWidth"));
    if (Number.isFinite(savedLeft)) {
      setLeftWidth(clamp(savedLeft, MIN_LEFT, MAX_LEFT));
    }
    const savedRight = Number(localStorage.getItem("sidebarRightWidth"));
    if (Number.isFinite(savedRight)) {
      setRightWidth(clamp(savedRight, MIN_RIGHT, MAX_RIGHT));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem("sidebarLeftWidth", String(Math.round(leftWidth)));
  }, [leftWidth]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem("sidebarRightWidth", String(Math.round(rightWidth)));
  }, [rightWidth]);

  const onPointerMove = useCallback((event: PointerEvent) => {
    const state = resizeRef.current;
    if (!state) {
      return;
    }
    if (state.mode === "left") {
      const maxLeftByLayout =
        state.gridWidth - MIN_MAIN - state.startRight - GUTTER;
      const maxLeft = Math.max(MIN_LEFT, Math.min(MAX_LEFT, maxLeftByLayout));
      const nextLeft = clamp(
        state.startLeft + (event.clientX - state.startX),
        MIN_LEFT,
        maxLeft,
      );
      setLeftWidth(nextLeft);
      return;
    }

    const maxRightByLayout =
      state.gridWidth - MIN_MAIN - state.startLeft - GUTTER;
    const maxRight = Math.max(MIN_RIGHT, Math.min(MAX_RIGHT, maxRightByLayout));
    const nextRight = clamp(
      state.startRight + (state.startX - event.clientX),
      MIN_RIGHT,
      maxRight,
    );
    setRightWidth(nextRight);
  }, []);

  const onPointerUp = useCallback(() => {
    resizeRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  const startResize = useCallback(
    (mode: "left" | "right", event: ReactPointerEvent<HTMLDivElement>) => {
      if (!gridRef.current) {
        return;
      }
      event.preventDefault();
      const rect = gridRef.current.getBoundingClientRect();
      resizeRef.current = {
        mode,
        startX: event.clientX,
        startLeft: leftWidth,
        startRight: rightWidth,
        gridWidth: rect.width,
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      if (event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [leftWidth, rightWidth, onPointerMove, onPointerUp],
  );

  const onLeftResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => startResize("left", event),
    [startResize],
  );

  const onRightResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => startResize("right", event),
    [startResize],
  );

  return {
    gridRef,
    leftWidth,
    rightWidth,
    onLeftResizeStart,
    onRightResizeStart,
  };
}

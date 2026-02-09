"use client";

import { useEffect, useState } from "react";

const colorCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

function boostChannel(value: number) {
  const boosted = Math.round(value * 1.08 + 12);
  return Math.min(255, Math.max(0, boosted));
}

async function extractDominantColor(src: string): Promise<string | null> {
  if (!src) {
    return null;
  }
  if (colorCache.has(src)) {
    return colorCache.get(src) ?? null;
  }
  if (inFlight.has(src)) {
    return inFlight.get(src) ?? null;
  }

  const promise = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 24;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 16) {
            continue;
          }
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count += 1;
        }
        if (count === 0) {
          resolve(null);
          return;
        }
        const avgR = boostChannel(r / count);
        const avgG = boostChannel(g / count);
        const avgB = boostChannel(b / count);
        resolve(`rgba(${avgR}, ${avgG}, ${avgB}, 0.45)`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

  inFlight.set(src, promise);
  const result = await promise;
  inFlight.delete(src);
  colorCache.set(src, result);
  return result;
}

export function useCoverGlow(src?: string | null) {
  const [glow, setGlow] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!src) {
      setGlow(null);
      return () => {
        mounted = false;
      };
    }
    void extractDominantColor(src).then((color) => {
      if (mounted) {
        setGlow(color);
      }
    });
    return () => {
      mounted = false;
    };
  }, [src]);

  return glow;
}

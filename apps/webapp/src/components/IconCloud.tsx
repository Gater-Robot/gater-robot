"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
// `IconCloud` is a client component; use the browser-safe server renderer entry.
// This avoids TS resolving `react-dom/server` to the Node build (`server.node.js`) under
// `moduleResolution: "bundler"`.
import { renderToString } from "react-dom/server.browser";

interface Icon {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  id: number;
}

export type IconCloudSize = "xs" | "sm" | "md" | "lg" | "xl";
export type IconCloudSpeed = "slow" | "normal" | "fast";

interface IconCloudProps {
  icons?: React.ReactNode[];
  images?: string[];
  /**
   * Visual size preset. `md` matches the previous default (250px).
   * Use `xs` (extra small) through `xl` (extra large).
   */
  size?: IconCloudSize;
  /**
   * Disable hover/drag/click mouse interactions (auto-rotation only).
   */
  disableMouseEffects?: boolean;
  /**
   * Auto-rotation speed preset.
   */
  speed?: IconCloudSpeed;
  /** Optional className applied to the `<canvas />`. */
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function getSizeConfig(size: IconCloudSize) {
  // Keep `md` aligned with the old 250x250 default.
  const table: Record<
    IconCloudSize,
    {
      canvasPx: number;
      iconPx: number;
      sphereRadius: number;
      overscanX: number;
      overscanY: number;
    }
  > = {
    // `overscanX/overscanY` enlarge the *internal* canvas buffer so icons near the edges don't clip,
    // while the element's *visible* size remains `canvasPx`.
    //
    // Note: Slightly larger overscan in Y matches real-world perception of top/bottom clipping,
    // especially at smaller sizes where iconPx is a larger fraction of the canvas.
    xs: { canvasPx: 160, iconPx: 26, sphereRadius: 64, overscanX: 1.22, overscanY: 1.28 },
    sm: { canvasPx: 200, iconPx: 32, sphereRadius: 80, overscanX: 1.2, overscanY: 1.26 },
    md: { canvasPx: 250, iconPx: 40, sphereRadius: 100, overscanX: 1.18, overscanY: 1.24 },
    lg: { canvasPx: 320, iconPx: 48, sphereRadius: 128, overscanX: 1.16, overscanY: 1.22 },
    xl: { canvasPx: 400, iconPx: 56, sphereRadius: 160, overscanX: 1.14, overscanY: 1.2 },
  };
  return table[size];
}

function getSpeedConfig(speed: IconCloudSpeed) {
  // Values are radians-per-frame-ish scalars. Tuned to feel close to previous defaults.
  const table: Record<IconCloudSpeed, { base: number; mouseMultiplier: number }> = {
    slow: { base: 0.003, mouseMultiplier: 0.75 },
    normal: { base: 0.005, mouseMultiplier: 1 },
    fast: { base: 0.008, mouseMultiplier: 1.35 },
  };
  return table[speed];
}

export function IconCloud({
  icons,
  images,
  size = "md",
  speed = "normal",
  disableMouseEffects = false,
  className,
}: IconCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [iconPositions, setIconPositions] = useState<Icon[]>([]);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
    distance: number;
    startTime: number;
    duration: number;
  } | null>(null);
  const animationFrameRef = useRef<number>(0);
  const rotationRef = useRef(rotation);
  const iconCanvasesRef = useRef<HTMLCanvasElement[]>([]);
  const imagesLoadedRef = useRef<boolean[]>([]);
  const iconPositionsRef = useRef<Icon[]>([]);

  const sizeConfig = useMemo(() => getSizeConfig(size), [size]);
  const speedConfig = useMemo(() => getSpeedConfig(speed), [speed]);
  const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);

  // Keep the canvas crisp while scaling visually via CSS size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Overscan: make the internal drawing buffer bigger than the visible size.
    // This gives the math a small “safe area” so edge icons don't get cut off.
    const internalCssPxX = Math.round(sizeConfig.canvasPx * sizeConfig.overscanX);
    const internalCssPxY = Math.round(sizeConfig.canvasPx * sizeConfig.overscanY);
    canvas.width = Math.round(internalCssPxX * dpr);
    canvas.height = Math.round(internalCssPxY * dpr);
    canvas.style.width = `${sizeConfig.canvasPx}px`;
    canvas.style.height = `${sizeConfig.canvasPx}px`;
  }, [sizeConfig.canvasPx, sizeConfig.overscanX, sizeConfig.overscanY, dpr]);

  const getCanvasPointFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return null;

    // Map CSS pixel coordinates into internal canvas coordinates (accounts for DPR + overscan).
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  // If mouse effects are disabled, ensure we exit any drag/target-rotation state.
  useEffect(() => {
    if (!disableMouseEffects) return;
    isDraggingRef.current = false;
    targetRotationRef.current = null;
  }, [disableMouseEffects]);

  // Keep the icon positions available to the RAF loop without re-running the effect.
  useEffect(() => {
    iconPositionsRef.current = iconPositions;
  }, [iconPositions]);

  // Create icon canvases once when icons/images change
  useEffect(() => {
    if (!icons && !images) return;

    const items = icons || images || [];
    imagesLoadedRef.current = new Array(items.length).fill(false);

    const newIconCanvases = items.map((item, index) => {
      const offscreen = document.createElement("canvas");
      offscreen.width = sizeConfig.iconPx;
      offscreen.height = sizeConfig.iconPx;
      const offCtx = offscreen.getContext("2d");

      if (offCtx) {
        if (images) {
          // Handle image URLs directly
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = items[index] as string;
          img.onload = () => {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height);

            // Create circular clipping path
            offCtx.beginPath();
            const r = sizeConfig.iconPx / 2;
            offCtx.arc(r, r, r, 0, Math.PI * 2);
            offCtx.closePath();
            offCtx.clip();

            // Draw the image
            offCtx.drawImage(img, 0, 0, sizeConfig.iconPx, sizeConfig.iconPx);

            imagesLoadedRef.current[index] = true;
          };
        } else {
          // Handle SVG icons
          const svgString = renderToString(item as React.ReactElement);
          const img = new Image();
          img.src = "data:image/svg+xml;base64," + btoa(svgString);
          img.onload = () => {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
            offCtx.drawImage(img, 0, 0, sizeConfig.iconPx, sizeConfig.iconPx);
            imagesLoadedRef.current[index] = true;
          };
        }
      }
      return offscreen;
    });

    iconCanvasesRef.current = newIconCanvases;
  }, [icons, images, sizeConfig.iconPx]);

  // Generate initial icon positions on a sphere
  useEffect(() => {
    const items = icons || images || [];
    const newIcons: Icon[] = [];
    const numIcons = items.length || 20;

    // Fibonacci sphere parameters
    const offset = 2 / numIcons;
    const increment = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < numIcons; i++) {
      const y = i * offset - 1 + offset / 2;
      const r = Math.sqrt(1 - y * y);
      const phi = i * increment;

      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;

      newIcons.push({
        x: x * sizeConfig.sphereRadius,
        y: y * sizeConfig.sphereRadius,
        z: z * sizeConfig.sphereRadius,
        scale: 1,
        opacity: 1,
        id: i,
      });
    }
    setIconPositions(newIcons);
  }, [icons, images, sizeConfig.sphereRadius]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disableMouseEffects) return;
    if (!canvasRef.current) return;

    const p = getCanvasPointFromClient(e.clientX, e.clientY);
    if (!p) return;
    const { x, y } = p;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    iconPositionsRef.current.forEach(icon => {
      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);
      const cosY = Math.cos(rotationRef.current.y);
      const sinY = Math.sin(rotationRef.current.y);

      const rotatedX = icon.x * cosY - icon.z * sinY;
      const rotatedZ = icon.x * sinY + icon.z * cosY;
      const rotatedY = icon.y * cosX + rotatedZ * sinX;

      const screenX = canvasRef.current!.width / 2 + rotatedX;
      const screenY = canvasRef.current!.height / 2 + rotatedY;

      const depthBase = sizeConfig.sphereRadius * 2;
      const depthRange = sizeConfig.sphereRadius * 3;
      const scale = (rotatedZ + depthBase) / depthRange;
      const radius = (sizeConfig.iconPx / 2) * scale;
      const dx = x - screenX;
      const dy = y - screenY;

      if (dx * dx + dy * dy < radius * radius) {
        const targetX = -Math.atan2(icon.y, Math.sqrt(icon.x * icon.x + icon.z * icon.z));
        const targetY = Math.atan2(icon.x, icon.z);

        const currentX = rotationRef.current.x;
        const currentY = rotationRef.current.y;
        const distance = Math.sqrt(Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2));

        const duration = Math.min(2000, Math.max(800, distance * 1000));

        targetRotationRef.current = {
          x: targetX,
          y: targetY,
          startX: currentX,
          startY: currentY,
          distance,
          startTime: performance.now(),
          duration,
        };
        return;
      }
    });

    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disableMouseEffects) return;
    const p = getCanvasPointFromClient(e.clientX, e.clientY);
    if (p) mousePosRef.current = p;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - lastMousePosRef.current.x;
      const deltaY = e.clientY - lastMousePosRef.current.y;

      rotationRef.current = {
        x: rotationRef.current.x + deltaY * 0.002,
        y: rotationRef.current.y + deltaX * 0.002,
      };

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    if (disableMouseEffects) return;
    isDraggingRef.current = false;
  };

  // Animation and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
      const dx = disableMouseEffects ? 0 : mousePosRef.current.x - centerX;
      const dy = disableMouseEffects ? 0 : mousePosRef.current.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const distanceFactor = maxDistance > 0 ? distance / maxDistance : 0;
      const mouseSpeed = speedConfig.base + distanceFactor * (speedConfig.base * 2);
      const computedSpeed = disableMouseEffects ? speedConfig.base : mouseSpeed * speedConfig.mouseMultiplier;

      const targetRotation = targetRotationRef.current;
      if (targetRotation) {
        const elapsed = performance.now() - targetRotation.startTime;
        const progress = Math.min(1, elapsed / targetRotation.duration);
        const easedProgress = easeOutCubic(progress);

        rotationRef.current = {
          x: targetRotation.startX + (targetRotation.x - targetRotation.startX) * easedProgress,
          y: targetRotation.startY + (targetRotation.y - targetRotation.startY) * easedProgress,
        };

        if (progress >= 1) {
          targetRotationRef.current = null;
        }
      } else if (!isDraggingRef.current) {
        rotationRef.current = {
          // When mouse effects are disabled, we keep a gentle constant drift.
          x:
            rotationRef.current.x + (disableMouseEffects ? computedSpeed * 0.35 : (dy / canvas.height) * computedSpeed),
          y: rotationRef.current.y + (disableMouseEffects ? computedSpeed : (dx / canvas.width) * computedSpeed),
        };
      }

      // Precompute trig once per frame (big perf win).
      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);
      const cosY = Math.cos(rotationRef.current.y);
      const sinY = Math.sin(rotationRef.current.y);

      iconPositionsRef.current.forEach((icon, index) => {
        const rotatedX = icon.x * cosY - icon.z * sinY;
        const rotatedZ = icon.x * sinY + icon.z * cosY;
        const rotatedY = icon.y * cosX + rotatedZ * sinX;

        const depthBase = sizeConfig.sphereRadius * 2;
        const depthRange = sizeConfig.sphereRadius * 3;
        const scale = (rotatedZ + depthBase) / depthRange;
        const opacity = Math.max(0.2, Math.min(1, (rotatedZ + depthBase * 0.75) / depthBase));

        ctx.save();
        ctx.translate(canvas.width / 2 + rotatedX, canvas.height / 2 + rotatedY);
        ctx.scale(scale, scale);
        ctx.globalAlpha = opacity;

        if (icons || images) {
          // Only try to render icons/images if they exist
          if (iconCanvasesRef.current[index] && imagesLoadedRef.current[index]) {
            const half = sizeConfig.iconPx / 2;
            ctx.drawImage(iconCanvasesRef.current[index], -half, -half, sizeConfig.iconPx, sizeConfig.iconPx);
          }
        } else {
          // Show numbered circles if no icons/images are provided
          ctx.beginPath();
          ctx.arc(0, 0, sizeConfig.iconPx / 2, 0, Math.PI * 2);
          ctx.fillStyle = "#4444ff";
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `${Math.max(12, Math.round(sizeConfig.iconPx * 0.4))}px Arial`;
          ctx.fillText(`${icon.id + 1}`, 0, 0);
        }

        ctx.restore();
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [disableMouseEffects, sizeConfig, speedConfig]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={disableMouseEffects ? undefined : handleMouseDown}
      onMouseMove={disableMouseEffects ? undefined : handleMouseMove}
      onMouseUp={disableMouseEffects ? undefined : handleMouseUp}
      onMouseLeave={disableMouseEffects ? undefined : handleMouseUp}
      className={["rounded-lg", className].filter(Boolean).join(" ")}
      aria-label="Interactive 3D Icon Cloud"
      role="img"
    />
  );
}

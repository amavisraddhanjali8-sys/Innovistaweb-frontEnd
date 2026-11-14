import { useEffect, useRef, type RefObject } from "react";
import {
  BUILDING_FLOOR_COUNT,
  computeBuildingConstructionFrame,
} from "../utils/footerBuildingHelpers";

export interface FooterBuildingConstructionBgProps {
  hostRef: RefObject<HTMLElement | null>;
}

/**
 * Soft interactive corporate glass-tower construction animation behind the footer.
 * Uses delicate low-opacity blueprint & sky-glass tones so every footer link,
 * contact card, and wordmark retains crisp legibility.
 */
export default function FooterBuildingConstructionBg({
  hostRef,
}: FooterBuildingConstructionBgProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ nx: 0, ny: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mq =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let reducedMotion = Boolean(mq?.matches);

    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };
    mq?.addEventListener("change", onMotionChange);

    const onPointerMove = (e: PointerEvent) => {
      if (!host) return;
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      pointerRef.current = {
        nx: Math.max(-1, Math.min(1, nx)),
        ny: Math.max(-1, Math.min(1, ny)),
        active: true,
      };
    };

    const onPointerLeave = () => {
      pointerRef.current.active = false;
    };

    host?.addEventListener("pointermove", onPointerMove);
    host?.addEventListener("pointerleave", onPointerLeave);

    let width = 1280;
    let height = 420;
    let dpr = 1;

    const syncSize = () => {
      const target = host || canvas.parentElement;
      const w = Math.max(320, target?.clientWidth || 1280);
      const h = Math.max(240, target?.clientHeight || 420);
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = w;
      height = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    syncSize();

    const resizeObserver = new ResizeObserver(syncSize);
    if (host) resizeObserver.observe(host);

    let disposed = false;
    let rafId = 0;
    let smoothNx = 0;
    let smoothNy = 0;
    const startSec = performance.now() / 1000;

    const drawTower = (
      x: number,
      baseY: number,
      towerW: number,
      floorH: number,
      bays: number,
      frame: ReturnType<typeof computeBuildingConstructionFrame>,
      alphaScale: number,
      px: number,
      py: number,
      withCrane: boolean
    ) => {
      const totalH = BUILDING_FLOOR_COUNT * floorH;
      const left = x + px;
      const topFull = baseY - totalH + py;

      ctx.save();

      // Vertical architectural steel core columns rising gently
      const coreH = totalH * frame.coreProgress;
      ctx.strokeStyle = `rgba(34, 87, 122, ${(0.12 * alphaScale).toFixed(3)})`;
      ctx.lineWidth = 1.15;
      for (let b = 0; b <= bays; b += 1) {
        const colX = left + (b / bays) * towerW;
        ctx.beginPath();
        ctx.moveTo(colX, baseY + py);
        ctx.lineTo(colX, baseY + py - coreH);
        ctx.stroke();
      }

      // Interior elevator shaft core silhouette
      const shaftW = towerW * 0.24;
      const shaftX = left + (towerW - shaftW) * 0.5;
      ctx.fillStyle = `rgba(34, 87, 122, ${(0.038 * alphaScale).toFixed(3)})`;
      ctx.fillRect(shaftX, baseY + py - coreH * 0.96, shaftW, coreH * 0.96);

      // Floor-by-floor slab + aluminium mullion + low-E glass bay assembly
      const bayW = towerW / bays;
      for (const floor of frame.floors) {
        const fBottom = baseY + py - floor.floorIndex * floorH;
        const fTop = fBottom - floorH;

        if (floor.slabProgress > 0.01) {
          const slabW = towerW * floor.slabProgress;
          ctx.fillStyle = `rgba(34, 87, 122, ${(0.085 * alphaScale).toFixed(3)})`;
          ctx.fillRect(left, fTop, slabW, 2.2);
        }

        if (floor.glazingProgress > 0.01) {
          const visibleBays = Math.ceil(bays * floor.glazingProgress);
          for (let b = 0; b < visibleBays; b += 1) {
            const bayProgress = Math.max(
              0,
              Math.min(1, floor.glazingProgress * bays - b)
            );
            const paneX = left + b * bayW + 2;
            const paneW = Math.max(0, bayW - 4);
            const paneH = Math.max(0, (floorH - 4) * bayProgress);
            const paneY = fBottom - 2 - paneH;

            // Translucent sky-blue glass fill
            const fillAlpha =
              (0.068 + floor.justLockedGlow * 0.065) * alphaScale;
            ctx.fillStyle = `rgba(51, 147, 184, ${fillAlpha.toFixed(3)})`;
            ctx.fillRect(paneX, paneY, paneW, paneH);

            // Diagonal glass reflection highlight
            if (paneH > 6 && paneW > 6) {
              ctx.strokeStyle = `rgba(255, 255, 255, ${(0.34 * alphaScale).toFixed(3)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(paneX + 3, paneY + paneH * 0.72);
              ctx.lineTo(paneX + paneW * 0.68, paneY + 3);
              ctx.stroke();
            }

            // Fine anodized aluminium bay border
            ctx.strokeStyle = `rgba(34, 87, 122, ${(0.145 * alphaScale).toFixed(3)})`;
            ctx.lineWidth = 0.9;
            ctx.strokeRect(paneX, paneY, paneW, paneH);
          }
        }
      }

      // Subtle architectural roof crown & beacon at upper cycle completion
      const lastFloor = frame.floors[frame.floors.length - 1];
      if (lastFloor && lastFloor.glazingProgress > 0.4) {
        const crownAlpha = (lastFloor.glazingProgress - 0.4) / 0.6;
        ctx.strokeStyle = `rgba(34, 87, 122, ${(0.2 * crownAlpha * alphaScale).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(left + towerW * 0.14, topFull - 10, towerW * 0.72, 10);
      }

      // Sleek architectural tower crane hoisting aluminium curtain-wall cassette
      if (withCrane && frame.craneMountProgress > 0.05) {
        const craneAlpha = frame.craneMountProgress * alphaScale;
        const mastX = left + towerW + Math.max(20, towerW * 0.14);
        const mastTopY = topFull - 36 * frame.craneMountProgress;

        ctx.strokeStyle = `rgba(34, 87, 122, ${(0.22 * craneAlpha).toFixed(3)})`;
        ctx.lineWidth = 1.4;
        // Mast + cross bracing
        ctx.beginPath();
        ctx.moveTo(mastX - 4, baseY + py);
        ctx.lineTo(mastX - 4, mastTopY);
        ctx.moveTo(mastX + 4, baseY + py);
        ctx.lineTo(mastX + 4, mastTopY);
        ctx.stroke();

        // Horizontal crane jib spanning back over the tower
        const jibLeft = left - 18;
        const jibRight = mastX + 34;
        ctx.beginPath();
        ctx.moveTo(jibLeft, mastTopY + 6);
        ctx.lineTo(jibRight, mastTopY + 6);
        // Tie-back stays
        ctx.moveTo(mastX, mastTopY - 14);
        ctx.lineTo(jibLeft + 14, mastTopY + 6);
        ctx.moveTo(mastX, mastTopY - 14);
        ctx.lineTo(jibRight - 6, mastTopY + 6);
        ctx.stroke();

        // Animated trolley + dangling curtain-wall cassette panel
        const trolleyX =
          left + 14 + frame.trolleyNormalizedX * Math.max(40, towerW - 28);
        const activeTopY =
          baseY + py - (frame.activeFloorIndex + 1) * floorH - 12;
        const cableEndY =
          mastTopY +
          10 +
          Math.max(18, (activeTopY - mastTopY - 10) * frame.hookDropProgress);

        ctx.fillStyle = `rgba(34, 87, 122, ${(0.18 * craneAlpha).toFixed(3)})`;
        ctx.fillRect(trolleyX - 5, mastTopY + 4, 10, 5);

        ctx.strokeStyle = `rgba(51, 147, 184, ${(0.22 * craneAlpha).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(trolleyX, mastTopY + 9);
        ctx.lineTo(trolleyX, cableEndY);
        ctx.stroke();

        // Hoisted glass unit gently suspended from crane cable
        ctx.fillStyle = `rgba(51, 147, 184, ${(0.1 * craneAlpha).toFixed(3)})`;
        ctx.strokeStyle = `rgba(34, 87, 122, ${(0.18 * craneAlpha).toFixed(3)})`;
        ctx.fillRect(trolleyX - 11, cableEndY, 22, 13);
        ctx.strokeRect(trolleyX - 11, cableEndY, 22, 13);
      }

      ctx.restore();
    };

    const renderFrame = () => {
      if (disposed) return;

      const elapsed = reducedMotion ? 11.4 : performance.now() / 1000 - startSec;
      const targetNx = pointerRef.current.active ? pointerRef.current.nx : 0;
      const targetNy = pointerRef.current.active ? pointerRef.current.ny : 0;
      smoothNx += (targetNx - smoothNx) * 0.08;
      smoothNy += (targetNy - smoothNy) * 0.08;

      const frame = computeBuildingConstructionFrame(
        elapsed,
        smoothNx,
        smoothNy,
        BUILDING_FLOOR_COUNT
      );

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // 1. Faint architectural blueprint coordinate lines (shifted gently with pointer)
      ctx.save();
      const gridAlpha = 0.045 * frame.envelopeAlpha;
      ctx.strokeStyle = `rgba(34, 87, 122, ${gridAlpha.toFixed(3)})`;
      ctx.lineWidth = 1;
      const step = 54;
      const offsetX = ((frame.parallaxX * 0.45) % step + step) % step;
      const offsetY = ((frame.parallaxY * 0.45) % step + step) % step;

      for (let gx = offsetX; gx < width; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = offsetY; gy < height; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }
      ctx.restore();

      const baseY = height - 10;
      const floorH = Math.max(18, Math.min(34, (height * 0.72) / BUILDING_FLOOR_COUNT));

      // 2. Soft background left-flank commercial annex (subtle depth, unobtrusive under nav links)
      const annexW = Math.min(180, width * 0.18);
      drawTower(
        width * 0.06,
        baseY,
        annexW,
        floorH * 0.72,
        4,
        frame,
        0.58 * frame.envelopeAlpha,
        frame.parallaxX * 0.45,
        frame.parallaxY * 0.45,
        false
      );

      // 3. Primary Corporate Glass High-Rise Tower + Crane (center-right skyline)
      const mainW = Math.min(270, width * 0.25);
      const mainX = width >= 768 ? width * 0.56 : width * 0.48;
      drawTower(
        mainX,
        baseY,
        mainW,
        floorH,
        6,
        frame,
        0.92 * frame.envelopeAlpha,
        frame.parallaxX,
        frame.parallaxY,
        true
      );

      // 4. Secondary glass atrium tower on far right edge
      const wingW = Math.min(150, width * 0.14);
      drawTower(
        width * 0.83,
        baseY,
        wingW,
        floorH * 0.64,
        4,
        frame,
        0.65 * frame.envelopeAlpha,
        frame.parallaxX * 0.7,
        frame.parallaxY * 0.7,
        false
      );

      // 5. Subtle horizon datum line along footer base
      ctx.strokeStyle = `rgba(34, 87, 122, ${(0.12 * frame.envelopeAlpha).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baseY + frame.parallaxY * 0.5);
      ctx.lineTo(width, baseY + frame.parallaxY * 0.5);
      ctx.stroke();

      if (!reducedMotion) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      mq?.removeEventListener("change", onMotionChange);
      host?.removeEventListener("pointermove", onPointerMove);
      host?.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [hostRef]);

  return (
    <div
      aria-hidden="true"
      data-testid="footer-building-construction-bg"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[inherit]"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full opacity-90"
      />
      {/* Gentle soft atmospheric mist veil so foreground text stays super clear & non-harsh */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(241,248,252,0.28) 55%, rgba(226,241,248,0.42) 100%)",
        }}
      />
    </div>
  );
}

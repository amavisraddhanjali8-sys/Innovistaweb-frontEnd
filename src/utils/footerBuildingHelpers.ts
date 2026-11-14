export interface BuildingConstructionFloorState {
  floorIndex: number;
  slabProgress: number;
  mullionProgress: number;
  glazingProgress: number;
  justLockedGlow: number;
}

export interface BuildingConstructionFrame {
  cycleProgress: number;
  envelopeAlpha: number;
  coreProgress: number;
  craneMountProgress: number;
  trolleyNormalizedX: number;
  hookDropProgress: number;
  activeFloorIndex: number;
  floors: BuildingConstructionFloorState[];
  parallaxX: number;
  parallaxY: number;
}

export const BUILDING_FLOOR_COUNT = 9;
export const BUILDING_CYCLE_SECONDS = 18;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Computes pure deterministic kinematics for the soft interactive
 * corporate building construction animation inside the footer backdrop.
 */
export function computeBuildingConstructionFrame(
  elapsedSec: number,
  pointerNx = 0,
  pointerNy = 0,
  floorCount: number = BUILDING_FLOOR_COUNT
): BuildingConstructionFrame {
  const safeElapsed = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
  const totalFloors = Math.max(3, Math.floor(floorCount));
  const cycleProgress = (safeElapsed % BUILDING_CYCLE_SECONDS) / BUILDING_CYCLE_SECONDS;

  // Smooth fade-in at cycle start and fade-out at cycle end so loop restarts gently
  let envelopeAlpha = 1;
  if (cycleProgress < 0.06) {
    envelopeAlpha = easeOutCubic(cycleProgress / 0.06);
  } else if (cycleProgress > 0.91) {
    envelopeAlpha = clamp01((1 - cycleProgress) / 0.09);
  }

  // Structural steel core rises smoothly in first 28% of cycle
  const coreProgress = easeOutCubic(cycleProgress / 0.28);

  // Tower crane mast & jib deploys between 8% and 24%
  const craneMountProgress = easeOutCubic((cycleProgress - 0.08) / 0.16);

  // Floors & curtain wall glass assemble sequentially from 12% -> 84%
  const floorsSpanStart = 0.12;
  const floorsSpanEnd = 0.84;
  const floorsSpan = floorsSpanEnd - floorsSpanStart;

  const floors: BuildingConstructionFloorState[] = [];
  let activeFloorIndex = 0;

  for (let i = 0; i < totalFloors; i += 1) {
    const startRatio = floorsSpanStart + (i / totalFloors) * (floorsSpan * 0.72);
    const localDuration = floorsSpan * 0.28;
    const localProgress = clamp01((cycleProgress - startRatio) / localDuration);

    const slabProgress = easeOutCubic(localProgress / 0.42);
    const mullionProgress = easeOutCubic((localProgress - 0.22) / 0.45);
    const glazingProgress = easeOutCubic((localProgress - 0.42) / 0.58);

    // Brief subtle specular lock-in gleam right as a floor completes glazing
    const justLockedGlow =
      localProgress > 0.82 && localProgress < 1
        ? Math.sin(((localProgress - 0.82) / 0.18) * Math.PI)
        : 0;

    if (localProgress > 0 && localProgress < 1) {
      activeFloorIndex = i;
    } else if (localProgress >= 1) {
      activeFloorIndex = Math.max(activeFloorIndex, i);
    }

    floors.push({
      floorIndex: i,
      slabProgress,
      mullionProgress,
      glazingProgress,
      justLockedGlow,
    });
  }

  // Crane trolley gently sweeps back and forth above the active assembly bay
  const trolleyNormalizedX = 0.5 + 0.36 * Math.sin(safeElapsed * 0.55);
  const hookDropProgress = 0.28 + 0.24 * (0.5 + 0.5 * Math.cos(safeElapsed * 1.15));

  // Clamped soft pointer parallax (subtle, never harsh)
  const clampedNx = Math.max(-1, Math.min(1, Number.isFinite(pointerNx) ? pointerNx : 0));
  const clampedNy = Math.max(-1, Math.min(1, Number.isFinite(pointerNy) ? pointerNy : 0));

  return {
    cycleProgress,
    envelopeAlpha,
    coreProgress,
    craneMountProgress,
    trolleyNormalizedX,
    hookDropProgress,
    activeFloorIndex,
    floors,
    parallaxX: clampedNx * 14,
    parallaxY: clampedNy * 8,
  };
}

export interface VintagePhoneRingState {
  scale: number;
  bodyShakeZ: number;
  handsetShakeZ: number;
  handsetLiftY: number;
  clapperAngleRad: number;
  waveProgress: number;
  isRingingBurst: boolean;
}

/**
 * Computes cyclic attention-getting shaking + auto-scaling motion
 * for the interactive 3D vintage rotary phone icon.
 */
export function computeVintagePhoneRingState(
  elapsedSec: number,
  isHovered: boolean,
  isDrawerOpen: boolean
): VintagePhoneRingState {
  const safeT = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
  const period = isHovered || isDrawerOpen ? 1.8 : 2.9;
  const phase = (safeT % period) / period;

  // Burst occupies first 58% of cycle so phone settles briefly then rings + swells again
  const burstEnd = isHovered || isDrawerOpen ? 0.78 : 0.62;
  const isRingingBurst = phase <= burstEnd;
  const burstNorm = isRingingBurst ? phase / burstEnd : 0;

  // Automatic scaling up and down gently even at rest, with extra swell during ring burst
  const ambientSwell = Math.sin(safeT * 2.4) * 0.045;
  const burstSwell = isRingingBurst ? Math.sin(burstNorm * Math.PI) * 0.115 : 0;
  const hoverLift = isHovered ? 0.05 : 0;
  const scale = Number((1.0 + ambientSwell + burstSwell + hoverLift).toFixed(4));

  const ringFreq = isHovered ? 38 : 30;
  const envelope = isRingingBurst ? Math.sin(burstNorm * Math.PI) : 0;
  const rattle = Math.sin(safeT * ringFreq) * envelope;

  const bodyShakeZ = rattle * (isHovered ? 0.14 : 0.1);
  const handsetShakeZ = Math.sin(safeT * (ringFreq + 6)) * envelope * 0.22;
  const handsetLiftY = isRingingBurst
    ? Math.abs(Math.sin(safeT * 16)) * envelope * 0.11
    : 0;
  const clapperAngleRad = Math.sin(safeT * 48) * envelope * 0.42;

  const waveProgress = phase;

  return {
    scale,
    bodyShakeZ,
    handsetShakeZ,
    handsetLiftY,
    clapperAngleRad,
    waveProgress,
    isRingingBurst,
  };
}

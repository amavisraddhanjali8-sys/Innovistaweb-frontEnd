import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { FiCheck, FiCopy, FiPhoneCall } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import {
  formatTelHref,
  formatWhatsAppHref,
} from "../utils/footerConsultationHelpers";
import { computeVintagePhoneRingState } from "../utils/footerBuildingHelpers";

export interface VintagePhone3DIconProps {
  phone: string;
  whatsapp?: string;
  label?: string;
}

function detectSoftwareWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export default function VintagePhone3DIcon({
  phone,
  whatsapp,
  label = "Direct Hotline",
}: VintagePhone3DIconProps) {
  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const hoveredRef = useRef(false);
  const openRef = useRef(false);
  const pointerRef = useRef({ nx: 0, ny: 0 });
  const reducedMotionRef = useRef(false);

  const [isHovered, setIsHovered] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    hoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    openRef.current = isDrawerOpen;
  }, [isDrawerOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    const wrapper = stageWrapperRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(76, container.clientWidth || 84);
    const height = Math.max(76, container.clientHeight || 84);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 20);
    camera.position.set(0.22, 0.65, 3.85);
    camera.lookAt(0, 0.08, 0);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(0x000000, 0);

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    const handleContextRestored = () => {
      setWebglFailed(false);
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      handleContextRestored
    );

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    envScene.dispose();
    pmremGenerator.dispose();

    const hemi = new THREE.HemisphereLight(0xf0f9ff, 0x1e293b, 1.15);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2.4, 3.6, 3.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.45);
    rimLight.position.set(-2.6, 1.8, -2.2);
    scene.add(rimLight);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    // Sculpted vintage materials: classic crimson-ruby or Innovista deep navy lacquer + brushed brass + ivory enamel
    const bodyLacquerMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xc81e1e,
        roughness: 0.22,
        metalness: 0.14,
        clearcoat: 0.92,
        clearcoatRoughness: 0.14,
      })
    );
    const plinthDarkMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x162436,
        roughness: 0.34,
        metalness: 0.28,
        clearcoat: 0.65,
      })
    );
    const brassMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf6c453,
        roughness: 0.24,
        metalness: 0.88,
      })
    );
    const chromeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.18,
        metalness: 0.92,
      })
    );
    const ivoryDialMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfdf8ec,
        roughness: 0.36,
        metalness: 0.05,
      })
    );
    const darkHoleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.5,
        metalness: 0.2,
      })
    );

    const rootPivot = new THREE.Group();
    scene.add(rootPivot);

    const phonePivot = new THREE.Group();
    phonePivot.position.y = -0.14;
    rootPivot.add(phonePivot);

    // 1. Tiered Rounded Plinth Base
    const baseFoot = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.36, 0.14, 1.12)),
      plinthDarkMat
    );
    baseFoot.position.y = -0.34;
    phonePivot.add(baseFoot);

    const lowerTier = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.24, 0.18, 0.98)),
      bodyLacquerMat
    );
    lowerTier.position.y = -0.2;
    phonePivot.add(lowerTier);

    // 2. Sculpted Tapered Vintage Housing
    const housing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.46, 0.68, 0.58, 4)),
      bodyLacquerMat
    );
    housing.rotation.y = Math.PI / 4;
    housing.scale.set(1.14, 1, 0.94);
    housing.position.y = 0.14;
    phonePivot.add(housing);

    // 3. Twin Vintage Brass Bells + Central Clapper Striker
    const bellsGroup = new THREE.Group();
    bellsGroup.position.set(0, 0.48, -0.1);
    phonePivot.add(bellsGroup);

    const bellGeo = trackGeo(
      new THREE.SphereGeometry(0.22, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58)
    );
    const leftBell = new THREE.Mesh(bellGeo, brassMat);
    leftBell.position.set(-0.27, 0, 0);
    leftBell.rotation.z = 0.28;
    bellsGroup.add(leftBell);

    const rightBell = new THREE.Mesh(bellGeo, brassMat);
    rightBell.position.set(0.27, 0, 0);
    rightBell.rotation.z = -0.28;
    bellsGroup.add(rightBell);

    const clapperPivot = new THREE.Group();
    clapperPivot.position.set(0, -0.02, 0.03);
    bellsGroup.add(clapperPivot);

    const clapperStem = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 8)),
      chromeMat
    );
    clapperStem.position.y = 0.09;
    clapperPivot.add(clapperStem);

    const clapperBall = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.055, 12, 10)),
      brassMat
    );
    clapperBall.position.y = 0.18;
    clapperPivot.add(clapperBall);

    // 4. Brass Cradle Forks supporting the Vintage Handset
    const cradlePosts = new THREE.Group();
    cradlePosts.position.set(0, 0.44, 0.06);
    phonePivot.add(cradlePosts);

    const forkGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.045, 0.24, 10));
    const leftFork = new THREE.Mesh(forkGeo, brassMat);
    leftFork.position.set(-0.26, 0.08, 0);
    leftFork.rotation.z = 0.12;
    cradlePosts.add(leftFork);

    const rightFork = new THREE.Mesh(forkGeo, brassMat);
    rightFork.position.set(0.26, 0.08, 0);
    rightFork.rotation.z = -0.12;
    cradlePosts.add(rightFork);

    // 5. Tilted Classic Rotary Dial on Front Face
    const dialGroup = new THREE.Group();
    dialGroup.position.set(0, 0.1, 0.42);
    dialGroup.rotation.x = -0.52;
    phonePivot.add(dialGroup);

    const dialOuterRing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.31, 0.33, 0.05, 28)),
      brassMat
    );
    dialOuterRing.rotation.x = Math.PI / 2;
    dialGroup.add(dialOuterRing);

    const dialFace = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.265, 0.265, 0.055, 28)),
      ivoryDialMat
    );
    dialFace.rotation.x = Math.PI / 2;
    dialGroup.add(dialFace);

    const dialCenterHub = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.095, 0.105, 0.068, 20)),
      brassMat
    );
    dialCenterHub.rotation.x = Math.PI / 2;
    dialGroup.add(dialCenterHub);

    // 10 Rotary finger holes around the dial rim
    const holeGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.062, 12));
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI * 0.18 + (i / 10) * Math.PI * 1.56;
      const hole = new THREE.Mesh(holeGeo, darkHoleMat);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(Math.cos(angle) * 0.185, Math.sin(angle) * 0.185, 0.005);
      dialGroup.add(hole);
    }

    // 6. Sculpted Vintage Curved Handset (Rattles & Lifts During Ring)
    const handsetPivot = new THREE.Group();
    handsetPivot.position.set(0, 0.62, 0.06);
    phonePivot.add(handsetPivot);

    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.62, -0.08, 0.02),
      new THREE.Vector3(-0.34, 0.16, 0),
      new THREE.Vector3(0, 0.21, 0),
      new THREE.Vector3(0.34, 0.16, 0),
      new THREE.Vector3(0.62, -0.08, 0.02),
    ]);
    const handleArch = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(archCurve, 24, 0.095, 12, false)),
      bodyLacquerMat
    );
    handsetPivot.add(handleArch);

    const cupConeGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.21, 0.18, 18));
    const cupCapGeo = trackGeo(new THREE.CylinderGeometry(0.21, 0.21, 0.035, 18));

    const leftCup = new THREE.Mesh(cupConeGeo, bodyLacquerMat);
    leftCup.position.set(-0.65, -0.14, 0.03);
    leftCup.rotation.z = -0.35;
    handsetPivot.add(leftCup);

    const leftCap = new THREE.Mesh(cupCapGeo, brassMat);
    leftCap.position.set(-0.69, -0.22, 0.03);
    leftCap.rotation.z = -0.35;
    handsetPivot.add(leftCap);

    const rightCup = new THREE.Mesh(cupConeGeo, bodyLacquerMat);
    rightCup.position.set(0.65, -0.14, 0.03);
    rightCup.rotation.z = 0.35;
    handsetPivot.add(rightCup);

    const rightCap = new THREE.Mesh(cupCapGeo, brassMat);
    rightCap.position.set(0.69, -0.22, 0.03);
    rightCap.rotation.z = 0.35;
    handsetPivot.add(rightCap);

    // 7. Coiled Cord Accent Sweeping From Side
    const coilPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i += 1) {
      const p = i / 32;
      const helix = p * Math.PI * 8;
      coilPoints.push(
        new THREE.Vector3(
          -0.62 - Math.sin(p * Math.PI) * 0.14 + Math.cos(helix) * 0.04,
          0.32 - p * 0.56,
          0.08 + Math.sin(helix) * 0.04
        )
      );
    }
    const cordMesh = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPoints), 36, 0.022, 7, false)
      ),
      plinthDarkMat
    );
    phonePivot.add(cordMesh);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(76, container.clientWidth || 84);
      const h = Math.max(76, container.clientHeight || 84);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let disposed = false;
    let frameId = 0;
    const startSec = performance.now() / 1000;
    let lastSec = startSec;
    let lastDatasetSync = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== "function") {
        frameId = window.setTimeout(cb, 65);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      let polls = 0;
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        polls += 1;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED && polls < 8) {
          frameId = window.setTimeout(poll, 10);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 60);
        }
      };
      frameId = window.setTimeout(poll, 10);
    }

    const tick = () => {
      if (disposed) return;

      const nowSec = performance.now() / 1000;
      const dt = Math.min(Math.max(nowSec - lastSec, 0.001), 0.08);
      lastSec = nowSec;
      const elapsed = nowSec - startSec;

      const reduced = reducedMotionRef.current;
      const hovered = hoveredRef.current;
      const open = openRef.current;

      const ring = reduced
        ? {
            scale: hovered ? 1.04 : 1,
            bodyShakeZ: 0,
            handsetShakeZ: 0,
            handsetLiftY: 0,
            clapperAngleRad: 0,
            waveProgress: 0,
            isRingingBurst: false,
          }
        : computeVintagePhoneRingState(elapsed, hovered, open);

      const nextScale = THREE.MathUtils.damp(
        rootPivot.scale.x,
        ring.scale,
        14,
        dt
      );
      rootPivot.scale.setScalar(nextScale);

      // Gentle 3D presentation angle + interactive pointer response
      const targetYaw =
        (hovered ? pointerRef.current.nx * 0.35 : Math.sin(elapsed * 0.9) * 0.14) -
        0.14;
      const targetPitch = hovered ? pointerRef.current.ny * 0.14 : 0.04;
      phonePivot.rotation.y = THREE.MathUtils.damp(
        phonePivot.rotation.y,
        targetYaw,
        9,
        dt
      );
      phonePivot.rotation.x = THREE.MathUtils.damp(
        phonePivot.rotation.x,
        targetPitch,
        9,
        dt
      );
      phonePivot.rotation.z = ring.bodyShakeZ;

      // Retro handset rattles and bounces off the brass cradle during ring burst
      handsetPivot.rotation.z = ring.handsetShakeZ;
      handsetPivot.position.y = 0.62 + ring.handsetLiftY;
      clapperPivot.rotation.z = ring.clapperAngleRad;

      // Subtle brass bell vibration
      bellsGroup.rotation.z = -ring.bodyShakeZ * 0.8;

      if (wrapper && nowSec - lastDatasetSync > 0.1) {
        lastDatasetSync = nowSec;
        wrapper.dataset.scale = nextScale.toFixed(3);
        wrapper.dataset.shake = ring.handsetShakeZ.toFixed(3);
        wrapper.dataset.ringing = ring.isRingingBurst ? "true" : "false";
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        handleContextRestored
      );
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const telHref = formatTelHref(phone);
  const waHref = formatWhatsAppHref(whatsapp || phone);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(phone);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      data-testid="footer-3d-call-widget"
      className="group relative rounded-2xl bg-white/92 border border-slate-200/90 hover:border-[#3393B8]/50 p-3.5 shadow-[0_10px_24px_-14px_rgba(34,87,122,0.3)] transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        pointerRef.current = { nx: 0, ny: 0 };
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        pointerRef.current = {
          nx: ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
          ny: ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1,
        };
      }}
    >
      <div className="flex items-center gap-3.5">
        {/* Interactive 3D Vintage Old Telephone Button */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          aria-label={`Interactive 3D Call Hotline for ${phone}`}
          aria-expanded={isDrawerOpen}
          data-testid="vintage-phone-3d-trigger"
          className="no-btn-fx relative w-[78px] h-[78px] sm:w-[84px] sm:h-[84px] rounded-2xl bg-gradient-to-br from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD] border border-white border-b-[4px] border-b-[#22577A] shadow-[0_10px_22px_-8px_rgba(34,87,122,0.45),inset_0_2px_3px_rgba(255,255,255,0.95)] flex items-center justify-center shrink-0 cursor-pointer overflow-hidden transition-shadow duration-300 group-hover:shadow-[0_14px_26px_-6px_rgba(230,0,0,0.28)]"
        >
          {/* Expanding silent visual beacon ring around the 3D old phone */}
          <span
            aria-hidden="true"
            className="silent-ring-wave silent-ring-wave-1 rounded-2xl"
          />
          <span
            aria-hidden="true"
            className="silent-ring-wave silent-ring-wave-2 rounded-2xl"
          />

          <div
            ref={stageWrapperRef}
            data-testid="vintage-phone-3d-stage"
            className="relative z-10 w-full h-full flex items-center justify-center"
          >
            {webglFailed && (
              <svg
                viewBox="0 0 80 80"
                aria-hidden="true"
                className="w-16 h-16 vintage-phone-fallback-anim drop-shadow-md"
              >
                <defs>
                  <linearGradient id="old-phone-red" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#991B1B" />
                  </linearGradient>
                  <linearGradient id="old-phone-brass" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                </defs>
                <rect x="14" y="57" width="52" height="10" rx="4" fill="#1E293B" />
                <path d="M18 57 L24 34 L56 34 L62 57 Z" fill="url(#old-phone-red)" />
                <path d="M21 25 A8 8 0 0 1 35 25 Z" fill="url(#old-phone-brass)" />
                <path d="M45 25 A8 8 0 0 1 59 25 Z" fill="url(#old-phone-brass)" />
                <path
                  d="M14 27 C24 14, 56 14, 66 27 L62 32 C54 23, 26 23, 18 32 Z"
                  fill="url(#old-phone-red)"
                  stroke="#7F1D1D"
                  strokeWidth="1.2"
                />
                <circle cx="40" cy="46" r="10.5" fill="url(#old-phone-brass)" />
                <circle cx="40" cy="46" r="8" fill="#FEF9C3" />
                <circle cx="40" cy="46" r="3" fill="#B45309" />
              </svg>
            )}
            <div
              ref={mountRef}
              className={`w-full h-full ${webglFailed ? "hidden" : "block"}`}
            />
          </div>
        </button>

        {/* Hotline Info + Attention Call Action */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#14171A]">
              {label}
            </span>
            <button
              type="button"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border cursor-pointer transition-colors ${
                isDrawerOpen
                  ? "bg-[#E60000] text-white border-[#E60000]"
                  : "bg-sky-50 text-[#22577A] border-[#3393B8]/40 hover:bg-[#22577A] hover:text-white"
              }`}
            >
              {isDrawerOpen ? "Call Options" : "Tap to Call"}
            </button>
          </div>

          <a
            href={telHref}
            onClick={() => setIsDrawerOpen(true)}
            className="text-sm sm:text-[15px] font-extrabold text-[#22577A] hover:text-[#E60000] no-underline transition-colors block truncate mt-1 tabular-nums"
          >
            {phone}
          </a>
          <p className="text-[11px] text-slate-500 m-0 mt-0.5 truncate">
            Direct engineering &amp; site inspection desk
          </p>
        </div>
      </div>

      {/* Interactive Quick-Call Actions Drawer */}
      {isDrawerOpen && (
        <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-2 animate-[fadeIn_0.18s_ease-out]">
          <a
            href={telHref}
            className="tactile-pill-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold no-underline cursor-pointer"
          >
            <FiPhoneCall className="relative z-10 text-xs" />
            <span className="relative z-10">Call Now</span>
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-[#25D366]/12 border-[#25D366]/40 text-[#15803d] hover:bg-[#25D366]/20 text-[11px] font-bold no-underline transition-colors"
          >
            <FaWhatsapp className="text-xs" />
            <span>WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
          >
            {copied ? (
              <>
                <FiCheck className="text-emerald-600 text-xs" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <FiCopy className="text-xs" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

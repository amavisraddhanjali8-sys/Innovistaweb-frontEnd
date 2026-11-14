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

    // Sculpted phone material: glossy blue-and-red gradient lacquer + brushed silver hardware + ivory dial
    const blueRedGradientMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 0.2,
        metalness: 0.14,
        clearcoat: 0.94,
        clearcoatRoughness: 0.12,
      })
    );
    const chromeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.2,
        metalness: 0.9,
      })
    );
    const darkTrimMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.55,
      })
    );
    const ivoryDialMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.34,
        metalness: 0.06,
      })
    );

    const blueStop = new THREE.Color("#0284C7");
    const cobaltStop = new THREE.Color("#1D4ED8");
    const crimsonStop = new THREE.Color("#B91C1C");
    const redStop = new THREE.Color("#E60000");
    const tmpPos = new THREE.Vector3();
    const tmpColor = new THREE.Color();

    const applyBlueRedGradient = (
      mesh: THREE.Mesh,
      parentOffset: THREE.Vector3 = new THREE.Vector3()
    ) => {
      mesh.updateMatrix();
      const geo = mesh.geometry;
      const posAttr = geo.attributes.position;
      const colors = new Float32Array(posAttr.count * 3);

      for (let i = 0; i < posAttr.count; i += 1) {
        tmpPos.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrix).add(parentOffset);
        // Smooth diagonal sweep: vibrant blue on top-left -> crimson/red on bottom-right
        const t = Math.max(
          0,
          Math.min(1, ((tmpPos.x + 0.78) / 1.56) * 0.72 + ((0.82 - tmpPos.y) / 1.3) * 0.28)
        );
        if (t < 0.32) {
          tmpColor.lerpColors(blueStop, cobaltStop, t / 0.32);
        } else if (t < 0.68) {
          tmpColor.lerpColors(cobaltStop, crimsonStop, (t - 0.32) / 0.36);
        } else {
          tmpColor.lerpColors(crimsonStop, redStop, (t - 0.68) / 0.32);
        }
        colors[i * 3] = tmpColor.r;
        colors[i * 3 + 1] = tmpColor.g;
        colors[i * 3 + 2] = tmpColor.b;
      }

      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    };

    const rootPivot = new THREE.Group();
    scene.add(rootPivot);

    const phonePivot = new THREE.Group();
    phonePivot.position.y = -0.14;
    rootPivot.add(phonePivot);

    // 1. Tiered Rounded Plinth Base (segmented for smooth vertex color gradient)
    const baseFoot = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.36, 0.14, 1.12, 18, 2, 12)),
      blueRedGradientMat
    );
    baseFoot.position.y = -0.34;
    applyBlueRedGradient(baseFoot);
    phonePivot.add(baseFoot);

    const lowerTier = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.24, 0.18, 0.98, 18, 2, 12)),
      blueRedGradientMat
    );
    lowerTier.position.y = -0.2;
    applyBlueRedGradient(lowerTier);
    phonePivot.add(lowerTier);

    // 2. Sculpted Tapered Vintage Housing
    const housing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.46, 0.68, 0.58, 4, 14)),
      blueRedGradientMat
    );
    housing.rotation.y = Math.PI / 4;
    housing.scale.set(1.14, 1, 0.94);
    housing.position.y = 0.14;
    applyBlueRedGradient(housing);
    phonePivot.add(housing);

    // 3. Twin Chrome-Silver Bells + Central Clapper Striker
    const bellsGroup = new THREE.Group();
    bellsGroup.position.set(0, 0.48, -0.1);
    phonePivot.add(bellsGroup);

    const bellGeo = trackGeo(
      new THREE.SphereGeometry(0.22, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58)
    );
    const leftBell = new THREE.Mesh(bellGeo, chromeMat);
    leftBell.position.set(-0.27, 0, 0);
    leftBell.rotation.z = 0.28;
    bellsGroup.add(leftBell);

    const rightBell = new THREE.Mesh(bellGeo, chromeMat);
    rightBell.position.set(0.27, 0, 0);
    rightBell.rotation.z = -0.28;
    bellsGroup.add(rightBell);

    const clapperPivot = new THREE.Group();
    clapperPivot.position.set(0, -0.02, 0.03);
    bellsGroup.add(clapperPivot);

    const clapperStem = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 8)),
      darkTrimMat
    );
    clapperStem.position.y = 0.09;
    clapperPivot.add(clapperStem);

    const clapperBall = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.055, 12, 10)),
      chromeMat
    );
    clapperBall.position.y = 0.18;
    clapperPivot.add(clapperBall);

    // 4. Chrome Cradle Forks supporting the Vintage Handset
    const cradlePosts = new THREE.Group();
    cradlePosts.position.set(0, 0.44, 0.06);
    phonePivot.add(cradlePosts);

    const forkGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.045, 0.24, 10));
    const leftFork = new THREE.Mesh(forkGeo, chromeMat);
    leftFork.position.set(-0.26, 0.08, 0);
    leftFork.rotation.z = 0.12;
    cradlePosts.add(leftFork);

    const rightFork = new THREE.Mesh(forkGeo, chromeMat);
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
      chromeMat
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
      chromeMat
    );
    dialCenterHub.rotation.x = Math.PI / 2;
    dialGroup.add(dialCenterHub);

    // 10 Rotary finger holes around the dial rim
    const holeGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.062, 12));
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI * 0.18 + (i / 10) * Math.PI * 1.56;
      const hole = new THREE.Mesh(holeGeo, darkTrimMat);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(Math.cos(angle) * 0.185, Math.sin(angle) * 0.185, 0.005);
      dialGroup.add(hole);
    }

    // 6. Sculpted Vintage Curved Handset with Blue-to-Red Gradient
    const handsetPivot = new THREE.Group();
    const handsetOffset = new THREE.Vector3(0, 0.62, 0.06);
    handsetPivot.position.copy(handsetOffset);
    phonePivot.add(handsetPivot);

    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.62, -0.08, 0.02),
      new THREE.Vector3(-0.34, 0.16, 0),
      new THREE.Vector3(0, 0.21, 0),
      new THREE.Vector3(0.34, 0.16, 0),
      new THREE.Vector3(0.62, -0.08, 0.02),
    ]);
    const handleArch = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(archCurve, 32, 0.095, 12, false)),
      blueRedGradientMat
    );
    applyBlueRedGradient(handleArch, handsetOffset);
    handsetPivot.add(handleArch);

    const leftCup = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.21, 0.18, 18, 6)),
      blueRedGradientMat
    );
    leftCup.position.set(-0.65, -0.14, 0.03);
    leftCup.rotation.z = -0.35;
    applyBlueRedGradient(leftCup, handsetOffset);
    handsetPivot.add(leftCup);

    const cupCapGeo = trackGeo(new THREE.CylinderGeometry(0.21, 0.21, 0.035, 18));
    const leftCap = new THREE.Mesh(cupCapGeo, chromeMat);
    leftCap.position.set(-0.69, -0.22, 0.03);
    leftCap.rotation.z = -0.35;
    handsetPivot.add(leftCap);

    const rightCup = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.21, 0.18, 18, 6)),
      blueRedGradientMat
    );
    rightCup.position.set(0.65, -0.14, 0.03);
    rightCup.rotation.z = 0.35;
    applyBlueRedGradient(rightCup, handsetOffset);
    handsetPivot.add(rightCup);

    const rightCap = new THREE.Mesh(cupCapGeo, chromeMat);
    rightCap.position.set(0.69, -0.22, 0.03);
    rightCap.rotation.z = 0.35;
    handsetPivot.add(rightCap);

    // 7. Coiled Cord Accent Sweeping From Left Side
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
      blueRedGradientMat
    );
    applyBlueRedGradient(cordMesh);
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
    let isIntersecting = false;
    let isTabVisible =
      typeof document === "undefined" || document.visibilityState !== "hidden";
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

      // Retro handset rattles and bounces off the cradle during ring burst
      handsetPivot.rotation.z = ring.handsetShakeZ;
      handsetPivot.position.y = 0.62 + ring.handsetLiftY;
      clapperPivot.rotation.z = ring.clapperAngleRad;

      // Subtle bell vibration
      bellsGroup.rotation.z = -ring.bodyShakeZ * 0.8;

      if (wrapper && nowSec - lastDatasetSync > 0.1) {
        lastDatasetSync = nowSec;
        wrapper.dataset.scale = nextScale.toFixed(3);
        wrapper.dataset.shake = ring.handsetShakeZ.toFixed(3);
        wrapper.dataset.ringing = ring.isRingingBurst ? "true" : "false";
      }

      renderer.render(scene, camera);
      if (!isIntersecting || !isTabVisible) {
        frameId = 0;
        return;
      }
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    const scheduleTick = () => {
      if (disposed || frameId || !isIntersecting || !isTabVisible) return;
      lastSec = performance.now() / 1000;
      frameId = requestAnimationFrame(tick);
    };

    const intersectionObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              isIntersecting = entries.some((entry) => entry.isIntersecting);
              if (isIntersecting) {
                scheduleTick();
              } else {
                cancelAnimationFrame(frameId);
                clearTimeout(frameId);
                frameId = 0;
              }
            },
            { rootMargin: "120px" }
          )
        : null;

    if (intersectionObserver) {
      intersectionObserver.observe(container);
    } else {
      isIntersecting = true;
    }

    const onVisibilityChange = () => {
      isTabVisible = document.visibilityState !== "hidden";
      if (isTabVisible) {
        scheduleTick();
      } else {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        frameId = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
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
      className="group relative"
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
      <div className="flex items-center gap-3">
        {/* Unboxed Interactive 3D Blue-and-Red Gradient Telephone */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          aria-label={`Interactive Call Hotline for ${phone}`}
          aria-expanded={isDrawerOpen}
          data-testid="vintage-phone-3d-trigger"
          className="no-btn-fx relative w-[76px] h-[76px] sm:w-[82px] sm:h-[82px] bg-transparent border-0 p-0 shadow-none flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22577A]"
        >
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
                  <linearGradient id="old-phone-blue-red" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0284C7" />
                    <stop offset="38%" stopColor="#1D4ED8" />
                    <stop offset="72%" stopColor="#B91C1C" />
                    <stop offset="100%" stopColor="#E60000" />
                  </linearGradient>
                  <linearGradient id="old-phone-silver" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F1F5F9" />
                    <stop offset="100%" stopColor="#94A3B8" />
                  </linearGradient>
                </defs>
                <rect x="14" y="57" width="52" height="10" rx="4" fill="url(#old-phone-blue-red)" />
                <path d="M18 57 L24 34 L56 34 L62 57 Z" fill="url(#old-phone-blue-red)" />
                <path d="M21 25 A8 8 0 0 1 35 25 Z" fill="url(#old-phone-silver)" />
                <path d="M45 25 A8 8 0 0 1 59 25 Z" fill="url(#old-phone-silver)" />
                <path
                  d="M14 27 C24 14, 56 14, 66 27 L62 32 C54 23, 26 23, 18 32 Z"
                  fill="url(#old-phone-blue-red)"
                />
                <circle cx="40" cy="46" r="10.5" fill="url(#old-phone-silver)" />
                <circle cx="40" cy="46" r="8" fill="#F8FAFC" />
                <circle cx="40" cy="46" r="3" fill="#22577A" />
              </svg>
            )}
            <div
              ref={mountRef}
              className={`w-full h-full ${webglFailed ? "hidden" : "block"}`}
            />
          </div>
        </button>

        {/* Simple Unboxed Hotline Number & Details */}
        <div className="min-w-0">
          <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#3B4451]">
            {label}
          </span>

          <a
            href={telHref}
            onClick={() => setIsDrawerOpen(true)}
            className="text-base sm:text-lg font-extrabold text-[#14171A] hover:text-[#22577A] no-underline transition-colors block truncate mt-0.5 tabular-nums"
          >
            {phone}
          </a>
          <p className="text-xs text-[#3B4451] m-0 mt-0.5">
            Direct engineering &amp; site inspection desk
          </p>

          {isDrawerOpen && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
              <a
                href={telHref}
                className="inline-flex items-center gap-1.5 text-[#22577A] hover:text-[#E60000] no-underline transition-colors"
              >
                <FiPhoneCall className="text-xs" />
                <span>Call Now</span>
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#15803d] hover:underline no-underline transition-colors"
              >
                <FaWhatsapp className="text-xs" />
                <span>WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-[#3B4451] hover:text-[#14171A] text-xs font-semibold cursor-pointer transition-colors"
              >
                {copied ? (
                  <>
                    <FiCheck className="text-emerald-600 text-xs" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="text-xs" />
                    <span>Copy Number</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

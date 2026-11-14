import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { computeChatbotCursorTargets } from "../utils/chatbotHelpers";

export interface Chatbot3DReceptionistAvatarProps {
  variant?: "launcher" | "concierge";
  isSpeaking?: boolean;
  isHovered?: boolean;
  className?: string;
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

/**
 * Applies a rich cyan-blue -> cobalt -> violet-magenta gradient across geometry vertices
 * matching the glossy 3D speech-bubble mascot aesthetic.
 */
function applyBotGradientVertexColors(
  geometry: THREE.BufferGeometry,
  minX = -1,
  maxX = 1
): THREE.BufferGeometry {
  const pos = geometry.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const cCyanBlue = new THREE.Color(0x00b4ff);
  const cElectricBlue = new THREE.Color(0x1f5eff);
  const cViolet = new THREE.Color(0x7c2ae8);
  const cMagentaPink = new THREE.Color(0xf42cc8);
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, (x - minX) / Math.max(0.001, maxX - minX)));
    const yShift = Math.max(0, Math.min(1, (y + 1) * 0.5));

    if (t < 0.35) {
      tmp.copy(cCyanBlue).lerp(cElectricBlue, t / 0.35);
    } else if (t < 0.68) {
      tmp.copy(cElectricBlue).lerp(cViolet, (t - 0.35) / 0.33);
    } else {
      tmp.copy(cViolet).lerp(cMagentaPink, (t - 0.68) / 0.32);
    }

    // Brighten upper specular crown subtly for soft 3D volume
    tmp.offsetHSL(0, 0, (yShift - 0.5) * 0.05);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export default function Chatbot3DReceptionistAvatar({
  variant = "launcher",
  isSpeaking = false,
  isHovered = false,
  className = "",
}: Chatbot3DReceptionistAvatarProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const speakingRef = useRef(isSpeaking);
  const hoveredRef = useRef(isHovered);
  const variantRef = useRef(variant);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const hoverSpinTimerRef = useRef(0);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    const prev = hoveredRef.current;
    hoveredRef.current = isHovered;
    if (isHovered && !prev) {
      // Trigger joyful 360-degree turn-around flourish on hover enter
      hoverSpinTimerRef.current = 1.0;
    }
  }, [isHovered]);

  useEffect(() => {
    variantRef.current = variant;
  }, [variant]);

  useEffect(() => {
    const container = mountRef.current;
    const wrapper = wrapperRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const fallbackSize = variant === "launcher" ? 104 : 52;
    const width = Math.max(44, container.clientWidth || fallbackSize);
    const height = Math.max(44, container.clientHeight || fallbackSize);

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
    if (variant === "launcher") {
      camera.position.set(0, 0.08, 4.35);
      camera.lookAt(0.05, 0.06, 0);
    } else {
      camera.position.set(0, 0.05, 3.85);
      camera.lookAt(0.04, 0.05, 0);
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
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
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored);

    // Studio IBL environment so glossy clearcoat shell and visor rim pop
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    envScene.dispose();
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xf5d0fe, 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(-2.4, 3.4, 3.6);
    scene.add(keyLight);

    const magentaRim = new THREE.DirectionalLight(0xf472b6, 1.45);
    magentaRim.position.set(2.8, 1.8, -1.6);
    scene.add(magentaRim);

    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.45);
    cyanRim.position.set(-2.8, 1.2, -1.8);
    scene.add(cyanRim);

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

    // High-gloss gradient shell material
    const glossyBotMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.14,
        metalness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        reflectivity: 0.95,
      })
    );

    const visorGlassMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x090d1a,
        roughness: 0.12,
        metalness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      })
    );

    const visorBezelMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x1e293b,
        roughness: 0.25,
        metalness: 0.78,
        clearcoat: 0.7,
      })
    );

    const antennaStemMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.28,
        metalness: 0.85,
      })
    );

    const leftEyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x60a5fa,
        emissiveIntensity: 1.35,
        roughness: 0.08,
      })
    );

    const rightEyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe879f9,
        emissiveIntensity: 1.35,
        roughness: 0.08,
      })
    );

    const eyeCoreMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      })
    );

    const pupilMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x0f172a,
      })
    );

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const botPivot = new THREE.Group();
    rootGroup.add(botPivot);

    // 1. Plump Speech-Bubble Cushion Body
    const headGeo = applyBotGradientVertexColors(
      trackGeo(new THREE.SphereGeometry(0.92, 36, 32)),
      -0.95,
      0.95
    );
    const bodyMesh = new THREE.Mesh(headGeo, glossyBotMat);
    bodyMesh.scale.set(1.07, 0.92, 0.76);
    botPivot.add(bodyMesh);

    // 2. Sculpted Bottom-Right Speech Bubble Tail
    const tailGeo = applyBotGradientVertexColors(
      trackGeo(new THREE.ConeGeometry(0.28, 0.56, 22)),
      -0.3,
      0.3
    );
    const tailMesh = new THREE.Mesh(tailGeo, glossyBotMat);
    tailMesh.position.set(0.68, -0.68, 0.02);
    tailMesh.rotation.z = -2.42;
    tailMesh.rotation.x = 0.08;
    botPivot.add(tailMesh);

    const tailTipGeo = applyBotGradientVertexColors(
      trackGeo(new THREE.SphereGeometry(0.082, 14, 14)),
      -0.1,
      0.1
    );
    const tailTip = new THREE.Mesh(tailTipGeo, glossyBotMat);
    tailTip.position.set(0.84, -0.87, 0.04);
    botPivot.add(tailTip);

    // 3. Top-Right Antenna Assembly
    const antennaPivot = new THREE.Group();
    antennaPivot.position.set(0.56, 0.69, 0.02);
    antennaPivot.rotation.z = -0.46;
    botPivot.add(antennaPivot);

    const stemMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.042, 0.052, 0.36, 14)),
      antennaStemMat
    );
    stemMesh.position.y = 0.16;
    antennaPivot.add(stemMesh);

    const antennaOrbGeo = applyBotGradientVertexColors(
      trackGeo(new THREE.SphereGeometry(0.16, 22, 22)),
      -0.16,
      0.16
    );
    const antennaOrb = new THREE.Mesh(antennaOrbGeo, glossyBotMat);
    antennaOrb.position.y = 0.37;
    antennaPivot.add(antennaOrb);

    // 4. Dark Glossy Pill Visor in Center Front
    const visorGroup = new THREE.Group();
    visorGroup.position.set(0, 0.01, 0.56);
    botPivot.add(visorGroup);

    const bezelCapsule = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.36, 0.54, 14, 28)),
      visorBezelMat
    );
    bezelCapsule.rotation.z = Math.PI / 2;
    bezelCapsule.scale.set(1.0, 1.0, 0.42);
    visorGroup.add(bezelCapsule);

    const screenCapsule = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.33, 0.52, 14, 28)),
      visorGlassMat
    );
    screenCapsule.rotation.z = Math.PI / 2;
    screenCapsule.scale.set(1.0, 1.0, 0.44);
    screenCapsule.position.z = 0.028;
    visorGroup.add(screenCapsule);

    // 5. Expressive Interactive Glowing Eyes inside the Visor
    const eyesAnchor = new THREE.Group();
    eyesAnchor.position.set(0, 0.0, 0.195);
    visorGroup.add(eyesAnchor);

    // Happy glowing arch eye + expressive interactive tracking eye iris/pupil
    const archGeo = trackGeo(
      new THREE.TorusGeometry(0.11, 0.038, 12, 22, Math.PI)
    );
    const glowDiscGeo = trackGeo(new THREE.CircleGeometry(0.112, 22));
    const trackingIrisGeo = trackGeo(new THREE.CircleGeometry(0.086, 20));
    const trackingPupilGeo = trackGeo(new THREE.CircleGeometry(0.046, 18));
    const glintGeo = trackGeo(new THREE.CircleGeometry(0.017, 12));

    const buildMascotEye = (xOffset: number, glowMat: THREE.MeshStandardMaterial) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(xOffset, 0, 0);

      // Luminous rounded eye disc (tracks cursor)
      const roundGroup = new THREE.Group();
      const outerHalo = new THREE.Mesh(glowDiscGeo, glowMat);
      outerHalo.position.z = 0.002;
      roundGroup.add(outerHalo);

      const whiteOrb = new THREE.Mesh(trackingIrisGeo, eyeCoreMat);
      whiteOrb.position.z = 0.006;
      roundGroup.add(whiteOrb);

      const pupil = new THREE.Mesh(trackingPupilGeo, pupilMat);
      pupil.position.z = 0.011;
      roundGroup.add(pupil);

      const glint = new THREE.Mesh(glintGeo, eyeCoreMat);
      glint.position.set(0.016, 0.018, 0.014);
      roundGroup.add(glint);

      eyeGroup.add(roundGroup);

      // Joyful arched crescent overlay (shown briefly on blink/greeting spin)
      const happyArch = new THREE.Mesh(archGeo, glowMat);
      happyArch.position.set(0, -0.025, 0.008);
      happyArch.visible = false;
      eyeGroup.add(happyArch);

      eyesAnchor.add(eyeGroup);
      return { eyeGroup, roundGroup, pupil, happyArch };
    };

    const leftEye = buildMascotEye(-0.22, leftEyeMat);
    const rightEye = buildMascotEye(0.22, rightEyeMat);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const handleGlobalPointerMove = (e: PointerEvent | MouseEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    window.addEventListener("pointermove", handleGlobalPointerMove, {
      passive: true,
    });
    window.addEventListener("mousemove", handleGlobalPointerMove, {
      passive: true,
    });

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(44, container.clientWidth || fallbackSize);
      const h = Math.max(44, container.clientHeight || fallbackSize);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let disposed = false;
    let frameId = 0;
    let isIntersecting = true;
    let isTabVisible =
      typeof document === "undefined" || document.visibilityState !== "hidden";
    const startSec = performance.now() / 1000;
    let lastSec = startSec;
    let lastDatasetSync = 0;
    let baseYaw = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== "function") {
        frameId = window.setTimeout(cb, 65);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 55);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;

      const nowSec = performance.now() / 1000;
      const dt = Math.min(Math.max(nowSec - lastSec, 0.001), 0.08);
      lastSec = nowSec;
      const t = nowSec - startSec;
      const hovered = hoveredRef.current;
      const speaking = speakingRef.current;

      // Compute cursor look targets relative to container center
      let targets = { nx: 0, ny: 0, eyeX: 0, eyeY: 0, headYaw: 0, headPitch: 0 };
      if (pointerRef.current.active && wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        targets = computeChatbotCursorTargets(
          pointerRef.current.x,
          pointerRef.current.y,
          cx,
          cy,
          window.innerWidth || 1440,
          window.innerHeight || 900
        );
      } else {
        // Subtle lifelike idle look before user moves pointer
        const idleX = Math.sin(t * 0.9) * 0.28;
        const idleY = Math.cos(t * 0.65) * 0.14;
        targets = {
          nx: idleX,
          ny: idleY,
          eyeX: idleX * 0.08,
          eyeY: -idleY * 0.04,
          headYaw: idleX * 0.3,
          headPitch: idleY * 0.16,
        };
      }

      // Hover celebration spin decay (smooth 360-degree turn-around flourish on hover)
      let hoverSpinYaw = 0;
      if (hoverSpinTimerRef.current > 0) {
        hoverSpinTimerRef.current = Math.max(0, hoverSpinTimerRef.current - dt * 1.45);
        const p = 1 - hoverSpinTimerRef.current;
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        hoverSpinYaw = eased * Math.PI * 2;
      }

      // Smooth float + hover lift & energetic scale
      const floatAmp = hovered ? 0.075 : 0.045;
      rootGroup.position.y = Math.sin(t * 2.5) * floatAmp + (hovered ? 0.05 : 0);
      const targetScale = hovered ? 1.09 : speaking ? 1.04 : 1.0;
      const nextScale = THREE.MathUtils.damp(rootGroup.scale.x, targetScale, 9, dt);
      rootGroup.scale.setScalar(nextScale);

      // Bot head turns around smoothly toward cursor (plus 360 spin flourish on hover enter)
      const desiredYaw = targets.headYaw * (hovered ? 1.2 : 1.0);
      const desiredPitch = targets.headPitch + (speaking ? Math.sin(t * 9) * 0.05 : 0);
      baseYaw = THREE.MathUtils.damp(baseYaw, desiredYaw, 8, dt);
      botPivot.rotation.y = baseYaw + hoverSpinYaw;
      botPivot.rotation.x = THREE.MathUtils.damp(botPivot.rotation.x, desiredPitch, 8, dt);
      botPivot.rotation.z = THREE.MathUtils.damp(
        botPivot.rotation.z,
        hovered ? Math.sin(t * 5.2) * 0.07 : -targets.nx * 0.08,
        7,
        dt
      );

      // Antenna bounce on hover / speaking
      antennaPivot.rotation.z =
        -0.46 + Math.sin(t * (hovered ? 10 : 3.2)) * (hovered ? 0.16 : 0.05);

      // Eyes follow cursor smoothly inside visor
      const dampEyeX = THREE.MathUtils.damp(
        leftEye.eyeGroup.position.x + 0.22,
        targets.eyeX,
        14,
        dt
      );
      const dampEyeY = THREE.MathUtils.damp(
        leftEye.eyeGroup.position.y,
        targets.eyeY,
        14,
        dt
      );
      leftEye.eyeGroup.position.set(-0.22 + dampEyeX, dampEyeY, 0);
      rightEye.eyeGroup.position.set(0.22 + dampEyeX, dampEyeY, 0);

      // Pupils track even further ahead inside each eye
      leftEye.pupil.position.set(targets.eyeX * 0.42, targets.eyeY * 0.42, 0.011);
      rightEye.pupil.position.set(targets.eyeX * 0.42, targets.eyeY * 0.42, 0.011);

      // Periodic joyful blink arches while keeping interactive tracking eyes prominent
      const blinkCycle = t % 4.0;
      const showHappyArch = blinkCycle > 3.84;
      leftEye.roundGroup.visible = !showHappyArch;
      rightEye.roundGroup.visible = !showHappyArch;
      leftEye.happyArch.visible = showHappyArch;
      rightEye.happyArch.visible = showHappyArch;

      const glowIntensity = hovered ? 1.95 : speaking ? 1.75 : 1.35;
      leftEyeMat.emissiveIntensity = glowIntensity;
      rightEyeMat.emissiveIntensity = glowIntensity;

      // Update lightweight inspectable DOM attributes (~8Hz) with zero React re-renders
      if (wrapper && nowSec - lastDatasetSync > 0.1) {
        lastDatasetSync = nowSec;
        wrapper.dataset.eyeX = dampEyeX.toFixed(3);
        wrapper.dataset.eyeY = dampEyeY.toFixed(3);
        wrapper.dataset.yaw = botPivot.rotation.y.toFixed(3);
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
            { rootMargin: "80px" }
          )
        : null;

    if (intersectionObserver) {
      intersectionObserver.observe(container);
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
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("mousemove", handleGlobalPointerMove);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      envRT.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [variant]);

  return (
    <div
      ref={wrapperRef}
      data-testid={`receptionist-3d-${variant}`}
      data-hovered={isHovered ? "true" : "false"}
      className={`relative w-full h-full overflow-visible flex items-center justify-center ${className}`}
    >
      {webglFailed && (
        <svg
          viewBox="0 0 84 84"
          className="w-full h-full drop-shadow-md"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="bot-grad-fallback" x1="0%" y1="30%" x2="100%" y2="70%">
              <stop offset="0%" stopColor="#00B4FF" />
              <stop offset="50%" stopColor="#3B5BFF" />
              <stop offset="100%" stopColor="#F02CC8" />
            </linearGradient>
          </defs>
          <line x1="58" y1="22" x2="67" y2="11" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="68" cy="10" r="6" fill="url(#bot-grad-fallback)" />
          <path
            d="M42 16 C61 16 74 28 74 44 C74 52 70 59 64 64 L71 75 L55 68 C51 70 46.7 71 42 71 C23 71 10 59 10 44 C10 28 23 16 42 16 Z"
            fill="url(#bot-grad-fallback)"
          />
          <rect x="20" y="31" width="44" height="25" rx="12.5" fill="#0B101E" />
          <path d="M28 45 Q33 37 38 45" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M46 45 Q51 37 56 45" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" />
        </svg>
      )}
      <div
        ref={mountRef}
        className={`w-full h-full ${webglFailed ? "hidden" : "block"}`}
      />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { motion } from "framer-motion";
import { FaRegHandshake } from "react-icons/fa";
import {
  getNextPose,
  type CharacterPoseId,
} from "../utils/contactShowcaseHelpers";

export interface Contact3DCharacterStageProps {
  pose: CharacterPoseId;
  onChangePose: (next: CharacterPoseId) => void;
}

// Reusable module-level scratch helpers (zero per-frame allocations)
const _pointerNdc = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

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

function createBadgeTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#EA580C";
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 72px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 68);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPhoneScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 256, 512);
    grad.addColorStop(0, "#1D4E6E");
    grad.addColorStop(1, "#3393B8");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(128, 175, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 28px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("INNOVISTA", 128, 285);
    ctx.font = "600 20px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#BAE6FD";
    ctx.fillText("Contact Us", 128, 325);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
    grad.addColorStop(0, "rgba(15, 23, 42, 0.42)");
    grad.addColorStop(0.55, "rgba(15, 23, 42, 0.16)");
    grad.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function Contact3DCharacterStage({
  pose,
  onChangePose,
}: Contact3DCharacterStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const poseRef = useRef<CharacterPoseId>(pose);
  const onChangePoseRef = useRef(onChangePose);
  const shakeTriggerTimeRef = useRef<number>(0);
  const pointerTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isHoveredRef = useRef<boolean>(false);

  const [shakeCount, setShakeCount] = useState(0);
  const [speechBurst, setSpeechBurst] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isStageVisible, setIsStageVisible] = useState(false);

  useEffect(() => {
    poseRef.current = pose;
  }, [pose]);

  useEffect(() => {
    onChangePoseRef.current = onChangePose;
  }, [onChangePose]);

  // Automatically cycle character poses ("handshake" -> "call" -> "quote") only when visible
  useEffect(() => {
    if (isHovered || !isStageVisible) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      onChangePoseRef.current(getNextPose(poseRef.current));
    }, 2800);

    return () => window.clearInterval(timer);
  }, [isHovered, isStageVisible, pose, shakeCount]);

  const triggerHandshakeInteraction = () => {
    onChangePose("handshake");
    shakeTriggerTimeRef.current = performance.now();
    setShakeCount((prev) => prev + 1);
    setSpeechBurst(true);
    window.setTimeout(() => setSpeechBurst(false), 1800);
  };

  const triggerHandshakeRef = useRef(triggerHandshakeInteraction);
  triggerHandshakeRef.current = triggerHandshakeInteraction;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(280, container.clientWidth || 520);
    const height = Math.max(320, container.clientHeight || 400);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 40);
    camera.position.set(0.12, 1.38, 4.78);
    camera.lookAt(0.08, 1.12, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "pointer";
    container.appendChild(renderer.domElement);

    // Studio IBL environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    envScene.dispose();
    pmremGenerator.dispose();

    // Three-point warm/cool studio lighting
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xfdba74, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1db, 2.25);
    keyLight.position.set(3.2, 5.2, 4.4);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.camera.left = -2.6;
    keyLight.shadow.camera.right = 2.6;
    keyLight.shadow.camera.top = 3.2;
    keyLight.shadow.camera.bottom = -1.2;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.1);
    rimLight.position.set(-3.4, 2.8, -2.6);
    scene.add(rimLight);

    // Track disposable resources
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      textures.push(t);
      return t;
    };

    const contactShadowTex = trackTex(createContactShadowTexture());
    const badgeTex = trackTex(createBadgeTexture("1"));
    const screenTex = trackTex(createPhoneScreenTexture());

    // Materials with varied PBR roughness (>= 0.25 delta across adjacent materials)
    const jacketMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        roughness: 0.76,
        metalness: 0.04,
      })
    );
    const innerShirtMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        roughness: 0.85,
        metalness: 0.02,
      })
    );
    const skinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf7cbb0,
        roughness: 0.52,
        metalness: 0.02,
      })
    );
    const hairMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x3b2316,
        roughness: 0.62,
        metalness: 0.08,
      })
    );
    const metalAccentMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xdbeafe,
        roughness: 0.2,
        metalness: 0.9,
        clearcoat: 0.6,
      })
    );
    const glassesFrameMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x111827,
        roughness: 0.16,
        metalness: 0.35,
        clearcoat: 0.85,
      })
    );
    const lensMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        roughness: 0.05,
        metalness: 0.05,
        transparent: true,
        opacity: 0.28,
        clearcoat: 1.0,
      })
    );
    const eyeWhiteMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.0,
      })
    );
    const eyeIrisMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f766e,
        roughness: 0.18,
        metalness: 0.12,
      })
    );
    const darkPupilMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.1,
        metalness: 0.1,
      })
    );
    const lipMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc2414b,
        roughness: 0.42,
        metalness: 0.02,
      })
    );
    const phoneBodyMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x1e3a5f,
        roughness: 0.24,
        metalness: 0.82,
        clearcoat: 0.8,
      })
    );
    const phoneScreenMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: screenTex,
        emissiveMap: screenTex,
        emissive: new THREE.Color(0x38bdf8),
        emissiveIntensity: 0.42,
        roughness: 0.14,
        metalness: 0.1,
      })
    );
    const chatCardMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x3b82f6,
        roughness: 0.32,
        metalness: 0.12,
        clearcoat: 0.65,
      })
    );
    const envelopeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.46,
        metalness: 0.05,
      })
    );
    const badgeSphereMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: badgeTex,
        roughness: 0.25,
        metalness: 0.1,
      })
    );
    const sparkleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.65,
      })
    );
    // 1. Soft Contact Shadow Disc (Zero pedestal/box under character)
    const shadowPlane = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(1.12, 48)),
      trackMat(
        new THREE.MeshBasicMaterial({
          map: contactShadowTex,
          transparent: true,
          opacity: 0.46,
          depthWrite: false,
        })
      )
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(-0.1, 0.015, 0);
    scene.add(shadowPlane);

    // 2. Hero Character Group (grounded cleanly on soft contact shadow)
    const characterRoot = new THREE.Group();
    characterRoot.position.set(-0.1, 0.02, 0);
    scene.add(characterRoot);

    const bodyRoot = new THREE.Group();
    characterRoot.add(bodyRoot);

    // Torso & Hoodie Jacket (Lathe / sculpted rounded cylinder silhouette)
    const torsoMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.42, 0.56, 0.98, 32)),
      jacketMat
    );
    torsoMesh.position.y = 0.49;
    torsoMesh.scale.set(1.06, 1, 0.78);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    bodyRoot.add(torsoMesh);

    const innerShirtMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.62, 24)),
      innerShirtMat
    );
    innerShirtMesh.position.set(0, 0.68, 0.25);
    innerShirtMesh.scale.set(1, 1, 0.45);
    bodyRoot.add(innerShirtMesh);

    // Hoodie collar ring
    const hoodCollar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.35, 0.11, 18, 36)),
      jacketMat
    );
    hoodCollar.rotation.x = Math.PI / 2 + 0.18;
    hoodCollar.position.set(0, 0.98, -0.02);
    hoodCollar.castShadow = true;
    bodyRoot.add(hoodCollar);

    // Metallic jacket pin & zipper accent
    const pinMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 20)),
      metalAccentMat
    );
    pinMesh.rotation.x = Math.PI / 2;
    pinMesh.position.set(0.27, 0.72, 0.37);
    bodyRoot.add(pinMesh);

    const zipperMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.032, 0.46, 0.04)),
      metalAccentMat
    );
    zipperMesh.position.set(0.11, 0.38, 0.39);
    bodyRoot.add(zipperMesh);

    // Neck
    const neckMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.15, 0.17, 0.26, 24)),
      skinMat
    );
    neckMesh.position.y = 1.08;
    bodyRoot.add(neckMesh);

    // 3. Head Group (Expressive face, glasses, hair, animated talking mouth)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.46, 0.02);
    bodyRoot.add(headPivot);

    const headSphere = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.39, 36, 36)),
      skinMat
    );
    headSphere.scale.set(0.96, 1.03, 0.94);
    headSphere.castShadow = true;
    headPivot.add(headSphere);

    // Ears
    const earGeo = trackGeo(new THREE.SphereGeometry(0.085, 16, 16));
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.scale.set(0.55, 1, 0.7);
    leftEar.position.set(-0.37, -0.02, 0);
    headPivot.add(leftEar);
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.37;
    headPivot.add(rightEar);

    // Soft cheek blush discs
    const blushGeo = trackGeo(new THREE.SphereGeometry(0.058, 16, 16));
    const blushMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfca5a5,
        roughness: 0.75,
        transparent: true,
        opacity: 0.55,
      })
    );
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.scale.set(1.2, 0.7, 0.35);
    leftBlush.position.set(-0.2, -0.08, 0.32);
    headPivot.add(leftBlush);
    const rightBlush = leftBlush.clone();
    rightBlush.position.x = 0.2;
    headPivot.add(rightBlush);

    // Nose
    const noseMesh = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.048, 16, 16)),
      skinMat
    );
    noseMesh.scale.set(0.9, 0.8, 1.15);
    noseMesh.position.set(0, -0.04, 0.38);
    headPivot.add(noseMesh);

    // Expressive Eyes with blinking lid groups
    const eyeScleraGeo = trackGeo(new THREE.SphereGeometry(0.068, 20, 20));
    const eyeIrisGeo = trackGeo(new THREE.SphereGeometry(0.046, 20, 20));
    const eyePupilGeo = trackGeo(new THREE.SphereGeometry(0.028, 16, 16));
    const eyeGlintGeo = trackGeo(new THREE.SphereGeometry(0.012, 12, 12));
    const eyelidGeo = trackGeo(
      new THREE.SphereGeometry(0.072, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52)
    );

    const createEye = (xOffset: number) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(xOffset, 0.04, 0.305);

      const sclera = new THREE.Mesh(eyeScleraGeo, eyeWhiteMat);
      sclera.scale.set(0.95, 1.0, 0.58);
      eyeGroup.add(sclera);

      const iris = new THREE.Mesh(eyeIrisGeo, eyeIrisMat);
      iris.position.z = 0.028;
      iris.scale.set(0.96, 0.96, 0.5);
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(eyePupilGeo, darkPupilMat);
      pupil.position.z = 0.042;
      pupil.scale.set(1, 1, 0.45);
      eyeGroup.add(pupil);

      const glint = new THREE.Mesh(eyeGlintGeo, eyeWhiteMat);
      glint.position.set(0.015, 0.016, 0.052);
      eyeGroup.add(glint);

      const eyelid = new THREE.Mesh(eyelidGeo, skinMat);
      eyelid.rotation.x = -Math.PI * 0.45;
      eyeGroup.add(eyelid);

      headPivot.add(eyeGroup);
      return eyelid;
    };

    const leftEyelid = createEye(-0.135);
    const rightEyelid = createEye(0.135);

    // Eyebrows
    const browGeo = trackGeo(new THREE.CapsuleGeometry(0.016, 0.08, 6, 12));
    const leftBrow = new THREE.Mesh(browGeo, hairMat);
    leftBrow.rotation.z = Math.PI / 2 - 0.1;
    leftBrow.position.set(-0.14, 0.145, 0.34);
    headPivot.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, hairMat);
    rightBrow.rotation.z = Math.PI / 2 + 0.1;
    rightBrow.position.set(0.14, 0.145, 0.34);
    headPivot.add(rightBrow);

    // Talking Smile Mouth Pivot
    const mouthPivot = new THREE.Group();
    mouthPivot.position.set(0, -0.145, 0.348);
    headPivot.add(mouthPivot);

    const smileArc = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.06, 0.013, 12, 24, Math.PI * 0.82)),
      lipMat
    );
    smileArc.rotation.z = Math.PI + Math.PI * 0.09;
    mouthPivot.add(smileArc);

    // Eyeglasses (Round Acetate Rims + Bridge + Clear Lenses)
    const glassesGroup = new THREE.Group();
    glassesGroup.position.set(0, 0.04, 0.395);
    headPivot.add(glassesGroup);

    const rimGeo = trackGeo(new THREE.TorusGeometry(0.105, 0.016, 14, 36));
    const lensGeo = trackGeo(new THREE.CircleGeometry(0.098, 32));

    const leftRim = new THREE.Mesh(rimGeo, glassesFrameMat);
    leftRim.position.x = -0.138;
    glassesGroup.add(leftRim);

    const rightRim = new THREE.Mesh(rimGeo, glassesFrameMat);
    rightRim.position.x = 0.138;
    glassesGroup.add(rightRim);

    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.position.set(-0.138, 0, -0.002);
    glassesGroup.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeo, lensMat);
    rightLens.position.set(0.138, 0, -0.002);
    glassesGroup.add(rightLens);

    const bridgeMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.078, 12)),
      glassesFrameMat
    );
    bridgeMesh.rotation.z = Math.PI / 2;
    bridgeMesh.position.y = 0.018;
    glassesGroup.add(bridgeMesh);

    const templeGeo = trackGeo(new THREE.BoxGeometry(0.016, 0.018, 0.36));
    const leftTemple = new THREE.Mesh(templeGeo, glassesFrameMat);
    leftTemple.position.set(-0.24, 0.012, -0.17);
    glassesGroup.add(leftTemple);

    const rightTemple = new THREE.Mesh(templeGeo, glassesFrameMat);
    rightTemple.position.set(0.24, 0.012, -0.17);
    glassesGroup.add(rightTemple);

    // Layered Hair Silhouette (Crown + Sweeping Side Hair)
    const hairCrown = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.415, 32, 32)),
      hairMat
    );
    hairCrown.position.set(0, 0.08, -0.05);
    hairCrown.scale.set(1.04, 1.02, 1.04);
    hairCrown.castShadow = true;
    headPivot.add(hairCrown);

    const leftHairSide = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.115, 0.46, 12, 18)),
      hairMat
    );
    leftHairSide.position.set(-0.3, -0.14, -0.02);
    leftHairSide.rotation.z = -0.1;
    hairCrown.add(leftHairSide);

    const rightHairSide = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.115, 0.46, 12, 18)),
      hairMat
    );
    rightHairSide.position.set(0.3, -0.14, -0.02);
    rightHairSide.rotation.z = 0.1;
    hairCrown.add(rightHairSide);

    const bangSwirl = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.25, 24, 24)),
      hairMat
    );
    bangSwirl.scale.set(1.35, 0.56, 0.85);
    bangSwirl.position.set(0.09, 0.28, 0.19);
    bangSwirl.rotation.z = -0.25;
    headPivot.add(bangSwirl);

    // 4. Articulated Right Arm Pivot (Performs Handshake + Holds Phone!)
    const rightShoulderPivot = new THREE.Group();
    rightShoulderPivot.position.set(-0.46, 0.85, 0.02);
    bodyRoot.add(rightShoulderPivot);

    const rightUpperArm = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.125, 0.34, 12, 20)),
      jacketMat
    );
    rightUpperArm.position.y = -0.2;
    rightUpperArm.castShadow = true;
    rightShoulderPivot.add(rightUpperArm);

    const rightElbowPivot = new THREE.Group();
    rightElbowPivot.position.set(0, -0.4, 0);
    rightShoulderPivot.add(rightElbowPivot);

    const rightForearm = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.115, 0.3, 12, 20)),
      jacketMat
    );
    rightForearm.position.y = -0.18;
    rightForearm.castShadow = true;
    rightElbowPivot.add(rightForearm);

    const rightHandGroup = new THREE.Group();
    rightHandGroup.position.set(0, -0.38, 0);
    rightHandGroup.scale.setScalar(1.22);
    rightElbowPivot.add(rightHandGroup);

    const rightPalm = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.13, 0.16, 0.075)),
      skinMat
    );
    rightHandGroup.add(rightPalm);

    const rightThumb = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.026, 0.07, 6, 10)),
      skinMat
    );
    rightThumb.position.set(0.072, 0.04, 0.025);
    rightThumb.rotation.z = -0.55;
    rightHandGroup.add(rightThumb);

    const fingerGeo = trackGeo(new THREE.CapsuleGeometry(0.018, 0.075, 6, 10));
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(fingerGeo, skinMat);
      finger.position.set(-0.045 + f * 0.03, -0.1, 0.01);
      rightHandGroup.add(finger);
    }

    // Smartphone attached to right hand (visible in Call pose, tucked/hidden otherwise)
    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(0.03, 0.03, 0.05);
    phoneGroup.rotation.set(0.15, -0.4, 0.25);
    rightHandGroup.add(phoneGroup);

    const phoneBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.16, 0.31, 0.024)),
      phoneBodyMat
    );
    phoneGroup.add(phoneBody);

    const phoneScreen = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.136, 0.27)),
      phoneScreenMat
    );
    phoneScreen.position.z = 0.013;
    phoneGroup.add(phoneScreen);

    // 5. Articulated Left Arm Pivot (Welcoming Wave & Gesture)
    const leftShoulderPivot = new THREE.Group();
    leftShoulderPivot.position.set(0.46, 0.85, 0.02);
    bodyRoot.add(leftShoulderPivot);

    const leftUpperArm = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.125, 0.34, 12, 20)),
      jacketMat
    );
    leftUpperArm.position.y = -0.2;
    leftUpperArm.castShadow = true;
    leftShoulderPivot.add(leftUpperArm);

    const leftElbowPivot = new THREE.Group();
    leftElbowPivot.position.set(0, -0.4, 0);
    leftShoulderPivot.add(leftElbowPivot);

    const leftForearm = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.115, 0.3, 12, 20)),
      jacketMat
    );
    leftForearm.position.y = -0.18;
    leftForearm.castShadow = true;
    leftElbowPivot.add(leftForearm);

    const leftHand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.125, 0.15, 0.07)),
      skinMat
    );
    leftHand.position.set(0, -0.37, 0);
    leftElbowPivot.add(leftHand);

    // 6. Floating 3D Mail Bubble + Badge "1" + Sparkles (from reference screenshot 1)
    const mailFloatGroup = new THREE.Group();
    mailFloatGroup.position.set(1.02, 1.56, -0.05);
    scene.add(mailFloatGroup);

    // Rounded chat bubble card
    const bubbleShape = new THREE.Shape();
    const bw = 0.36;
    const bh = 0.28;
    const br = 0.08;
    bubbleShape.moveTo(-bw + br, -bh);
    bubbleShape.lineTo(-0.08, -bh);
    bubbleShape.lineTo(-0.22, -bh - 0.14);
    bubbleShape.lineTo(0.05, -bh);
    bubbleShape.lineTo(bw - br, -bh);
    bubbleShape.quadraticCurveTo(bw, -bh, bw, -bh + br);
    bubbleShape.lineTo(bw, bh - br);
    bubbleShape.quadraticCurveTo(bw, bh, bw - br, bh);
    bubbleShape.lineTo(-bw + br, bh);
    bubbleShape.quadraticCurveTo(-bw, bh, -bw, bh - br);
    bubbleShape.lineTo(-bw, -bh + br);
    bubbleShape.quadraticCurveTo(-bw, -bh, -bw + br, -bh);

    const bubbleGeo = trackGeo(
      new THREE.ExtrudeGeometry(bubbleShape, {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.03,
        bevelSegments: 4,
      })
    );
    bubbleGeo.center();
    const bubbleMesh = new THREE.Mesh(bubbleGeo, chatCardMat);
    bubbleMesh.castShadow = true;
    mailFloatGroup.add(bubbleMesh);

    const envelopeMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.46, 0.3, 0.05)),
      envelopeMat
    );
    envelopeMesh.position.z = 0.075;
    mailFloatGroup.add(envelopeMesh);

    const flapLineMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })
    );
    const flapLeft = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.26, 0.022, 0.06)),
      flapLineMat
    );
    flapLeft.position.set(-0.095, 0.03, 0.082);
    flapLeft.rotation.z = -0.58;
    mailFloatGroup.add(flapLeft);

    const flapRight = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.26, 0.022, 0.06)),
      flapLineMat
    );
    flapRight.position.set(0.095, 0.03, 0.082);
    flapRight.rotation.z = 0.58;
    mailFloatGroup.add(flapRight);

    // Notification badge sphere "1"
    const badgeMesh = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.135, 24, 24)),
      badgeSphereMat
    );
    badgeMesh.position.set(0.32, 0.25, 0.11);
    badgeMesh.rotation.y = -Math.PI / 2;
    mailFloatGroup.add(badgeMesh);

    // Golden 4-point star sparkles
    const sparkleGroup = new THREE.Group();
    sparkleGroup.position.set(-0.98, 1.72, 0.15);
    scene.add(sparkleGroup);

    const starGeo = trackGeo(new THREE.OctahedronGeometry(0.075, 0));
    const starA = new THREE.Mesh(starGeo, sparkleMat);
    starA.scale.set(0.85, 1.3, 0.5);
    sparkleGroup.add(starA);

    const starB = new THREE.Mesh(starGeo, sparkleMat);
    starB.scale.set(0.5, 0.85, 0.35);
    starB.position.set(0.18, -0.22, 0.1);
    sparkleGroup.add(starB);

    // Raycast hit proxies for fast click feedback
    const interactiveMeshes: THREE.Object3D[] = [characterRoot, mailFloatGroup];

    // Pre-warm shaders cleanly on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Event listeners on WebGL canvas
    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerTargetRef.current.x = THREE.MathUtils.clamp(_pointerNdc.x, -1, 1);
      pointerTargetRef.current.y = THREE.MathUtils.clamp(_pointerNdc.y, -1, 1);
      isHoveredRef.current = true;
    };

    const handlePointerLeave = () => {
      isHoveredRef.current = false;
      pointerTargetRef.current.x = 0;
      pointerTargetRef.current.y = 0;
    };

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointerNdc, camera);
      const hits = _raycaster.intersectObjects(interactiveMeshes, true);
      if (hits.length > 0) {
        triggerHandshakeRef.current();
      } else {
        triggerHandshakeRef.current();
      }
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("click", handleCanvasClick);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(260, container.clientWidth);
      const h = Math.max(280, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation loop using performance.now() timing & Software-WebGL afterDraw pacing
    let disposed = false;
    let frameId = 0;
    let isIntersecting = false;
    let isTabVisible =
      typeof document === "undefined" || document.visibilityState !== "hidden";
    const startTimeSec = performance.now() / 1000;
    let lastTimeSec = startTimeSec;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== "function") {
        frameId = window.setTimeout(cb, 80);
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
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;

      const nowSec = performance.now() / 1000;
      const dt = Math.min(Math.max(nowSec - lastTimeSec, 0.001), 0.08);
      lastTimeSec = nowSec;
      const t = nowSec - startTimeSec;
      const activePose = poseRef.current;

      const msSinceBurst = performance.now() - shakeTriggerTimeRef.current;
      const isBursting = msSinceBurst > 0 && msSinceBurst < 2200;

      // Subtle breathing & floating motion
      bodyRoot.position.y = Math.sin(t * 2.1) * 0.022;

      // Head tracking pointer + friendly nod when saying "Contact Us!"
      const targetHeadY = pointerTargetRef.current.x * 0.26;
      const targetHeadX =
        -pointerTargetRef.current.y * 0.14 +
        (isBursting ? Math.sin(t * 8.5) * 0.06 : Math.sin(t * 1.9) * 0.03);
      headPivot.rotation.y = THREE.MathUtils.damp(
        headPivot.rotation.y,
        targetHeadY,
        7,
        dt
      );
      headPivot.rotation.x = THREE.MathUtils.damp(
        headPivot.rotation.x,
        targetHeadX,
        7,
        dt
      );
      headPivot.rotation.z = THREE.MathUtils.damp(
        headPivot.rotation.z,
        activePose === "call" ? 0.08 : Math.sin(t * 1.4) * 0.035,
        6,
        dt
      );

      // Blinking every 3.6 seconds
      const blinkPhase = t % 3.6;
      const blinkScale = blinkPhase > 3.44 ? 1.0 : 0.08;
      leftEyelid.scale.y = blinkScale;
      rightEyelid.scale.y = blinkScale;

      // Expressive mouth talking animation ("Contact Us!")
      const talkAmp =
        activePose === "handshake" || isBursting
          ? 0.28 + Math.abs(Math.sin(t * 9.0)) * 0.55
          : 0.12 + Math.abs(Math.sin(t * 4.2)) * 0.18;
      mouthPivot.scale.y = THREE.MathUtils.damp(mouthPivot.scale.y, 1 + talkAmp, 12, dt);

      // Articulated Right & Left Arms per active pose
      let rShoulderX = 0;
      let rShoulderZ = -0.14;
      let rElbowX = -0.4;
      let rElbowZ = 0;
      let rHandRotZ = 0;

      let lShoulderX = 0;
      let lShoulderZ = 0.18;
      let lElbowX = -0.25;
      let lElbowZ = 0;

      if (activePose === "handshake") {
        // Extended welcoming handshake clearly visible in mid-foreground chest height
        const pump = Math.sin(t * (isBursting ? 9.5 : 6.4));
        rShoulderX = -1.55 + pump * 0.16;
        rShoulderZ = -0.25;
        rElbowX = -0.22 + pump * 0.25;
        rElbowZ = 0.55;
        rHandRotZ = 1.48; // open palm turned vertically to shake hands!
        phoneGroup.visible = false;

        // Left arm welcomes warmly
        lShoulderX = -0.35;
        lShoulderZ = 0.36 + Math.sin(t * 2.4) * 0.08;
        lElbowX = -0.58;
      } else if (activePose === "call") {
        // Holding smartphone up against right ear matching reference portrait
        rShoulderX = -0.52;
        rShoulderZ = -0.58;
        rElbowX = -1.15;
        rElbowZ = 1.48;
        rHandRotZ = -0.25;
        phoneGroup.visible = true;

        lShoulderX = -0.22;
        lShoulderZ = 0.26;
        lElbowX = -0.75 + Math.sin(t * 2.2) * 0.08;
        lElbowZ = -0.25;
      } else {
        // Quote / friendly wave pose toward floating mail envelope
        rShoulderX = -0.35;
        rShoulderZ = -0.35 + Math.sin(t * 4.5) * 0.18;
        rElbowX = -0.65;
        rElbowZ = -0.1;
        rHandRotZ = Math.sin(t * 6.5) * 0.22;
        phoneGroup.visible = false;

        lShoulderX = -0.45;
        lShoulderZ = 0.58 + Math.sin(t * 5.2) * 0.24;
        lElbowX = -0.95;
        lElbowZ = 0.25;
      }

      const armDamp = 9;
      rightShoulderPivot.rotation.x = THREE.MathUtils.damp(
        rightShoulderPivot.rotation.x,
        rShoulderX,
        armDamp,
        dt
      );
      rightShoulderPivot.rotation.z = THREE.MathUtils.damp(
        rightShoulderPivot.rotation.z,
        rShoulderZ,
        armDamp,
        dt
      );
      rightElbowPivot.rotation.x = THREE.MathUtils.damp(
        rightElbowPivot.rotation.x,
        rElbowX,
        armDamp,
        dt
      );
      rightElbowPivot.rotation.z = THREE.MathUtils.damp(
        rightElbowPivot.rotation.z,
        rElbowZ,
        armDamp,
        dt
      );
      rightHandGroup.rotation.z = THREE.MathUtils.damp(
        rightHandGroup.rotation.z,
        rHandRotZ,
        armDamp,
        dt
      );

      leftShoulderPivot.rotation.x = THREE.MathUtils.damp(
        leftShoulderPivot.rotation.x,
        lShoulderX,
        armDamp,
        dt
      );
      leftShoulderPivot.rotation.z = THREE.MathUtils.damp(
        leftShoulderPivot.rotation.z,
        lShoulderZ,
        armDamp,
        dt
      );
      leftElbowPivot.rotation.x = THREE.MathUtils.damp(
        leftElbowPivot.rotation.x,
        lElbowX,
        armDamp,
        dt
      );
      leftElbowPivot.rotation.z = THREE.MathUtils.damp(
        leftElbowPivot.rotation.z,
        lElbowZ,
        armDamp,
        dt
      );

      // Subtle character swivel toward hovered cursor
      characterRoot.rotation.y = THREE.MathUtils.damp(
        characterRoot.rotation.y,
        0.16 + pointerTargetRef.current.x * 0.22,
        6,
        dt
      );

      // Floating 3D mail notification card & sparkles
      mailFloatGroup.position.y = 1.56 + Math.sin(t * 2.2) * 0.08;
      mailFloatGroup.rotation.y = -0.18 + Math.sin(t * 1.4) * 0.14;
      mailFloatGroup.rotation.z = Math.cos(t * 1.7) * 0.05;

      sparkleGroup.position.y = 1.72 + Math.cos(t * 2.5) * 0.07;
      starA.rotation.y = t * 1.8;
      starB.rotation.y = -t * 2.1;

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
      lastTimeSec = performance.now() / 1000;
      frameId = requestAnimationFrame(tick);
    };

    const intersectionObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              const visible = entries.some((entry) => entry.isIntersecting);
              isIntersecting = visible;
              setIsStageVisible(visible);
              if (visible) {
                scheduleTick();
              } else {
                cancelAnimationFrame(frameId);
                clearTimeout(frameId);
                frameId = 0;
              }
            },
            { rootMargin: "160px" }
          )
        : null;

    if (intersectionObserver) {
      intersectionObserver.observe(container);
    } else {
      isIntersecting = true;
      setIsStageVisible(true);
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

    // Render initial pose frame cleanly, then animate only when visible
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("click", handleCanvasClick);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envRT.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      data-testid="contact-3d-stage"
      data-pose={pose}
      data-shakes={shakeCount}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-[340px] sm:h-[395px] select-none"
    >
      {/* Subtle Open-Air Background Typography Behind Character (Zero Card/Box Chrome) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center overflow-hidden px-2"
      >
        <span
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className="text-[clamp(3.1rem,8vw,5.8rem)] font-black tracking-[-0.04em] leading-none uppercase text-center text-[#22577A]/[0.06]"
        >
          CONTACT US
        </span>
      </div>

      {/* Minimal Floating "Contact Us!" Speech Bubble */}
      <div className="relative z-20 px-1 sm:px-2 pt-1 flex justify-start pointer-events-none">
        <motion.button
          type="button"
          onClick={triggerHandshakeInteraction}
          animate={{
            y: [0, -4, 0],
            scale: speechBurst ? [1, 1.06, 1] : 1,
          }}
          transition={{
            y: { repeat: Infinity, duration: 2.8, ease: "easeInOut" },
            scale: { duration: 0.35 },
          }}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full px-3.5 py-2 bg-white border border-sky-200/90 shadow-sm cursor-pointer hover:border-[#EA580C]/60 transition-colors"
          aria-label="Character says Contact Us. Click to shake hands"
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#EA580C] text-white shrink-0">
            <FaRegHandshake className="text-xs" />
          </span>
          <span
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-sm font-extrabold tracking-tight text-[#14171A]"
          >
            Contact Us!
          </span>
        </motion.button>
      </div>

      {/* Borderless Transparent WebGL Stage */}
      <div
        ref={mountRef}
        data-testid="contact-3d-canvas-container"
        aria-label="Interactive 3D character automatically waving and shaking hands saying Contact Us"
        className="absolute inset-0 z-10 w-full h-full"
      />
    </div>
  );
}

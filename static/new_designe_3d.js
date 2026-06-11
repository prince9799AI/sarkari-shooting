/* ════════════════════════════════════════════════════════════
   SARKARI SHOOTING — full-page cinematic background (Three.js)
   Fixed canvas · shader aurora · bokeh particles · gold rings ·
   hero camera model · scroll-depth travel · always animating
   ════════════════════════════════════════════════════════════ */

import * as THREE from "three";

const canvas = document.getElementById("webgl");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && !reduced) initScene();

function makeBokehTexture() {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,235,200,1)");
  g.addColorStop(0.25, "rgba(230,201,135,0.7)");
  g.addColorStop(0.55, "rgba(201,164,92,0.25)");
  g.addColorStop(1, "rgba(201,164,92,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function initScene() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 0, 12);

  /* ── Animated shader backdrop ── */
  const bgGeo = new THREE.PlaneGeometry(2, 2);
  const bgMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uScroll;
      uniform vec2 uMouse;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec2 uv = vUv;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= 1.2;

        float t = uTime * 0.12;
        float n1 = noise(p * 1.8 + vec2(t, t * 0.7) + uMouse * 0.15);
        float n2 = noise(p * 3.2 - vec2(t * 0.6, t) + uScroll * 0.5);
        float n3 = noise(p * 0.9 + vec2(sin(t) * 0.5, cos(t * 0.8) * 0.5));

        float glow = smoothstep(0.2, 0.95, n1 * 0.55 + n2 * 0.3 + n3 * 0.25);
        float gold = glow * (0.35 + 0.25 * sin(uTime * 0.4 + p.x * 3.0));

        vec3 col = vec3(0.02, 0.02, 0.03);
        col += vec3(0.55, 0.42, 0.22) * gold * 0.45;
        col += vec3(0.35, 0.28, 0.15) * smoothstep(0.5, 1.0, n2) * 0.2;
        col += vec3(0.15, 0.12, 0.25) * smoothstep(0.6, 1.0, n3) * 0.12 * (1.0 - uScroll * 0.5);

        float vig = 1.0 - length(p * vec2(0.55, 0.65));
        col *= smoothstep(-0.2, 0.9, vig);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthWrite: false,
    depthTest: false,
  });
  const bgMesh = new THREE.Mesh(bgGeo, bgMat);
  bgMesh.frustumCulled = false;
  bgMesh.renderOrder = -1;
  scene.add(bgMesh);

  /* ── Lights ── */
  scene.add(new THREE.AmbientLight(0x2a2520, 1.2));
  const keyLight = new THREE.DirectionalLight(0xfff0d0, 2.5);
  keyLight.position.set(3, 5, 8);
  scene.add(keyLight);
  const goldLight = new THREE.PointLight(0xc9a45c, 40, 35);
  goldLight.position.set(-4, 1, 6);
  scene.add(goldLight);
  const rimLight = new THREE.PointLight(0x6a7ab0, 18, 30);
  rimLight.position.set(6, -2, -4);
  scene.add(rimLight);

  /* ── Bokeh particle field (sprites — highly visible) ── */
  const bokehTex = makeBokehTexture();
  const bokehLayers = [];

  for (let layer = 0; layer < 4; layer++) {
    const count = layer === 0 ? 180 : layer === 1 ? 120 : 80;
    const group = new THREE.Group();
    const spread = 28 + layer * 14;
    const depth = -8 - layer * 12;

    for (let i = 0; i < count; i++) {
      const size = (0.4 + Math.random() * 1.8) * (1 + layer * 0.35);
      const mat = new THREE.SpriteMaterial({
        map: bokehTex,
        color: new THREE.Color().setHSL(0.1 + Math.random() * 0.06, 0.7, 0.45 + Math.random() * 0.25),
        transparent: true,
        opacity: 0.15 + Math.random() * 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.55,
        depth + (Math.random() - 0.5) * 8
      );
      sprite.scale.setScalar(size);
      sprite.userData = {
        base: sprite.position.clone(),
        speed: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        drift: (Math.random() - 0.5) * 0.4,
      };
      group.add(sprite);
    }
    scene.add(group);
    bokehLayers.push(group);
  }

  /* ── Fine dust points ── */
  const dustGroups = [];
  const palette = [0xc9a45c, 0xe6c987, 0xf3ecdd, 0x9a7b3f];
  for (let layer = 0; layer < 2; layer++) {
    const count = 600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const spread = 40 + layer * 20;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread - layer * 15;
      const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.06 + layer * 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    scene.add(pts);
    dustGroups.push(pts);
  }

  /* ── Rotating gold rings (aperture feel) ── */
  const rings = [];
  for (let i = 0; i < 5; i++) {
    const r = 4 + i * 2.2;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.012 + i * 0.004, 8, 128),
      new THREE.MeshBasicMaterial({
        color: 0xc9a45c,
        transparent: true,
        opacity: 0.08 + i * 0.03,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.position.z = -15 - i * 8;
    ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    ring.userData = { spin: (i % 2 === 0 ? 1 : -1) * (0.08 + i * 0.03), idx: i };
    scene.add(ring);
    rings.push(ring);
  }

  /* ── Hero camera model ── */
  const matBody = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.35, metalness: 0.8 });
  const matGrip = new THREE.MeshStandardMaterial({ color: 0x0e0e11, roughness: 0.85, metalness: 0.3 });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xc9a45c, roughness: 0.2, metalness: 0.95, emissive: 0x3a2e10, emissiveIntensity: 0.15 });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1a3050, roughness: 0.02, metalness: 0.05,
    clearcoat: 1, transmission: 0.35, ior: 1.5,
  });

  const cameraModel = new THREE.Group();
  cameraModel.add(new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.9, 1.1), matBody));
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.85, 1.25), matGrip);
  grip.position.set(1.32, 0, 0.12);
  cameraModel.add(grip);
  const topPlate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.28, 0.95), matBody);
  topPlate.position.set(-0.18, 1.06, 0);
  cameraModel.add(topPlate);
  const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.78, 0.55, 4), matBody);
  prism.rotation.y = Math.PI / 4;
  prism.position.set(0, 1.32, 0);
  cameraModel.add(prism);
  const shutter = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 24), matGold);
  shutter.position.set(1.25, 1.22, 0.25);
  cameraModel.add(shutter);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 32), matGold);
  dial.position.set(-1.15, 1.22, 0);
  cameraModel.add(dial);
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.18, 48), matGold);
  mount.rotation.x = Math.PI / 2;
  mount.position.set(-0.1, 0, 0.62);
  cameraModel.add(mount);
  const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.88, 0.9, 48), matBody);
  barrel1.rotation.x = Math.PI / 2;
  barrel1.position.set(-0.1, 0, 1.15);
  cameraModel.add(barrel1);
  const focusRing = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 48), matGold);
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.set(-0.1, 0, 1.45);
  cameraModel.add(focusRing);
  const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.85, 0.55, 48), matBody);
  barrel2.rotation.x = Math.PI / 2;
  barrel2.position.set(-0.1, 0, 1.85);
  cameraModel.add(barrel2);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.72, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2.4), matGlass);
  glass.rotation.x = Math.PI / 2;
  glass.position.set(-0.1, 0, 1.95);
  cameraModel.add(glass);
  const glint = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.03, 12, 64), matGold);
  glint.position.set(-0.1, 0, 2.15);
  cameraModel.add(glint);

  cameraModel.scale.setScalar(0.82);
  const cameraRig = new THREE.Group();
  cameraRig.add(cameraModel);
  scene.add(cameraRig);

  /* ── Floating photo frames ── */
  const frames = [];
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const FRAME_PHOTOS = [
    { url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=640&q=70", pos: [-6, 2, -4], rotY: 0.45 },
    { url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=640&q=70", pos: [6.5, -1, -6], rotY: -0.5 },
    { url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=640&q=70", pos: [-5, -2.5, -10], rotY: 0.35 },
    { url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=640&q=70", pos: [5.5, 3, -12], rotY: -0.3 },
  ];

  FRAME_PHOTOS.forEach((cfg, i) => {
    loader.load(cfg.url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const g = new THREE.Group();
      const w = 2.4, h = 3;
      g.add(new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xc9a45c, roughness: 0.3, metalness: 0.9, emissive: 0x2a2010, emissiveIntensity: 0.1 })
      ));
      const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
      photo.material.color.setScalar(0.75);
      photo.position.z = 0.05;
      g.add(photo);
      g.position.set(...cfg.pos);
      g.rotation.y = cfg.rotY;
      g.userData = { baseY: cfg.pos[1], phase: i * 1.5, speed: 0.35 + Math.random() * 0.3 };
      scene.add(g);
      frames.push(g);
    });
  });

  /* ── Interaction ── */
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  let scrollY = 0, scrollTarget = 0;

  addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / innerWidth - 0.5) * 2;
    mouseY = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  function updateScroll() {
    scrollTarget = window.scrollY;
    scrollY += (scrollTarget - scrollY) * 0.06;
    requestAnimationFrame(updateScroll);
  }
  updateScroll();

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  });

  /* ── Render loop — NEVER pauses ── */
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const heroProgress = Math.min(1, scrollY / innerHeight);
    const pageProgress = Math.min(1, scrollY / (document.documentElement.scrollHeight - innerHeight || 1));

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    bgMat.uniforms.uTime.value = t;
    bgMat.uniforms.uScroll.value = pageProgress;
    bgMat.uniforms.uMouse.value.set(targetX, targetY);

    // Camera travels through depth as user scrolls
    const camZ = 12 - pageProgress * 18;
    const camY = targetY * -1.2 + heroProgress * -1.5;
    const camX = targetX * 1.8;
    camera.position.x += (camX - camera.position.x) * 0.04;
    camera.position.y += (camY - camera.position.y) * 0.04;
    camera.position.z += (camZ - camera.position.z) * 0.04;
    camera.lookAt(targetX * 0.5, targetY * 0.3, -10);

    // Hero camera model — visible at top, fades on scroll
    const heroOpacity = 1 - Math.pow(heroProgress, 1.4);
    cameraModel.rotation.y = t * 0.3 + targetX * 0.5;
    cameraModel.rotation.x = Math.sin(t * 0.5) * 0.08 + targetY * 0.3;
    cameraModel.position.y = Math.sin(t * 0.7) * 0.25;
    cameraRig.position.y = -heroProgress * 4;
    cameraRig.scale.setScalar(0.82 + heroOpacity * 0.18);
    cameraModel.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const fade = heroOpacity < 0.995;
      child.material.transparent = fade;
      child.material.opacity = fade ? heroOpacity : 1;
    });

    // Gold light orbits
    goldLight.position.x = Math.sin(t * 0.35) * 8;
    goldLight.position.y = Math.cos(t * 0.28) * 4;
    goldLight.position.z = 4 + Math.sin(t * 0.2) * 3;
    goldLight.intensity = 35 + Math.sin(t * 0.8) * 8;

    // Bokeh sprites float + parallax
    bokehLayers.forEach((group, li) => {
      group.children.forEach((sprite) => {
        const u = sprite.userData;
        const bp = u.base;
        sprite.position.x = bp.x + Math.sin(t * u.speed + u.phase) * 1.2 + targetX * -(1.5 + li);
        sprite.position.y = bp.y + Math.cos(t * u.speed * 0.8 + u.phase) * 0.8 + targetY * (1 + li * 0.4);
        sprite.position.z = bp.z - scrollY * 0.008 * (li + 1);
        sprite.material.opacity = (0.12 + li * 0.06) * (0.7 + 0.3 * Math.sin(t + u.phase));
      });
    });

    // Dust rotates
    dustGroups.forEach((pts, i) => {
      pts.rotation.y = t * 0.015 * (i + 1);
      pts.position.x = -targetX * (0.8 + i * 0.5);
      pts.position.y = targetY * (0.5 + i * 0.3);
    });

    // Rings spin at depth
    rings.forEach((ring) => {
      ring.rotation.z += ring.userData.spin * 0.01;
      ring.position.y = Math.sin(t * 0.2 + ring.userData.idx) * 0.5;
      ring.material.opacity = (0.06 + ring.userData.idx * 0.025) * (1 - heroProgress * 0.3);
    });

    // Photo frames
    frames.forEach((f) => {
      const u = f.userData;
      f.position.y = u.baseY + Math.sin(t * u.speed + u.phase) * 0.35;
      f.rotation.x = Math.sin(t * 0.25 + u.phase) * 0.06 + targetY * 0.08;
      f.visible = heroOpacity > 0.05;
      f.traverse((c) => {
        if (c.isMesh && c.material) {
          c.material.transparent = true;
          c.material.opacity = heroOpacity * 0.9;
        }
      });
    });

    renderer.render(scene, camera);
  }

  animate();
}

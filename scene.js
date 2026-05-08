// =========================================================================
// scene.js — the one Three.js moment.
// A low-poly horizon: terrain stretching to a foggy horizon, ember-lit
// peaks, dust particles drifting toward the camera. Camera dollies forward
// continuously to create the "race ahead" feeling.
//
// Bails out gracefully on:
//   - prefers-reduced-motion: reduce
//   - low-end devices (< 4 cores or < 4 GB RAM)
//   - touch / mobile (we still render but at half DPR & smaller terrain)
// =========================================================================

import * as THREE from 'three';

const reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const lowEnd  = (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)
             || (navigator.deviceMemory && navigator.deviceMemory < 4);

export function initScene(canvas) {
    if (!canvas || reduce) return null;

    // ---- Sizing ----
    const dprCap = lowEnd ? 1 : (isTouch ? 1.25 : 1.5);
    const dpr    = Math.min(window.devicePixelRatio || 1, dprCap);

    let w = canvas.clientWidth || window.innerWidth;
    let h = canvas.clientHeight || window.innerHeight;

    // ---- Renderer ----
    const renderer = new THREE.WebGLRenderer({
        canvas, alpha: true, antialias: !lowEnd, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    // ---- Scene ----
    const scene = new THREE.Scene();
    const fogColor = new THREE.Color(0x0b0a08);
    scene.fog = new THREE.Fog(fogColor, 18, 70);

    // ---- Camera ----
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
    camera.position.set(0, 4.2, 16);
    camera.lookAt(0, 1.2, -6);

    // ---- Lights ----
    const amb = new THREE.AmbientLight(0xfff1d6, 0.35);
    scene.add(amb);

    const sun = new THREE.DirectionalLight(0xff7d4d, 1.4);
    sun.position.set(-6, 7, -8);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6b8aff, 0.25);
    fill.position.set(8, 4, 6);
    scene.add(fill);

    // ---- Terrain ----
    const segX = lowEnd ? 50 : 90;
    const segZ = lowEnd ? 40 : 70;
    const terrainGeom = new THREE.PlaneGeometry(80, 200, segX, segZ);
    terrainGeom.rotateX(-Math.PI / 2);

    // Cheap layered noise (sum of trig)
    const positions = terrainGeom.attributes.position;
    const noise = (x, z) => {
        return Math.sin(x * 0.18) * 0.9
             + Math.cos(z * 0.22) * 0.7
             + Math.sin((x + z) * 0.12) * 0.5
             + Math.cos((x - z) * 0.31) * 0.35;
    };
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        // distance falloff: stay flat near camera, get tall toward horizon
        const dist = Math.max(0, -z);
        const falloff = Math.min(1, dist / 30);
        const n = noise(x, z);
        positions.setY(i, n * 0.9 * falloff);
    }
    terrainGeom.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
        color: 0x1a1410,
        roughness: 0.95,
        metalness: 0.0,
        flatShading: true,
        emissive: 0x150b04,
        emissiveIntensity: 0.6
    });
    const terrain = new THREE.Mesh(terrainGeom, terrainMat);
    terrain.position.y = -1.2;
    scene.add(terrain);

    // Wireframe overlay on horizon (subtle topographic feel)
    const wireMat = new THREE.MeshBasicMaterial({
        color: 0xff5b1f,
        wireframe: true,
        transparent: true,
        opacity: 0.06
    });
    const wireMesh = new THREE.Mesh(terrainGeom, wireMat);
    wireMesh.position.y = -1.18;
    scene.add(wireMesh);

    // ---- Horizon line: emissive thin plane across the back ----
    const horizonGeom = new THREE.PlaneGeometry(120, 0.04);
    const horizonMat = new THREE.MeshBasicMaterial({
        color: 0xff7d4d, transparent: true, opacity: 0.55
    });
    const horizon = new THREE.Mesh(horizonGeom, horizonMat);
    horizon.position.set(0, 1.2, -50);
    scene.add(horizon);

    // ---- Particles (wind dust) ----
    const partCount = lowEnd ? 280 : 600;
    const partGeom = new THREE.BufferGeometry();
    const partPos = new Float32Array(partCount * 3);
    const partVel = new Float32Array(partCount);
    for (let i = 0; i < partCount; i++) {
        partPos[i * 3 + 0] = (Math.random() - 0.5) * 60;
        partPos[i * 3 + 1] = Math.random() * 8 + 0.5;
        partPos[i * 3 + 2] = (Math.random() - 0.5) * 80 - 10;
        partVel[i] = 0.04 + Math.random() * 0.12;
    }
    partGeom.setAttribute('position', new THREE.BufferAttribute(partPos, 3));

    const partMat = new THREE.PointsMaterial({
        color: 0xfff1d6,
        size: 0.04,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        sizeAttenuation: true
    });
    const points = new THREE.Points(partGeom, partMat);
    scene.add(points);

    // ---- Mouse parallax target ----
    let mx = 0, my = 0;
    let mxL = 0, myL = 0;
    if (!isTouch) {
        window.addEventListener('mousemove', (e) => {
            mx = (e.clientX / window.innerWidth - 0.5) * 0.6;
            my = (e.clientY / window.innerHeight - 0.5) * 0.3;
        }, { passive: true });
    }

    // ---- Resize ----
    const onResize = () => {
        const rect = canvas.getBoundingClientRect();
        w = rect.width; h = rect.height;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // ---- Animate ----
    let running = true;
    let raf = null;
    let t = 0;
    let cameraDollyZ = 16;

    // Pause when offscreen
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            running = entry.isIntersecting;
            if (running && !raf) tick();
        });
    }, { threshold: 0.01 });
    io.observe(canvas);

    const tick = () => {
        if (!running) { raf = null; return; }
        raf = requestAnimationFrame(tick);
        t += 0.005;

        // Smooth mouse parallax
        mxL += (mx - mxL) * 0.05;
        myL += (my - myL) * 0.05;

        // Camera dolly: slow continuous push forward, recycled
        cameraDollyZ -= 0.012;
        if (cameraDollyZ < -2) cameraDollyZ = 16;
        camera.position.x = mxL * 1.5;
        camera.position.y = 4.2 + myL * 0.4;
        camera.position.z = cameraDollyZ;
        camera.lookAt(mxL * 0.6, 1.2, -6);

        // Terrain breathes slightly
        terrain.position.z = Math.sin(t * 0.4) * 0.4;
        wireMesh.position.z = terrain.position.z;

        // Particles drift toward camera; recycle when they pass
        const arr = partGeom.attributes.position.array;
        for (let i = 0; i < partCount; i++) {
            arr[i * 3 + 2] += partVel[i];
            arr[i * 3 + 0] += Math.sin(t * 0.6 + i) * 0.004;
            if (arr[i * 3 + 2] > camera.position.z + 4) {
                arr[i * 3 + 2] = camera.position.z - 80;
                arr[i * 3 + 0] = (Math.random() - 0.5) * 60;
                arr[i * 3 + 1] = Math.random() * 8 + 0.5;
            }
        }
        partGeom.attributes.position.needsUpdate = true;

        // Subtle horizon flicker
        horizon.material.opacity = 0.45 + Math.sin(t * 1.5) * 0.1;

        renderer.render(scene, camera);
    };

    // Reveal canvas once first frame is ready
    requestAnimationFrame(() => {
        canvas.classList.add('is-ready');
        tick();
    });

    // ---- Cleanup ----
    return () => {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        io.disconnect();
        window.removeEventListener('resize', onResize);
        terrainGeom.dispose();
        terrainMat.dispose();
        wireMat.dispose();
        horizonGeom.dispose();
        horizonMat.dispose();
        partGeom.dispose();
        partMat.dispose();
        renderer.dispose();
    };
}

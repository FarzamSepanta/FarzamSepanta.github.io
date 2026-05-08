// =========================================================================
// scene.js — the one Three.js moment, now reading as sustainability/grid.
// A leaf-green wireframe grid floor receding to a glowing horizon, with
// a subtle data-node pulse layer and a slow forward camera dolly.
//
// Bails out gracefully on:
//   - prefers-reduced-motion: reduce
//   - low-end devices (< 4 cores or < 4 GB RAM)
// =========================================================================

import * as THREE from 'three';

const reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const lowEnd  = (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)
             || (navigator.deviceMemory && navigator.deviceMemory < 4);

const COLOR_LEAF = 0x7ad672;
const COLOR_LEAF_HI = 0xa3e89e;
const COLOR_FOG = 0x081008;
const COLOR_BG = 0x0b0a08;

export function initScene(canvas) {
    if (!canvas || reduce) return null;

    const dprCap = lowEnd ? 1 : (isTouch ? 1.25 : 1.5);
    const dpr    = Math.min(window.devicePixelRatio || 1, dprCap);

    let w = canvas.clientWidth || window.innerWidth;
    let h = canvas.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
        canvas, alpha: true, antialias: !lowEnd, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(COLOR_FOG, 14, 60);

    const camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 200);
    camera.position.set(0, 3.4, 14);
    camera.lookAt(0, 1.6, -6);

    // ---- Lights ----
    const amb = new THREE.AmbientLight(0xb6f6ad, 0.4);
    scene.add(amb);
    const key = new THREE.DirectionalLight(COLOR_LEAF_HI, 1.0);
    key.position.set(0, 6, -8);
    scene.add(key);

    // ---- Grid floor (foreground) ----
    // Custom plane with wireframe — finer grid + glowing line aesthetic
    const segs = lowEnd ? 36 : 60;
    const planeGeom = new THREE.PlaneGeometry(120, 200, segs, segs * 1.6 | 0);
    planeGeom.rotateX(-Math.PI / 2);
    const planeMat = new THREE.MeshBasicMaterial({
        color: COLOR_LEAF,
        wireframe: true,
        transparent: true,
        opacity: 0.22
    });
    const grid = new THREE.Mesh(planeGeom, planeMat);
    grid.position.y = -1.1;
    scene.add(grid);

    // ---- Grid floor (background, larger + dimmer for parallax depth) ----
    const planeGeom2 = new THREE.PlaneGeometry(280, 320, 24, 36);
    planeGeom2.rotateX(-Math.PI / 2);
    const planeMat2 = new THREE.MeshBasicMaterial({
        color: COLOR_LEAF,
        wireframe: true,
        transparent: true,
        opacity: 0.07
    });
    const gridFar = new THREE.Mesh(planeGeom2, planeMat2);
    gridFar.position.y = -1.0;
    scene.add(gridFar);

    // ---- Horizon line ----
    const horizonGeom = new THREE.PlaneGeometry(220, 0.05);
    const horizonMat = new THREE.MeshBasicMaterial({
        color: COLOR_LEAF_HI, transparent: true, opacity: 0.7
    });
    const horizon = new THREE.Mesh(horizonGeom, horizonMat);
    horizon.position.set(0, 0.3, -52);
    scene.add(horizon);

    // ---- Horizon glow plane (soft bloom-ish gradient via vertex colors) ----
    const glowGeom = new THREE.PlaneGeometry(220, 14, 1, 1);
    const glowColors = new Float32Array([
        // top-left, top-right, bottom-left, bottom-right
        0.48, 0.84, 0.45,  0.48, 0.84, 0.45,
        0, 0, 0,           0, 0, 0
    ]);
    glowGeom.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
    const glowMat = new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.28, depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.position.set(0, 6.5, -52);
    scene.add(glow);

    // ---- Data-node particles ----
    const partCount = lowEnd ? 220 : 480;
    const partGeom = new THREE.BufferGeometry();
    const partPos = new Float32Array(partCount * 3);
    const partVel = new Float32Array(partCount);
    const partFlick = new Float32Array(partCount);
    for (let i = 0; i < partCount; i++) {
        partPos[i * 3 + 0] = (Math.random() - 0.5) * 70;
        partPos[i * 3 + 1] = Math.random() * 7 + 0.2;
        partPos[i * 3 + 2] = (Math.random() - 0.5) * 90 - 12;
        partVel[i] = 0.04 + Math.random() * 0.14;
        partFlick[i] = Math.random() * Math.PI * 2;
    }
    partGeom.setAttribute('position', new THREE.BufferAttribute(partPos, 3));

    const partMat = new THREE.PointsMaterial({
        color: COLOR_LEAF_HI,
        size: 0.05,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        sizeAttenuation: true
    });
    const points = new THREE.Points(partGeom, partMat);
    scene.add(points);

    // ---- Pulse rings: occasional concentric ring sweeping outward from origin ----
    const pulseGeom = new THREE.RingGeometry(0.5, 0.55, 64);
    pulseGeom.rotateX(-Math.PI / 2);
    const pulses = [];
    const pulseCount = 3;
    for (let i = 0; i < pulseCount; i++) {
        const m = new THREE.MeshBasicMaterial({
            color: COLOR_LEAF_HI, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
        });
        const mesh = new THREE.Mesh(pulseGeom, m);
        mesh.position.set(0, -1.08, -8);
        mesh.scale.set(1, 1, 1);
        scene.add(mesh);
        pulses.push({ mesh, mat: m, t: -i * 1.7, period: 5 + Math.random() * 1.5 });
    }

    // ---- Mouse parallax ----
    let mx = 0, my = 0;
    let mxL = 0, myL = 0;
    if (!isTouch) {
        window.addEventListener('mousemove', (e) => {
            mx = (e.clientX / window.innerWidth - 0.5) * 0.6;
            my = (e.clientY / window.innerHeight - 0.5) * 0.3;
        }, { passive: true });
    }

    const onResize = () => {
        const rect = canvas.getBoundingClientRect();
        w = rect.width; h = rect.height;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    let running = true;
    let raf = null;
    let t = 0;
    let dollyZ = 14;

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

        mxL += (mx - mxL) * 0.05;
        myL += (my - myL) * 0.05;

        // Camera dolly: continuous forward motion, recycle
        dollyZ -= 0.02;
        if (dollyZ < -2) dollyZ = 14;
        camera.position.x = mxL * 1.3;
        camera.position.y = 3.4 + myL * 0.3;
        camera.position.z = dollyZ;
        camera.lookAt(mxL * 0.5, 1.6, -6);

        // Grids drift toward camera so motion is felt even when camera resets
        grid.position.z = (t * 4) % 4;
        gridFar.position.z = (t * 1.5) % 4;

        // Particles drift toward camera, recycled
        const arr = partGeom.attributes.position.array;
        for (let i = 0; i < partCount; i++) {
            arr[i * 3 + 2] += partVel[i];
            arr[i * 3 + 0] += Math.sin(t * 0.5 + partFlick[i]) * 0.003;
            if (arr[i * 3 + 2] > camera.position.z + 4) {
                arr[i * 3 + 2] = camera.position.z - 90;
                arr[i * 3 + 0] = (Math.random() - 0.5) * 70;
                arr[i * 3 + 1] = Math.random() * 7 + 0.2;
            }
        }
        partGeom.attributes.position.needsUpdate = true;

        // Pulse rings: sweep outward over `period`, fade as they go
        pulses.forEach((p) => {
            p.t += 0.01;
            const phase = ((p.t % p.period) + p.period) % p.period;
            const k = phase / p.period;
            const scale = 1 + k * 60;
            p.mesh.scale.set(scale, 1, scale);
            p.mat.opacity = (1 - k) * 0.45 * Math.max(0, 1 - k * 0.3);
        });

        // Horizon flicker
        horizon.material.opacity = 0.55 + Math.sin(t * 1.4) * 0.12;

        renderer.render(scene, camera);
    };

    requestAnimationFrame(() => {
        canvas.classList.add('is-ready');
        tick();
    });

    return () => {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        io.disconnect();
        window.removeEventListener('resize', onResize);
        planeGeom.dispose();
        planeMat.dispose();
        planeGeom2.dispose();
        planeMat2.dispose();
        horizonGeom.dispose();
        horizonMat.dispose();
        glowGeom.dispose();
        glowMat.dispose();
        partGeom.dispose();
        partMat.dispose();
        pulseGeom.dispose();
        pulses.forEach((p) => p.mat.dispose());
        renderer.dispose();
    };
}

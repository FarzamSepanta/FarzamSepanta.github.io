// =========================================================================
// cursor.js — custom cursor + magnetic hover
// Hidden on touch devices and when prefers-reduced-motion is set.
// =========================================================================

const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initCursor() {
    if (isTouch || reduce) return;

    const ring = document.querySelector('[data-cursor]');
    const dot  = document.querySelector('[data-cursor-dot]');
    if (!ring || !dot) return;

    // Start hidden — show only after the user actually moves the pointer.
    // Otherwise the cursor sits parked at viewport center on load, which
    // looks broken.
    ring.classList.add('is-hidden');
    dot.classList.add('is-hidden');
    let firstMove = true;

    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let rx = tx, ry = ty;
    let dx = tx, dy = ty;

    document.addEventListener('mousemove', (e) => {
        if (firstMove) {
            // Snap on first movement so we don't see a long lerp from
            // viewport center to wherever the pointer actually is.
            rx = tx = e.clientX;
            ry = ty = e.clientY;
            ring.classList.remove('is-hidden');
            dot.classList.remove('is-hidden');
            firstMove = false;
        }
        tx = e.clientX;
        ty = e.clientY;
        dx = e.clientX;
        dy = e.clientY;
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        ring.classList.add('is-hidden');
        dot.classList.add('is-hidden');
    });
    document.addEventListener('mouseenter', () => {
        ring.classList.remove('is-hidden');
        dot.classList.remove('is-hidden');
    });

    const tick = () => {
        // ring lerps slowly, dot snaps
        rx += (tx - rx) * 0.18;
        ry += (ty - ry) * 0.18;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
        dot.style.transform  = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
        requestAnimationFrame(tick);
    };
    tick();

    // ----- Hover state on interactive elements -----
    const linkSelector = 'a, button, [data-magnetic], [role="button"]';
    document.body.addEventListener('mouseover', (e) => {
        if (e.target.closest(linkSelector)) ring.classList.add('is-link');
    });
    document.body.addEventListener('mouseout', (e) => {
        if (e.target.closest(linkSelector)) ring.classList.remove('is-link');
    });
}

// =========================================================================
// magnetic hover for [data-magnetic]
// =========================================================================
export function initMagnetic() {
    if (isTouch || reduce) return;
    const els = document.querySelectorAll('[data-magnetic]');
    const strength = 0.35;

    els.forEach((el) => {
        let raf = null;
        let tx = 0, ty = 0;
        let cx = 0, cy = 0;

        const onMove = (e) => {
            const rect = el.getBoundingClientRect();
            const dx = e.clientX - (rect.left + rect.width / 2);
            const dy = e.clientY - (rect.top + rect.height / 2);
            tx = dx * strength;
            ty = dy * strength;
            if (!raf) raf = requestAnimationFrame(loop);
        };

        const loop = () => {
            cx += (tx - cx) * 0.18;
            cy += (ty - cy) * 0.18;
            el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
            if (Math.abs(tx - cx) < 0.1 && Math.abs(ty - cy) < 0.1) {
                raf = null;
                return;
            }
            raf = requestAnimationFrame(loop);
        };

        const reset = () => {
            tx = 0; ty = 0;
            if (!raf) raf = requestAnimationFrame(loop);
        };

        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', reset);
    });
}

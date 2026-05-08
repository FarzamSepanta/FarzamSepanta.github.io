// =========================================================================
// app.js — orchestrator.
// Boots smooth scroll, custom cursor, page transitions, the 3D hero scene,
// reveal animations, race progress bar, and per-page renderers (magazine,
// media). All modules are vanilla ES, GSAP/Lenis come from CDN globals.
// =========================================================================

import { initCursor, initMagnetic } from './cursor.js';
import { initTransitions } from './transitions.js';
import { initIntro } from './intro.js';
// scene.js is dynamically imported only on pages that have [data-hero],
// because it depends on three.js (resolved via the importmap on index.html).

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Wait for GSAP/Lenis CDN scripts (they're deferred, module scripts run after)
function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
}

ready(() => {
    // Boot the intro first; everything else still initializes in parallel
    // so smooth scroll, the 3D scene, and reveals are ready by the time
    // the intro hands off (~5s).
    initIntro();

    initSmoothScroll();
    initTransitions();
    initCursor();
    initMagnetic();
    initReveal();
    initProgressBar();
    initParallax();

    initHero();
    initMagazine();
    initMedia();
});

// =========================================================================
// Smooth scroll via Lenis (hooked to GSAP ticker so ScrollTrigger stays in sync)
// =========================================================================
function initSmoothScroll() {
    if (reduce || !window.Lenis) return;
    const lenis = new window.Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.4
    });

    if (window.gsap && window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        lenis.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add((time) => lenis.raf(time * 1000));
        window.gsap.ticker.lagSmoothing(0);
    } else {
        const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
    }
}

// =========================================================================
// Reveal observer for [data-reveal]
// =========================================================================
function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
        els.forEach((el) => el.classList.add('is-in'));
        return;
    }

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach((el) => io.observe(el));
}

// =========================================================================
// Race progress bar
// =========================================================================
function initProgressBar() {
    const bar = document.querySelector('[data-progress]');
    if (!bar) return;

    const onScroll = () => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        const p = max > 0 ? (window.scrollY / max) * 100 : 0;
        bar.style.setProperty('--p', p.toFixed(2) + '%');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
}

// =========================================================================
// Parallax: [data-parallax data-depth="0.05"]
// =========================================================================
function initParallax() {
    if (reduce) return;
    const els = document.querySelectorAll('[data-parallax]');
    if (!els.length) return;

    let mx = 0, my = 0;
    let lx = 0, ly = 0;
    let raf = null;

    window.addEventListener('mousemove', (e) => {
        mx = (e.clientX / window.innerWidth - 0.5);
        my = (e.clientY / window.innerHeight - 0.5);
        if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    const loop = () => {
        lx += (mx - lx) * 0.06;
        ly += (my - ly) * 0.06;
        els.forEach((el) => {
            const d = parseFloat(el.dataset.depth || '0.04');
            const x = lx * 100 * d;
            const y = ly * 60 * d;
            el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
        if (Math.abs(mx - lx) < 0.001 && Math.abs(my - ly) < 0.001) {
            raf = null;
            return;
        }
        raf = requestAnimationFrame(loop);
    };
}

// =========================================================================
// HERO — photo load, motto reveal, name split, 3D scene
// =========================================================================
function initHero() {
    const hero = document.querySelector('[data-hero]');
    if (!hero) return;

    // Photo load class for the slow scale-in
    const photo = hero.querySelector('.hero-photo');
    const img   = photo && photo.querySelector('img');
    if (img) {
        if (img.complete) photo.classList.add('is-loaded');
        else img.addEventListener('load', () => photo.classList.add('is-loaded'));
    }

    // Motto letter-by-letter
    initMottoReveal();

    // Hero name parallax tilt on mouse
    initHeroNameTilt();

    // Three.js horizon scene — dynamic import keeps three.js out of inner pages
    const canvas = hero.querySelector('[data-scene]');
    if (canvas) {
        import('./scene.js')
            .then(({ initScene }) => initScene(canvas))
            .catch((err) => {
                // If three.js fails to load, leave the canvas hidden — the
                // photo, type, and gradient bg still carry the hero.
                console.warn('hero scene unavailable:', err);
            });
    }
}

function initMottoReveal() {
    const motto = document.querySelector('[data-motto]');
    if (!motto) return;
    const text = motto.textContent.trim();
    motto.textContent = '';
    [...text].forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'motto-letter';
        span.textContent = ch === ' ' ? ' ' : ch;
        span.style.setProperty('--d', `${600 + i * 30}ms`);
        motto.appendChild(span);
    });
    requestAnimationFrame(() => motto.classList.add('is-revealed'));
}

function initHeroNameTilt() {
    if (reduce) return;
    const rows = document.querySelectorAll('.hero-name-row');
    if (!rows.length) return;

    let mx = 0, my = 0;
    let lx = 0, ly = 0;
    let raf = null;

    window.addEventListener('mousemove', (e) => {
        mx = (e.clientX / window.innerWidth - 0.5);
        my = (e.clientY / window.innerHeight - 0.5);
        if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    const loop = () => {
        lx += (mx - lx) * 0.05;
        ly += (my - ly) * 0.05;
        rows.forEach((row, i) => {
            const dir = i % 2 === 0 ? 1 : -1;
            row.style.transform = `translate3d(${lx * 18 * dir}px, ${ly * 8}px, 0)`;
        });
        if (Math.abs(mx - lx) < 0.001 && Math.abs(my - ly) < 0.001) {
            raf = null;
            return;
        }
        raf = requestAnimationFrame(loop);
    };
}

// =========================================================================
// MAGAZINE page
// =========================================================================
function initMagazine() {
    const list = document.querySelector('[data-mag-list]');
    const track = document.querySelector('[data-mag-track]');
    if (!list && !track) return;

    const articles = window.MAGAZINE_ARTICLES || [];

    // ----- Featured horizontal scroll -----
    if (track) {
        const featured = articles.slice(0, Math.min(4, articles.length));
        track.innerHTML = featured.map((a, i) => featuredCard(a, i)).join('');
        initMagFeaturedScroll(track);
    }

    // ----- Full archive -----
    if (list) {
        list.innerHTML = articles.map((a, i) => archiveRow(a, i)).join('');
        // Re-attach reveal observer to the dynamically added rows
        const rows = list.querySelectorAll('[data-reveal]');
        attachReveal(rows);
    }
}

function featuredCard(a, i) {
    const num = String(i + 1).padStart(2, '0');
    return `
        <a class="mag-feat-card" href="${a.url}" target="_blank" rel="noopener">
            <div class="mag-feat-card-meta">
                <span class="mag-feat-card-num">N° ${num}</span>
                <span>${a.year}</span>
            </div>
            <h3 class="mag-feat-card-title">${escapeHtml(a.title)}</h3>
            <p class="mag-feat-card-byline">${escapeHtml(a.authors)}</p>
            <div class="mag-feat-card-foot">
                <span class="mag-feat-card-journal">${escapeHtml(a.journal)}</span>
                <span class="mag-feat-card-link">
                    <span>Read</span>
                    <span aria-hidden="true">→</span>
                </span>
            </div>
        </a>
    `;
}

function archiveRow(a, i) {
    const num = String(i + 1).padStart(2, '0');
    return `
        <li class="mag-row" data-reveal>
            <a href="${a.url}" target="_blank" rel="noopener">
                <span class="mag-row-year">${num} · ${a.year}</span>
                <span class="mag-row-title">${escapeHtml(a.title)}</span>
                <span class="mag-row-meta">
                    <span class="mag-row-journal">${escapeHtml(a.journal)}</span>
                    <span class="mag-row-arrow" aria-hidden="true">↗</span>
                </span>
            </a>
        </li>
    `;
}

function initMagFeaturedScroll(track) {
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    const pin = document.querySelector('[data-mag-pin]');
    if (!pin) return;
    if (window.matchMedia('(max-width: 720px)').matches) return;

    const scrollDistance = () => track.scrollWidth - window.innerWidth + 80;

    window.gsap.to(track, {
        x: () => -scrollDistance(),
        ease: 'none',
        scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${scrollDistance()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            anticipatePin: 1
        }
    });
}

// =========================================================================
// MEDIA page
// =========================================================================
function initMedia() {
    const list  = document.querySelector('[data-media-list]');
    const track = document.querySelector('[data-rail-track]');
    if (!list && !track) return;

    const items = window.MEDIA_APPEARANCES || [];

    if (track) {
        const featured = items.slice(0, Math.min(8, items.length));
        track.innerHTML = featured.map((m, i) => railCard(m, i)).join('');
        initMediaRailScroll(track);
    }

    if (list) {
        list.innerHTML = items.map((m, i) => mediaCard(m, i)).join('');
        const cards = list.querySelectorAll('[data-reveal]');
        attachReveal(cards);
    }
}

function railCard(m, i) {
    const num = String(i + 1).padStart(2, '0');
    const linkBlock = m.url
        ? `<a class="media-rail-card-link" href="${m.url}" target="_blank" rel="noopener">
               <span>Watch / Listen</span><span aria-hidden="true">→</span>
           </a>`
        : `<span class="media-rail-card-link" style="color:var(--fg-mute)">Archived</span>`;

    return `
        <article class="media-rail-card">
            <span class="media-rail-card-type">${escapeHtml(m.type || 'Press')}</span>
            <div>
                <h3 class="media-rail-card-title">${escapeHtml(m.title)}</h3>
                <p class="media-rail-card-outlet">${escapeHtml(m.outlet)}</p>
            </div>
            <div class="media-rail-card-foot">
                <span class="media-rail-card-num">N° ${num}</span>
                ${linkBlock}
            </div>
        </article>
    `;
}

function mediaCard(m, i) {
    const num = String(i + 1).padStart(2, '0');
    const desc = m.description ? `<p class="media-card-desc">${escapeHtml(m.description)}</p>` : '';
    const link = m.url
        ? `<a class="media-card-link" href="${m.url}" target="_blank" rel="noopener">
               <span>Watch / Listen</span><span aria-hidden="true">→</span>
           </a>`
        : `<span class="media-card-noLink">No public link</span>`;

    return `
        <li class="media-card" data-reveal>
            <header class="media-card-head">
                <span class="media-card-type">${escapeHtml(m.type || 'Press')}</span>
                <span class="media-card-num">N° ${num}</span>
            </header>
            <h3 class="media-card-title">${escapeHtml(m.title)}</h3>
            <p class="media-card-outlet">${escapeHtml(m.outlet)}</p>
            ${desc}
            ${link}
        </li>
    `;
}

function initMediaRailScroll(track) {
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    const pin = document.querySelector('[data-rail-pin]');
    if (!pin) return;
    if (window.matchMedia('(max-width: 720px)').matches) return;

    const scrollDistance = () => track.scrollWidth - window.innerWidth + 80;

    window.gsap.to(track, {
        x: () => -scrollDistance(),
        ease: 'none',
        scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${scrollDistance()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            anticipatePin: 1
        }
    });
}

// =========================================================================
// Helpers
// =========================================================================
function attachReveal(els) {
    if (!els || !els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
        els.forEach((el) => el.classList.add('is-in'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
}

function escapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

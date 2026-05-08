// =========================================================================
// intro.js — first-load intro on the home page.
//
// Timeline (~5.5s):
//   0.0–0.3s  : intro mounts, "FARZAM SEPANTA" appears centered, both fill
//               and stroke layers visible on a single line
//   0.3–1.7s  : strokes draw on left → right (CSS clip-path)
//   1.7–3.5s  : static, progress bar fills
//   3.5–4.7s  : MORPH — FLIP-style. Each intro word is measured against
//               its corresponding hero-name row and animated (translate +
//               scale) so it lands exactly on the hero's position.
//               Simultaneously: FARZAM stroke fades out, SEPANTA fill
//               fades out, SEPANTA stroke retraces (clip-path) along its
//               own path. The hero H1 (hidden until now) is revealed at
//               the moment the morph lands so the swap is invisible.
//   4.4s      : photo slides in from the right (CSS handles the easing)
//   4.7–5.4s  : intro overlay fades; rest of the hero (meta, role, motto,
//               stats, cue, motion fx) fades in alongside the photo
//   5.4s+     : intro removed, hero is fully exposed
//
// Skipped on prefers-reduced-motion and on subsequent home visits in the
// same tab session.
// =========================================================================

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SESSION_KEY = 'fs-intro-played';

export function initIntro() {
    const intro = document.querySelector('[data-intro]');
    if (!intro) return Promise.resolve();
    if (document.body.dataset.page !== 'home') {
        intro.classList.add('is-gone');
        return Promise.resolve();
    }

    let alreadyPlayed = false;
    try { alreadyPlayed = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) {}

    if (reduce || alreadyPlayed) {
        document.body.classList.add('is-photo-in', 'is-name-in', 'is-hero-in');
        intro.classList.add('is-gone');
        return Promise.resolve();
    }

    intro.removeAttribute('aria-hidden');
    intro.classList.add('is-active');

    return new Promise((resolve) => {
        runSequence(intro, resolve);
    });
}

function runSequence(intro, done) {
    const introFirst = intro.querySelector('[data-intro-first]');
    const introLast  = intro.querySelector('[data-intro-last]');
    const progress   = intro.querySelector('[data-intro-progress]');

    // Tick strokes in (CSS handles the animation)
    setTimeout(() => intro.classList.add('is-drawn'), 50);

    // Progress bar fill
    if (progress && window.gsap) {
        window.gsap.to(progress, { scaleX: 1, duration: 4.5, ease: 'none' });
    } else if (progress) {
        progress.style.transition = 'transform 4.5s linear';
        progress.style.transform = 'scaleX(1)';
    }

    // 3.5s — start the morph
    setTimeout(() => morph(intro, introFirst, introLast), 3500);

    // 4.4s — release hero photo slide-in
    setTimeout(() => document.body.classList.add('is-photo-in'), 4400);

    // 4.7s — fade overlay; reveal the rest of the hero (meta, role, motto, stats)
    setTimeout(() => {
        intro.classList.add('is-leaving');
        document.body.classList.add('is-hero-in');
    }, 4700);

    // 5.4s — fully hide and resolve
    setTimeout(() => {
        intro.classList.add('is-gone');
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
        done();
    }, 5400);
}

// =========================================================================
// FLIP-style morph: measure where each hero name row WOULD render, then
// translate+scale the intro word onto that exact rect. Reveal the hero
// H1 at the moment the morph finishes — the swap is then invisible
// because both elements occupy the same pixels with the same content.
// =========================================================================
function morph(intro, first, last) {
    intro.classList.add('is-morphing');
    if (!first || !last) return;

    const heroH1 = document.querySelector('.hero-name');
    const heroFirst = heroH1 && heroH1.querySelector('[data-hero-first]');
    const heroLast  = heroH1 && heroH1.querySelector('[data-hero-last]');

    // Without hero rows we can't FLIP; fall back to the older arc morph
    if (!heroH1 || !heroFirst || !heroLast) {
        fallbackArc(first, last);
        return;
    }

    // Hero is hidden via CSS (body lacks .is-name-in). Layout is still
    // computed, so getBoundingClientRect returns the real future rect.
    const heroFirstRect = heroFirst.getBoundingClientRect();
    const heroLastRect  = heroLast.getBoundingClientRect();
    const introFirstRect = first.getBoundingClientRect();
    const introLastRect  = last.getBoundingClientRect();

    // Bail if we got bad measurements
    if (!heroFirstRect.height || !introFirstRect.height) {
        fallbackArc(first, last);
        return;
    }

    const dxF = heroFirstRect.left - introFirstRect.left;
    const dyF = heroFirstRect.top  - introFirstRect.top;
    const sF  = heroFirstRect.height / introFirstRect.height;

    const dxL = heroLastRect.left - introLastRect.left;
    const dyL = heroLastRect.top  - introLastRect.top;
    const sL  = heroLastRect.height / introLastRect.height;

    const duration = 1.2;

    if (window.gsap) {
        window.gsap.to(first, {
            x: dxF, y: dyF, scale: sF,
            transformOrigin: 'left top',
            duration: duration,
            ease: 'power3.inOut'
        });
        window.gsap.to(last, {
            x: dxL, y: dyL, scale: sL,
            transformOrigin: 'left top',
            duration: duration,
            ease: 'power3.inOut'
        });
    } else {
        first.style.transformOrigin = 'left top';
        first.style.transition = `transform ${duration}s cubic-bezier(0.65,0,0.35,1)`;
        first.style.transform = `translate(${dxF}px, ${dyF}px) scale(${sF})`;
        last.style.transformOrigin = 'left top';
        last.style.transition = `transform ${duration}s cubic-bezier(0.65,0,0.35,1)`;
        last.style.transform = `translate(${dxL}px, ${dyL}px) scale(${sL})`;
    }

    // Just before the intro begins fading, reveal the hero H1. Intro
    // words are sitting on top of the hero rows at this moment (same
    // pixels, same content) so the visual handoff is invisible.
    setTimeout(() => {
        document.body.classList.add('is-name-in');
    }, duration * 1000 + 30);
}

function fallbackArc(first, last) {
    if (window.gsap) {
        window.gsap.to(first, {
            keyframes: [
                { x: '-6vw',  y: '-12vh', scale: 0.9, ease: 'power2.out', duration: 0.5 },
                { x: '-14vw', y: '-26vh', scale: 0.8, ease: 'power2.in',  duration: 0.7 }
            ]
        });
        window.gsap.to(last, {
            keyframes: [
                { x: '6vw',  y: '-6vh',  scale: 0.9, ease: 'power2.out', duration: 0.5 },
                { x: '-2vw', y: '-18vh', scale: 0.8, ease: 'power2.in',  duration: 0.7 }
            ]
        });
    }
    setTimeout(() => document.body.classList.add('is-name-in'), 1230);
}

// =========================================================================
// intro.js — first-load intro sequence on the home page.
//
// Timeline (5s total):
//   0.0–0.3s  : intro overlay mounts, "FARZAM SEPANTA" appears, both fill
//               and stroke layers visible on one line
//   0.3–1.7s  : stroke layer "draws on" via clip-path (left → right)
//   1.7–3.5s  : full static state, progress bar fills
//   3.5–4.7s  : morph — FARZAM stroke fades out, SEPANTA fill fades out,
//               SEPANTA stroke retraces along its path. Words travel along
//               a curved arc toward the hero name's upper-left position.
//   4.4s      : hero photo released from its hidden state, slides in from
//               the right (CSS handles the easing)
//   4.7–5.0s  : intro fades out, real hero is exposed underneath
//
// Skipped on:
//   - prefers-reduced-motion (reveals hero immediately)
//   - subsequent home-page visits in the same tab session
//   - non-home pages
// =========================================================================

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SESSION_KEY = 'fs-intro-played';

export function initIntro() {
    const intro = document.querySelector('[data-intro]');
    if (!intro) return Promise.resolve();

    // Only home page has the intro markup, but guard anyway.
    if (document.body.dataset.page !== 'home') {
        intro.classList.add('is-gone');
        return Promise.resolve();
    }

    // If we already played the intro this session, skip.
    let alreadyPlayed = false;
    try { alreadyPlayed = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) {}

    if (reduce || alreadyPlayed) {
        document.body.classList.add('is-photo-in');
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

    // 0.05s — tick the strokes in (CSS handles the actual clip-path animation)
    setTimeout(() => intro.classList.add('is-drawn'), 50);

    // Progress bar fill (matches total visible duration before fade-out begins)
    if (progress && window.gsap) {
        window.gsap.to(progress, {
            scaleX: 1,
            duration: 4.5,
            ease: 'none'
        });
    } else if (progress) {
        progress.style.transition = 'transform 4.5s linear';
        progress.style.transform = 'scaleX(1)';
    }

    // 3.5s — start the morph
    setTimeout(() => morph(intro, introFirst, introLast), 3500);

    // 4.4s — release the hero photo from its hidden state (CSS slides it in)
    setTimeout(() => document.body.classList.add('is-photo-in'), 4400);

    // 4.7s — fade the intro out
    setTimeout(() => intro.classList.add('is-leaving'), 4700);

    // 5.4s — fully hide and resolve
    setTimeout(() => {
        intro.classList.add('is-gone');
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
        done();
    }, 5400);
}

// =========================================================================
// Morph — words follow curved paths toward upper-left while their layers
// swap (fill stays for FARZAM, stroke stays for SEPANTA). The path is a
// two-segment GSAP keyframe arc; if GSAP is unavailable we fall back to a
// CSS transform.
// =========================================================================
function morph(intro, first, last) {
    intro.classList.add('is-morphing');

    if (!first || !last) return;

    if (window.gsap) {
        // FARZAM: arc up-and-left, slight scale-down. Mirrors the hero's
        // top-left FARZAM position approximately.
        window.gsap.to(first, {
            keyframes: [
                { x: '-6vw', y: '-12vh', scale: 0.94, ease: 'power2.out', duration: 0.5 },
                { x: '-14vw', y: '-26vh', scale: 0.85, ease: 'power2.in',  duration: 0.7 }
            ]
        });
        // SEPANTA: arc up-and-right then settle. Mirrors the hero's
        // outlined-row position which is offset slightly right of FARZAM.
        window.gsap.to(last, {
            keyframes: [
                { x: '6vw',  y: '-6vh',  scale: 0.94, ease: 'power2.out', duration: 0.5 },
                { x: '-2vw', y: '-18vh', scale: 0.85, ease: 'power2.in',  duration: 0.7 }
            ]
        });
    } else {
        first.style.transition = 'transform 1.2s cubic-bezier(0.22,1,0.36,1)';
        last.style.transition  = 'transform 1.2s cubic-bezier(0.22,1,0.36,1)';
        first.style.transform = 'translate(-14vw, -26vh) scale(0.85)';
        last.style.transform  = 'translate(-2vw, -18vh) scale(0.85)';
    }
}
